import { el } from '../dom.js';
import * as pc from '../../vendor/playcanvas.mjs';

export function createHotspotsLayer({ canvas, camera, hotspots, enabled }) {
    const layer = el('div', { cls: 'hotspots-layer' });
    layer.style.cssText = 'position:absolute; inset:0; pointer-events:none; overflow:hidden;';
    canvas.parentElement.appendChild(layer);

    const items = hotspots.map((h, i) => {
        const wrap = el('div', { cls: 'hotspot' });
        const dot = el('button', { cls: 'hs-dot', text: String(i + 1), attrs: { type: 'button' } });
        const card = el('div', { cls: 'hs-card' });
        card.appendChild(el('h4', { cls: 'hs-title', text: h.title }));
        card.appendChild(el('p', { cls: 'hs-body', text: h.body }));
        wrap.appendChild(dot);
        wrap.appendChild(card);
        layer.appendChild(wrap);
        let pinned = false;
        dot.addEventListener('click', () => { pinned = !pinned; wrap.classList.toggle('pinned', pinned); });
        return { wrap, dot, world: new pc.Vec3(...h.world) };
    });

    let visible = !!enabled;
    layer.style.display = visible ? 'block' : 'none';

    const screenVec = new pc.Vec3();
    let raf = 0;
    const tick = () => {
        if (visible) {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            for (const it of items) {
                camera.camera.worldToScreen(it.world, screenVec);
                if (screenVec.z < 0 || screenVec.x < 0 || screenVec.x > w || screenVec.y < 0 || screenVec.y > h) {
                    it.wrap.style.display = 'none';
                } else {
                    it.wrap.style.display = '';
                    it.wrap.style.left = screenVec.x + 'px';
                    it.wrap.style.top = screenVec.y + 'px';
                }
            }
        }
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return {
        setEnabled(on) { visible = !!on; layer.style.display = visible ? 'block' : 'none'; },
        destroy() { cancelAnimationFrame(raf); layer.remove(); }
    };
}
