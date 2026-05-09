// Mini-map / compass overlay for the walkthrough tab.
// Top-down 2D radar drawn on its own canvas: footprint of the splat AABB,
// hotspot dots, and the camera as a triangle pointing along its yaw.
// Tapping a hotspot dot teleports the camera to its world XZ.

export function createMinimap({ host, hotspots, getCamera, getBounds, onTeleport }) {
    const wrap = document.createElement('div');
    wrap.className = 'tour-minimap';
    wrap.setAttribute('aria-label', 'Mini-map and compass');

    const canvas = document.createElement('canvas');
    const SIZE = 132;            // CSS pixels (square)
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = SIZE + 'px';
    canvas.style.height = SIZE + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const compass = document.createElement('div');
    compass.className = 'tour-minimap-n';
    compass.textContent = 'N';

    wrap.appendChild(canvas);
    wrap.appendChild(compass);
    host.appendChild(wrap);

    let bounds = null;            // { minX, maxX, minZ, maxZ }
    const PAD = 0.5;              // world-units of padding around AABB

    const project = (worldX, worldZ) => {
        if (!bounds) return null;
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxZ - bounds.minZ;
        const span = Math.max(w, h, 0.001);
        const cx = (bounds.minX + bounds.maxX) * 0.5;
        const cz = (bounds.minZ + bounds.maxZ) * 0.5;
        const px = SIZE * 0.5 + ((worldX - cx) / span) * (SIZE - 16);
        const py = SIZE * 0.5 + ((worldZ - cz) / span) * (SIZE - 16);
        return { x: px, y: py };
    };

    const screenToWorld = (sx, sy) => {
        if (!bounds) return null;
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxZ - bounds.minZ;
        const span = Math.max(w, h, 0.001);
        const cx = (bounds.minX + bounds.maxX) * 0.5;
        const cz = (bounds.minZ + bounds.maxZ) * 0.5;
        const wx = ((sx - SIZE * 0.5) / (SIZE - 16)) * span + cx;
        const wz = ((sy - SIZE * 0.5) / (SIZE - 16)) * span + cz;
        return { x: wx, z: wz };
    };

    const draw = () => {
        const b = getBounds();
        if (b) bounds = { minX: b.minX - PAD, maxX: b.maxX + PAD,
                          minZ: b.minZ - PAD, maxZ: b.maxZ + PAD };

        ctx.clearRect(0, 0, SIZE, SIZE);

        // Footprint
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Crosshair
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(SIZE / 2, 6); ctx.lineTo(SIZE / 2, SIZE - 6);
        ctx.moveTo(6, SIZE / 2); ctx.lineTo(SIZE - 6, SIZE / 2);
        ctx.stroke();

        // Hotspots
        for (const h of hotspots) {
            const p = project(h.world[0], h.world[2]);
            if (!p) continue;
            ctx.fillStyle = '#ff385c';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Camera
        const cam = getCamera();
        const cp = project(cam.x, cam.z);
        if (cp) {
            const yawRad = cam.yaw * Math.PI / 180;
            // FOV cone
            ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y);
            const rCone = 32;
            const half = (45 * Math.PI) / 180;
            ctx.arc(cp.x, cp.y, rCone, -Math.PI / 2 - yawRad - half,
                                       -Math.PI / 2 - yawRad + half);
            ctx.closePath();
            ctx.fill();

            // Heading triangle
            ctx.save();
            ctx.translate(cp.x, cp.y);
            ctx.rotate(-yawRad);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(-4.5, 4);
            ctx.lineTo(4.5, 4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }
    };

    // Tap = teleport to nearest hotspot if one is within ~10px, else to the
    // tapped XZ. Pointer events so it works on mouse + touch alike.
    const onPointer = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        let best = null, bestD = 12;
        for (const h of hotspots) {
            const p = project(h.world[0], h.world[2]);
            if (!p) continue;
            const d = Math.hypot(p.x - sx, p.y - sy);
            if (d < bestD) { bestD = d; best = h; }
        }
        if (best) {
            onTeleport({ x: best.world[0], z: best.world[2] });
        } else {
            const w = screenToWorld(sx, sy);
            if (w) onTeleport(w);
        }
    };
    canvas.addEventListener('pointerdown', onPointer);

    let raf = 0;
    const tick = () => { draw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            canvas.removeEventListener('pointerdown', onPointer);
            if (wrap.parentElement) wrap.parentElement.removeChild(wrap);
        }
    };
}
