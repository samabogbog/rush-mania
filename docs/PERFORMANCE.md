# Performance correction — 2026-10-02

The reported stutter affected Low as well as higher presets. Profiling found several independent costs in the Babylon/DOM presentation layer. The fix does not change saves, combat rules, economic transactions or server authority.

## Findings and changes

- **Forced browser layouts:** each monster-name projection called `getBoundingClientRect()` after earlier labels had written DOM/styles. Canvas bounds are now read once on resize; label elements/text are cached, unchanged text/HP are retained, and labels update at 20 Hz on Low / 30 Hz otherwise.
- **Unused rig animation:** GLTF loading automatically ran the first animation on template containers. Templates now remain stopped; hidden classes and offscreen/dead actors stop their clips and restart on visibility.
- **Low did not bound GPU work:** PBR actors remained enabled and render resolution still scaled with window size. Low now uses shared StandardMaterials, disables shadows, and limits the framebuffer to 518,400 pixels (960×540 at 16:9). Auto starts at 921,600 pixels and reduces to Low when sustained frame time exceeds 40 ms. High is capped at 2,073,600 pixels. DOM UI retains native resolution. Linear GLTF colors are converted for StandardMaterial and restored on switching back to PBR.
- **Excess geometry/draw submissions:** the 2,401-vertex torus used for each ground ring is replaced by a 66-vertex flat outline. Static map pieces with equivalent shading are batched using vertex colors instead of separate meshes by palette color. NPC picking and the ground remain separate.
- **Frame lifecycle:** the manual RAF renderer now calls Babylon `beginFrame` / `endFrame`, so engine time and frame IDs advance correctly.
- **Network movement latency:** the old request loop added another 200 ms after every response. Request duration now counts toward the 200 ms cadence, while retaining one request in flight. Keyboard motion has presentation-only prediction, reconciles to server positions, respects obstacles and map bounds, stops prediction after one second without a snapshot, and stays within 1.6 units of the latest server coordinate. Commands, damage, currency and inventory still await server acknowledgement.

## Measurements

Same local browser, 1280×720 CSS viewport, Low, Moonlit Glade, 20 instantiated rigged actors; four-second warmup followed by a seven-second CDP sample. Chromium used **SwiftShader software rendering** in this workspace. These are comparative cost measurements, not the player's device FPS or a 60 FPS claim.

| Measurement | Before | After |
|---|---:|---:|
| Browser layouts during sample | 377 | 38 |
| Draw calls per frame | 41 | 23 |
| Active animation tracks | 196 | 126 |
| Vertices per ground ring | 2,401 | 66 |
| Rolling frame p95 | 994 ms | 301 ms |

The p95 window includes startup and shader compilation; it is not a steady-state hardware benchmark. A hardware-accelerated browser on the intended player devices still needs an FPS/frame-time test before any B+ performance claim.

## Regression coverage

`tests/performance.spec.ts` exercises delayed server acknowledgement without changing authoritative state, prediction bounds/obstacles/pause reconciliation, framebuffer budgets, stopped template clips, ring geometry, quality switching and advancing engine frame IDs. Existing adventure, mobile, context-loss/picking, class, world, online reconnect and server-authority suites cover gameplay regressions. Screenshots are in `artifacts/performance-low.png` and `artifacts/performance-high.png`.

For a target-device check: open Settings after loading, read FPS and p95, walk/fight for at least 30 seconds, and repeat in Low with the same browser/window size. Browser hardware acceleration and network round-trip time should be recorded separately from graphics preset.

Validation: 33 distinct tests passed across the unit/API, browser regression and performance suites; production TypeScript/Vite/Worker build and `git diff --check` passed.
