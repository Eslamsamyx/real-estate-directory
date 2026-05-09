// Walkthrough tab — first-person tour through a Gaussian Splat capture.
// Adapted from /demo/walkthrough.html, with chrome stripped (chrome lives in modal.js).
import * as pc from '../../vendor/playcanvas.mjs';
window.pc ||= pc;

const ENGINE_BASE = '/engine/examples/assets';

export async function start({ canvas, listing, hotspotsOn }) {
    const isTouch = matchMedia('(pointer: coarse)').matches;

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

    // Touch joystick: left half = move, right half = look. Joystick base + thumb
    // and vertical (▲/▼) chips are rendered on-screen when on a touch device so
    // the controls are discoverable without an instruction modal. Append
    // `?touch=1` to the URL to force the on-screen controls on desktop too —
    // useful for design QA and client demos on a laptop.
    const _forceTouch = new URLSearchParams(location.search).get('touch') === '1';
    const _isTouchUI = isTouch || _forceTouch;
    const move = { active: false, id: null, x: 0, y: 0, baseX: 0, baseY: 0 };
    const look = { active: false, id: null, lastX: 0, lastY: 0 };
    let mobileVertical = 0;       // -1, 0, or +1 (driven by ▲/▼ chips)
    let mobileSprintMul = 1.0;    // 1.0 normal, ramps to 2.5 at edge of joystick
    const SPRINT_THRESHOLD = 0.85; // |move| at which sprint engages

    // On-screen mobile UI (joystick + chips). Lives inside the canvas's parent
    // (.tour-stage) so it disappears with the modal.
    let mobileUI = null;
    if (_isTouchUI) {
        const stage = canvas.parentElement;
        mobileUI = {
            root: document.createElement('div'),
            joyBase: document.createElement('div'),
            joyThumb: document.createElement('div'),
            upBtn: document.createElement('button'),
            downBtn: document.createElement('button')
        };
        mobileUI.root.className = 'tour-mobile-controls';
        mobileUI.joyBase.className = 'tour-joy-base';
        mobileUI.joyThumb.className = 'tour-joy-thumb';
        mobileUI.upBtn.className = 'tour-vert-chip up';
        mobileUI.upBtn.type = 'button';
        mobileUI.upBtn.textContent = '▲';
        mobileUI.upBtn.setAttribute('aria-label', 'Move up');
        mobileUI.downBtn.className = 'tour-vert-chip down';
        mobileUI.downBtn.type = 'button';
        mobileUI.downBtn.textContent = '▼';
        mobileUI.downBtn.setAttribute('aria-label', 'Move down');
        mobileUI.joyBase.appendChild(mobileUI.joyThumb);
        mobileUI.root.appendChild(mobileUI.joyBase);
        mobileUI.root.appendChild(mobileUI.upBtn);
        mobileUI.root.appendChild(mobileUI.downBtn);
        stage.appendChild(mobileUI.root);

        const holdHandler = (el, sign) => {
            const press = (e) => { e.preventDefault(); mobileVertical = sign; el.classList.add('active'); };
            const release = () => { mobileVertical = 0; el.classList.remove('active'); };
            el.addEventListener('touchstart', press, { passive: false });
            el.addEventListener('touchend', release);
            el.addEventListener('touchcancel', release);
            el.addEventListener('touchleave', release);
            // pointer events so the controls also work in DevTools mobile mode
            el.addEventListener('pointerdown', press);
            el.addEventListener('pointerup', release);
            el.addEventListener('pointercancel', release);
            el.addEventListener('pointerleave', release);
        };
        holdHandler(mobileUI.upBtn, +1);
        holdHandler(mobileUI.downBtn, -1);
    }

    // Move joystick thumb to reflect (move.x, move.y), capped to base radius.
    // Also flip the base into "sprint" state at the rim.
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

    const onTouchStart = (e) => {
        // Don't preventDefault on chip taps (they handle themselves).
        if (e.target && e.target.classList && e.target.classList.contains('tour-vert-chip')) return;
        e.preventDefault();
        const w = window.innerWidth;
        for (const t of e.changedTouches) {
            if (t.clientX < w * 0.5 && !move.active) {
                move.active = true; move.id = t.identifier;
                move.baseX = t.clientX; move.baseY = t.clientY;
                move.x = 0; move.y = 0;
                updateJoystickThumb();
            } else if (!look.active) {
                look.active = true; look.id = t.identifier;
                look.lastX = t.clientX; look.lastY = t.clientY;
            }
        }
    };
    const onTouchMove = (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('tour-vert-chip')) return;
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
                cam.yaw -= (t.clientX - look.lastX) * 0.25;
                cam.pitch -= (t.clientY - look.lastY) * 0.25;
                cam.pitch = Math.max(-80, Math.min(80, cam.pitch));   // tighter on mobile
                look.lastX = t.clientX; look.lastY = t.clientY;
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
            }
        }
    };
    if (isTouch) {
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
    const { HOTSPOTS } = await import('../../data/hotspots.js');
    const { createHotspotsLayer } = await import('./hotspots.js');
    const flipped = HOTSPOTS.map(h => ({ ...h, world: [h.world[0], -h.world[1], -h.world[2]] }));
    const hsLayer = createHotspotsLayer({ canvas, camera, hotspots: flipped, enabled: hotspotsOn });

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
                if (isTouch) {
                    canvas.removeEventListener('touchstart', onTouchStart);
                    canvas.removeEventListener('touchmove', onTouchMove);
                    canvas.removeEventListener('touchend', onTouchEnd);
                    canvas.removeEventListener('touchcancel', onTouchEnd);
                    if (mobileUI?.root?.parentElement) mobileUI.root.parentElement.removeChild(mobileUI.root);
                }
                hsLayer.destroy();
            } catch (err) {
                console.warn('[walkthrough] teardown', err);
            } finally {
                try { app.destroy(); } catch (err) { console.warn('[walkthrough] app.destroy', err); }
            }
        }
    };
}
