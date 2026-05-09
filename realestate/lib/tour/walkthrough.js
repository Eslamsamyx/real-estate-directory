// Walkthrough tab — first-person tour through a Gaussian Splat capture.
// Adapted from /demo/walkthrough.html, with chrome stripped (chrome lives in modal.js).
import * as pc from '../../vendor/playcanvas.mjs';
window.pc ||= pc;

const ENGINE_BASE = '/engine/examples/assets';

export async function start({ canvas, listing, hotspotsOn }) {
    // Multi-criteria touch detection. `(pointer: coarse)` alone misses some
    // configurations: iPads in desktop mode, devices with both touch and a
    // mouse plugged in, in-app webviews that don't set the media feature, etc.
    // We OR several signals so the on-screen controls show on any reasonable
    // touch device.
    const isTouch =
        (typeof window !== 'undefined' && 'ontouchstart' in window) ||
        (navigator.maxTouchPoints || 0) > 0 ||
        matchMedia('(pointer: coarse)').matches ||
        matchMedia('(hover: none)').matches;

    const app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: new pc.TouchDevice(canvas),
        keyboard: new pc.Keyboard(window),
        graphicsDeviceOptions: {
            antialias: false,
            powerPreference: 'high-performance'
        }
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    const onResize = () => app.resizeCanvas();
    window.addEventListener('resize', onResize);

    if (app.scene.fog) app.scene.fog.type = pc.FOG_NONE;

    // Camera
    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
        clearColor: new pc.Color(0.02, 0.025, 0.035),
        fov: 70,
        nearClip: 0.05,
        farClip: 200
    });
    app.root.addChild(camera);

    // Asset
    const splatUrl = listing?.tour3d?.splat || `${ENGINE_BASE}/splats/apartment.sog`;
    const splatAsset = new pc.Asset('apartment-splat', 'gsplat', { url: splatUrl });

    // Camera state
    const cam = {
        pos: new pc.Vec3(0, 1.6, 4),
        yaw: 0,
        pitch: 0,
        speed: 2.4,
        lookSensitivity: 0.0022,
        isLocked: false
    };

    // Pre-allocated scratch Vec3s reused every frame (no per-frame GC churn)
    const _fwd = new pc.Vec3();
    const _right = new pc.Vec3();
    const _delta = new pc.Vec3();

    const applyCamera = () => {
        const yawR = cam.yaw * pc.math.DEG_TO_RAD;
        const pitchR = cam.pitch * pc.math.DEG_TO_RAD;
        _fwd.set(
            -Math.sin(yawR) * Math.cos(pitchR),
            Math.sin(pitchR),
            -Math.cos(yawR) * Math.cos(pitchR)
        );
        camera.setPosition(cam.pos);
        camera.lookAt(cam.pos.x + _fwd.x, cam.pos.y + _fwd.y, cam.pos.z + _fwd.z);
    };
    applyCamera();

    // Pointer-lock
    const lockPointer = () => {
        if (isTouch) return;
        try { canvas.requestPointerLock(); } catch (_) {}
    };
    const unlockPointer = () => {
        if (document.pointerLockElement === canvas) document.exitPointerLock();
    };

    const onClick = () => {
        if (!cam.isLocked) lockPointer();
    };
    canvas.addEventListener('click', onClick);

    const onPointerLockChange = () => {
        cam.isLocked = document.pointerLockElement === canvas;
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const onMouseMove = (e) => {
        if (!cam.isLocked) return;
        cam.yaw -= e.movementX * cam.lookSensitivity * 60;
        cam.pitch -= e.movementY * cam.lookSensitivity * 60;
        cam.pitch = Math.max(-89, Math.min(89, cam.pitch));
    };
    document.addEventListener('mousemove', onMouseMove);

    // Keyboard
    const keys = new Set();
    const onKeyDown = (e) => {
        keys.add(e.code);
        if (e.code === 'Escape') unlockPointer();
    };
    const onKeyUp = (e) => keys.delete(e.code);
    const onBlur = () => keys.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Dual on-screen joysticks: left half = move, right half = look (camera
    // angular velocity). Rendered on every touch device so the controls are
    // discoverable without an instruction modal. Append `?touch=1` to the URL
    // to force them on desktop too — useful for design QA on a laptop.
    const _forceTouch = new URLSearchParams(location.search).get('touch') === '1';
    const _isTouchUI = isTouch || _forceTouch;

    // Debug breadcrumb so the on-screen controls' presence/absence can be
    // diagnosed via remote Web Inspector / chrome://inspect on a real device.
    // Cheap log; no PII.
    try {
        // eslint-disable-next-line no-console
        console.info('[walkthrough] touch detection:',
            { isTouch, _forceTouch, _isTouchUI,
              ontouchstart: 'ontouchstart' in window,
              maxTouchPoints: navigator.maxTouchPoints || 0,
              pointerCoarse: matchMedia('(pointer: coarse)').matches,
              hoverNone: matchMedia('(hover: none)').matches,
              w: window.innerWidth, h: window.innerHeight });
    } catch (_) {}
    const move = { active: false, id: null, x: 0, y: 0, baseX: 0, baseY: 0 };
    // Look stick mirrors move stick: x/y in [-1,1], baseX/baseY = touch-start
    // anchor. Drives camera angular velocity in the update loop.
    const look = { active: false, id: null, x: 0, y: 0, baseX: 0, baseY: 0 };
    // Free-drag swipe-look: any right-half touch that doesn't land on the
    // joystick rotates the camera by per-move delta (like a mouse-look swipe).
    const swipe = { active: false, id: null, lastX: 0, lastY: 0 };
    let mobileVertical = 0;       // unused at runtime; reserved for future Z-axis chip
    let mobileSprintMul = 1.0;    // 1.0 normal, ramps to 2.5 at edge of joystick
    const SPRINT_THRESHOLD = 0.85; // |move| at which sprint engages

    // On-screen mobile UI (joystick + chips). Lives inside the canvas's parent
    // (.tour-stage) so it disappears with the modal.
    let mobileUI = null;
    if (_isTouchUI) {
        const stage = canvas.parentElement;
        // LOCAL FIX (iPhone Safari): append mobileUI to the modal root, not
        // the stage. The stage has `overflow: hidden` which can clip fixed
        // descendants on iOS Safari, and switching tabs replaces the canvas.
        // Putting controls one level higher avoids both.
        const mobileHost = canvas.closest('.tour-modal') || stage;
        mobileUI = {
            root: document.createElement('div'),
            joyBase: document.createElement('div'),
            joyThumb: document.createElement('div'),
            lookBase: document.createElement('div'),
            lookThumb: document.createElement('div')
        };
        mobileUI.root.className = 'tour-mobile-controls';
        mobileUI.joyBase.className = 'tour-joy-base';
        mobileUI.joyThumb.className = 'tour-joy-thumb';
        // Right-side stick: same chrome, mirrored to the right edge via the
        // `.look` modifier in style.css. Drives camera angular velocity.
        mobileUI.lookBase.className = 'tour-joy-base look';
        mobileUI.lookThumb.className = 'tour-joy-thumb';
        mobileUI.joyBase.appendChild(mobileUI.joyThumb);
        mobileUI.lookBase.appendChild(mobileUI.lookThumb);
        mobileUI.root.appendChild(mobileUI.joyBase);
        mobileUI.root.appendChild(mobileUI.lookBase);
        mobileHost.appendChild(mobileUI.root);
    }

    // Move/look thumbs reflect (x, y) state, capped to base radius.
    // Move stick also toggles "sprint" at the rim.
    const JOY_RADIUS = 38; // px, slightly under the base's 110px diameter / 2
    const updateJoystickThumb = () => {
        if (!mobileUI) return;
        const tx = move.x * JOY_RADIUS;
        const ty = move.y * JOY_RADIUS;
        mobileUI.joyThumb.style.transform = `translate(${tx}px, ${ty}px)`;
        const sprinting = Math.hypot(move.x, move.y) > SPRINT_THRESHOLD;
        mobileUI.joyBase.classList.toggle('sprint', sprinting);
        mobileUI.joyThumb.classList.toggle('sprint', sprinting);
    };
    const updateLookThumb = () => {
        if (!mobileUI) return;
        const tx = look.x * JOY_RADIUS;
        const ty = look.y * JOY_RADIUS;
        mobileUI.lookThumb.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    // Hit-test a touch against the look-joystick base (with a small padding so
    // it's still grabbable near the rim). When false, the touch is treated as
    // free-drag swipe-look on the canvas.
    const isOnLookStick = (clientX, clientY) => {
        if (!mobileUI?.lookBase) return false;
        const r = mobileUI.lookBase.getBoundingClientRect();
        const pad = 18;
        return clientX >= r.left - pad && clientX <= r.right + pad &&
               clientY >= r.top - pad  && clientY <= r.bottom + pad;
    };
    const isOnMoveStick = (clientX, clientY) => {
        if (!mobileUI?.joyBase) return false;
        const r = mobileUI.joyBase.getBoundingClientRect();
        const pad = 18;
        return clientX >= r.left - pad && clientX <= r.right + pad &&
               clientY >= r.top - pad  && clientY <= r.bottom + pad;
    };

    const onTouchStart = (e) => {
        e.preventDefault();
        const w = window.innerWidth;
        for (const t of e.changedTouches) {
            // Move stick wins on the left half OR if finger lands on its base.
            if (!move.active && (isOnMoveStick(t.clientX, t.clientY) || t.clientX < w * 0.5)) {
                move.active = true; move.id = t.identifier;
                move.baseX = t.clientX; move.baseY = t.clientY;
                move.x = 0; move.y = 0;
                updateJoystickThumb();
            } else if (!look.active && isOnLookStick(t.clientX, t.clientY)) {
                // Look-stick mode: anchored joystick, drives angular velocity.
                look.active = true; look.id = t.identifier;
                look.baseX = t.clientX; look.baseY = t.clientY;
                look.x = 0; look.y = 0;
                updateLookThumb();
            } else if (!swipe.active) {
                // Free-drag swipe-look on the rest of the canvas. Per-move
                // delta rotates camera (yaw/pitch in degrees per pixel).
                swipe.active = true; swipe.id = t.identifier;
                swipe.lastX = t.clientX; swipe.lastY = t.clientY;
            }
        }
    };
    const SWIPE_LOOK_SENS = 0.22; // deg per pixel — comparable to Street View.
    const onTouchMove = (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier === move.id) {
                const dx = t.clientX - move.baseX;
                const dy = t.clientY - move.baseY;
                const r = Math.min(40, Math.hypot(dx, dy));
                const a = Math.atan2(dy, dx);
                move.x = (Math.cos(a) * r) / 40;
                move.y = (Math.sin(a) * r) / 40;
                updateJoystickThumb();
            } else if (t.identifier === look.id) {
                const dx = t.clientX - look.baseX;
                const dy = t.clientY - look.baseY;
                const r = Math.min(40, Math.hypot(dx, dy));
                const a = Math.atan2(dy, dx);
                look.x = (Math.cos(a) * r) / 40;
                look.y = (Math.sin(a) * r) / 40;
                updateLookThumb();
            } else if (t.identifier === swipe.id) {
                cam.yaw   -= (t.clientX - swipe.lastX) * SWIPE_LOOK_SENS;
                cam.pitch -= (t.clientY - swipe.lastY) * SWIPE_LOOK_SENS;
                cam.pitch = Math.max(-80, Math.min(80, cam.pitch));
                swipe.lastX = t.clientX; swipe.lastY = t.clientY;
            }
        }
    };
    const onTouchEnd = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === move.id) {
                move.active = false; move.id = null;
                move.x = 0; move.y = 0;
                updateJoystickThumb();
            } else if (t.identifier === look.id) {
                look.active = false; look.id = null;
                look.x = 0; look.y = 0;
                updateLookThumb();
            } else if (t.identifier === swipe.id) {
                swipe.active = false; swipe.id = null;
            }
        }
    };
    if (_isTouchUI) {
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }

    // Update loop
    const updateHandler = (dt) => {
        const yawR = cam.yaw * pc.math.DEG_TO_RAD;
        _fwd.set(-Math.sin(yawR), 0, -Math.cos(yawR));
        _right.set(Math.cos(yawR), 0, -Math.sin(yawR));

        let mx = 0, my = 0, mUp = 0;
        if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
        if (keys.has('Space')) mUp += 1;
        if (keys.has('ShiftLeft') || keys.has('ShiftRight')) mUp -= 1;
        if (keys.has('KeyQ')) cam.yaw += dt * 60;
        if (keys.has('KeyE')) cam.yaw -= dt * 60;

        // Right joystick drives camera angular velocity. Speed at full
        // deflection is 140°/s yaw, 90°/s pitch — comparable to mainstream
        // mobile FPS defaults and snappy enough for a tour.
        if (look.x !== 0 || look.y !== 0) {
            cam.yaw   -= look.x * 140 * dt;
            cam.pitch -= look.y * 90  * dt;
            cam.pitch = Math.max(-80, Math.min(80, cam.pitch));
        }

        mx += move.x;
        my -= move.y;
        mUp += mobileVertical;

        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }

        // Smooth sprint multiplier. Engages once the joystick crosses
        // SPRINT_THRESHOLD; ramps in/out over ~250ms via lerp(0.18 per frame).
        const stickMag = Math.hypot(move.x, move.y);
        const targetMul = stickMag > SPRINT_THRESHOLD ? 2.5 : 1.0;
        const prevMul = mobileSprintMul;
        mobileSprintMul += (targetMul - mobileSprintMul) * 0.18;
        // Subtle haptic the moment sprint engages
        if (prevMul < 1.6 && mobileSprintMul >= 1.6 && navigator.vibrate) {
            try { navigator.vibrate(12); } catch (_) {}
        }

        const speed = cam.speed * mobileSprintMul;
        _delta.set(
            (_right.x * mx + _fwd.x * my) * speed * dt,
            mUp * speed * dt,
            (_right.z * mx + _fwd.z * my) * speed * dt
        );
        cam.pos.add(_delta);

        applyCamera();
    };
    app.on('update', updateHandler);

    // Load splat
    await new Promise((resolve) => {
        const loader = new pc.AssetListLoader([splatAsset], app.assets);
        loader.load((errors) => {
            if (errors) console.error('[walkthrough] asset errors', errors);
            resolve();
        });
    });

    if (splatAsset.resource) {
        const entity = new pc.Entity('apartment');
        entity.addComponent('gsplat', { asset: splatAsset, unified: true });
        entity.setLocalEulerAngles(180, 0, 0); // PLY captures are Y-down
        app.root.addChild(entity);

        // Place camera at scene centre
        try {
            const aabb = entity.gsplat?.instance?.meshInstance?.aabb;
            if (aabb) {
                cam.pos.copy(aabb.center);
            }
        } catch (_) {}
    }

    // Hotspots layer — splat is rotated 180° on X, flip y/z to match
    const { HOTSPOTS } = await import('../../data/hotspots.js?v=3');
    const { createHotspotsLayer } = await import('./hotspots.js?v=3');
    const flipped = HOTSPOTS.map(h => ({ ...h, world: [h.world[0], -h.world[1], -h.world[2]] }));
    const hsLayer = createHotspotsLayer({ canvas, camera, hotspots: flipped, enabled: hotspotsOn });

    // Mini-map / compass overlay. Uses the gsplat AABB for footprint bounds
    // and the camera state for the heading cone. Tap to teleport.
    const { createMinimap } = await import('./minimap.js?v=3');
    const splatEntity = app.root.findByName('apartment');
    const minimap = createMinimap({
        host: canvas.closest('.tour-modal') || canvas.parentElement,
        hotspots: flipped,
        getCamera: () => ({ x: cam.pos.x, z: cam.pos.z, yaw: cam.yaw }),
        getBounds: () => {
            const aabb = splatEntity?.gsplat?.instance?.meshInstance?.aabb;
            if (!aabb) return null;
            return {
                minX: aabb.center.x - aabb.halfExtents.x,
                maxX: aabb.center.x + aabb.halfExtents.x,
                minZ: aabb.center.z - aabb.halfExtents.z,
                maxZ: aabb.center.z + aabb.halfExtents.z
            };
        },
        onTeleport: ({ x, z }) => { cam.pos.x = x; cam.pos.z = z; applyCamera(); }
    });

    app.start();

    return {
        setHotspotsEnabled(on) { hsLayer.setEnabled(on); },
        destroy() {
            try {
                if (document.pointerLockElement === canvas) document.exitPointerLock();
                window.removeEventListener('resize', onResize);
                canvas.removeEventListener('click', onClick);
                document.removeEventListener('pointerlockchange', onPointerLockChange);
                document.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('keydown', onKeyDown);
                window.removeEventListener('keyup', onKeyUp);
                window.removeEventListener('blur', onBlur);
                if (_isTouchUI) {
                    canvas.removeEventListener('touchstart', onTouchStart);
                    canvas.removeEventListener('touchmove', onTouchMove);
                    canvas.removeEventListener('touchend', onTouchEnd);
                    canvas.removeEventListener('touchcancel', onTouchEnd);
                    if (mobileUI?.root?.parentElement) mobileUI.root.parentElement.removeChild(mobileUI.root);
                }
                hsLayer.destroy();
                minimap.destroy();
            } catch (err) {
                console.warn('[walkthrough] teardown', err);
            } finally {
                try { app.destroy(); } catch (err) { console.warn('[walkthrough] app.destroy', err); }
            }
        }
    };
}
