# Lv30 VFX review

All six Lv30 branch skills now have distinct authored 3D effects: Iron Guard Crash uses a four-pillar fortress impact; Field Recovery Burst uses crossed beams and a helix; Arcane Barrier Crash uses a triangular prism; Spore Hex uses orbital hoops and spores; Evasive Stance Crash uses wing-shaped slashes; Scatter Volley uses a six-beam fan and moving arrows.

Three expanding waves reach a 6.6-unit decorative radius. Immediate release, 0.32-second primary beams, 0.6-second waves and radial particles preserve the existing game-hit/choreography callback. The runtime diff is confined to skill-vfx.ts. Gameplay ranges, damage, cooldowns, skill definitions, saves and networking are unchanged; Lv10/Lv20 releases retain their behavior.

Reviewed all six high-quality impact frames, late waves and representative Low frames. The contact sheet shows the distinct branch silhouettes. Actual-cast movies were reviewed through twelve-frame samples from their final four seconds: onset, expansion and recovery are visible at the game camera. This Lv30 visual scope is approved; no whole-game art score or player-device FPS is claimed.

Validation: 15 focused checks passed across the original completed checks and the two successfully repeated browser-family checks. All six actual rank1 casts spent MP, began cooldown, killed four nearby fixture enemies and returned to zero active VFX. The fixture genuinely learns the Lv10/Lv20 prerequisites, learns Lv30 through UI, moves through the map and casts via keyboard input. Render-only previews do not change gameplay. npm run build passed with the existing large-chunk warning.

Environment: headless Chromium ANGLE SwiftShader software rendering. Low-quality real gameplay and independent High/Low previews are separated. validation.json records comparative idle/burst frame p50/p95, draw calls, scene meshes and material counts. These software-renderer timings do not certify player hardware performance. The shared pool remains capped at 40 Low / 96 High active and 160 allocated meshes; overlap, expiry and disposal have dedicated checks.

QA fixture failures were resolved without changing runtime: Vite's first dependency optimization invalidated shader module URLs; the local dev server later stopped across a turn interruption. It was restarted and HTTP200 readiness checks were added. Continuous-release polling now reads the active counter directly, avoiding unnecessary skinned-vertex bounds calculations on every frame; it has a bounded30-second software-renderer timeout. Repeated final captures have zero model/page errors.

Assets: original procedural Babylon.js geometry and shared materials. No new downloads, textures, sprites or billboards. PNG/JSON and motion contact sheets are retained; raw WebM recordings stay local.
