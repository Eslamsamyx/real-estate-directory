// Configurator tab — same scene as dollhouse + a side panel that swaps materials.
import * as pc from '../../vendor/playcanvas.mjs';
import { el } from '../dom.js';
import { PALETTES } from '../../data/configurator.js';
window.pc ||= pc;

const ENGINE_BASE = '/engine/examples/assets';
const ENV_URL = `${ENGINE_BASE}/cubemaps/helipad-env-atlas.png`;

// Heuristic for which material in `allMaterials` the configurator should target
// for a given palette key when the model's material names don't include the
// expected substring (apartment.glb materials are opaque numeric IDs).
const FALLBACK_INDEX = { walls: 0, floor: 1, counter: 2 };

export async function start({ canvas, listing, aside, hotspotsOn }) {
    const app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: new pc.TouchDevice(canvas),
        graphicsDeviceOptions: { antialias: true, powerPreference: 'high-performance' }
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    const onResize = () => app.resizeCanvas();
    window.addEventListener('resize', onResize);

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

    // Assets
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
            if (errors) console.error('[configurator] asset errors', errors);
            resolve();
        });
    });

    if (helipad.resource) {
        app.scene.envAtlas = helipad.resource;
        app.scene.skyboxIntensity = 0;
    }

    // Mesh
    let entity = null;
    if (meshAsset.resource) {
        entity = meshAsset.resource.instantiateRenderEntity({
            receiveShadows: true,
            castShadows: true
        });
        app.root.addChild(entity);
    }

    // AABB to frame camera
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
        distanceCurrent: radius * 2.4
    };

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

    // Pointer drag — orbit only, no scroll-zoom (config experience is steady)
    const drag = { active: false, id: null, lastX: 0, lastY: 0 };
    const onDown = (e) => {
        canvas.setPointerCapture(e.pointerId);
        drag.active = true; drag.id = e.pointerId;
        drag.lastX = e.clientX; drag.lastY = e.clientY;
    };
    const onMove = (e) => {
        if (!drag.active || drag.id !== e.pointerId) return;
        orbit.yaw -= (e.clientX - drag.lastX) * 0.35;
        orbit.pitch += (e.clientY - drag.lastY) * 0.35;
        orbit.pitch = Math.max(-25, Math.min(80, orbit.pitch));
        drag.lastX = e.clientX; drag.lastY = e.clientY;
    };
    const onUp = (e) => {
        if (drag.id === e.pointerId) {
            drag.active = false;
            drag.id = null;
        }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const updateHandler = (dt) => {
        const damp = 1 - Math.pow(0.001, dt);
        orbit.yawCurrent += (orbit.yaw - orbit.yawCurrent) * damp;
        orbit.pitchCurrent += (orbit.pitch - orbit.pitchCurrent) * damp;
        orbit.distanceCurrent += (orbit.distance - orbit.distanceCurrent) * damp;
        applyCamera();
    };
    app.on('update', updateHandler);

    // ----- Material catalog -----------------------------------------------
    const allMaterials = [];
    const seen = new Set();
    if (entity) {
        for (const r of entity.findComponents('render')) {
            for (const mi of r.meshInstances) {
                const m = mi.material;
                if (m && !seen.has(m.id)) {
                    seen.add(m.id);
                    allMaterials.push(m);
                }
            }
        }
    }

    // Snapshot original diffuse + gloss values so reset can restore them.
    const originals = allMaterials.map(m => ({
        diffuse: m.diffuse ? new pc.Color(m.diffuse.r, m.diffuse.g, m.diffuse.b) : null,
        gloss: m.gloss
    }));

    function findMaterial(substring, paletteKey) {
        if (!allMaterials.length) return null;
        const target = (substring || '').toLowerCase();
        if (target) {
            const found = allMaterials.find(m => (m.name || '').toLowerCase().includes(target));
            if (found) return found;
        }
        // Fallback: deterministic index per palette key (0 walls, 1 floor, 2 counter)
        const idx = FALLBACK_INDEX[paletteKey] ?? 0;
        return allMaterials[Math.min(idx, allMaterials.length - 1)] || null;
    }

    function applyOption(paletteKey, option) {
        const palette = PALETTES[paletteKey];
        if (!palette) return;
        const mat = findMaterial(palette.targetMaterial, paletteKey);
        if (!mat) return;
        if (option.diffuse) {
            mat.diffuse = new pc.Color(option.diffuse[0], option.diffuse[1], option.diffuse[2]);
        }
        if (typeof option.gloss === 'number') {
            mat.gloss = option.gloss;
        }
        mat.useMetalness = true;
        mat.update();
    }

    function resetDefaults() {
        for (let i = 0; i < allMaterials.length; i++) {
            const m = allMaterials[i];
            const o = originals[i];
            if (!o) continue;
            if (o.diffuse) m.diffuse = new pc.Color(o.diffuse.r, o.diffuse.g, o.diffuse.b);
            if (typeof o.gloss === 'number') m.gloss = o.gloss;
            m.update();
        }
        // Clear .on classes
        for (const btn of aside.querySelectorAll('.cfg-swatch.on')) btn.classList.remove('on');
    }

    // ----- Side panel DOM -------------------------------------------------
    aside.replaceChildren();

    const head = el('div', { cls: 'cfg-head' });
    head.appendChild(el('h3', { text: 'Customize finishes' }));
    head.appendChild(el('p', { cls: 'cfg-sub', text: 'Try walls, flooring, and counter swatches in real time.' }));
    aside.appendChild(head);

    for (const paletteKey of Object.keys(PALETTES)) {
        const palette = PALETTES[paletteKey];
        const section = el('section', { cls: 'cfg-section' });
        section.appendChild(el('div', { cls: 'cfg-label', text: palette.label }));

        const swatches = el('div', { cls: 'cfg-swatches' });
        for (const opt of palette.options) {
            const btn = el('button', {
                cls: 'cfg-swatch',
                attrs: { type: 'button', 'aria-label': opt.label, title: opt.label }
            });
            const [r, g, b] = opt.diffuse;
            btn.style.background = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
            btn.appendChild(el('span', { cls: 'cfg-swatch-label', text: opt.label }));
            btn.addEventListener('click', () => {
                for (const sib of swatches.querySelectorAll('.cfg-swatch.on')) sib.classList.remove('on');
                btn.classList.add('on');
                applyOption(paletteKey, opt);
            });
            swatches.appendChild(btn);
        }
        section.appendChild(swatches);
        aside.appendChild(section);
    }

    const resetSection = el('section', { cls: 'cfg-section' });
    const resetBtn = el('button', { cls: 'tour-btn', text: 'Reset to defaults', attrs: { type: 'button' } });
    resetBtn.style.width = '100%';
    resetBtn.addEventListener('click', resetDefaults);
    resetSection.appendChild(resetBtn);
    aside.appendChild(resetSection);

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
                aside.replaceChildren();
                hsLayer.destroy();
                app.destroy();
            } catch (err) {
                console.error('[configurator] destroy error', err);
            }
        }
    };
}
