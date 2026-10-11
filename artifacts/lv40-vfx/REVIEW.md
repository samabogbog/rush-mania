# Lv40 VFX review

Runtime review: all six Lv40 skills have distinct class/branch silhouettes, broader 7.8-unit decorative waves than Lv30 (6.6), and longer principal impact layers. Reviewed the six high/low impact frames, late waves, all three Lv30 comparison sheets, and sampled continuous preview/gameplay recordings. The gameplay motion sheets show impact, expansion and recovery; final snapshots confirm zero active VFX. This approves the local Lv40 visual scope for user review; it does not certify a whole-game art score, production rollout, or player-device FPS.

Source and reproduction details: `docs/LV40-VFX-TH.md`. `validation.json` records the tested runtime digest, environment, all six real casts and comparison measurements. `lv40-six-skills.png` and `lv40-low-six-skills.png` are render-only previews. `*-gameplay-motion.png` and `*-recovered.png` come from learned rank1 skills cast through real practice-game controls. All final model/page error counters are zero.

Build passed. 41 distinct checks passed on the final frozen runtime (32 code checks, 9 browser checks); repeated QA captures are not added to the count. Source diff is confined to `src/render/skill-vfx.ts`; no damage, cooldown, range, save or online authority changes. Assets are original procedural geometry/materials; no external asset downloads. Pool limits remain 40 Low / 96 High active and 160 allocated.

Measured below using Chromium 151 ANGLE SwiftShader on Debian13 x86_64, Node24.19.0. Impact is frozen during frame-cost sampling; this compares render cost with idle in the same fixture, not full gameplay/device FPS. Player hardware desktop60/mobile30 targets remain unverified. Tall Lightning may extend outside a close gameplay zoom, and solid hero layers can briefly obscure the target; later waves reopen the view. Local WebM recordings are retained but ignored by Git. Nothing was pushed or deployed.

| Skill | Quality | Idle p50/p95 ms | Impact p50/p95 ms | Draw calls idle/impact | Impact VFX draws | Meshes/materials |
| --- | --- | --- | --- | --- | --- | --- |
| swordsman-4 | High | 68.0/170.5 | 96.9/167.4 | 11/59 | 47 | 82/10 |
| swordsman-b-4 | High | 68.0/170.5 | 107.6/195.4 | 11/60 | 49 | 157/16 |
| swordsman-4 | Low | 66.7/143.8 | 94.5/212.0 | 11/37 | 25 | 157/17 |
| swordsman-b-4 | Low | 66.7/143.8 | 102.0/190.1 | 11/38 | 27 | 157/17 |
| mage-4 | High | 57.3/141.1 | 106.8/160.3 | 10/60 | 50 | 118/17 |
| mage-b-4 | High | 57.3/141.1 | 110.6/160.5 | 10/60 | 50 | 183/29 |
| mage-4 | Low | 53.9/150.0 | 100.5/171.7 | 10/38 | 28 | 183/30 |
| mage-b-4 | Low | 53.9/150.0 | 92.7/133.3 | 10/38 | 28 | 183/30 |
| archer-4 | High | 80.3/186.5 | 103.3/207.7 | 9/60 | 51 | 115/9 |
| archer-b-4 | High | 80.3/186.5 | 98.8/203.0 | 9/61 | 52 | 169/22 |
| archer-4 | Low | 53.7/102.6 | 93.7/174.1 | 9/38 | 29 | 169/24 |
| archer-b-4 | Low | 53.7/102.6 | 99.0/179.5 | 9/39 | 30 | 169/24 |
