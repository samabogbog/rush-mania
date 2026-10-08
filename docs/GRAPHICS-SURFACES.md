# Textured environment and lighting

Six shared original procedural surface families (grass, dirt, stone, wood, plaster, water) add material detail without external downloads. Each uses a 128×128 mipmapped albedo and normal texture. Albedo keeps 60% of the original texture contrast, and normal relief is deliberately subtle. World-space UV projection keeps scale consistent across merged meshes and map sectors. Vertex colors preserve each zone's palette; static meshes batch by surface family.

Warm directional sunlight with a cooler sky fill adds depth. The shadow camera follows the player across the full 96×96 map. High uses a 2048 shadow map with a 20-tap Gaussian kernel on a half-resolution blur target; Auto retains its 512 map with a 10-tap kernel. Both use blurred close exponential filtering to soften polygon silhouettes; shadow darkness is reduced. Low keeps albedo textures, disables bump sampling and shadows, and uses reduced texture filtering. Switching quality reuses the cached texture library.

## Verification

- Browser screenshots reviewed for all six maps and phone layout; no page errors or model loading errors.
- Repeated High/Low switching preserves models, touch controls, and bounded texture/mesh counts.
- NullEngine map checks preserve collision proxies and vertex colors. Geometry has exactly the same vertex count before and after for all six zones: Town166247, Glade179533, Orchard187573, Marsh89441, Frost49831, Ruins24109. The old120000 test budget predates existing town/orchard art; updated to220000.
- Production TypeScript/Vite/worker build passes. Existing large-chunk warning remains.
- Screenshot/diagnostic evidence: `artifacts/graphics-upgrade/`. Headless Chromium uses software rendering; these measurements do not establish FPS on a player's GPU.

Source: `src/render/surface-materials.ts`, `primitives.ts`, `environment-art.ts`, `src/world.ts`. No balance, account, database, or networking changes.
