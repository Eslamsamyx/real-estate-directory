// Shim for the engine examples' `examples/files` module.
// In the real build, this exposes inline file contents (controls.mjs, shaders, etc.).
// For static viewing we provide an empty dictionary; examples that read from it
// will fall back to their default behaviour.
export default {};
