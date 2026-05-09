// 3D tour modal — full-screen overlay with four tabs (Dollhouse/Walkthrough/Configure/Hotspots toggle).
// Tab renderers are loaded lazily via dynamic import to keep the initial bundle small.
import { el } from '../dom.js';
import { fmtPrice, fmtCityState } from '../format.js';

let currentTab = 'dollhouse';
let activeRenderer = null;
let listing = null;
let hotspotsOn = false;
let modal = null;
let canvas = null;
let aside = null;
let stage = null;
let splash = null;
let escHandler = null;
let tabButtons = {};
let hotspotBtn = null;

const TAB_MODULES = {
    dollhouse: () => import('./dollhouse.js'),
    walkthrough: () => import('./walkthrough.js'),
    configure: () => import('./configurator.js')
};

const TAB_LABELS = {
    dollhouse: 'Dollhouse',
    walkthrough: 'Walkthrough',
    configure: 'Configure'
};

export async function openTour(_listing) {
    if (modal) return;
    listing = _listing;
    currentTab = 'dollhouse';
    hotspotsOn = false;

    modal = el('div', { cls: 'tour-modal', attrs: { role: 'dialog', 'aria-label': '3D tour' } });
    modal.appendChild(buildHeader());

    stage = el('div', { cls: 'tour-stage' });
    canvas = el('canvas', { cls: 'tour-canvas', attrs: { id: 'tour-canvas' } });
    stage.appendChild(canvas);
    splash = buildSplash();
    stage.appendChild(splash);
    modal.appendChild(stage);

    aside = el('aside', { cls: 'tour-aside' });
    modal.appendChild(aside);

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    escHandler = (e) => { if (e.key === 'Escape') closeTour(); };
    document.addEventListener('keydown', escHandler);

    await switchTab(currentTab);
}

function buildHeader() {
    const head = el('header', { cls: 'tour-head' });

    const title = el('div', { cls: 'tour-title' });
    title.appendChild(el('div', { cls: 'tour-listing-title', text: listing.title }));
    const subText = (listing.address?.line1 || '') + ' · ' + fmtCityState(listing) + ' · ' + fmtPrice(listing.price);
    title.appendChild(el('div', { cls: 'tour-listing-sub', text: subText }));
    head.appendChild(title);

    const tabs = el('div', { cls: 'tour-tabs' });
    tabButtons = {};
    for (const id of ['dollhouse', 'walkthrough', 'configure']) {
        const btn = el('button', { cls: 'tour-tab', text: TAB_LABELS[id], attrs: { type: 'button', 'data-tab': id } });
        btn.addEventListener('click', () => switchTab(id));
        tabs.appendChild(btn);
        tabButtons[id] = btn;
    }
    head.appendChild(tabs);

    const actions = el('div', { cls: 'tour-actions' });

    hotspotBtn = el('button', { cls: 'tour-btn', text: '★ Hotspots', attrs: { type: 'button' } });
    hotspotBtn.addEventListener('click', () => {
        hotspotsOn = !hotspotsOn;
        hotspotBtn.classList.toggle('active', hotspotsOn);
        if (activeRenderer && activeRenderer.setHotspotsEnabled) {
            activeRenderer.setHotspotsEnabled(hotspotsOn);
        }
    });
    actions.appendChild(hotspotBtn);

    const fsBtn = el('button', { cls: 'tour-btn', text: 'Fullscreen', attrs: { type: 'button' } });
    fsBtn.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (modal && modal.requestFullscreen) {
            modal.requestFullscreen();
        }
    });
    actions.appendChild(fsBtn);

    const closeBtn = el('button', { cls: 'tour-btn close', text: '✕', attrs: { type: 'button', 'aria-label': 'Close' } });
    closeBtn.addEventListener('click', closeTour);
    actions.appendChild(closeBtn);

    head.appendChild(actions);
    return head;
}

function buildSplash() {
    const s = el('div', { cls: 'tour-splash' });
    s.appendChild(el('div', { cls: 'tour-spin' }));
    s.appendChild(el('div', { cls: 'tour-splash-label', text: 'Loading scene' }));
    return s;
}

async function switchTab(id) {
    currentTab = id;
    for (const k in tabButtons) {
        tabButtons[k].classList.toggle('active', k === id);
    }

    // Tear down current renderer
    if (activeRenderer && activeRenderer.destroy) {
        try { activeRenderer.destroy(); } catch (err) { console.error('[tour] destroy error', err); }
        activeRenderer = null;
    }
    aside.replaceChildren();
    aside.classList.toggle('show', id === 'configure');

    // Replace canvas — PlayCanvas apps cannot reuse canvas reliably across tabs
    const fresh = el('canvas', { cls: 'tour-canvas', attrs: { id: 'tour-canvas' } });
    canvas.replaceWith(fresh);
    canvas = fresh;

    // Show splash
    if (!stage.contains(splash)) stage.appendChild(splash);
    splash.classList.remove('hidden');
    splash.style.display = '';

    try {
        const mod = await TAB_MODULES[id]();
        if (!mod || typeof mod.start !== 'function') throw new Error('Module ' + id + ' has no start()');
        activeRenderer = await mod.start({ canvas, listing, aside, hotspotsOn });
    } catch (err) {
        console.error('[tour] tab failed to start', id, err);
        const labelEl = splash.querySelector('.tour-splash-label');
        if (labelEl) labelEl.textContent = 'Failed to load — see console';
        return;
    }

    // Hide splash
    splash.style.display = 'none';
}

function closeTour() {
    if (!modal) return;
    if (activeRenderer && activeRenderer.destroy) {
        try { activeRenderer.destroy(); } catch (err) { console.error('[tour] destroy error', err); }
    }
    activeRenderer = null;
    if (escHandler) document.removeEventListener('keydown', escHandler);
    escHandler = null;
    document.body.style.overflow = '';
    modal.remove();
    modal = null;
    canvas = null;
    aside = null;
    stage = null;
    splash = null;
    listing = null;
    tabButtons = {};
    hotspotBtn = null;
}
