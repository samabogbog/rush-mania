# Lv20 VFX review

Scope: all six Lv20 branch skills. Runtime change is confined to `src/render/skill-vfx.ts`; no skills, simulation, save, network or damage tables changed.

- Whirlwind: luminous pillar, rapidly expanding spinning crescent blades and radial light streaks.
- Concussion: impact pillar, shield pulse and flying stone fragments.
- Frost Nova: icy pillar, rising crystal spires and airborne ice fragments.
- Restoring Dew Burst (existing attack skill): green pillar, botanical helix and petal burst.
- Arrow Rain: golden pillar, descending arrows and radial light streaks.
- Venom Dart: purple pillar, toxic helix and dispersed motes.

Three expanding volumetric rings and the radial fan reach approximately 5.6 world units. This is decorative reach, not the damage radius. The release starts immediately at the existing impact callback; the primary beam lasts 0.28 seconds, the wave 0.52 seconds, and the particle fan 0.55 seconds. No textures, sprites or billboards were introduced.

Visual inspection: all six high-quality 240 ms frames reviewed individually, plus impact-onset and low-quality late-wave frames. `contact-high.png` summarizes the six families. The actor and effect shapes remain readable at game camera distance. Low quality retains the hero silhouette with fewer fragments. Approved for this Lv20 VFX scope; this is not an assessment of overall MMORPG readiness.

Environment: headless Chromium with ANGLE SwiftShader software rendering. PNG/JSON captures are packaged; local WebM files contain continuous releases and authentic learned casts. Render-only previews never mutate gameplay. Actual casts use a level100 practice-save fixture, a genuinely learned Lv10 prerequisite, learned Lv20 rank1, real map movement and keyboard hotbar input. Actual gameplay runs in Low; both Low and High are covered by the independent visual fixture. Software-renderer traversal in High exceeded the navigation timeout during the first attempt; no runtime change was made to hide that limitation.

Pool limits remain 40 active in Low, 96 in High and 160 allocated meshes. Repeated overlapping effects, expiry and disposal are checked by the Lv20 unit tests; Lv10 regression checks also retain their existing shape/timing behavior. These bounds do not certify device FPS.

Assets: authored procedural Babylon.js geometry and existing shared materials; no new external assets.

Validation: 13 focused checks passed across the completed preview/regression run and final actual-cast/unit run. `npm run build` passed with the existing large-chunk warning. Each of the six actual casts killed four nearby fixture enemies; MP decreased, cooldown began and active VFX returned to zero. See `validation.json` and per-skill captures.
