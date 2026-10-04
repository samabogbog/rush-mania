# Authored mesh character review

Final combined application freeze verified: all 11 targeted mesh-character checks passed on 2026-10-04 (2.9 minutes). The controller accepted this candidate for the requested mesh-replacement scope; these test results do not award a whole-game art score.

The selected assets are Kay Lousberg's CC0 KayKit Adventurers Knight (swordsman), Mage (mage), and Rogue with crossbow (archer). Canonical source commit is `672074b73ba276876a19e8816ecdc5241817ab47`. Source license, untouched three GLBs, SHA-256 hashes, exact motion aliases and selected props are retained in the source package and runtime manifest. The ranged character uses a crossbow; its gameplay class name does not imply a longbow asset.

`tests/mesh-characters.spec.ts` executed eleven targeted checks: source/runtime GLB provenance and rigs; three class Babylon closeups, low/high materials and sampled motion recordings; six class/quality desktop/mobile gameplay captures with genuine movement and target selection; and one genuine learned mage cast. The independent preview scene uses the actual runtime ModelLibrary and the same GLBs. Its motion recordings are render-only and do not assert gameplay damage. It samples bone positions and world bounds at three times for each of idle, walk, attack, skill/cast, hurt and death, plus a 1.6-second death tail (2.4 seconds total); this is not an audit of every frame.

Environment: headless Chromium with ANGLE SwiftShader software WebGL. Render timing from this environment cannot establish desktop/mobile player hardware FPS.

Final readiness: application source and public files were frozen by both mesh integration and EXP-item owners. Page and `/api/game` returned HTTP 200 before QA. `npm run build` passed TypeScript, Vite and worker bundling after the combined freeze (integration log `.local/mesh-exp-final-build.log`; Vite 45.61 seconds). The final 11-check browser run is recorded in `.local/mesh-character-final-qa.log`. Earlier fixture attempts and old test suites are not included in this count.

## Final authored assets

| Class | Authored source | Runtime bytes | Vertices | Render meshes | Skin joints | Selected props |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| swordsman | Knight.glb | 645,324 | 4,920 | 10 | 41 | Knight_Helmet, Knight_Cape, 1H_Sword, Badge_Shield |
| mage | Mage.glb | 600,688 | 4,304 | 9 | 41 | Mage_Hat, Mage_Cape, 2H_Staff |
| archer | Rogue.glb | 605,048 | 4,509 | 8 | 41 | Rogue_Cape, 2H_Crossbow |

Each source GLB contains 76 actual source clips. Each runtime GLB retains one skin, one texture/material atlas and exactly 11 aliases drawn from source animation channels. The three untouched canonical sources and CC0 license are retained under `art/characters-mesh/kaykit/`; source SHA-256 and pinned commit are recorded in `public/models/manifest.json` and `source-pin.json`.

| Runtime motion | Knight | Mage | Rogue |
| --- | --- | --- | --- |
| idle | Idle | Idle | Idle |
| walk | Walking_A | Walking_A | Walking_A |
| run | Running_A | Running_A | Running_A |
| attack | 1H_Melee_Attack_Slice_Diagonal | Spellcast_Shoot | 2H_Ranged_Shoot |
| attack-heavy | 1H_Melee_Attack_Chop | Spellcast_Long | 2H_Ranged_Shooting |
| skill | 1H_Melee_Attack_Stab | Spellcast_Raise | 2H_Ranged_Shoot |
| skill-heal | Use_Item | Spellcast_Raise | Use_Item |
| skill-guard | Block | Spellcasting | Block |
| skill-ultimate | 1H_Melee_Attack_Slice_Horizontal | Spellcast_Long | 2H_Ranged_Shooting |
| hurt | Hit_A | Hit_A | Hit_A |
| death | Death_A | Death_A | Death_A |

## Explicit visual limits

