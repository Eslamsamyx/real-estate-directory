// Shim for the engine examples' `examples/utils` module.
// Re-implements only the surface the example .mjs files use, suitable for
// running them directly in a no-build workspace via importmap.

const ABS_ROOT = '/engine/examples';
export const rootPath = ABS_ROOT;
export const deviceType = (new URLSearchParams(location.search).get('device')) || 'webgl2';

export function getQueryParams(url) {
    const q = String(url).split('?').pop().split('#')[0];
    const out = {};
    if (!q) return out;
    for (const pair of q.split('&')) {
        const [k, v] = pair.split('=');
        if (k) out[k] = v ?? '';
    }
    return out;
}

export async function fetchFile(url) {
    const res = await fetch(url);
    return res.text();
}

export async function fileImport(url) {
    return await import(/* @vite-ignore */ url);
}

export async function localImport(name) {
    const url = name.startsWith('/') || name.startsWith('http') ? name : new URL(name, location.href).toString();
    return await import(/* @vite-ignore */ url);
}

export function clearImports() { /* native ESM has no cache to clear */ }

const _listeners = {};
export function fire(name, ...args) {
    (_listeners[name] || []).forEach(fn => fn(...args));
}
export function on(name, fn) {
    (_listeners[name] = _listeners[name] || []).push(fn);
}

export function updateDeviceType() { /* no device picker in our wrapper */ }

export function parseConfig(src) {
    const config = {};
    const re = /\/\/\s*@config\s+([A-Z_]+)(?:\s+(.+))?/g;
    let m;
    while ((m = re.exec(src || ''))) {
        config[m[1]] = (m[2] ?? '').trim();
    }
    return config;
}
