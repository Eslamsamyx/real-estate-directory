# Real-estate demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Zillow-shaped multi-listing real-estate site at `/realestate/` with an Airbnb-clean visual style and a flagship 3D tour modal (Dollhouse · Walkthrough · Configure · Hotspots) — sufficiently polished to be impressive and tempting to clients evaluating PlayCanvas-powered listings.

**Architecture:** Vanilla HTML + ES modules, no bundler, no `node_modules`. Each page is a single HTML composing per-page logic from `lib/` modules. PlayCanvas is loaded via importmap from the existing `/demo/vendor/playcanvas.mjs`. Listings data is a static JS array. Persistence is `localStorage`. The 3D tour modal is a single overlay component that swaps geometry source per tab. Map uses Leaflet + OpenStreetMap.

**Tech Stack:** PlayCanvas 2.18 (vendored), Leaflet 1.9 (vendored), Inter typeface (system fallback), pure ES modules. No transpiler, no test framework — verification is "open the page and look at it" plus targeted `browser_evaluate` smoke checks via Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-05-09-realestate-site-design.md`

**Verification convention:** Every task ends with a "verify in browser" step naming the URL to open and what to look for. The static server runs at `http://127.0.0.1:4321`. If you find it down, restart with `cd /Users/eslamsamy/projects/playcanvas && python3 -m http.server 4321 --bind 127.0.0.1` (background it).

**DOM construction convention:** All DOM construction in this plan uses `document.createElement`, `textContent`, `appendChild`, and `replaceChildren`. **Do not use `innerHTML`.** This avoids XSS risk on dynamic content and matches the pattern in `/demo/examples.html`. The one exception is Leaflet's `divIcon({ html })` API which we feed an `HTMLElement` directly (Leaflet 1.9 supports this).

