# Real-estate site design

**Status:** approved 2026-05-09
**Lives at:** `/realestate/` (separate from `/demo/`)
**Tech:** vanilla HTML + ES modules, no bundler, no `node_modules`

## 1. Goal

Build a Zillow-shaped multi-listing real-estate site that uses the PlayCanvas workspace to deliver a 3D tour experience that real Zillow listings can't match. The site is a working demo, not a production platform — there's no real backend, no auth, no payments.

The point is to show what 3D adds to a property listing: a photoreal Gaussian Splat walkthrough, a rotating dollhouse, a finish configurator, and clickable hotspots — all on one detail page, all running locally with no build step.

## 2. Scope

### In scope

- Four routes (index, listing detail, favorites, contact)
- 12 mock listings in a single US city (default: Austin, TX)
- Listings grid, OpenStreetMap pins, price/beds/baths/type filters
- One flagship listing with the full 3D tour modal (4 tabs)
- Other listings show photos + "3D tour coming soon"
- localStorage for favorites, recent views, contact-form drafts
- Mortgage calculator on detail page
- Airbnb-clean visual style (white, soft pinkish-coral CTA, generous typography)
- Touch + mobile-aware (responsive layout, touch joystick in walkthrough)

### Out of scope

- Real authentication / accounts (placeholder button only)
- Real backend / database (everything is static JSON + localStorage)
- Real photos for fictional listings (placeholder gradients/colored hero panels suffice)
- Listing creation, agent dashboards, transactions, escrow
- Internationalization, currency conversion
- Analytics / tracking
- 3D content for non-flagship listings (only one property has the splat + mesh)
- SEO / SSR / metadata for listings (it's a demo, not indexed)

## 3. Visual style

**Direction B from the brainstorm — Clean & photographic, Airbnb-ish.**

- **Background:** white (`#fff`); secondary surface `#fafafa`
- **Text:** primary `#1a2540`, secondary `#5a6275`, muted `#8a93a6`
- **Accent (CTA, price, heart):** `#ff385c` coral
- **Border:** `#e5e6e8` 1px
- **Card radius:** 12px; chip radius 999px
- **Shadow:** `0 4px 24px rgba(0,0,0,0.06)` for floating cards on hover
- **Typeface:** Inter (system fallback) for everything; numerics tabular
- **Hierarchy:** generous whitespace, large hero photos, modest section dividers
- **Listing card:** photo on top (16:9), price and address below, beds/baths/sqft inline at bottom, heart icon top-right of photo, "3D" badge top-left when applicable
- **Photo treatment:** since real photos are out of scope, use gradient backdrops keyed off each listing's color. Adds personality without faking real estate.

## 4. Pages

### 4.1 `/realestate/index.html` — Landing + listings

**Above the fold:**
- Top nav: logo (left), `Buy / Rent (disabled) / Sell (disabled)` (center), `Favorites` (heart count) + `Account` placeholder (right)
- Hero search bar: location text input (decorative, doesn't actually filter), "Find homes" button
- Result count: "12 homes for sale in Austin, TX"

**Filters bar (sticky on scroll):**
- Price slider (min/max)
- Beds chip group (Any · 1+ · 2+ · 3+ · 4+)
- Baths chip group (Any · 1+ · 2+ · 3+)
- Type chip group (House · Townhouse · Condo)
- "3D tour only" toggle
- "Sort: newest / price low / price high" dropdown

**Layout toggle:** Grid · Map · Split (default Split)

**Grid:** responsive CSS grid; cards link to listing detail with `?id=`

**Map:** Leaflet + OpenStreetMap tiles, custom price-tag pin per property, click pin highlights matching card. Map-area filter: as you pan/zoom, only properties in the visible bounding box stay.

**Footer:** "Demo only · powered by PlayCanvas" + links back to `/demo/`.

### 4.2 `/realestate/listing.html?id=N` — Property detail

**Hero section:**
- 4-photo grid (1 large + 3 small, Airbnb-style). Click any to open lightbox.
- Floating buttons: "View 3D tour" (only on flagship), Share, Heart
- Address + neighborhood
- Price + "$X / sqft" + days on market

**Quick-stat row:** beds · baths · sqft · year built · type

**3D tour modal trigger** — only renders the button on the flagship listing. Detail of the modal in §5.

**About this home:** description (multi-paragraph), feature list (bullet chips), HOA, lot size

**Mortgage calculator:**
- Inputs: home price (prefilled), down payment %, interest rate, loan term
- Output: monthly payment, principal+interest breakdown, total paid over loan
- Persists last-used values to localStorage

**Schools section:** placeholder cards with K/Middle/High and a fake rating

**Neighborhood:** small Leaflet map centered on property, walk-score-style number

**Agent contact card:** photo placeholder + name + "Send message" button → opens contact form pre-filled with property reference

**Similar listings:** carousel of 4 cards from `data/listings.json` matching by city/type/price band

### 4.3 `/realestate/favorites.html` — Saved listings

Same grid as index but only listings whose IDs are in `localStorage['re.favorites']`. Empty state: "No favorites yet — heart any listing to save it." with a "Browse listings" button back to index.

### 4.4 `/realestate/contact.html` — Agent contact form

Form fields: name, email, phone (optional), preferred contact time, property reference (auto-filled if arrived via listing detail), message. Submit shows a success card and stores the draft in `localStorage['re.contactSubmissions']`. Below: "Recent inquiries" listing past submissions from localStorage.

## 5. The 3D tour modal (flagship listing only)

Full-viewport modal opened by the "View 3D tour" CTA. Closes on Esc or overlay click.

**Header bar:** property title, share-this-view button, fullscreen, close

**Tab switcher:** four tabs, switching swaps the central viewport content

### 5.1 Dollhouse tab (default)

- PlayCanvas scene loads `engine/examples/assets/models/apartment.glb` plus `helipad-env-atlas.png` for IBL
- Orbit camera around the model, drag to rotate, scroll to zoom
- Toned-down ambient + key directional light + soft shadows
- "Click a room to enter walkthrough" hint
- Hotspots (when Hotspots toggle is on): floating chips above key rooms

### 5.2 Walkthrough tab

- Loads `engine/examples/assets/splats/apartment.sog` (3D Gaussian Splat)
- First-person camera with WASD + pointer lock; touch joystick on mobile
- Floor-plan thumbnail bottom-right; click a room to teleport
- Hotspots (when on): floating annotations attached to world positions
- Reuses the controller from `/demo/walkthrough.html`

### 5.3 Configure tab

- Loads the same `apartment.glb` mesh
- Side panel on the right with three swap groups:
  - **Wall paint:** white / warm grey / sage / charcoal (4 swatches)
  - **Flooring:** light oak / dark oak / concrete / tile (4 swatches)
  - **Kitchen counter:** quartz / marble / butcher block (3 swatches)
- Each swap mutates the corresponding `pc.StandardMaterial`'s `diffuse` / `diffuseMap` / `gloss` / `metalness` then calls `material.update()`. The mesh re-renders instantly.
- Reset button restores defaults
- Material findings: identify target meshes by name; if name-matching fails, fall back to indexing the first N materials by render order. The list of swappable materials lives in `data/configurator.js`.

### 5.4 Hotspots tab

- Toggle (on/off) — applies to all other tabs too
- Hotspot data in `data/hotspots.js`: each entry is `{id, world: [x,y,z], title, body, room?}`
- DOM elements positioned via `camera.camera.worldToScreen(...)` each frame
- Style: small numbered dot, expand on hover/click into a card with title + body
- Authored hotspots: 5–8 covering "12-ft ceilings", "Quartz countertop · 2024 reno", "View of lake", "Built-in storage", "Skylight", "Smart thermostat"

### 5.5 Shared modal infrastructure

- Single `<canvas>` shared across tabs (recreated only when the geometry source changes splat ↔ mesh)
- Camera state preserved per tab when switching back
- Loading splash for asset transitions; "Press Esc to release pointer" hint when locked
- Share-this-view: serializes camera position/rotation + active tab to URL hash; opening that URL deep-links the user to that exact view
- Fullscreen: native `requestFullscreen()` on the modal element

## 6. Listings data model

Single file: `realestate/data/listings.js` exporting an array. Schema (TypeScript-ish):

```ts
{
  id: string,                            // "L001" — stable, used in URLs and localStorage
  title: string,                         // "Hill Country Modern"
  address: { line1: string, city: string, state: string, zip: string },
  lat: number, lng: number,
  price: number,                         // 1295000
  beds: number, baths: number, sqft: number,
  type: 'house' | 'townhouse' | 'condo',
  yearBuilt: number,
  daysOnMarket: number,
  description: string,                   // 2–3 paragraphs
  features: string[],                    // ["Quartz countertops", "Two-car garage", ...]
  hoaMonthly?: number,
  lotSqft?: number,
  agent: { name: string, photoColor: string },
  // Visual treatment in lieu of real photos:
  heroColor: string,                     // CSS gradient seed, e.g. "linear-gradient(135deg, #f8d4b8, #f5b78c)"
  // 3D tour: only present on flagship listing(s)
  tour3d?: {
    splat: string,                       // engine/examples/assets/splats/apartment.sog
    mesh: string,                        // engine/examples/assets/models/apartment.glb
    floorPlan?: string,
    hotspots: string                     // module path to hotspot data
  }
}
```

Twelve listings, one flagship (the apartment), spread across Austin TX neighborhoods (Zilker, East Austin, Hyde Park, etc.) so the map looks plausible. Price range $300k–$4M. Agent names rotate from a small pool of fictional names.

## 7. Filters & sort behavior

- All filter state lives in URL query params (`?beds=3&type=house&priceMax=2000000`) so filtered views are linkable
- Filter changes are debounced (~150ms) before re-rendering
- Map-area filter: invisible when in Grid view; in Map / Split, applies the visible bbox as an additional constraint
- "3D tour only" filter shows only listings with `tour3d`
- Sort: stable sort by `newest` (insertion order), `priceAsc`, `priceDesc`

## 8. Persistence (localStorage)

| Key | Value | Used by |
| --- | --- | --- |
| `re.favorites` | string[] of listing IDs | favorites page, heart toggle |
| `re.recentViews` | `{id: string, ts: number}[]` (cap 10) | "Recently viewed" strip on index |
| `re.mortgage` | `{down, rate, term}` | mortgage calculator prefill |
| `re.contactDraft` | partial form data | contact form draft |
| `re.contactSubmissions` | submitted form snapshots | contact page recent list |

All reads are wrapped in `try/catch` so a corrupt JSON value doesn't crash the page; bad reads return defaults.

## 9. File layout

```
realestate/
├── index.html
├── listing.html
├── favorites.html
├── contact.html
├── style.css                          # shared
├── lib/
│   ├── data.js                        # listings array
│   ├── filters.js                     # filter state + URL serialization
│   ├── map.js                         # Leaflet wrapper, custom price pins
│   ├── store.js                       # localStorage helpers (typed)
│   ├── format.js                      # currency, sqft, days-ago
│   ├── card.js                        # listing card component
│   ├── tour/
│   │   ├── modal.js                   # the 3D tour modal shell
│   │   ├── dollhouse.js               # mesh + orbit camera
│   │   ├── walkthrough.js             # splat + first-person
│   │   ├── configurator.js            # material swap panel
│   │   └── hotspots.js                # world-space annotations
│   └── mortgage.js                    # calculator
├── data/
│   ├── listings.js                    # 12 listings
│   ├── hotspots.js                    # flagship listing hotspots
│   └── configurator.js                # swappable materials catalog
└── vendor/
    ├── playcanvas.mjs                 # symlink → ../../demo/vendor/playcanvas.mjs
    ├── leaflet.js                     # CDN-vendored leaflet (~150 KB)
    ├── leaflet.css
    └── observer.mjs                   # symlink → ../../demo/vendor/observer.mjs
```

Importmap declares: `playcanvas` → `./vendor/playcanvas.mjs`. Pages import their per-page module which composes the lib pieces.

## 10. Map specifics

- Leaflet's free CDN bundle (vendored) + OpenStreetMap tiles (free, no API key, attribution rendered)
- Custom DivIcon pins shaped as price pills ("$1.295M") matching the coral accent
- Cluster nearby pins at low zoom using `L.markerClusterGroup` (skip if disk-tight; can ship without)
- Bounds change emits an event the index page listens to for the area filter

## 11. Mobile / responsive

- Index: filters collapse into a single "Filters" sheet on mobile; grid becomes single-column; map view becomes full-screen with a "List" pill to switch back
- Listing detail: photo grid becomes a single hero photo + carousel; mortgage and agent collapse into accordion sections
- 3D tour modal: touch joystick (left half = move, right half = look) for walkthrough; Configure tab's side panel becomes a bottom sheet
- All interactive 3D tabs disable canvas antialiasing on mobile if perf drops

## 12. Tech approach (no-build invariants)

- Pure ES modules; one importmap per HTML page resolving `playcanvas` → vendored `.mjs`
- Reuse the engine examples symlinks (`/engine/examples/static/...`) we already created
- Reuse `/demo/vendor/playcanvas.mjs` and `/demo/vendor/observer.mjs` via symlinks
- Each page is a single HTML with inline `<style>` (page-specific) plus shared `style.css`
- No transpiler, no bundler, no `node_modules`. Browsers used: latest Chrome / Safari / Firefox; no IE / no polyfills.

## 13. Risks / known limits

- **Splat camera passes through walls** — splats have no collision. Acceptable for a demo (and many real Matterport-like products skip collision in walkthrough mode); call it out as "free-fly mode" in the UI.
- **Configurator material identification** — `apartment.glb` material names may not be human-readable. Fallback strategy is documented (§5.3).
- **OpenStreetMap rate limits** — free tile usage is fine for a demo viewed by a handful of people; if presenting to a crowd, swap tiles to a free CDN like CARTO basemaps.
- **Disk pressure** — workspace is at ~95% capacity. Vendoring Leaflet (~150 KB) and adding listing data (~30 KB) is fine; do not introduce npm.

## 14. Build sequence

The implementation plan (next step) will sequence work, but the obvious order is:

1. Scaffold layout (`style.css`, page shells, top nav, shared card component)
2. Listings data + index grid (no map yet)
3. Filters + URL state
4. Map integration + map-area filter
5. Listing detail page (photos, meta, description, mortgage, agent)
6. Favorites + heart toggle (localStorage)
7. Contact form + recent inquiries
8. 3D tour modal — start with Dollhouse tab
9. 3D Walkthrough tab (port `/demo/walkthrough.html`)
10. 3D Configurator tab (material swaps)
11. 3D Hotspots overlay (world-to-screen)
12. Mobile responsive pass + touch joystick
13. Polish, share-view URLs, fullscreen

Each step is a self-verifying milestone (open in browser, see it work).

## 15. Open questions

None at spec time. If implementation surfaces questions, the writing-plans phase will lift them up.
