# CLAUDE.md

> Project-level guidance for Claude Code. Read this before doing anything in this workspace.

## TL;DR

This is a **PlayCanvas exploration workspace**. It contains:

1. A **shallow clone of the PlayCanvas engine** at `engine/` — pure reference material. Do not modify.
2. **Five self-contained 3D demos** at `demo/` plus a gallery hub, all using PlayCanvas v2 via a **vendored ESM build**, no bundler, no `node_modules`.
3. A `README.md` and this `CLAUDE.md`.

The demos are the only "real code" in the repo. Everything else is reference material or a build artifact (`demo/vendor/playcanvas.mjs`, `demo/thumbs/*.png`).

There is no test suite, no CI, no build step, no `package.json`, no git repository (`is_git: false`). It is intentionally minimal — single HTML files you can open with any static server.

## Layout

```
/Users/eslamsamy/projects/playcanvas/
├── CLAUDE.md                       # this file
├── README.md                       # human-facing overview
├── demo/
│   ├── index.html                  # gallery hub — landing page with 4 cards
│   ├── pavilion.html               # Scene 01: procedural crystals + picking
│   ├── gltf-studio.html            # Scene 02: glTF + IBL + live controls
│   ├── splat-stage.html            # Scene 03: 3D Gaussian Splat viewer
│   ├── material-lab.html           # Scene 04: PBR sphere matrix + IBL
│   ├── walkthrough.html            # Scene 05: first-person tour of apartment splat
│   ├── thumbs/                     # PNG thumbnails used by hub cards
│   │   ├── pavilion.png
│   │   ├── gltf.png
│   │   ├── splat.png
│   │   ├── material.png
│   │   └── walkthrough.png
│   └── vendor/
│       └── playcanvas.mjs          # PlayCanvas v2 ESM build (~3.5 MB), vendored from jsDelivr
└── engine/                         # shallow clone of github.com/playcanvas/engine (~786 MB)
    ├── src/                        # engine source — primary reference for API behavior
    ├── examples/src/examples/      # runnable example code — primary reference for usage patterns
    ├── examples/assets/            # glTF models, cubemaps, splats, textures (used by demos via ../engine/examples/assets/...)
    ├── scripts/                    # bundled helper scripts (camera controllers, post-effects)
    ├── playcanvas.d.ts             # full TS type definitions — authoritative API surface
    └── README.md                   # engine README with feature list and quickstart
```

The engine clone is the **single most useful resource** in the workspace. When in doubt about a PlayCanvas API, grep `engine/src/` and look at `engine/examples/src/examples/` for working snippets before asking the user or guessing.

## How to run the demos

```sh
# from the project root
python3 -m http.server 4321
# then open http://localhost:4321/demo/         (gallery hub)
```

The hub at `/demo/` links to all four scenes. Direct URLs:

- `/demo/pavilion.html` — Crystal Pavilion
- `/demo/gltf-studio.html` — glTF Studio
- `/demo/splat-stage.html` — Splat Stage
- `/demo/material-lab.html` — Material Lab
- `/demo/walkthrough.html` — Walkthrough (first-person apartment splat tour)

Demos require a static server because they use ES modules (browsers refuse to load modules over `file://`). Any static server is fine: `python3 -m http.server`, `npx serve`, `caddy file-server`, `php -S`, etc. **Do not** introduce a bundler, dev server, or `package.json` unless the user explicitly asks for one — the no-build property is intentional (see Constraints).

## What each demo is

### Scene 01 — Crystal Pavilion (`pavilion.html`)

Procedural-only scene: eight emissive diamond crystals (cone + inverted cone) orbiting a glowing pedestal. Drag to orbit, scroll to zoom, click a crystal to pulse it, hover for soft glow, auto-orbit when idle > 2.5 s. **No external assets.** Best showcase of: scene graph, hand-rolled orbit camera, ray-sphere picking, animated emissive materials.

### Scene 02 — glTF Studio (`gltf-studio.html`)

Loads `engine/examples/assets/models/statue.glb` plus the `helipad-env-atlas.png` cubemap, applies environment-based lighting (IBL). Live controls panel: skybox toggle, IBL toggle, exposure slider, auto-rotate toggle. Best showcase of: `pc.Asset` + `pc.AssetListLoader`, `instantiateRenderEntity()` from a glTF container, `app.scene.envAtlas` for IBL, automatic AABB-based camera framing.

