# Production visual review

This review covers the current visual production pass, not certification of a production MMORPG. The user supplied a baseline of 5/10. The controller reviewed rendered game screenshots, authored motion recordings and contact sheets; passing automated tests alone did not determine art scores.

## Accepted controller scores

| Area | Weight | Score |
| --- | ---: | ---: |
| Characters and monsters | 25% | 8.0 |
| Environment | 20% | 7.8 |
| Motion | 20% | 8.0 |
| Skill effects | 20% | 8.2 |
| Icons | 15% | 8.4 |

Weighted result: **8.06/10, approximately 8.1**. These are explicit controller review judgments for this art scope. They do not establish overall MMO readiness. Roles, ownership, rejection and evidence requirements are recorded in [PRODUCTION-RULES.md](PRODUCTION-RULES.md).

## Delivered and reviewed

The project contains 29 original, project-authored rounded GLB assets with one palette material each. The three heroes have 11 animation clips, 13 joints for swordsman/mage and 14 for the archer. The archer includes an animated bow-string nock and authored two-bone arm poses. Sixty distinct skill PNGs use consistent icon framing; twelve transparent illustrated effect textures provide colored focal effects. Sources and manifests remain in the project for reproduction; no third-party model provenance is claimed.

The existing gameplay contracts remain: six slots accept skills, four auxiliary slots accept supported consumables, and each class has twenty skills across two ten-stage paths with one choice at each stage. Authority, save migration and retry behavior were regression-tested separately from art previews.

## Corrections made after rejected reviews

- Initial generic silhouettes and repeated visual treatments were replaced with distinct armor, robes and bow poses, rounded expressive monsters and unique skill illustrations.
- Ground ribbons initially lacked UV attributes and broke static mesh merging. UV consistency and all-six-map merge/collision/budget regression checks now cover that failure. Paths, plaza, cottages, NPCs and ground variation received further composition reviews.
- Weapon clearance, bow grip, feet and death-floor placement were corrected in authored poses. Sampled exported-GLB checks support contact and clearance evidence; they do not prove every continuous animation frame. The final death geometry no longer sinks below the ground.
- Thin effects failed the visual gate. Illustrated sprites replaced them. Additive blending subsequently washed colored art into white blobs; alpha-combine blending, emissive textures and corrected texture orientation restored readable colors and an upright, grounded world tree. Fresh full-game colored peaks were reviewed after the fix.
- Mobile HUD overlap was corrected with separate D-pad, hotbar and wallet/community zones. Desktop and mobile skill-path UI screenshots were reviewed.

## Verification and evidence

The current frozen candidate passed **53 distinct unit/API cases**: four skill-path cases and 49 progression, equipment, refinement, regeneration, economy, admin, operations, online authority, geometry and VFX cases. Two skill-path browser cases also passed, giving **55 cases before art verification**. The final `npm run build` passed after the last generated death-floor asset correction. All nine art cases passed across the separately completed Mage High case and eight remaining cases: both qualities for all three classes, town/mobile rendering, all sixty icon mappings and a real learned Mage cast. Four additional current browser cases passed: desktop HUD/refinement, online peer/chat/reconnect/save reload, party/trade/escrow market, and missing-identity handling. **Final total: 68 distinct passing cases (53 unit/API + 6 UI/online browser + 9 art).** Actual WASD movement was asserted in the five remaining class/quality cases; the earlier quick Mage High capture explicitly did not verify movement.

Representative evidence:

- [Skill icon contact sheet](../art/skills/contact-sheet.png)
- [Effect contact sheet](../art/vfx/contact-sheet.png)
- [Fresh Astral effect](../artifacts/production/mage-high-mage-10.png)
- [Fresh world-tree effect](../artifacts/production/mage-high-mage-b-10.png)
- [Desktop skill-path UI](../artifacts/skill-paths-1200.png)
- [Mobile skill-path UI](../artifacts/skill-paths-mobile.png)
- [Town desktop](../artifacts/production/town-high-1200.png)
- [Town mobile](../artifacts/production/town-high-mobile.png)

Final three-class six-clip motion recordings are local evidence under `artifacts/chibi-final-*-motions.webm`, reviewed by the controller. Video files and superseded iterations are intentionally excluded from source packaging; they remain in the workspace. Full-game preview videos contain natural timelines followed by explicitly held render-only peak frames. Held frames at effect ages 0.35 and 0.65 support visual inspection and do not change simulation, MP, cooldowns, saves or online authority.

## Limits and remaining production work

Browser measurements use headless Chromium with ANGLE SwiftShader software rendering. They are diagnostic observations, **not hardware FPS benchmarks**. The desktop 60 FPS/mobile 30 FPS goals still require real target-device testing. Pool bounds and cleanup checks do not substitute for device performance or concurrent-player load tests. Overall MMO content, long-term economy, deployment operations and production reliability remain separate work.

Browser fixture interruptions from unavailable localhost services or concurrent HMR were classified separately from product failures. Final evidence uses frozen sources with service readiness checked before launch. QA observes actual movement/state changes rather than treating key presses or DOM assertions as proof of action.

Superseded browser fixtures that assume seven-joint actors, native graphics selects or the former skill-assignment combobox were not counted as current verification. The new skill-path UI checks cover current assignment; current art checks cover actor loading, draw diagnostics and effect cleanup.

Representative current frozen-scene measurement (Swordsman Low, 1200×800 viewport, 20 post-load RAF samples): p50 **316.7 ms**, p95 **450 ms**, 23 idle draw calls and 20 attached rigged actors. Actual WASD movement was verified. After four skill-preview sequences the effect pool contained 17 objects, active effects returned to zero, and scene meshes changed from 99 to 124 within the allocated pool/template bound. [Raw diagnostics](../artifacts/production/swordsman-low-metrics.json) include the software-renderer qualification. This sample does not establish a before/after speedup or target-device frame rate.

| Current software sample | Frames | p50 ms | p95 ms | Idle draws | Pool after cleanup |
| --- | ---: | ---: | ---: | ---: | ---: |
| Swordsman Low | 20 | 316.7 | 450.0 | 23 | 17 |
| Swordsman High | 20 | 1083.3 | 2683.2 | 44 | 27 |
| Mage Low | 20 | 316.7 | 383.3 | 23 | 19 |
| Archer Low | 20 | 316.6 | 399.9 | 23 | 13 |
| Archer High | 20 | 1083.3 | 1249.9 | 44 | 27 |

All these sequences ended with zero active effects and zero model-loading errors. The Mage High quick capture used only five frame samples and is deliberately excluded from this measurement table. Every value above comes from software rendering and cannot predict player hardware performance.

Final logs: `/tmp/production-final-unit.log`, `/tmp/production-final-skill-ui.log`, `/tmp/production-held-final-proof.log`, `/tmp/production-final-art.log`, `/tmp/production-final-browser.log`, and `/tmp/production-final-build.log`. Local logs and videos are workspace evidence, not source-package dependencies.
