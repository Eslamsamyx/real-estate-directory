# PlayCanvas Workspace

This workspace pairs the **cloned PlayCanvas engine source** with **four self-contained interactive 3D demos** that use it. Built as a working starting point for exploring PlayCanvas (`https://github.com/playcanvas`).

```
.
├── demo/
│   ├── index.html                  # gallery hub (start here)
│   ├── pavilion.html               # Scene 01 — Crystal Pavilion
│   ├── gltf-studio.html            # Scene 02 — glTF Studio (PBR + IBL)
│   ├── splat-stage.html            # Scene 03 — Splat Stage (3D Gaussian Splat)
│   ├── material-lab.html           # Scene 04 — Material Lab (PBR matrix)
│   ├── thumbs/                     # Hub thumbnails
│   └── vendor/playcanvas.mjs       # PlayCanvas v2 ESM build (3.5 MB), vendored
├── engine/                         # Shallow clone of github.com/playcanvas/engine (786 MB)
├── CLAUDE.md                       # Project guide for Claude Code
└── README.md                       # This file
```

## Run

```sh
python3 -m http.server 4321
# then open http://localhost:4321/demo/
```

Any static server works (`npx serve`, `caddy file-server`, `php -S`, etc.). No build step. Modules load instantly from the local vendor directory.

## The four demos

| # | Demo | What it shows | Engine features exercised |
| --- | --- | --- | --- |
| **01** | **Crystal Pavilion** | Eight emissive diamond crystals orbiting a glowing pedestal. Click to pulse, drag to orbit, idle auto-rotates. | Procedural geometry, scene graph, ray-sphere picking, animated emissive PBR materials, hand-rolled orbit camera, fog, tone mapping |
| **02** | **glTF Studio** | A statue model (`statue.glb`) lit by an HDR-derived environment atlas. Live controls toggle skybox, IBL, exposure, auto-rotate. | `pc.Asset` + `pc.AssetListLoader`, glTF 2.0 container instantiation, image-based lighting (`scene.envAtlas`), automatic AABB-based camera framing |
| **03** | **Splat Stage** | A 3D Gaussian Splat capture of a guitar (`guitar.compressed.ply`, ~91K splats) — PlayCanvas's flagship feature. | `gsplat` asset type, `gsplat` component with `unified: true`, antialiasing disabled (splats don't benefit), Y-flip for PLY convention |
| **04** | **Material Lab** | 5×5 sphere matrix sweeping metalness × gloss under PBR + IBL. Hover any sphere to inspect its values. | PBR parameter visualization, three-point lighting, ray-sphere hover-pick, environment reflections on metals |

Each demo is a single HTML file (~14–28 KB) with inline CSS and a single `<script type="module">` block. They share `vendor/playcanvas.mjs` and pull engine assets directly from `engine/examples/assets/`.

Interactions across all demos: **drag to orbit, scroll to zoom**, plus per-demo extras (click to pulse, hover to inspect, panel toggles).

## Why CDN-vendored instead of npm

The host filesystem was tight (<1 GB free) so `npm install` of a Vite + PlayCanvas project (typically 200-400 MB of `node_modules`) wasn't viable. Instead, the engine's published ESM build (`playcanvas.mjs`, ~3.5 MB) was downloaded once and committed to `demo/vendor/`. Each HTML file resolves the bare `playcanvas` import via importmap to the local copy. No tooling, no build, no network at runtime.

## What you get from `engine/`

The shallow clone is the source for the package on npm. Notable directories:

- `engine/src/` — the engine itself (scene, framework, graphics, math, physics, animation, XR, sound)
- `engine/examples/` — runnable demos in many categories: `animation/`, `camera/`, `compute/`, `gaussian-splatting/`, `gizmos/`, `graphics/`, `input/`, `loaders/`, `materials/`, `physics/`, `shaders/`, `sound/`, `user-interface/`, `xr/`
- `engine/examples/assets/` — glTF models, cubemaps, splats, textures, animations, sounds (used directly by the demos here)
- `engine/scripts/` — small utility scripts (camera controllers, post-effects)
- `engine/playcanvas.d.ts` — full TypeScript type definitions

To rebuild from source (needs ~500 MB of `node_modules`): `cd engine && npm install && npm run build`.

---

## What else is in `github.com/playcanvas`

The org has 80+ repos. The engine is the foundation — most others are tools, integrations, and ecosystem pieces around it. Highlights, by category:

### Core engine + scaffolding
| Repo | What it is |
| --- | --- |
| **engine** (15K★) | The 3D engine on WebGL2/WebGPU — what we cloned and used |
| **create-playcanvas** | `npm create playcanvas@latest` — official project scaffolder |
| **playcanvas.github.io** | Live examples site for the engine |
| **api-reference** | The `api.playcanvas.com` reference docs source |
| **developer-site** | The `developer.playcanvas.com` user manual source |