### Scene 03 — Splat Stage (`splat-stage.html`)

Loads `engine/examples/assets/splats/guitar.compressed.ply` and renders it as a 3D Gaussian Splat (~91K splats, 1.5 MB compressed). Auto-orbit, drag, zoom. Best showcase of: PlayCanvas's first-class 3DGS support — asset type `'gsplat'`, component `'gsplat'` with `unified: true`, antialiasing disabled (splats don't benefit). The splat is rotated 180° on X because PLY captures are typically Y-down.

### Scene 04 — Material Lab (`material-lab.html`)

5×5 sphere matrix with metalness sweeping along X (0→1) and gloss along Y (0→1). Hover any sphere to see its parameters. Three-point lighting plus IBL. Best showcase of: PBR parameter visualization, hover-based ray-sphere inspect, why metals need an environment to look correct.

## Common patterns across demos

| Feature                         | Where                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| ESM import via importmap        | `<script type="importmap">` → `./vendor/playcanvas.mjs`        |
| `pc.Application` boot           | mouse/touch/keyboard input plugged in via constructor options  |
| Custom orbit camera             | hand-rolled yaw/pitch/distance with critically damped follow   |
| Pointer + touch                 | unified `pointerdown/move/up` with `setPointerCapture`         |
| Tone mapping                    | `camera.addComponent('camera', { toneMapping: TONEMAP_ACES })` |
| PBR materials                   | `pc.StandardMaterial` + `metalness`/`gloss`/`emissive`         |
| Asset loading                   | `new pc.Asset(name, type, { url })` + `pc.AssetListLoader`     |
| IBL                             | `app.scene.envAtlas = textureAsset.resource`                   |
| HUD overlay                     | DOM elements positioned with `position: fixed` over the canvas |
| FPS counter                     | accumulator updated every 500 ms in the update loop            |

Each demo is one HTML file, ~14–28 KB, fully self-contained except for shared `vendor/playcanvas.mjs`.

## PlayCanvas v2 API gotchas

The vendored `playcanvas.mjs` is **v2.x**. Several things changed from v1 — these were learned from this project:

### `app.scene.fog` is an object now (NOT a constant)

```js
//  v1 (broken)
app.scene.fog = pc.FOG_EXP2;
app.scene.fogColor = new pc.Color(...);
app.scene.fogDensity = 0.04;

//  v2 (correct)
app.scene.fog.type = pc.FOG_EXP2;
app.scene.fog.color = new pc.Color(...);
app.scene.fog.density = 0.04;
```

`app.scene.fog` is a getter-only `Fog` instance. Assigning to it throws `TypeError: Cannot set property fog of #<Scene> which has only a getter`. See `engine/src/scene/scene.js` (`get fog()` around line 530) and `engine/src/scene/fog.js`.

### Tone mapping moved off `Scene` and onto the camera component

```js
//  v1 (silently no-op or throws in v2)
app.scene.toneMapping = pc.TONEMAP_ACES;

//  v2 (correct)
camera.addComponent('camera', { toneMapping: pc.TONEMAP_ACES });
// or:
camera.camera.toneMapping = pc.TONEMAP_ACES;
```

See `engine/src/framework/components/camera/component.js` (`set toneMapping`).

### `gammaCorrection` is no longer a Scene property to set

In v2 the sRGB output path is the default; do not set `app.scene.gammaCorrection`.

### Material caveats

- After mutating a `StandardMaterial` (e.g. `mat.emissiveIntensity = 5`), call `mat.update()` or the change won't take effect.
- `mat.useMetalness = true` is required if you set `mat.metalness` and want PBR/metalness-roughness behavior.
- `mat.gloss` is the inverted roughness (1 = mirror, 0 = matte).

### Asset loading: glTF, cubemap, gsplat

The demos all use the same loader pattern. Engine assets live at `../engine/examples/assets/*` from any `demo/*.html`.

