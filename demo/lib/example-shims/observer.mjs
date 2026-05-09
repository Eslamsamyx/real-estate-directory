// Shim for the engine examples' `examples/observer` module.
// Re-exports the official @playcanvas/observer package vendored alongside playcanvas.mjs,
// and exposes the `data` Observer + `refresh` no-op that examples expect.

import { Observer } from '../../vendor/observer.mjs';

export const data = new Observer({});
export function refresh() { /* no live editor to re-render */ }
