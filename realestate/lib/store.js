const PREFIX = 're.';

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
    } catch (_) { return fallback; }
}

function write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
}

export function getFavorites() { return read('favorites', []); }
export function isFavorite(id) { return getFavorites().includes(id); }
export function toggleFavorite(id) {
    const list = getFavorites();
    const i = list.indexOf(id);
    const nowFavorite = i < 0;
    if (nowFavorite) list.unshift(id); else list.splice(i, 1);
    write('favorites', list);
    return nowFavorite;
}

export function pushRecent(id) {
    const list = read('recent', []).filter(r => r.id !== id);
    list.unshift({ id, ts: Date.now() });
    write('recent', list.slice(0, 10));
}
export function getRecent() { return read('recent', []); }

export function getMortgage() { return read('mortgage', { down: 20, rate: 6.5, term: 30 }); }
export function setMortgage(v) { write('mortgage', v); }

export function getContactDraft() { return read('contactDraft', {}); }
export function setContactDraft(v) { write('contactDraft', v); }
export function clearContactDraft() { write('contactDraft', {}); }

export function pushSubmission(form) {
    const list = read('contactSubmissions', []);
    list.unshift({ ...form, ts: Date.now() });
    write('contactSubmissions', list.slice(0, 20));
}
export function getSubmissions() { return read('contactSubmissions', []); }