```js
// glTF model
const statue = new pc.Asset('statue', 'container', {
    url: '../engine/examples/assets/models/statue.glb'
});

// Cubemap (env atlas) for IBL — note the rgbp + mipmaps:false options
const helipad = new pc.Asset('helipad', 'texture',
    { url: '../engine/examples/assets/cubemaps/helipad-env-atlas.png' },
    { type: pc.TEXTURETYPE_RGBP, mipmaps: false }
);

// 3D Gaussian Splat
const guitar = new pc.Asset('guitar', 'gsplat', {
    url: '../engine/examples/assets/splats/guitar.compressed.ply'
});

const loader = new pc.AssetListLoader([statue, helipad, guitar], app.assets);
loader.load((errors) => {
    if (errors) { console.error(errors); return; }

    // glTF: instantiate render entity from container resource
    const entity = statue.resource.instantiateRenderEntity();
    app.root.addChild(entity);

    // IBL: bind cubemap atlas to scene
    app.scene.envAtlas = helipad.resource;
    app.scene.skyboxIntensity = 0.0; // 0 = invisible skybox, IBL only

    // GSplat: add gsplat component
    const splatEntity = new pc.Entity();
    splatEntity.addComponent('gsplat', { asset: guitar, unified: true });
    splatEntity.setLocalEulerAngles(180, 0, 0); // PLY captures are usually Y-down
    app.root.addChild(splatEntity);
});
```

`pc.Application` (the wrapper) registers all standard component systems and resource handlers including `GSplatComponentSystem` and `GSplatHandler`. The granular `pc.AppBase` API used by some engine examples requires manual registration — don't bother unless you need to trim the bundle, which doesn't apply here (we use the prebuilt `playcanvas.mjs`).

### Camera framing for loaded models

For arbitrary glTF, scale and position vary. Compute the entity's combined AABB and frame the camera:

```js
const aabb = new pc.BoundingBox();
const renders = entity.findComponents('render');
let initialised = false;
for (const r of renders) {
    for (const mi of r.meshInstances) {
        if (!initialised) { aabb.copy(mi.aabb); initialised = true; }
        else aabb.add(mi.aabb);
    }
}
orbit.target.copy(aabb.center);
orbit.distance = aabb.halfExtents.length() * 3;
```

For GSplat entities, AABB lives at `entity.gsplat.instance.meshInstance.aabb`.

### Cone primitive orientation

The `'cone'` render primitive is **base at `y=-0.5`, tip at `y=+0.5`** in local space (1 m total height by default). To make a downward-pointing cone, rotate 180° around X *and* offset the position so the bases meet — see the diamond construction in `demo/index.html`:

```js
// top half: base at y=0, tip at y=+1.4 (after scale)
top.setLocalScale(0.55, 1.4, 0.55);
top.setLocalPosition(0, 0.70, 0);

// bottom half: rotated 180° on X, base at y=0, tip at y=-0.6
bot.setLocalScale(0.55, 0.6, 0.55);
bot.setLocalEulerAngles(180, 0, 0);
bot.setLocalPosition(0, -0.30, 0);
```

The bases must meet at the same Y for the silhouette to look like a real diamond. Off-by-an-equator placement was the first visible bug in the demo — keep the math explicit.

### Transform composition

Child world position = parent world transform applied to child's local position. `setLocalPosition(0, -0.75, 0)` on a child whose parent has `setLocalScale(1, 1.6, 1)` puts the child 1.2 units below parent in world Y — easy to forget. The current demo uses **a transform-only parent entity** with rendered children, so pulse animations can `setLocalScale(s, s, s)` on the parent uniformly without distorting the geometry math.

## Constraints

These shaped the design — respect them unless the user changes the requirement.

### Disk space

The host filesystem is small (~1 GB free at project start). This is why:

- The engine clone is `--depth 1` (still ~786 MB).
- The demo does **not** use `npm install`. A typical Vite + PlayCanvas project's `node_modules` is 200–400 MB and would not fit reliably.
- PlayCanvas was downloaded **once** as `playcanvas.mjs` and committed to `demo/vendor/`. The demo resolves the bare `playcanvas` import via importmap.

If asked to add a build step, **first check `df -h /`** and tell the user the available space before installing anything.

### CDN reachability

`cdn.jsdelivr.net` was reachable but slow during development (multi-second downloads of `playcanvas.mjs`). This is the second reason for vendoring: the demo loads instantly and works offline.

