import { fmtPrice } from './format.js';

let mapInstance = null;
const markers = new Map();

export function initMap(container, listings, opts = {}) {
    if (!window.L) throw new Error('Leaflet not loaded — include vendor/leaflet.js + leaflet.css');
    mapInstance = L.map(container, { zoomControl: true, attributionControl: true })
        .setView([30.275, -97.745], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapInstance);
    placeMarkers(listings, opts);
    if (opts.onBoundsChange) {
        mapInstance.on('moveend', () => {
            const b = mapInstance.getBounds();
            opts.onBoundsChange([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
        });
    }
    return mapInstance;
}

export function updateMarkers(listings, opts = {}) { placeMarkers(listings, opts); }

function placeMarkers(listings, opts) {
    if (!mapInstance) return;
    for (const m of markers.values()) m.remove();
    markers.clear();

    for (const l of listings) {
        const pin = document.createElement('div');
        pin.className = 'map-pin' + (l.tour3d ? ' has-tour' : '');
        pin.textContent = fmtPrice(l.price);
        const icon = L.divIcon({ className: '', html: pin, iconSize: [60, 28], iconAnchor: [30, 28] });
        const m = L.marker([l.lat, l.lng], { icon }).addTo(mapInstance);
        m.on('click', () => { if (opts.onPinClick) opts.onPinClick(l.id); });
        markers.set(l.id, m);
    }
}

export function highlightMarker(id) {
    for (const [mid, m] of markers) {
        const e = m.getElement();
        if (!e) continue;
        e.classList.toggle('highlight', mid === id);
    }
}

export function flyTo(id, listings) {
    const l = listings.find(x => x.id === id);
    if (l && mapInstance) mapInstance.flyTo([l.lat, l.lng], 14, { duration: 0.6 });
}