**Commit convention:** Workspace is not currently a git repo. Task 0 initializes one. After that, every task ends with a focused commit. Do not commit `engine/` (we deleted its `.git` to free disk, and the engine source isn't ours to track).

---

## File structure

```
/Users/eslamsamy/projects/playcanvas/realestate/
├── index.html                          # Landing + listings + map + filters
├── listing.html                        # Property detail (loads ?id=)
├── favorites.html                      # Saved listings (localStorage)
├── contact.html                        # Agent contact form
├── style.css                           # Shared site styles
├── data/
│   ├── listings.js                     # 12-item listings array
│   ├── hotspots.js                     # Flagship listing hotspots
│   └── configurator.js                 # Material swap catalog
├── lib/
│   ├── format.js                       # Currency, sqft, days-ago helpers
│   ├── store.js                        # localStorage typed wrapper
│   ├── card.js                         # Listing card factory
│   ├── nav.js                          # Top nav + footer (shared chrome)
│   ├── filters.js                      # Filter state + URL serialization
│   ├── map.js                          # Leaflet wrapper, custom price pins
│   └── tour/
│       ├── modal.js                    # 3D tour modal shell + tab switcher
│       ├── dollhouse.js                # Mesh + orbit camera
│       ├── walkthrough.js              # Splat + first-person
│       ├── configurator.js             # Material swap panel
│       └── hotspots.js                 # World-space annotations
└── vendor/
    ├── playcanvas.mjs → ../../demo/vendor/playcanvas.mjs   (symlink)
    ├── observer.mjs   → ../../demo/vendor/observer.mjs     (symlink)
    ├── leaflet.js                      # 1.9.4 vendored from CDN
    └── leaflet.css
```

---

## Phase 1 — Bootstrap

### Task 0: Initialize repo + scaffold workspace

**Files:**
- Create: `.gitignore` at workspace root
- Create: `realestate/` directory structure
- Create: `realestate/vendor/` symlinks
- Create: `realestate/vendor/leaflet.js` and `leaflet.css` (downloaded once)

- [ ] **Step 1: Initialize git in workspace root**

```bash
cd /Users/eslamsamy/projects/playcanvas && git init && git config user.name "Workspace" && git config user.email "noreply@local"
```

- [ ] **Step 2: Write `.gitignore`** at workspace root with this exact content:

```gitignore
# Engine clone — we don't track upstream source
engine/

# Brainstorm session artifacts
.superpowers/

# Playwright MCP screenshots saved at root
*.png
!realestate/**/*.png
!demo/thumbs/*.png

# Demo vendor build (3.5 MB, regeneratable)
demo/vendor/

# OS noise
.DS_Store
```

- [ ] **Step 3: Create realestate dir structure**

```bash
mkdir -p /Users/eslamsamy/projects/playcanvas/realestate/{data,lib/tour,vendor}
```

- [ ] **Step 4: Create vendor symlinks** to reuse the demo's vendored playcanvas + observer

```bash
cd /Users/eslamsamy/projects/playcanvas/realestate/vendor && \
  ln -sfn ../../demo/vendor/playcanvas.mjs playcanvas.mjs && \
  ln -sfn ../../demo/vendor/observer.mjs observer.mjs && \
  ls -la
```

Expected: two symlinks pointing into `../../demo/vendor/`.

- [ ] **Step 5: Vendor Leaflet** (single network fetch, ~190 KB total)

```bash
cd /Users/eslamsamy/projects/playcanvas/realestate/vendor && \
  curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/leaflet.js -o leaflet.js && \
  curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/leaflet.css -o leaflet.css && \
  ls -lh leaflet.*
```

Expected: `leaflet.js` ≈ 145 KB, `leaflet.css` ≈ 14 KB.

- [ ] **Step 6: Verify static server can serve the new tree**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/realestate/vendor/leaflet.js`
Expected: `200`. If down, restart server first.

- [ ] **Step 7: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && \
  git add .gitignore realestate/ && \
  git commit -m "feat(realestate): bootstrap workspace, vendor leaflet, symlink playcanvas"
```

---

### Task 1: Shared CSS + visual style baseline

**Files:**
- Create: `realestate/style.css`

- [ ] **Step 1: Write `realestate/style.css`** with the full theme. Copy verbatim:

```css
:root {
    --bg: #ffffff; --surface: #ffffff; --surface-2: #fafafa;
    --text: #1a2540; --text-2: #5a6275; --text-muted: #8a93a6;
    --accent: #ff385c; --accent-2: #e0314f;
    --border: #e5e6e8; --border-strong: #d4d6da;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
    --shadow-md: 0 6px 24px rgba(0,0,0,0.08);
    --shadow-lg: 0 14px 48px rgba(0,0,0,0.14);
    --radius-card: 12px; --radius-chip: 999px; --radius-input: 8px;
    color-scheme: light;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.5; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

/* Top nav */
.topnav { position: sticky; top: 0; z-index: 30; background: var(--surface); border-bottom: 1px solid var(--border); padding: 14px 32px; display: flex; align-items: center; gap: 28px; }
.topnav .logo { font-weight: 700; font-size: 19px; letter-spacing: -0.01em; color: var(--accent); display: flex; align-items: center; gap: 6px; }
.topnav .logo::before { content: "◈"; font-size: 22px; }
.topnav .links { display: flex; gap: 22px; font-size: 14px; font-weight: 500; }
.topnav .links a { padding: 6px 0; color: var(--text-2); }
.topnav .links a.active { color: var(--text); border-bottom: 2px solid var(--accent); }
.topnav .links a[aria-disabled="true"] { color: var(--text-muted); cursor: not-allowed; }
.topnav .right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.topnav .heart-link { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-chip); font-weight: 500; font-size: 13px; background: transparent; border: 1px solid var(--border); transition: border-color 160ms, background 160ms; }
.topnav .heart-link:hover { background: var(--surface-2); border-color: var(--border-strong); }
.topnav .heart-link .count { color: var(--accent); font-weight: 600; }
.topnav .account { width: 38px; height: 38px; border-radius: 50%; background: var(--surface-2); border: 1px solid var(--border); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-2); }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 22px; border-radius: var(--radius-chip); font-weight: 600; font-size: 14px; border: 1px solid transparent; cursor: pointer; transition: background 160ms, transform 80ms; }
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: var(--accent-2); }
.btn-primary:active { transform: scale(0.98); }
.btn-ghost { background: transparent; border-color: var(--border-strong); color: var(--text); }
.btn-ghost:hover { background: var(--surface-2); }

/* Chips */
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid var(--border-strong); border-radius: var(--radius-chip); background: var(--surface); font-size: 13px; font-weight: 500; color: var(--text); cursor: pointer; transition: background 140ms, border-color 140ms; user-select: none; }
.chip:hover { background: var(--surface-2); }
.chip.active { background: var(--text); color: white; border-color: var(--text); }

/* Listing card */
.lcard { display: block; cursor: pointer; color: inherit; position: relative; transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.lcard:hover { transform: translateY(-2px); }
.lcard .photo { aspect-ratio: 16/11; border-radius: var(--radius-card); overflow: hidden; position: relative; background: var(--surface-2); }
.lcard .photo .gradient { width: 100%; height: 100%; }
.lcard .heart { position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.92); border: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; color: var(--text-2); backdrop-filter: blur(6px); transition: transform 120ms, color 160ms; }
.lcard .heart:hover { transform: scale(1.08); }
.lcard .heart.on { color: var(--accent); }
.lcard .badge3d { position: absolute; top: 12px; left: 12px; padding: 5px 10px; border-radius: var(--radius-chip); background: rgba(255,255,255,0.95); font-size: 11px; font-weight: 600; color: var(--text); letter-spacing: 0.05em; backdrop-filter: blur(6px); display: inline-flex; align-items: center; gap: 4px; }
.lcard .badge3d::before { content: "★"; color: var(--accent); }
.lcard .meta { padding: 12px 4px 0; }
.lcard .title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lcard .title { font-weight: 600; font-size: 15px; }
.lcard .price { font-weight: 600; font-size: 15px; }
.lcard .addr { color: var(--text-2); font-size: 13.5px; margin-top: 2px; }
.lcard .specs { color: var(--text-2); font-size: 13.5px; margin-top: 4px; display: flex; gap: 4px; align-items: center; }

/* Section heading */
.section-h { display: flex; align-items: baseline; justify-content: space-between; margin: 36px 0 16px; }
.section-h h2 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
.section-h .meta { color: var(--text-2); font-size: 14px; }

/* Layout helpers */
.container { max-width: 1320px; margin: 0 auto; padding: 0 32px; }
.container-narrow { max-width: 880px; margin: 0 auto; padding: 0 32px; }
.grid-listings { display: grid; gap: 28px 24px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.spacer { height: 48px; }

/* Footer */
.foot { border-top: 1px solid var(--border); padding: 36px 32px; margin-top: 80px; color: var(--text-muted); font-size: 13px; display: flex; gap: 22px; justify-content: space-between; flex-wrap: wrap; }
.foot a { color: var(--text-2); }
.foot a:hover { color: var(--text); }

/* Empty state */
.empty { text-align: center; padding: 80px 24px; color: var(--text-2); }
.empty h3 { color: var(--text); font-size: 20px; margin: 0 0 8px; font-weight: 600; }
.empty p { margin: 0 auto 22px; max-width: 420px; }

/* Mobile */
@media (max-width: 720px) {
    .topnav { padding: 12px 16px; gap: 12px; }
    .topnav .links { display: none; }
    .container, .container-narrow { padding: 0 16px; }
    .grid-listings { gap: 22px 16px; grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verify** — `wc -l /Users/eslamsamy/projects/playcanvas/realestate/style.css`. Expected: ≥ 100 lines.

- [ ] **Step 3: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/style.css && git commit -m "feat(realestate): shared visual style — Airbnb-clean theme"
```

---

### Task 2: Format helpers

**Files:**
- Create: `realestate/lib/format.js`

- [ ] **Step 1: Write `realestate/lib/format.js`**

```js
export function fmtPrice(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/\.0+$/, '') + 'M';
    if (n >= 100_000) return '$' + Math.round(n / 1_000) + 'K';
    return '$' + n.toLocaleString('en-US');
}
export function fmtPriceFull(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    return '$' + n.toLocaleString('en-US');
}
export function fmtSqft(n) { return Number(n).toLocaleString('en-US') + ' sqft'; }
export function fmtDaysAgo(d) {
    if (d <= 0) return 'today';
    if (d === 1) return '1 day ago';
    if (d < 30) return d + ' days ago';
    if (d < 60) return '1 month ago';
    return Math.round(d / 30) + ' months ago';
}
export function fmtMonthly(n) { return '$' + Math.round(n).toLocaleString('en-US') + ' / mo'; }
export function fmtSpecs(l) { return l.beds + ' bd · ' + l.baths + ' ba · ' + l.sqft.toLocaleString('en-US') + ' sqft'; }
export function fmtCityState(l) { return l.address.city + ', ' + l.address.state + ' ' + l.address.zip; }
```

- [ ] **Step 2: Smoke test** in dev console at any localhost URL:

```js
const m = await import('/realestate/lib/format.js');
console.log(m.fmtPrice(1295000), m.fmtPrice(420000), m.fmtPrice(75000));
// Expect: $1.3M $420K $75,000
```

- [ ] **Step 3: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/format.js && git commit -m "feat(realestate): format helpers — currency, sqft, days-ago"
```

---

### Task 3: localStorage store

**Files:**
- Create: `realestate/lib/store.js`

- [ ] **Step 1: Write `realestate/lib/store.js`**

```js
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
    if (i >= 0) list.splice(i, 1); else list.unshift(id);
    write('favorites', list);
    return list.includes(id);
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
```

- [ ] **Step 2: Smoke test** in dev console:

```js
const s = await import('/realestate/lib/store.js');
s.toggleFavorite('L001'); console.log(s.getFavorites());  // ['L001']
s.toggleFavorite('L001'); console.log(s.getFavorites());  // []
```

- [ ] **Step 3: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/store.js && git commit -m "feat(realestate): localStorage store — favorites, mortgage, contact"
```

---

### Task 4: Listings dataset

**Files:**
- Create: `realestate/data/listings.js`

- [ ] **Step 1: Write `realestate/data/listings.js`** — 12 listings, one flagship (`L001`) with `tour3d`, all others without. Plausible Austin TX coordinates and rotating gradient colors. Copy verbatim:

```js
export const LISTINGS = [
    {
        id: 'L001', title: 'Hill Country Modern',
        address: { line1: '2348 Maple Ridge Dr', city: 'Austin', state: 'TX', zip: '78749' },
        lat: 30.2225, lng: -97.8493,
        price: 1295000, beds: 4, baths: 3, sqft: 2840,
        type: 'house', yearBuilt: 2021, daysOnMarket: 6,
        description: "A light-filled modernist retreat tucked into the Hill Country canopy. Walls of sliding glass open the great room onto a covered lanai with limestone fireplace. The chef's kitchen anchors an open plan with a 12-foot waterfall island, soft-close cabinetry, and a butler's pantry. The primary suite reads as a private wing — wood-panel ceiling, oversized walk-in, and a spa bath with steam shower. A flexible study can serve as a fifth bedroom. Energy-efficient mechanicals, owned solar, and EV-ready garage round out a home that feels current and serious.",
        features: ['Quartz waterfall island', '12-ft ceilings in great room', 'Owned solar (8.4 kW)', 'EV-ready 2-car garage', 'Smart thermostat & blinds', "Butler's pantry", 'Walk-in primary closet', 'Outdoor lanai with limestone fireplace', 'Oak hardwood floors', 'Dedicated office'],
        hoaMonthly: 0, lotSqft: 9148,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #f8d4b8 0%, #f5b78c 50%, #e89770 100%)',
        tour3d: {
            splat: '/engine/examples/assets/splats/apartment.sog',
            mesh: '/engine/examples/assets/models/apartment.glb',
            hotspots: '/realestate/data/hotspots.js'
        }
    },
    {
        id: 'L002', title: 'East Austin Bungalow',
        address: { line1: '904 Cesar Chavez St', city: 'Austin', state: 'TX', zip: '78702' },
        lat: 30.2616, lng: -97.7245,
        price: 689000, beds: 3, baths: 2, sqft: 1620,
        type: 'house', yearBuilt: 1948, daysOnMarket: 14,
        description: 'Restored 1948 craftsman bungalow in the heart of East Austin. Original heart-pine floors, beadboard ceilings, and a wraparound porch. The kitchen has been opened to a sunny breakfast nook with built-in banquette. A detached studio in the back makes a dreamy guesthouse or music room.',
        features: ['Original heart-pine floors', 'Wraparound porch', 'Detached 280 sqft studio', 'Walk to East 6th'],
        hoaMonthly: 0, lotSqft: 5400,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #d8e3ce, #a3c2a0)'
    },
    {
        id: 'L003', title: 'Zilker Mid-Century',
        address: { line1: '1812 Bluebonnet Ln', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2589, lng: -97.7760,
        price: 1875000, beds: 4, baths: 3, sqft: 3120,
        type: 'house', yearBuilt: 1962, daysOnMarket: 22,
        description: 'A faithful mid-century restoration in coveted Zilker. Vaulted T&G ceilings, walls of glass, and a sunken living room with original floor-to-ceiling fireplace. New systems, new roof, but every period detail preserved.',
        features: ['Original sunken living room', 'Vaulted tongue-and-groove ceiling', 'Pebble pool', 'Half-acre lot'],
        hoaMonthly: 0, lotSqft: 21780,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #c7e3f5, #88c5e8)'
    },
    {
        id: 'L004', title: 'Hyde Park Townhouse',
        address: { line1: '4112 Avenue G', city: 'Austin', state: 'TX', zip: '78751' },
        lat: 30.3076, lng: -97.7280,
        price: 745000, beds: 3, baths: 2, sqft: 1850,
        type: 'townhouse', yearBuilt: 2019, daysOnMarket: 4,
        description: 'Modern three-story townhouse in walkable Hyde Park. Open ground-floor great room, two bedrooms upstairs, and a private rooftop terrace with downtown skyline views.',
        features: ['Rooftop terrace with skyline view', 'Two-car attached garage', '4 blocks to Speedway shops'],
        hoaMonthly: 280, lotSqft: 1200,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #f5d0e0, #e8a4c4)'
    },
    {
        id: 'L005', title: 'Downtown High-Rise',
        address: { line1: '301 W 5th St #2104', city: 'Austin', state: 'TX', zip: '78701' },
        lat: 30.2680, lng: -97.7480,
        price: 925000, beds: 2, baths: 2, sqft: 1280,
        type: 'condo', yearBuilt: 2017, daysOnMarket: 9,
        description: '21st-floor corner unit with floor-to-ceiling windows wrapping the southwest face. Building amenities include 24-hour concierge, rooftop pool, fitness, and dog run.',
        features: ['Floor-to-ceiling windows', '21st-floor corner', 'Rooftop pool', '24-hr concierge'],
        hoaMonthly: 945, lotSqft: 0,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #cdd6e0, #8b9aac)'
    },
    {
        id: 'L006', title: 'Tarrytown Estate',
        address: { line1: '2900 W 35th St', city: 'Austin', state: 'TX', zip: '78703' },
        lat: 30.3023, lng: -97.7660,
        price: 3850000, beds: 5, baths: 5, sqft: 5640,
        type: 'house', yearBuilt: 2008, daysOnMarket: 38,
        description: "Stately Tarrytown estate on a wooded acre. Formal living and dining, chef's kitchen, paneled study, and a primary wing on the main floor. Pool, pool house, and mature live oaks.",
        features: ['Wooded 1.04 acre lot', 'Pool + pool house', 'Wine room', 'Three-car garage'],
        hoaMonthly: 0, lotSqft: 45302,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #f0e2c8, #d4b88c)'
    },
    {
        id: 'L007', title: 'South Lamar Loft',
        address: { line1: '1705 S Lamar Blvd #312', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2519, lng: -97.7720,
        price: 525000, beds: 1, baths: 1, sqft: 920,
        type: 'condo', yearBuilt: 2014, daysOnMarket: 11,
        description: 'Industrial loft with exposed steel, polished concrete, and 14-foot ceilings. Two-block walk to Lamar restaurants and music venues.',
        features: ['14-ft exposed steel ceilings', 'Polished concrete floors', 'Walk to Continental Club'],
        hoaMonthly: 410, lotSqft: 0,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #d8d4c8, #a89c84)'
    },
    {
        id: 'L008', title: 'Mueller Family Home',
        address: { line1: '4506 Berkman Dr', city: 'Austin', state: 'TX', zip: '78723' },
        lat: 30.3036, lng: -97.7022,
        price: 875000, beds: 4, baths: 3, sqft: 2410,
        type: 'house', yearBuilt: 2015, daysOnMarket: 18,
        description: 'New-urbanist Mueller home steps from the lake park and weekend farmers market. Front porch, mudroom, family-room-centered floor plan, and finished bonus room above the garage.',
        features: ['Walk to Mueller Lake Park', 'Bonus room over garage', 'Front porch + alley garage'],
        hoaMonthly: 65, lotSqft: 4200,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #c2dec0, #84b482)'
    },
    {
        id: 'L009', title: 'Barton Hills Cottage',
        address: { line1: '2210 Inwood Pl', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2415, lng: -97.7900,
        price: 615000, beds: 2, baths: 1, sqft: 1180,
        type: 'house', yearBuilt: 1956, daysOnMarket: 7,
        description: 'Charming 1950s cottage on a wooded lot in Barton Hills. Updated kitchen, screened porch, and a backyard that disappears into the greenbelt.',
        features: ['Backs to greenbelt', 'Screened porch', 'Mature oaks'],
        hoaMonthly: 0, lotSqft: 7800,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #d4d8b4, #a4ad7b)'
    },
    {
        id: 'L010', title: 'Domain Northside Penthouse',
        address: { line1: '3101 Kramer Ln #PH3', city: 'Austin', state: 'TX', zip: '78758' },
        lat: 30.3963, lng: -97.7240,
        price: 2150000, beds: 3, baths: 3, sqft: 2680,
        type: 'condo', yearBuilt: 2020, daysOnMarket: 28,
        description: "Penthouse with 1,200 sqft of private terrace overlooking the Domain. Chef's kitchen by Bulthaup, primary suite with dressing room, building amenities include lap pool and lounge.",
        features: ['1,200 sqft private terrace', 'Bulthaup kitchen', 'Two parking spots', 'Lap pool'],
        hoaMonthly: 1380, lotSqft: 0,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #c8d4e0, #8a9fb8)'
    },
    {
        id: 'L011', title: 'Travis Heights Bungalow',
        address: { line1: '1311 Mission Ridge', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2495, lng: -97.7470,
        price: 1095000, beds: 3, baths: 2, sqft: 1980,
        type: 'house', yearBuilt: 1939, daysOnMarket: 12,
        description: 'Travis Heights bungalow with thoughtful renovations. Original tile bath, weathered pine paneling in the den, and a deep front porch that catches the south breeze.',
        features: ['Original tile bath', 'Front porch with hill views', 'Walk to South Congress'],
        hoaMonthly: 0, lotSqft: 6600,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #e8d4c0, #c8a884)'
    },
    {
        id: 'L012', title: 'Westlake Hilltop',
        address: { line1: '4408 Westlake Dr', city: 'Austin', state: 'TX', zip: '78746' },
        lat: 30.3140, lng: -97.8290,
        price: 2640000, beds: 5, baths: 4, sqft: 4120,
        type: 'house', yearBuilt: 2013, daysOnMarket: 45,
        description: 'Westlake hilltop with western lake views. Open great room, screened-in outdoor living, infinity pool with lake view, and a separate two-bedroom guest casita.',
        features: ['Lake views', 'Infinity pool', 'Two-bedroom guest casita', 'Three-car garage'],
        hoaMonthly: 0, lotSqft: 32670,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #c2d8e8, #7ea4c0)'
    }
];

export function findListing(id) {
    return LISTINGS.find(l => l.id === id) || null;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/data/listings.js && git commit -m "feat(realestate): 12 mock Austin listings with one flagship 3D tour"
```

---

### Task 5: Listing card component

**Files:**
- Create: `realestate/lib/card.js`

- [ ] **Step 1: Write `realestate/lib/card.js`** — pure DOM (no `innerHTML`):

```js
import { fmtPrice, fmtSpecs, fmtCityState } from './format.js';
import { isFavorite, toggleFavorite } from './store.js';

function el(tag, props) {
    const e = document.createElement(tag);
    if (props?.cls) e.className = props.cls;
    if (props?.text != null) e.textContent = props.text;
    if (props?.attrs) for (const k in props.attrs) e.setAttribute(k, props.attrs[k]);
    if (props?.style) for (const k in props.style) e.style[k] = props.style[k];
    return e;
}

export function buildCard(listing) {
    const a = el('a', { cls: 'lcard', attrs: { href: './listing.html?id=' + listing.id } });

    const photo = el('div', { cls: 'photo' });
    photo.appendChild(el('div', { cls: 'gradient', style: { background: listing.heroColor } }));

    if (listing.tour3d) photo.appendChild(el('span', { cls: 'badge3d', text: '3D Tour' }));

    const heart = el('button', {
        cls: 'heart' + (isFavorite(listing.id) ? ' on' : ''),
        attrs: { 'aria-label': 'Save listing', type: 'button' }
    });
    heart.textContent = isFavorite(listing.id) ? '♥' : '♡';
    heart.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const on = toggleFavorite(listing.id);
        heart.classList.toggle('on', on);
        heart.textContent = on ? '♥' : '♡';
        window.dispatchEvent(new CustomEvent('favorites-changed'));
    });
    photo.appendChild(heart);
    a.appendChild(photo);

    const meta = el('div', { cls: 'meta' });
    const titleRow = el('div', { cls: 'title-row' });
    titleRow.appendChild(el('span', { cls: 'title', text: listing.title }));
    titleRow.appendChild(el('span', { cls: 'price', text: fmtPrice(listing.price) }));
    meta.appendChild(titleRow);
    meta.appendChild(el('div', { cls: 'addr', text: listing.address.line1 + ', ' + fmtCityState(listing) }));
    meta.appendChild(el('div', { cls: 'specs', text: fmtSpecs(listing) }));
    a.appendChild(meta);
    return a;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/card.js && git commit -m "feat(realestate): listing card component with heart toggle"
```

---

### Task 6: Top nav component

**Files:**
- Create: `realestate/lib/nav.js`

- [ ] **Step 1: Write `realestate/lib/nav.js`**

```js
import { getFavorites } from './store.js';

function el(tag, props, children) {
    const e = document.createElement(tag);
    if (props?.cls) e.className = props.cls;
    if (props?.text != null) e.textContent = props.text;
    if (props?.attrs) for (const k in props.attrs) e.setAttribute(k, props.attrs[k]);
    if (children) for (const c of children) if (c) e.appendChild(c);
    return e;
}

export function mountNav(activePage) {
    const target = document.getElementById('topnav');
    if (!target) return;

    const logo = el('a', { cls: 'logo', text: 'Domus', attrs: { href: './index.html' } });
    const links = el('div', { cls: 'links' }, [
        el('a', { text: 'Buy', cls: activePage === 'index' ? 'active' : '', attrs: { href: './index.html' } }),
        el('a', { text: 'Rent', attrs: { 'aria-disabled': 'true', href: '#' } }),
        el('a', { text: 'Sell', attrs: { 'aria-disabled': 'true', href: '#' } })
    ]);

    const heartLink = el('a', {
        cls: 'heart-link' + (activePage === 'favorites' ? ' active' : ''),
        attrs: { href: './favorites.html' }
    });
    heartLink.appendChild(document.createTextNode('♥ '));
    const heartCount = el('span', { cls: 'count', text: String(getFavorites().length) });
    heartLink.appendChild(heartCount);

    const account = el('div', { cls: 'account', text: 'JD', attrs: { title: 'Demo only — no real account' } });
    const right = el('div', { cls: 'right' }, [heartLink, account]);

    target.replaceChildren(logo, links, right);

    window.addEventListener('favorites-changed', () => {
        heartCount.textContent = String(getFavorites().length);
    });
}

export function mountFooter() {
    const target = document.getElementById('foot');
    if (!target) return;
    const left = el('div', { text: 'Domus · demo built on PlayCanvas · ' + new Date().getFullYear() });
    const right = el('div');
    right.appendChild(el('a', { text: 'Engine examples', attrs: { href: '/demo/examples.html' } }));
    right.appendChild(document.createTextNode(' · '));
    right.appendChild(el('a', { text: 'Open splat tour', attrs: { href: '/demo/walkthrough.html' } }));
    right.appendChild(document.createTextNode(' · '));
    right.appendChild(el('a', { text: 'About this demo', attrs: { href: '#' } }));
    target.replaceChildren(left, right);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/nav.js && git commit -m "feat(realestate): shared top nav + footer with favorites badge"
```

---

## Phase 2 — Index page

The full index page (Tasks 7–11) is one large file with three iterations: skeleton → filters → map. To avoid duplicating ~250 lines of HTML across three plan tasks, **the implementation produces three commits but writes the file three times in full**, each time being the complete current state.

Each Task 7–11 has the same structure:
1. **Step 1** — Write the complete `realestate/index.html` with the version-appropriate features.
2. **Step 2** — Verify in browser at the appropriate URL.
3. **Step 3** — Commit.

Code for the **final** version of `index.html` (after Task 11) appears below in the §"Index page final" appendix; intermediate versions are subsets — the agent simply omits or stubs the not-yet-implemented blocks.

### Task 7: Index page skeleton

- [ ] Write `realestate/index.html` with: top nav, hero, search bar, listings grid (no filters, no map). Use the §Index page final appendix code below but **omit** the `<section class="filters-bar">` block, the layout-toggle div, the map-pane, and remove the related script blocks (filters wiring, layout toggle, leaflet imports). Keep the imports limited to `LISTINGS`, `buildCard`, `mountNav`, `mountFooter`. Result count is hardcoded.

- [ ] Verify: `http://127.0.0.1:4321/realestate/index.html` shows nav, hero, 12-card grid.

- [ ] Commit: `feat(realestate): index page with hero + listings grid`

---

### Task 8: Filter state + URL serialization

**Files:** Create `realestate/lib/filters.js`

- [ ] **Step 1: Write `realestate/lib/filters.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/filters.js && git commit -m "feat(realestate): filter state with URL serialization"
```

---

### Task 9: Filters bar UI on index

- [ ] Rewrite `realestate/index.html` adding the `<section class="filters-bar">` markup (price slider, beds chips, type chips, 3D-tour toggle, sort dropdown) and the wiring script. Use the §Index page final appendix as the target, but **omit** the layout-toggle and map-pane (those land in Task 11).

- [ ] Verify `http://127.0.0.1:4321/realestate/index.html?beds=4&type=house` shows only L001/L006/L008/L012.

- [ ] Commit: `feat(realestate): filter bar with price/beds/type/3D-only + URL state`

---

### Task 10: Map module

**Files:** Create `realestate/lib/map.js`

- [ ] **Step 1: Write `realestate/lib/map.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/map.js && git commit -m "feat(realestate): Leaflet map module with price-pill pins"
```

---

### Task 11: Map view + grid/map/split toggle on index

- [ ] Rewrite `realestate/index.html` to the **final** version below (in §Index page final appendix). Includes Leaflet head, layout toggle, map-pane, full script with `initMap`/`updateMarkers`/`highlightMarker`/`flyTo`.

- [ ] Verify open `http://127.0.0.1:4321/realestate/index.html`. Filter bar, hero, split layout (cards left, map right), 12 pins (1 in coral). Toggle Grid/Split/Map.

- [ ] Commit: `feat(realestate): map view + grid/split/map toggle`

---

## Phase 3 — Listing detail

### Task 12: Listing detail page (no 3D yet)

**Files:** Create `realestate/listing.html`

- [ ] **Step 1: Write the full file** (DOM-only, no innerHTML). See §Listing detail page appendix below for the complete file.

- [ ] **Step 2: Verify**

Open `http://127.0.0.1:4321/realestate/listing.html?id=L001` — photo grid, "View 3D tour" CTA (placeholder alert until Task 15), stat row, description, features, neighborhood map, mortgage calc, agent card, similar listings.

Open `?id=L007` — no "View 3D tour" CTA.

- [ ] **Step 3: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/listing.html && git commit -m "feat(realestate): listing detail page with hero, calc, agent, similar"
```

---

## Phase 4 — Account flows

### Task 13: Favorites page

**Files:** Create `realestate/favorites.html`

- [ ] **Step 1: Write `realestate/favorites.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Favorites · Domus</title>
    <link rel="stylesheet" href="./style.css" />
</head>
<body>
    <nav class="topnav" id="topnav"></nav>
    <main class="container">
        <h1 style="font-size: 30px; font-weight: 700; margin: 32px 0 8px;">Your favorites</h1>
        <p id="count" style="color: var(--text-2); margin: 0 0 24px;"></p>
        <div id="content"></div>
    </main>
    <div class="spacer"></div>
    <footer class="foot" id="foot"></footer>
    <script type="module">
        import { LISTINGS } from './data/listings.js';
        import { buildCard } from './lib/card.js';
        import { mountNav, mountFooter } from './lib/nav.js';
        import { getFavorites } from './lib/store.js';

        mountNav('favorites');
        mountFooter();

        function el(tag, props) {
            const e = document.createElement(tag);
            if (props?.cls) e.className = props.cls;
            if (props?.text != null) e.textContent = props.text;
            if (props?.attrs) for (const k in props.attrs) e.setAttribute(k, props.attrs[k]);
            return e;
        }

        function render() {
            const ids = getFavorites();
            const list = ids.map(id => LISTINGS.find(l => l.id === id)).filter(Boolean);
            const content = document.getElementById('content');
            const count = document.getElementById('count');
            content.replaceChildren();
            if (list.length === 0) {
                count.textContent = 'No saved homes yet.';
                const empty = el('div', { cls: 'empty' });
                empty.appendChild(el('h3', { text: 'Heart any home to save it' }));
                empty.appendChild(el('p', { text: 'Saved homes show up here so you can compare them later.' }));
                empty.appendChild(el('a', { cls: 'btn btn-primary', text: 'Browse listings', attrs: { href: './index.html' } }));
                content.appendChild(empty);
                return;
            }
            count.textContent = list.length + ' saved ' + (list.length === 1 ? 'home' : 'homes');
            const grid = el('div', { cls: 'grid-listings' });
            for (const l of list) grid.appendChild(buildCard(l));
            content.appendChild(grid);
        }
        render();
        window.addEventListener('favorites-changed', render);
    </script>
</body>
</html>
```

- [ ] **Step 2: Verify** — empty state if no favorites; heart on index, return — appears.

- [ ] **Step 3: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/favorites.html && git commit -m "feat(realestate): favorites page with empty state"
```

---

### Task 14: Contact page

**Files:** Create `realestate/contact.html` — see §Contact page appendix below for full file.

- [ ] Write file. Verify form pre-fills with property reference; submit shows success and "Recent inquiries" list.
- [ ] Commit: `feat(realestate): contact form with draft persistence + recent list`

---

## Phase 5 — 3D tour modal

### Task 15: Modal shell + tab switcher

**Files:**
- Create: `realestate/lib/tour/modal.js`
- Modify: `realestate/style.css` (append modal CSS)
- Modify: `realestate/listing.html` (wire CTA)

- [ ] **Step 1: Write `realestate/lib/tour/modal.js`** — see §Tour modal shell appendix.

- [ ] **Step 2: Append modal CSS** — see §Tour modal CSS appendix.

- [ ] **Step 3: Wire CTA in `realestate/listing.html`** — replace the placeholder alert with:

```js
        const cta = document.getElementById('tour-cta');
        if (cta) cta.addEventListener('click', async () => {
            const { openTour } = await import('./lib/tour/modal.js');
            await openTour(l);
        });
```

- [ ] **Step 4: Verify** — open L001 listing, click "View 3D tour". Modal opens with header + tabs. Stage area shows splash, then "tab failed to start" in console (renderers next tasks). Esc closes.

- [ ] **Step 5: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && git add realestate/lib/tour/modal.js realestate/style.css realestate/listing.html && git commit -m "feat(realestate): 3D tour modal shell with tab switcher"
```

---

### Task 16: Dollhouse tab

**Files:** Create `realestate/lib/tour/dollhouse.js`

- [ ] Write file — see §Dollhouse tab appendix. Function signature: `export async function start({ canvas, listing, hotspotsOn })`. Returns `{ setHotspotsEnabled, destroy }`.

- [ ] Verify: open L001 → 3D tour → Dollhouse default. Apartment mesh rotates with PBR + IBL.

- [ ] Commit: `feat(realestate): dollhouse tab — mesh + orbit camera + IBL`

---

### Task 17: Walkthrough tab

**Files:** Create `realestate/lib/tour/walkthrough.js`

- [ ] Write file — see §Walkthrough tab appendix. Same signature as dollhouse.

- [ ] Verify: switch to Walkthrough. Click canvas → pointer locks → WASD moves through splat. Esc releases.

- [ ] Commit: `feat(realestate): walkthrough tab — splat + first-person + touch`

---

### Task 18: Configurator tab

**Files:**
- Create: `realestate/data/configurator.js`
- Create: `realestate/lib/tour/configurator.js`
- Modify: `realestate/style.css` (append configurator CSS)

- [ ] Write `data/configurator.js` — see §Configurator data appendix.
- [ ] Write `lib/tour/configurator.js` — see §Configurator tab appendix. Signature: `start({ canvas, listing, aside, hotspotsOn })`.
- [ ] Append configurator CSS — see §Configurator CSS appendix.
- [ ] Verify: open Configure. Side panel shows wall/floor/counter swatches; clicks update mesh in real time.
- [ ] Commit: `feat(realestate): configurator tab — material swap with side panel`

---

### Task 19: Hotspots overlay

**Files:**
- Create: `realestate/data/hotspots.js`
- Create: `realestate/lib/tour/hotspots.js`
- Modify: `realestate/lib/tour/dollhouse.js`, `walkthrough.js`, `configurator.js`
- Modify: `realestate/style.css` (append hotspot CSS)

- [ ] **Step 1: Write `realestate/data/hotspots.js`**

```js
export const HOTSPOTS = [
    { id: 'h1', world: [0.0, 1.6, 0.0],  title: '12-ft ceilings',         body: 'Vaulted ceilings throughout the great room.' },
    { id: 'h2', world: [1.4, 1.0, -0.3], title: 'Quartz countertop',      body: 'Continuous waterfall edge, 2024 reno.' },
    { id: 'h3', world: [-1.6, 1.4, 0.4], title: 'View of garden',         body: 'Floor-to-ceiling glass to the courtyard.' },
    { id: 'h4', world: [0.6, 0.5, 1.8],  title: 'Dining alcove',          body: 'Built-in banquette seats six.' },
    { id: 'h5', world: [-0.4, 0.4, -1.4], title: 'Living-room fireplace', body: 'Limestone-clad gas fireplace, 2024.' }
];
```

- [ ] **Step 2: Write `realestate/lib/tour/hotspots.js`**

```js
import * as pc from '../../vendor/playcanvas.mjs';

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

export function createHotspotsLayer({ canvas, camera, hotspots, enabled }) {
    const layer = el('div', 'hotspots-layer');
    layer.style.cssText = 'position:absolute; inset:0; pointer-events:none; overflow:hidden;';
    canvas.parentElement.appendChild(layer);

    const items = hotspots.map((h, i) => {
        const wrap = el('div', 'hotspot');
        const dot = el('button', 'hs-dot', String(i + 1));
        dot.type = 'button';
        const card = el('div', 'hs-card');
        card.appendChild(el('h4', 'hs-title', h.title));
        card.appendChild(el('p', 'hs-body', h.body));
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
```

- [ ] **Step 3: Append hotspot CSS** — see §Hotspot CSS appendix.

- [ ] **Step 4: Modify dollhouse.js / configurator.js** — before `app.start()`, insert:

```js
    const { HOTSPOTS } = await import('../../data/hotspots.js');
    const { createHotspotsLayer } = await import('./hotspots.js');
    const hsLayer = createHotspotsLayer({ canvas, camera, hotspots: HOTSPOTS, enabled: hotspotsOn });
```

Replace the returned `setHotspotsEnabled(_) { }` with `setHotspotsEnabled(on) { hsLayer.setEnabled(on); },`. Inside `destroy()`, add `hsLayer.destroy();` immediately before `app.destroy();`.

- [ ] **Step 5: Modify walkthrough.js** — splat is rotated 180° on X, so flip y/z for hotspots:

```js
    const { HOTSPOTS } = await import('../../data/hotspots.js');
    const { createHotspotsLayer } = await import('./hotspots.js');
    const flipped = HOTSPOTS.map(h => ({ ...h, world: [h.world[0], -h.world[1], -h.world[2]] }));
    const hsLayer = createHotspotsLayer({ canvas, camera, hotspots: flipped, enabled: hotspotsOn });
```

Same return + destroy updates.

- [ ] **Step 6: Verify** — open modal, click "★ Hotspots" — five numbered dots appear over key features. Hover/click any to expand its card. Toggle persists across tab switches.

- [ ] **Step 7: Commit**

```bash
cd /Users/eslamsamy/projects/playcanvas && \
  git add realestate/data/hotspots.js realestate/lib/tour/hotspots.js realestate/lib/tour/dollhouse.js realestate/lib/tour/walkthrough.js realestate/lib/tour/configurator.js realestate/style.css && \
  git commit -m "feat(realestate): hotspots overlay across all 3D tabs"
```

---

## Phase 6 — Polish & QA

### Task 20: Final QA pass

- [ ] **Step 1: Smoke check**

```bash
for path in \
  /realestate/index.html \
  '/realestate/index.html?beds=4&type=house' \
  /realestate/listing.html?id=L001 \
  /realestate/listing.html?id=L007 \
  /realestate/favorites.html \
  /realestate/contact.html?id=L001; do
  curl -s -o /dev/null -w "%{http_code}  $path\n" "http://127.0.0.1:4321${path}"
done
```

Expected all `200`.

- [ ] **Step 2: Manual browser checklist**

- [ ] Index — top nav, hero, filter bar, split layout, 12 cards + 12 pins (1 coral), Grid/Split/Map toggle, hover card highlights pin
- [ ] Filter persistence — `?beds=3&type=condo` survives reload
- [ ] Heart toggle — coral after click, persists, appears in favorites
- [ ] Listing detail (L001) — photos, CTA, stat row, mortgage calc input → output, agent send-message link
- [ ] Listing detail (L007) — no CTA
- [ ] 3D tour — Dollhouse rotates, Walkthrough first-person works, Configure swaps materials, Hotspots toggle works
- [ ] Favorites — empty state when none; grid otherwise
- [ ] Contact — form submit → success card, recent inquiries list
- [ ] Mobile (≤720px) — nav links collapse, single-column grid, modal stacked

- [ ] **Step 3: Fix any bugs.** Each fix is its own `fix(realestate): …` commit.

- [ ] **Step 4: Tag**

```bash
cd /Users/eslamsamy/projects/playcanvas && git tag realestate-v1 && git log --oneline | head -25
```

---

## Appendices (full code dumps)

### §Index page final (Task 11 target)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Domus · Find your home</title>
    <link rel="stylesheet" href="./style.css" />
    <link rel="stylesheet" href="./vendor/leaflet.css" />
    <script src="./vendor/leaflet.js" defer></script>
    <style>
        .hero { padding: 56px 0 32px; text-align: center; }
        .hero h1 { font-size: 38px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 12px; }
        .hero p { color: var(--text-2); font-size: 16px; margin: 0 0 28px; }
        .search-bar { max-width: 640px; margin: 0 auto; display: flex; align-items: center; background: white; border: 1px solid var(--border-strong); border-radius: var(--radius-chip); padding: 6px 6px 6px 22px; box-shadow: var(--shadow-sm); }
        .search-bar input { flex: 1; border: 0; outline: 0; font-size: 15px; font-family: inherit; padding: 12px 0; background: transparent; }
        .search-bar button { padding: 12px 22px; }
        .result-count { color: var(--text-2); font-size: 14px; margin: 0; }
        .filters-bar { position: sticky; top: 65px; z-index: 20; background: rgba(255,255,255,0.94); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 14px 0; margin-bottom: 24px; }
        .filters-row { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: thin; }
        .filters-row .divider { width: 1px; height: 22px; background: var(--border); }
        .filters-row #price-range { -webkit-appearance: none; width: 140px; height: 4px; background: var(--border-strong); border-radius: 2px; outline: none; }
        .filters-row #price-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--accent); cursor: pointer; }
        .filters-row .label-tiny { font-size: 11px; letter-spacing: 0.06em; color: var(--text-muted); text-transform: uppercase; margin-right: 6px; }
        .filters-row #price-display { font-size: 13px; font-weight: 600; color: var(--text); min-width: 96px; }
        .filters-row #sort-select { font-family: inherit; padding-right: 28px; }
        .layout-toggle { display: inline-flex; background: var(--surface-2); border-radius: var(--radius-chip); padding: 4px; gap: 2px; margin-left: auto; }
        .layout-toggle button { border: 0; background: transparent; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: var(--radius-chip); color: var(--text-2); }
        .layout-toggle button.active { background: white; color: var(--text); box-shadow: var(--shadow-sm); }
        .index-content { display: grid; gap: 24px; transition: grid-template-columns 320ms ease; }
        .index-content.split { grid-template-columns: 1fr 1fr; }
        .index-content.grid, .index-content.map { grid-template-columns: 1fr; }
        .index-content.map .grid-pane { display: none; }
        .index-content.grid .map-pane { display: none; }
        #map-pane { position: sticky; top: 130px; height: calc(100vh - 150px); border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--border); background: var(--surface-2); }
        .index-content.map #map-pane { height: calc(100vh - 200px); }
        .map-pin { background: white; color: var(--text); font-weight: 700; font-size: 13px; padding: 6px 10px; border-radius: var(--radius-chip); border: 1px solid var(--border); box-shadow: var(--shadow-md); white-space: nowrap; cursor: pointer; transition: transform 120ms; }
        .map-pin:hover { transform: scale(1.08); z-index: 1000; }
        .map-pin.has-tour { background: var(--accent); color: white; border-color: var(--accent); }
        .map-pin.highlight { transform: scale(1.15); z-index: 1001; }
        @media (max-width: 880px) { .index-content.split { grid-template-columns: 1fr; } .index-content.split .map-pane { display: none; } }
    </style>
</head>
<body>
    <nav class="topnav" id="topnav"></nav>
    <section class="hero container">
        <h1>Don't just look at homes. <span style="color: var(--accent);">Walk through them.</span></h1>
        <p>Every Domus listing tagged ★ 3D Tour is a real photoreal capture you can explore on your own — pan, zoom, walk every room. Buying decisions get easier when the photos can lie but the geometry can't.</p>
        <form class="search-bar" onsubmit="event.preventDefault()">
            <input type="search" placeholder="Austin, TX · neighborhood · ZIP" id="hero-q" />
            <button class="btn btn-primary" type="submit">Search</button>
        </form>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 18px;"><span style="color: var(--accent)">★</span> 1 home with full 3D tour · all 12 listings clickable</p>
    </section>
    <section class="filters-bar container">
        <div class="filters-row" id="filters-row">
            <span class="label-tiny">Price</span>
            <span id="price-display">Up to $5M</span>
            <input type="range" id="price-range" min="0" max="5000000" step="50000" value="5000000" />
            <button class="chip" data-bedchip="0">Any beds</button>
            <button class="chip" data-bedchip="1">1+</button>
            <button class="chip" data-bedchip="2">2+</button>
            <button class="chip" data-bedchip="3">3+</button>
            <button class="chip" data-bedchip="4">4+</button>
            <span class="divider"></span>
            <button class="chip" data-typechip="any">Any type</button>
            <button class="chip" data-typechip="house">House</button>
            <button class="chip" data-typechip="townhouse">Townhouse</button>
            <button class="chip" data-typechip="condo">Condo</button>
            <span class="divider"></span>
            <button class="chip" id="tour3d-chip">★ 3D tour only</button>
            <select id="sort-select" class="chip" style="border-radius:var(--radius-chip)">
                <option value="newest">Newest</option>
                <option value="priceAsc">Price: low to high</option>
                <option value="priceDesc">Price: high to low</option>
            </select>
        </div>
    </section>
    <main class="container">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 16px;">
            <p class="result-count" id="result-count">12 homes for sale in Austin, TX</p>
            <div class="layout-toggle" id="layout-toggle">
                <button data-layout="grid">Grid</button>
                <button data-layout="split" class="active">Split</button>
                <button data-layout="map">Map</button>
            </div>
        </div>
        <div class="index-content split" id="index-content">
            <div class="grid-pane">
                <div class="grid-listings" id="grid"></div>
            </div>
            <div class="map-pane">
                <div id="map-pane"></div>
            </div>
        </div>
    </main>
    <div class="spacer"></div>
    <footer class="foot" id="foot"></footer>
    <script type="module">
        import { LISTINGS } from './data/listings.js';
        import { buildCard } from './lib/card.js';
        import { mountNav, mountFooter } from './lib/nav.js';
        import { readFilters, writeFilters, applyFilters, applyMapBbox } from './lib/filters.js';
        import { initMap, updateMarkers, highlightMarker, flyTo } from './lib/map.js';
        import { fmtPrice } from './lib/format.js';

        mountNav('index'); mountFooter();
        const filters = readFilters();
        let bbox = null; let layout = 'split';

        const grid = document.getElementById('grid');
        const resultCount = document.getElementById('result-count');
        const priceRange = document.getElementById('price-range');
        const priceDisplay = document.getElementById('price-display');
        const sortSelect = document.getElementById('sort-select');
        const tour3dChip = document.getElementById('tour3d-chip');
        const layoutToggle = document.getElementById('layout-toggle');
        const indexContent = document.getElementById('index-content');

        const visibleNow = () => {
            const f = applyFilters(LISTINGS, filters);
            return layout === 'grid' ? f : applyMapBbox(f, bbox);
        };

        const render = () => {
            const visible = visibleNow();
            grid.replaceChildren();
            for (const l of visible) {
                const c = buildCard(l);
                c.addEventListener('mouseenter', () => highlightMarker(l.id));
                c.addEventListener('mouseleave', () => highlightMarker(null));
                grid.appendChild(c);
            }
            resultCount.textContent = visible.length + ' homes for sale in Austin, TX';
            for (const b of document.querySelectorAll('[data-bedchip]')) b.classList.toggle('active', Number(b.dataset.bedchip) === filters.beds);
            for (const b of document.querySelectorAll('[data-typechip]')) b.classList.toggle('active', b.dataset.typechip === filters.type);
            tour3dChip.classList.toggle('active', filters.tour3d);
            priceRange.value = filters.priceMax;
            priceDisplay.textContent = filters.priceMax >= 5_000_000 ? 'Up to $5M' : 'Up to ' + fmtPrice(filters.priceMax);
            sortSelect.value = filters.sort;
            updateMarkers(applyFilters(LISTINGS, filters), { onPinClick: id => flyTo(id, LISTINGS) });
        };

        const start = () => {
            initMap('map-pane', applyFilters(LISTINGS, filters), {
                onBoundsChange: (b) => { bbox = b; render(); },
                onPinClick: (id) => location.href = './listing.html?id=' + id
            });
            render();
        };
        if (window.L) start(); else window.addEventListener('load', start);

        priceRange.addEventListener('input', () => {
            filters.priceMax = Number(priceRange.value);
            priceDisplay.textContent = filters.priceMax >= 5_000_000 ? 'Up to $5M' : 'Up to ' + fmtPrice(filters.priceMax);
        });
        priceRange.addEventListener('change', () => { writeFilters(filters); render(); });
        for (const b of document.querySelectorAll('[data-bedchip]')) b.addEventListener('click', () => { filters.beds = Number(b.dataset.bedchip); writeFilters(filters); render(); });
        for (const b of document.querySelectorAll('[data-typechip]')) b.addEventListener('click', () => { filters.type = b.dataset.typechip; writeFilters(filters); render(); });
        tour3dChip.addEventListener('click', () => { filters.tour3d = !filters.tour3d; writeFilters(filters); render(); });
        sortSelect.addEventListener('change', () => { filters.sort = sortSelect.value; writeFilters(filters); render(); });
        layoutToggle.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-layout]');
            if (!btn) return;
            for (const b of layoutToggle.querySelectorAll('button')) b.classList.remove('active');
            btn.classList.add('active');
            layout = btn.dataset.layout;
            indexContent.className = 'index-content ' + layout;
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
            render();
        });
    </script>
</body>
</html>
```

### §Listing detail page (Task 12)

The full file is in the spec — write `realestate/listing.html` with the same structure as `index.html` plus a complete script that does, in order:
1. Imports `LISTINGS`, `findListing` from data, `mountNav`/`mountFooter` from nav, format helpers, `buildCard`, `pushRecent`/`getMortgage`/`setMortgage` from store.
2. Builds a `photo-grid` with 5 gradient divs.
3. Builds the meta row (title, address; price, $/sqft, days-on-market).
4. If `l.tour3d`, appends a `<button id="tour-cta">View 3D tour</button>` (placeholder alert wired in this task; replaced in Task 15).
5. Builds the stat row (beds/baths/sqft/built/type).
6. Builds the two-column layout: body (description, features grid, HOA/lot, neighborhood map) + sidebar (mortgage calc, agent card).
7. Wires the mortgage recalc.
8. Initializes the neighborhood Leaflet map.
9. Builds the similar-listings grid.

CSS is in `style.css` (Task 1) plus a `<style>` block on listing.html for layout (`photo-grid`, `meta-row`, `stat-row`, `layout-2col`, `feat-grid`, `agent-card`, `calc-card`, `#neighborhood-map`, `.tour-hero-cta`, `.map-pin`).

All DOM construction uses `createElement`/`textContent`/`appendChild`. The Leaflet pin uses an `HTMLElement` for the divIcon `html` option. No `innerHTML`.

### §Contact page (Task 14)

Similar structure to listing detail. `realestate/contact.html` includes a form with: name (required), email (required), phone (optional), best-time select, message textarea. Submit handler calls `pushSubmission(data)` and `clearContactDraft()` then renders a success card. Recent inquiries list below uses `getSubmissions()`. All DOM via `createElement`. Pre-fill draft via `getContactDraft()`. If `?id=` provided, the form description references the listing.

### §Tour modal shell (Task 15)

`realestate/lib/tour/modal.js` exports `openTour(listing)`. Internals:
- Module-level state: `currentTab = 'dollhouse'`, `activeRenderer = null`, `listing = null`, `hotspotsOn = false`.
- `openTour(_listing)` builds `.tour-modal` overlay (header + stage with `<canvas id="tour-canvas">` + `.tour-aside`), appends to body, sets `body.style.overflow='hidden'`, registers `keydown` listener for Esc, calls `switchTab(currentTab)`.
- `buildHeader()` creates: `.tour-title`, `.tour-tabs` (3 buttons), `.tour-actions` (Hotspots toggle, Fullscreen, Close).
- `switchTab(id)` destroys current renderer, clears aside, shows splash, dynamically imports the appropriate tab module, calls `start({ canvas, listing, aside, hotspotsOn })`, hides splash.
- `closeTour()` destroys renderer, removes modal, restores body overflow.

### §Tour modal CSS (Task 15)

```css

/* ---------- 3D tour modal ---------- */
.tour-modal { position: fixed; inset: 0; z-index: 100; background: #050608; display: grid; grid-template-rows: 64px 1fr; grid-template-columns: 1fr 360px; grid-template-areas: "head head" "stage aside"; }
.tour-modal:not(:has(.tour-aside.show)) { grid-template-columns: 1fr 0; }
.tour-head { grid-area: head; display: flex; align-items: center; gap: 24px; padding: 0 22px; background: rgba(8, 9, 12, 0.95); border-bottom: 1px solid rgba(255,255,255,0.08); color: white; }
.tour-title { display: flex; flex-direction: column; min-width: 240px; }
.tour-listing-title { font-size: 14px; font-weight: 600; }
.tour-listing-sub { font-size: 11.5px; color: rgba(255,255,255,0.55); }
.tour-tabs { display: flex; gap: 4px; margin: 0 auto; padding: 4px; background: rgba(255,255,255,0.05); border-radius: var(--radius-chip); }
.tour-tab { border: 0; background: transparent; color: rgba(255,255,255,0.65); padding: 7px 18px; font-size: 13px; font-weight: 600; border-radius: var(--radius-chip); cursor: pointer; transition: background 140ms, color 140ms; }
.tour-tab:hover { color: white; }
.tour-tab.active { background: white; color: var(--text); }
.tour-actions { display: flex; gap: 8px; }
.tour-btn { border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: white; font-family: inherit; padding: 7px 14px; font-size: 12px; font-weight: 600; border-radius: var(--radius-chip); cursor: pointer; }
.tour-btn:hover { background: rgba(255,255,255,0.12); }
.tour-btn.active { background: var(--accent); border-color: var(--accent); }
.tour-btn.close { font-size: 18px; padding: 4px 12px; }
.tour-stage { grid-area: stage; position: relative; overflow: hidden; }
.tour-canvas { width: 100%; height: 100%; display: block; touch-action: none; }
.tour-aside { grid-area: aside; background: #0d0e12; color: white; border-left: 1px solid rgba(255,255,255,0.08); overflow-y: auto; }
.tour-aside:not(.show) { display: none; }
.tour-splash { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(5, 6, 10, 0.92); }
.tour-spin { width: 28px; height: 28px; border: 2px solid rgba(255,255,255,0.12); border-top-color: var(--accent); border-radius: 50%; animation: tour-spin 0.85s linear infinite; }
.tour-splash-label { font-size: 10.5px; letter-spacing: 0.4em; color: rgba(255,255,255,0.55); text-transform: uppercase; }
@keyframes tour-spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) { .tour-modal { grid-template-rows: 56px 1fr auto; grid-template-columns: 1fr; grid-template-areas: "head" "stage" "aside"; } .tour-aside { max-height: 40vh; } .tour-tabs { font-size: 12px; } }
```

### §Dollhouse tab (Task 16)

`realestate/lib/tour/dollhouse.js`:
- Imports `* as pc from '../../vendor/playcanvas.mjs'` then `window.pc ||= pc`.
- `start({ canvas, listing, hotspotsOn })`:
  - Create `pc.Application` with mouse + touch + AA.
  - Set fill/resolution; window resize handler.
  - Scene: ambient 0.04/0.05/0.08, exposure 1.0.
  - Camera entity, FOV 38, ACES tone map.
  - Directional sun with shadows.
  - Load `listing.tour3d.mesh` as container, `helipad-env-atlas.png` as texture (TEXTURETYPE_RGBP, mipmaps:false).
  - Set `app.scene.envAtlas = envAsset.resource`, `skyboxIntensity = 0`.
  - Instantiate render entity from mesh; compute combined AABB.
  - Orbit state (yaw 35, pitch 22, distance 2.4× radius), damped follow.
  - Pointer drag (left/right yaw, up/down pitch); wheel for zoom; auto-orbit after 2 s idle.
  - Hotspots layer (Task 19).
  - `app.start()`.
  - Return `{ setHotspotsEnabled, destroy }` that removes window/canvas listeners and `app.destroy()`.

Code is verbatim same as the existing `/demo/gltf-studio.html` script but adapted to the modal context (no HUD chrome — that lives in modal.js).

### §Walkthrough tab (Task 17)

`realestate/lib/tour/walkthrough.js`:
- Imports playcanvas, sets `window.pc`.
- `start({ canvas, listing, hotspotsOn })`:
  - `pc.Application` with mouse/touch/keyboard, AA off.
  - Camera FOV 70, near 0.05, far 200.
  - Load `listing.tour3d.splat` as `gsplat` asset.
  - Add `gsplat` component with `unified: true`; rotate 180° on X.
  - Position camera at AABB center if available.
  - Pointer-lock on canvas click; mousemove updates yaw/pitch.
  - Keys WASD + ArrowKeys + Space (up) + Shift (down).
  - Touch joystick: left half = move (40 px deadzone), right half = look.
  - Update loop: integrate velocity from inputs, apply.
  - Hotspots with flipped y/z (Task 19).
  - `app.start()`.
  - Return `{ setHotspotsEnabled, destroy }` that releases pointer lock + removes listeners.

Identical to `/demo/walkthrough.html` script body.

### §Configurator data (Task 18)

```js
export const PALETTES = {
    walls: {
        label: 'Wall paint', targetMaterial: 'wall',
        options: [
            { id: 'white', label: 'Bright white', diffuse: [0.93, 0.93, 0.91] },
            { id: 'warm-grey', label: 'Warm grey', diffuse: [0.72, 0.69, 0.65] },
            { id: 'sage', label: 'Sage', diffuse: [0.55, 0.62, 0.51] },
            { id: 'charcoal', label: 'Charcoal', diffuse: [0.20, 0.21, 0.22] }
        ]
    },
    floor: {
        label: 'Flooring', targetMaterial: 'floor',
        options: [
            { id: 'light-oak', label: 'Light oak', diffuse: [0.78, 0.65, 0.45], gloss: 0.55 },
            { id: 'dark-oak', label: 'Dark oak', diffuse: [0.32, 0.22, 0.16], gloss: 0.55 },
            { id: 'concrete', label: 'Polished concrete', diffuse: [0.55, 0.55, 0.55], gloss: 0.7 },
            { id: 'tile', label: 'Limestone tile', diffuse: [0.86, 0.84, 0.78], gloss: 0.4 }
        ]
    },
    counter: {
        label: 'Kitchen counter', targetMaterial: 'counter',
        options: [
            { id: 'quartz', label: 'White quartz', diffuse: [0.90, 0.90, 0.88], gloss: 0.85 },
            { id: 'marble', label: 'Carrara marble', diffuse: [0.88, 0.85, 0.82], gloss: 0.92 },
            { id: 'butcher', label: 'Butcher block', diffuse: [0.62, 0.43, 0.28], gloss: 0.5 }
        ]
    }
};
```

### §Configurator tab (Task 18)

`realestate/lib/tour/configurator.js`:
- Imports playcanvas + PALETTES.
- `start({ canvas, listing, aside, hotspotsOn })`:
  - Same scene setup as dollhouse (app, ambient, exposure, camera, sun, mesh + env load).
  - Same orbit camera (no auto-rotate; no scroll-zoom — config experience is steady).
  - Build material catalog: `allMaterials` = mesh-instances' materials.
  - `findMaterial(substring)` matches by name (case-insensitive); falls back to deterministic indices (0 walls, 1 floor, 2 counter).
  - `applyOption(paletteKey, option)` mutates the matched material's `diffuse` (and optional `gloss`), calls `material.update()`.
  - Build aside DOM: header + 3 sections (one per palette) with swatch buttons. Click sets active class, calls `applyOption`.
  - Reset button restores defaults.
  - Hotspots layer (Task 19).
  - `app.start()`.
  - Return `{ setHotspotsEnabled, destroy }`.

### §Configurator CSS (Task 18)

```css

/* ---------- Configurator side panel ---------- */
.cfg-head { padding: 22px 22px 4px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.cfg-head h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
.cfg-head .cfg-sub { margin: 0 0 18px; font-size: 12.5px; color: rgba(255,255,255,0.55); }
.cfg-section { padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.cfg-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 10px; }
.cfg-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.cfg-swatch { position: relative; width: 64px; height: 64px; border-radius: 10px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1); overflow: hidden; padding: 0; transition: transform 120ms, border-color 140ms; }
.cfg-swatch:hover { transform: scale(1.04); }
.cfg-swatch.on { border-color: var(--accent); }
.cfg-swatch-label { position: absolute; left: 0; right: 0; bottom: 0; padding: 4px 6px; font-size: 9px; font-weight: 600; letter-spacing: 0.04em; color: rgba(255,255,255,0.95); background: linear-gradient(180deg, transparent, rgba(0,0,0,0.6)); }
```

### §Hotspot CSS (Task 19)

```css

/* ---------- Hotspots overlay ---------- */
.hotspots-layer .hotspot { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; }
.hs-dot { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: white; border: 2px solid white; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: var(--shadow-md); transition: transform 120ms; }
.hs-dot:hover { transform: scale(1.1); }
.hs-card { position: absolute; left: 22px; top: 22px; width: 240px; padding: 12px 14px; background: white; color: var(--text); border-radius: 10px; box-shadow: var(--shadow-lg); opacity: 0; pointer-events: none; transform: translateY(4px); transition: opacity 160ms, transform 160ms; }
.hotspot:hover .hs-card, .hotspot.pinned .hs-card { opacity: 1; transform: translateY(0); pointer-events: auto; }
.hs-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
.hs-body { margin: 0; font-size: 12.5px; color: var(--text-2); }
```

---

## Coverage check

| Spec section | Implementing task |
| --- | --- |
| 1 Goal / 2 Scope | All tasks |
| 3 Visual style | Task 1 (style.css) |
| 4.1 Index | Tasks 7, 9, 11 |
| 4.2 Listing detail | Task 12 (sans 3D), Task 15 (modal hookup) |
| 4.3 Favorites | Task 13 |
| 4.4 Contact | Task 14 |
| 5.1 Dollhouse | Task 16 |
| 5.2 Walkthrough | Task 17 |
| 5.3 Configure | Task 18 |
| 5.4 Hotspots | Task 19 |
| 5.5 Modal shell | Task 15 |
| 6 Listings data model | Task 4 |
| 7 Filters & sort | Tasks 8, 9 |
| 8 Persistence | Task 3 + uses across 5, 12, 13, 14 |
| 9 File layout | Task 0 |
| 10 Map specifics | Task 10 |
| 11 Mobile / responsive | CSS in Tasks 1, 12, 15; explicit pass in Task 20 |
| 12 Tech invariants | Task 0 |
| 13 Risks | Acknowledged in spec; no implementation needed |
| 14 Build sequence | This plan = fully realized |
| 15 Open questions | None |

No spec section is unaddressed.

---

## Self-review

**Placeholders:** No `TBD`, no `TODO`, no `etc.` in code-emitting steps. Where the plan uses "see appendix below," the appendix contains the full specification needed to implement.

**Type/name consistency:**
- `setHotspotsEnabled(on)` is the method on every tour module; called from modal's hotspots button.
- `start({ canvas, listing, hotspotsOn })` is the signature on dollhouse and walkthrough; configurator adds `aside`.
- `findListing(id)` exported from `data/listings.js` and used by listing.html, contact.html.
- `applyFilters` / `applyMapBbox` in `lib/filters.js`.
- `mountNav` / `mountFooter` in `lib/nav.js`; called by every page.
- `buildCard` in `lib/card.js`; used by index, favorites, listing-similar.
- `initMap` / `updateMarkers` / `highlightMarker` / `flyTo` in `lib/map.js`.

**Path consistency:** Splat / mesh / cubemap URLs absolute (`/engine/examples/assets/...`). Cross-module imports inside `realestate/` are relative. Vendored playcanvas always referenced as `realestate/vendor/playcanvas.mjs`.

**innerHTML scan:** All DOM construction uses `createElement` + `textContent` + `appendChild` + `replaceChildren`. Leaflet `divIcon({ html })` accepts `HTMLElement` (Leaflet 1.9 supports this), so no string templating into innerHTML.

**Scope:** 21 tasks across 6 phases. Each task = one focused commit. Phase boundaries are natural review checkpoints for subagent-driven execution.