If you need to update the vendored build:

```sh
curl -fsSL "https://cdn.jsdelivr.net/npm/playcanvas@2/build/playcanvas.mjs" \
  -o /Users/eslamsamy/projects/playcanvas/demo/vendor/playcanvas.mjs
```

Pin a specific version (`@2.x.y`) for reproducibility if you do this — the project currently uses `@2` (latest 2.x at fetch time).

### No git repository

This workspace is not a git repo (`git status` will fail at the project root). Don't run `git commit` here unless the user explicitly asks you to `git init` first. The cloned `engine/` directory is its own git repo; **do not** commit anything to it.

### No package.json, no build tools, no tests

Don't add them unless asked. The demo is a single HTML file on purpose. The "deliverable" is the file you can open in any browser.

## Verifying changes

Always verify visually after touching any `demo/*.html`. The standard workflow is:

1. **Start the server** (if not already running): `python3 -m http.server 4321 --bind 127.0.0.1`. The server stays up across iterations.
2. **Use Playwright MCP** to navigate and screenshot:
   - `browser_navigate http://127.0.0.1:4321/demo/<scene>.html`
   - `browser_console_messages level=error` — must be 0 errors before claiming success
   - `browser_take_screenshot filename=<scene>-vN.png`
   - `Read /Users/eslamsamy/projects/playcanvas/<scene>-vN.png` to actually see the output
   - If the screenshot resolution looks small or odd, call `browser_resize 1280 720` first.
3. **Chrome DevTools MCP is unavailable** in this environment — there is a Chrome process holding the profile. Stick with Playwright.
4. **Don't claim "it works"** based on absence of errors alone. Always look at the screenshot. The first iteration of this demo had a giant misshapen yellow crystal that produced zero console errors.

For interactivity testing, dispatch synthetic pointer events via `browser_evaluate`:

```js
canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true }));
canvas.dispatchEvent(new PointerEvent('pointerup',   { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true }));
```

The demo's click handler treats a pointer that moved <6px between down and up as a click and runs the picker.

## Common tasks (recipes)

### Add a new geometry primitive to the scene

Follow the existing pattern. All primitives use `addComponent('render', { type, material })`.

```js
const mat = new pc.StandardMaterial();
mat.diffuse = new pc.Color(0.8, 0.2, 0.2);
mat.update();

const e = new pc.Entity('thing');
e.addComponent('render', { type: 'box', material: mat });
e.setLocalScale(1, 1, 1);
e.setPosition(0, 1, 0);
app.root.addChild(e);
```

Available `type` values: `'box'`, `'capsule'`, `'cone'`, `'cylinder'`, `'plane'`, `'sphere'`, `'torus'`, plus `'asset'` for a custom mesh.

### Load a glTF model

Pattern from `engine/examples/src/examples/loaders/`:

```js
app.assets.loadFromUrl('/path/to/model.glb', 'container', (err, asset) => {
  if (err) { console.error(err); return; }
  const entity = asset.resource.instantiateRenderEntity();
  app.root.addChild(entity);
});
```

The container resource includes meshes, materials, and animations. Use `instantiateRenderEntity()` for static models, `instantiateModelEntity()` for animated ones with skeletons.

### Add post-processing (e.g. bloom)

Look at `engine/scripts/posteffects/posteffect-bloom.js` for the v1-style script-based effect, and `engine/src/extras/render-passes/` for the modern v2 render-pass approach. Bloom would meaningfully improve the emissive look of the crystals — it was deliberately skipped in the initial demo to keep the dependency surface minimal.

### Add physics

Requires `ammo.wasm` + `ammo.js` from the engine. Pattern in `engine/examples/src/examples/physics/`. This adds runtime weight (~500 KB extra) but enables real rigidbody dynamics. Discuss the trade-off with the user before adding.

### Pick more accurately

The demo uses a hand-rolled ray-sphere test. For precise mesh picking, use `pc.Picker` (the framebuffer-based picker) — see `engine/src/framework/picker.js`. It's more code but handles arbitrary geometry and rotation correctly.

## What not to do