The models are authored stylized low-poly meshes, including intentionally faceted helmets, clothes and weapons. They replace the primitive anatomical assembly and introduce modeled faces, hair and garments; this does not assert a smoothly subdivided sculpt. The archer uses a crossbow. Existing armor stats, equipped-item UI and save/server rules remain gameplay concerns; the fitted class garments replace the old primitive armor box, so distinct armor-set external geometry/color identity is currently absent. Accessory and refinement socket decorations remain in the consuming world. Low quality retains the hero atlas using a restricted PBR clone (at most two lights, no reflection/bump) and disables shadows. Vertex-color monsters continue to use StandardMaterial. This preserves the glTF sRGB color pipeline; directly reusing the uploaded sRGB atlas in StandardMaterial produced a near-black Knight and was corrected before final verification.

## Final observed evidence

The three class GLBs load with `modelErrors = 0`; all six class/quality gameplay runs and the real mage-cast run report no page errors. Each runtime character has one shared rig, one colored atlas, exactly 11 mapped source clips, normal buffers on every visible mesh, the selected class props and no stack of alternative source weapons. Front and side views prove the face direction is +Z. Low-quality palette now agrees with high: the Knight is gray with brown belt and red cape instead of near-black. The consuming-world low screenshot confirms this correction.

The 1200×800 desktop and 390×844 mobile captures cover every class in both low and high quality. No horizontal document overflow was observed. Movement used actual `d` input and verified world X changed by more than 0.5m; actual `Tab` input selected a monster, with selected target retained in gameplay JSON. The mage test used a learned/assigned skill through key `1`, observed an active `mage-10` cast, MP spending and cooldown, then resolution and target damage/kill. Render-only studio motion captures are separate from this gameplay evidence. Sampled bones changed during walk, attack, cast, hurt and death for all three classes. Root X/Z remained zero in the sampled clips.

Grounding is approximate rather than perfect. CPU-skinned leg world-Y minima, sampled at the recorded poses, ranged from -0.025m to +0.055m for Knight, -0.032m to -0.000m for Mage, and -0.050m to +0.030m for Rogue during living motions. Positive minima can be a lifted foot. Idle minima were near zero. Final source `Death_A` ends in a reclined seated pose with the weapon held; boot minima were approximately -0.107/-0.096m (Knight), -0.112/-0.091m (Mage), and -0.102/-0.105m (Rogue). The final death boots partly intersect the flat review ground. This is retained source-clip behavior, not a claim of zero clipping. Bounds JSON includes source/rest mesh bounds; live grounding values come from the CPU-skinned position samples, not those static boxes.

Inspected evidence includes all three front closeups, Knight low/high and low-world proof, mobile Mage gameplay, the three movie filmstrips and full death-tail screenshots. Materials, faces, modeled garments, selected props and ground shadows render coherently in these observed poses. The evidence does not certify every animation frame, every skill variant or player-hardware FPS.

Artifacts: `artifacts/mesh-characters/` retains 12 front/side class/quality PNGs, 18 motion pose PNGs, 12 class/quality desktop/mobile gameplay PNGs, one genuine cast PNG, three filmstrip previews and ten JSON evidence files. Three full per-class WebM recordings are local review artifacts and ignored by Git, together with Playwright's intermediate video folder. The source package contains exactly three canonical character GLBs, three exported runtime GLBs (27 visible meshes, 13,733 vertices, 1,851,060 bytes total), upstream CC0 license/readme and source pin/hash evidence.

## Controller judgment

The controller opened the final low-quality Knight front, high-quality Mage/Rogue fronts and actual low-quality gameplay evidence, and accepted this candidate for the user's authored-mesh replacement scope. Modeled faces, garments and armor, correct atlas palette and selected props were accepted. No numerical whole-game score is awarded. The known faceted geometry, crossbow alias, fitted-armor appearance limitation and source walk/death-ground intersection remain explicit review limits.

Final combined targeted validation totals 20 passing tests: 11 mesh-character checks described above plus nine EXP-item/admin checks reported by their owner after the combined source freeze. The final combined build also passed. The entire 142MB upstream vendor clone is excluded from Git; the three canonical GLBs, license/source-pin evidence and representative PNG proof are retained. The rejected authored candidate preserves its `.blend` source and PNG review proof while backup/export files remain local.
