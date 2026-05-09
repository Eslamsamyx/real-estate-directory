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

    const applyCamera = () => {
        const yawR = cam.yaw * pc.math.DEG_TO_RAD;
        const pitchR = cam.pitch * pc.math.DEG_TO_RAD;
        const fwd = new pc.Vec3(
            -Math.sin(yawR) * Math.cos(pitchR),
            Math.sin(pitchR),
            -Math.cos(yawR) * Math.cos(pitchR)
        );
        camera.setPosition(cam.pos);
        camera.lookAt(cam.pos.x + fwd.x, cam.pos.y + fwd.y, cam.pos.z + fwd.z);
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

    // Touch joystick: left half = move, right half = look
    const move = { active: false, id: null, x: 0, y: 0, baseX: 0, baseY: 0 };
    const look = { active: false, id: null, lastX: 0, lastY: 0 };

    const onTouchStart = (e) => {
        e.preventDefault();
        const w = window.innerWidth;
        for (const t of e.changedTouches) {
            if (t.clientX < w * 0.5 && !move.active) {
                move.active = true; move.id = t.identifier;
                move.baseX = t.clientX; move.baseY = t.clientY;
                move.x = 0; move.y = 0;
            } else if (!look.active) {
                look.active = true; look.id = t.identifier;
                look.lastX = t.clientX; look.lastY = t.clientY;
            }
        }
    };
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
            } else if (t.identifier === look.id) {
                cam.yaw -= (t.clientX - look.lastX) * 0.25;
                cam.pitch -= (t.clientY - look.lastY) * 0.25;
                cam.pitch = Math.max(-89, Math.min(89, cam.pitch));
                look.lastX = t.clientX; look.lastY = t.clientY;
            }
        }
    };
    const onTouchEnd = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === move.id) {
                move.active = false; move.id = null;
                move.x = 0; move.y = 0;
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
        const fwd = new pc.Vec3(-Math.sin(yawR), 0, -Math.cos(yawR));
        const right = new pc.Vec3(Math.cos(yawR), 0, -Math.sin(yawR));

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

        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }

        const speed = cam.speed;
        const delta = new pc.Vec3();
        delta.x = (right.x * mx + fwd.x * my) * speed * dt;
        delta.y = mUp * speed * dt;
        delta.z = (right.z * mx + fwd.z * my) * speed * dt;
        cam.pos.add(delta);

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

    app.start();

    return {
        setHotspotsEnabled(_) { /* no-op until Task 19 */ },
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
                }
                app.destroy();
            } catch (err) {
                console.error('[walkthrough] destroy error', err);
            }
        }
    };
}