### Editing & tooling
| Repo | What it is |
| --- | --- |
| **editor** (1K★) | The browser-based visual editor (the SaaS product, open-source client) |
| **vscode-extension** | VS Code integration for editor projects |
| **editor-mcp-server** | MCP server so AI agents can drive the Editor |
| **playcanvas-sync** | Live two-way file sync between editor cloud and local disk |
| **playcanvas-rest-api-tools** | CLI helpers around the editor REST API |
| **texture-tool** | GPU texture authoring/inspection tool |
| **playcanvas-inspector** | Chrome devtools-style inspector for shipped apps |

### UI for tools
| Repo | What it is |
| --- | --- |
| **pcui** | Component library used by editor tooling (panels, trees, inputs) |
| **pcui-graph** | Node-based graph editor built on pcui |
| **observer** | TS implementation of the Observer pattern (data binding for pcui) |

### Framework integrations
| Repo | What it is |
| --- | --- |
| **react** | Declarative React bindings (`<Entity>`, `<Camera>`, `<Light>` …) |
| **web-components** | Native custom elements (`<pc-app>`, `<pc-entity>` …) — no framework required |
| **playcanvas-webpack** | Webpack reference setup |
| **playcanvas-editor-ts-template** | TypeScript template that round-trips with the editor |

### Gaussian Splatting
| Repo | What it is |
| --- | --- |
| **supersplat** (5.6K★) | Browser-based 3DGS editor (load, edit, segment, export splats) |
| **supersplat-viewer** | Standalone viewer for 3DGS scenes |
| **splat-transform** | CLI/library for transforming, compressing, converting `.ply` / `.compressed.ply` / `.ksplat` |
| **model-viewer** | Drag-and-drop viewer for glTF and 3DGS — also a `<model-viewer>` web component |

### XR & geospatial
| Repo | What it is |
| --- | --- |
| **playcanvas-ar** | Marker-based AR (jsartoolkit) integration |
| **earthatile** | Engine-agnostic 3D Tiles streaming (Google Photorealistic Tiles, Cesium ion) |

### Plugins & integrations
| Repo | What it is |
| --- | --- |
| **playcanvas-spine** | Spine 2D skeletal animation runtime |
| **playcanvas-tween** | Tweening library |
| **playcanvas-p2.js** | 2D physics via p2.js (alongside the engine's built-in 3D ammo physics) |
| **playcanvas-facebook** | Facebook Instant Games SDK glue |

### Misc / curiosities
| Repo | What it is |
| --- | --- |
| **awesome-playcanvas** | Curated list of community resources |
| **FlappyBird** | Reference mini-game (engine-only, no editor) |
| **walkthrough.js** | Interactive web walkthroughs |
| **canvas-mock** | Headless canvas mock for Node-side testing |
| **visual-tests** | Screenshot-based regression tests for the engine |

## Engine feature catalog (from `engine/README.md`)

- **Graphics** — WebGL2 + WebGPU PBR renderer; clustered lighting, shadows, post-effects
- **Gaussian Splatting** — first-class loader/renderer for 3DGS scenes (Scene 03 here)
- **XR** — WebXR for AR + VR with hands, hit-test, anchors
- **Physics** — Ammo.js (Bullet) integration for rigid bodies, joints, raycasts
- **Animation** — state-graph + blend trees, generic property animation, glTF skeletons
- **Input** — mouse, keyboard, touch, gamepad
- **Sound** — 3D positional audio on Web Audio
- **Assets** — async streaming with glTF 2.0 (Scene 02), Draco mesh compression, Basis texture compression
- **Scripts** — TypeScript or JavaScript components; classic ECS-style attachment

## Suggested next steps from this workspace

- Add a glTF with **animation** (e.g. `engine/examples/assets/models/morph-stress-test.glb`) and trigger via `entity.anim`
- Add **post-processing** — bloom would lift Pavilion's emissive crystals and Splat Stage's photoreal capture (`engine/scripts/posteffects/` or v2 render passes)
- Add **physics** — `app.systems.rigidbody` requires `ammo.wasm`; pattern in `engine/examples/src/examples/physics/`
- Try a **larger splat** — drop `apartment.sog` (8 MB) into Splat Stage in place of the guitar
- For a structured project, run `npm create playcanvas@latest` (uses `create-playcanvas` from the org)

## Reference

- User manual: <https://developer.playcanvas.com/user-manual/engine/>
- API reference: <https://api.playcanvas.com/engine/>
- Examples gallery: <https://playcanvas.github.io/>
