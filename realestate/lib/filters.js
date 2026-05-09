export function readFilters() {
    const params = new URLSearchParams(location.search);
    return {
        priceMin: numberOr(params.get('priceMin'), 0),
        priceMax: numberOr(params.get('priceMax'), 5_000_000),
        beds: numberOr(params.get('beds'), 0),
        baths: numberOr(params.get('baths'), 0),
        type: params.get('type') || 'any',
        tour3d: params.get('tour3d') === '1',
        sort: params.get('sort') || 'newest'
    };
}

export function writeFilters(f) {
    const params = new URLSearchParams(location.search);
    if (f.priceMin > 0) params.set('priceMin', f.priceMin); else params.delete('priceMin');
    if (f.priceMax < 5_000_000) params.set('priceMax', f.priceMax); else params.delete('priceMax');
    if (f.beds > 0) params.set('beds', f.beds); else params.delete('beds');
    if (f.baths > 0) params.set('baths', f.baths); else params.delete('baths');
    if (f.type && f.type !== 'any') params.set('type', f.type); else params.delete('type');
    if (f.tour3d) params.set('tour3d', '1'); else params.delete('tour3d');
    if (f.sort && f.sort !== 'newest') params.set('sort', f.sort); else params.delete('sort');
    const q = params.toString();
    history.replaceState(null, '', q ? '?' + q : location.pathname);
}

export function applyFilters(listings, f) {
    let out = listings.filter(l =>
        l.price >= f.priceMin && l.price <= f.priceMax &&
        l.beds >= f.beds && l.baths >= f.baths &&
        (f.type === 'any' || l.type === f.type) &&
        (!f.tour3d || !!l.tour3d)
    );
    if (f.sort === 'priceAsc')  out = out.slice().sort((a, b) => a.price - b.price);
    if (f.sort === 'priceDesc') out = out.slice().sort((a, b) => b.price - a.price);
    return out;
}

export function applyMapBbox(listings, bbox) {
    if (!bbox) return listings;
    const [s, w, n, e] = bbox;
    return listings.filter(l => l.lat >= s && l.lat <= n && l.lng >= w && l.lng <= e);
}

function numberOr(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
