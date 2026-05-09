// Dollhouse tab — orbits a glTF mesh with PBR + IBL.
// Adapted from /demo/gltf-studio.html, with chrome stripped (chrome lives in modal.js).
import * as pc from '../../vendor/playcanvas.mjs';
window.pc ||= pc;

const ENGINE_BASE = '/engine/examples/assets';
const ENV_URL = `${ENGINE_BASE}/cubemaps/helipad-env-atlas.png`;

export async function start({ canvas, listing, hotspotsOn }) {
    const app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: new pc.TouchDevice(canvas),
        graphicsDeviceOptions: { antialias: true, powerPreference: 'high-performance' }
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    const onResize = () => app.resizeCanvas();
    window.addEventListener('resize', onResize);

    // Scene tone
    app.scene.ambientLight = new pc.Color(0.04, 0.05, 0.08);
    app.scene.exposure = 1.0;
    if (app.scene.fog) app.scene.fog.type = pc.FOG_NONE;

    // Camera
    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
        clearColor: new pc.Color(0.03, 0.035, 0.05),
        fov: 38,
        nearClip: 0.05,
        farClip: 200,
        toneMapping: (typeof pc.TONEMAP_ACES !== 'undefined') ? pc.TONEMAP_ACES : undefined
    });
    app.root.addChild(camera);

    // Sun
    const sun = new pc.Entity('sun');
    sun.addComponent('light', {
        type: 'directional',
        color: new pc.Color(1, 0.96, 0.88),
        intensity: 0.9,
        castShadows: true,
        shadowDistance: 30,
        shadowResolution: 1024,
        normalOffsetBias: 0.05,
        shadowBias: 0.2
    });
    sun.setEulerAngles(50, -30, 0);
    app.root.addChild(sun);

    // Fill
    const fill = new pc.Entity('fill');
    fill.addComponent('light', {
        type: 'directional',
        color: new pc.Color(0.85, 0.9, 1.0),
        intensity: 0.4,
        castShadows: false
    });
    fill.setEulerAngles(-30, 60, 0);
    app.root.addChild(fill);

    // Asset loading
    const meshUrl = listing?.tour3d?.mesh || `${ENGINE_BASE}/models/apartment.glb`;
    const helipad = new pc.Asset(
        'helipad',
        'texture',
        { url: ENV_URL },
        { type: pc.TEXTURETYPE_RGBP, mipmaps: false }
    );
    const meshAsset = new pc.Asset('apartment-mesh', 'container', { url: meshUrl });

    await new Promise((resolve) => {
        const loader = new pc.AssetListLoader([helipad, meshAsset], app.assets);
        loader.load((errors) => {
            if (errors) console.error('[dollhouse] asset errors', errors);
            resolve();
        });
    });

    // IBL
    if (helipad.resource) {
        app.scene.envAtlas = helipad.resource;
        app.scene.skyboxIntensity = 0;
    }

    // Instantiate mesh
    let entity = null;
    if (meshAsset.resource) {
        entity = meshAsset.resource.instantiateRenderEntity({
            receiveShadows: true,
            castShadows: true
        });
        app.root.addChild(entity);
    }

    // Frame the mesh: compute combined AABB
    const aabb = new pc.BoundingBox();
    let initialised = false;
    if (entity) {
        for (const r of entity.findComponents('render')) {
            for (const mi of r.meshInstances) {
                if (!initialised) { aabb.copy(mi.aabb); initialised = true; }
                else aabb.add(mi.aabb);
            }
        }
    }
    const center = initialised ? aabb.center.clone() : new pc.Vec3(0, 1.5, 0);
    const radius = initialised ? aabb.halfExtents.length() : 3;

    const orbit = {
        target: center,
        distance: radius * 2.4,
        yaw: 35,
        pitch: 22,
        yawCurrent: 35,
        pitchCurrent: 22,
        distanceCurrent: radius * 2.4,
        autoRotate: true
    };
    let lastInteraction = performance.now();

    const applyCamera = () => {
        const yaw = orbit.yawCurrent * pc.math.DEG_TO_RAD;
        const pitch = orbit.pitchCurrent * pc.math.DEG_TO_RAD;
        const cy = Math.cos(pitch) * orbit.distanceCurrent;
        camera.setPosition(
            orbit.target.x + Math.sin(yaw) * cy,
            orbit.target.y + Math.sin(pitch) * orbit.distanceCurrent,
            orbit.target.z + Math.cos(yaw) * cy
        );
        camera.lookAt(orbit.target.x, orbit.target.y, orbit.target.z);
    };
    applyCamera();

    // Pointer drag
    const drag = { active: false, id: null, lastX: 0, lastY: 0 };
    const onDown = (e) => {
        canvas.setPointerCapture(e.pointerId);
        drag.active = true; drag.id = e.pointerId;
        drag.lastX = e.clientX; drag.lastY = e.clientY;
        orbit.autoRotate = false;
        lastInteraction = performance.now();
    };
    const onMove = (e) => {
        if (!drag.active || drag.id !== e.pointerId) return;
        orbit.yaw -= (e.clientX - drag.lastX) * 0.35;
        orbit.pitch += (e.clientY - drag.lastY) * 0.35;
        orbit.pitch = Math.max(-25, Math.min(80, orbit.pitch));
        drag.lastX = e.clientX; drag.lastY = e.clientY;
        lastInteraction = performance.now();
    };
    const onUp = (e) => {
        if (drag.id === e.pointerId) {
            drag.active = false;
            drag.id = null;
        }
    };
    const onWheel = (e) => {
        orbit.distance += e.deltaY * 0.012;
        const minDist = Math.max(0.4, radius * 0.4);
        const maxDist = Math.max(20, radius * 6);
        orbit.distance = Math.max(minDist, Math.min(maxDist, orbit.distance));
        lastInteraction = performance.now();
        e.preventDefault();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Update loop
    const updateHandler = (dt) => {
        const now = performance.now();
        if (!drag.active && now - lastInteraction > 2000) orbit.autoRotate = true;
        if (orbit.autoRotate) orbit.yaw += dt * 8;

        // Critically damped follow
        const damp = 1 - Math.pow(0.001, dt);
        orbit.yawCurrent += (orbit.yaw - orbit.yawCurrent) * damp;
        orbit.pitchCurrent += (orbit.pitch - orbit.pitchCurrent) * damp;
        orbit.distanceCurrent += (orbit.distance - orbit.distanceCurrent) * damp;
        applyCamera();
    };
    app.on('update', updateHandler);

    // Hotspots layer
    const { HOTSPOTS } = await import('../../data/hotspots.js');
    const { createHotspotsLayer } = await import('./hotspots.js');
    const hsLayer = createHotspotsLayer({ canvas, camera, hotspots: HOTSPOTS, enabled: hotspotsOn });

    app.start();

    return {
        setHotspotsEnabled(on) { hsLayer.setEnabled(on); },
        destroy() {
            try {
                window.removeEventListener('resize', onResize);
                canvas.removeEventListener('pointerdown', onDown);
                canvas.removeEventListener('pointermove', onMove);
                canvas.removeEventListener('pointerup', onUp);
                canvas.removeEventListener('pointercancel', onUp);
                canvas.removeEventListener('wheel', onWheel);
                hsLayer.destroy();
            } catch (err) {
                console.warn('[dollhouse] teardown', err);
            } finally {
                try { app.destroy(); } catch (err) { console.warn('[dollhouse] app.destroy', err); }
            }
        }
    };
}