- **Do not modify `engine/`.** It's reference material. If you need to "fix" something there, you're solving the wrong problem.
- **Do not add `node_modules`** without checking disk space and confirming with the user.
- **Do not introduce a bundler** (Vite, webpack, esbuild) unless the user explicitly asks. The single-HTML, importmap-based architecture is the design.
- **Do not delete `demo/vendor/playcanvas.mjs`** — without it the demo can't load offline.
- **Do not assume the demo "works" because there are no console errors.** Take a screenshot.
- **Do not call `pc.Application` constants on `app.scene.fog`** — see v2 API gotchas above.
- **Do not commit to `engine/`'s git repo.** Anything you do in this workspace stays in this workspace.
- **Do not use emojis in code, comments, or commit messages** (see user's global instructions).
- **Do not add Claude attribution** to anything (user's global instruction).

## Engine source as reference

When the user asks "how do I do X with PlayCanvas", grep first:

```sh
# find example usage
grep -rln "screenToWorld" /Users/eslamsamy/projects/playcanvas/engine/examples/src/examples/

# find API definition
grep -rn "set toneMapping\|get toneMapping" /Users/eslamsamy/projects/playcanvas/engine/src/

# inspect TS types
grep -n "screenToWorld\|toneMapping" /Users/eslamsamy/projects/playcanvas/engine/playcanvas.d.ts
```

The examples directory is organized by capability:

```
engine/examples/src/examples/
├── animation/         # state graph, blend trees, glTF skeletons
├── camera/            # orbit, fly, first-person, multi-camera
├── compute/           # WebGPU compute shaders
├── gaussian-splatting/ # 3DGS loading & rendering
├── gizmos/            # transform/rotation/scale gizmos
├── graphics/          # PBR, shadows, post-effects, instancing, particles
├── input/             # mouse/touch/keyboard/gamepad
├── loaders/           # glTF, Draco, Basis, custom
├── materials/         # standard, custom shaders, clearcoat, anisotropy
├── misc/              # editor integration, scripts, batching
├── physics/           # rigid bodies, joints, raycasts
├── shaders/           # custom shaders, compute, pre-passes
├── sound/             # 3D positional audio
├── user-interface/    # 2D UI elements, text, layout
└── xr/                # WebXR (VR + AR)
```

Each `.example.mjs` is a runnable demo with a clear, minimal pattern. Strongly prefer porting an example over inventing a pattern from scratch.

## External references

- User manual: <https://developer.playcanvas.com/user-manual/engine/>
- API reference: <https://api.playcanvas.com/engine/>
- Examples gallery (live): <https://playcanvas.github.io/>
- Engine repo: <https://github.com/playcanvas/engine>
- Org root: <https://github.com/playcanvas>

When fetching docs at runtime, prefer the Context7 MCP (`docs-lookup` skill) over WebSearch — it returns curated, version-specific PlayCanvas reference material.

## Style & conventions in this workspace

- **Vanilla JS only** in the demo (no TypeScript transpilation, no JSX). The runtime is pure ESM.
- **Single-file demo.** Don't split `demo/index.html` into multiple files unless the size grows past ~50 KB and the user asks.
- **No comments unless the *why* is non-obvious** (per the user's global instructions). Examples of comments worth keeping in `demo/index.html`: the cone-position math (the geometry is otherwise inscrutable), the v2 API note on `fog`. Don't restate what the code does.
- **No emojis** in any file written by Claude.
- **Use `pc.*` namespace** consistently (`import * as pc from 'playcanvas'`), not named imports — matches the engine's own examples.
- **Update materials after mutation** (`mat.update()`).
- **Reuse `pc.Vec3` / `pc.Color` instances** in hot paths if performance matters; the demo is small enough that allocation in `update` is fine, but keep an eye on it for larger scenes.

## When the user asks for "a feature"

Before writing code:

1. Check `engine/examples/src/examples/<category>/` for an existing example that does something similar.
2. Verify the API in `engine/playcanvas.d.ts` or `engine/src/` — do not rely on memory of v1 APIs.
3. If introducing a new dependency or runtime asset, surface the size cost and confirm with the user given the disk constraint.
4. Implement, then verify visually via the Playwright workflow above.
5. Keep the no-build, single-HTML architecture unless the user explicitly opts into a bundler.
