# Lv60 VFX review

Reviewed all six actual v4 icons, descriptions, Low/High six-skill sheets, all three Lv50/Lv60 comparisons and the six genuine gameplay motion sheets. Approved the Lv60 visual scope for release: crimson radial shout, forward crimson thrust, violet focus lance, elevated golden crescent beam, layered olive/gold aiming eye and cyan arrow with forked gold voltage. Lv60 extends the late decorative wave from 9.2 to 10.8 units and the finale from 0.98 to 1.22 seconds. These are visual dimensions, not damage range.

Build and 55 checks passed after the final runtime freeze: 46 code/authority/timing/pool checks plus nine browser checks. All six learned rank1 casts displayed their own Lv60 release cue and motion, consumed MP, started cooldown, increased kills and returned active VFX to zero. Moonbeam continued to display through damage during its 1.5 second cast (HP 1285.79 to 1260.30 in the captured cast samples). Fixed the original hurt-triggered visual cancellation without changing simulation cast rules. Hunter Focus's complete eyelids now stay above ground. Zero model/page errors.

96 comparison frames use one camera per class and identical Low/High essential forms. Pool/disposal stress checks retain 40 Low / 96 High active and 160 allocated. Gameplay fixtures use level100 practice heroes and ordinary learned prerequisites; no damage, enemy health, or simulation state mutation during recording. Original procedural geometry/materials; no new external assets. This approves this VFX release, not a whole-game art score or real-device performance certification. Close zoom can temporarily overlap an enemy with the focal sculpture before the wave expands and clears.

Performance samples use Chromium151 ANGLE SwiftShader; software renderer measurements are comparisons on this machine, not player-device FPS. Frame p50/p95 and draw counts below compare idle with frozen impact frames. Preview is render-only; genuine casts use learned rank1 skills through UI. Raw WebM remains local.

| Skill | Quality | Idle p50/p95 ms | Impact p50/p95 ms | Draw calls idle/impact | VFX draws | Meshes/materials |
| --- | --- | --- | --- | --- | --- | --- |
| swordsman-5 | High | 66.9/152.9 | 78.3/126.3 | 11/52 | 41 | 60/6 |
| swordsman-6 | High | 66.9/152.9 | 70.0/136.1 | 11/52 | 41 | 93/10 |
| swordsman-b-5 | High | 66.9/152.9 | 75.4/128.0 | 11/59 | 47 | 135/16 |
| swordsman-b-6 | High | 66.9/152.9 | 74.0/99.4 | 11/54 | 43 | 143/21 |
| swordsman-5 | Low | 47.5/104.7 | 76.9/113.6 | 11/32 | 21 | 143/22 |
| swordsman-6 | Low | 47.5/104.7 | 80.0/114.8 | 11/28 | 17 | 143/22 |
| swordsman-b-5 | Low | 47.5/104.7 | 74.9/114.5 | 11/39 | 27 | 143/22 |
| swordsman-b-6 | Low | 47.5/104.7 | 70.7/98.7 | 11/30 | 19 | 143/22 |
| mage-5 | High | 54.4/123.8 | 77.2/140.7 | 10/61 | 51 | 70/6 |
| mage-6 | High | 54.4/123.8 | 73.6/82.8 | 10/54 | 44 | 113/14 |
| mage-b-5 | High | 54.4/123.8 | 90.4/143.5 | 10/62 | 52 | 126/18 |
| mage-b-6 | High | 54.4/123.8 | 89.5/134.9 | 10/56 | 46 | 165/24 |
| mage-5 | Low | 50.6/107.6 | 82.9/171.1 | 10/41 | 31 | 165/26 |
| mage-6 | Low | 50.6/107.6 | 78.1/107.3 | 10/30 | 20 | 165/26 |
| mage-b-5 | Low | 50.6/107.6 | 86.8/137.7 | 10/42 | 32 | 165/26 |
| mage-b-6 | Low | 50.6/107.6 | 80.0/157.8 | 10/32 | 22 | 165/26 |
| archer-5 | High | 62.0/144.1 | 84.7/175.5 | 9/58 | 49 | 71/6 |
| archer-6 | High | 62.0/144.1 | 75.5/100.9 | 9/56 | 47 | 112/11 |
| archer-b-5 | High | 62.0/144.1 | 95.5/132.1 | 9/60 | 51 | 147/15 |
| archer-b-6 | High | 62.0/144.1 | 63.3/111.4 | 9/52 | 43 | 181/19 |
| archer-5 | Low | 40.0/118.7 | 83.2/156.0 | 9/38 | 29 | 181/21 |
| archer-6 | Low | 40.0/118.7 | 75.3/114.4 | 9/32 | 23 | 181/21 |
| archer-b-5 | Low | 40.0/118.7 | 92.6/158.8 | 9/40 | 31 | 181/21 |
| archer-b-6 | Low | 40.0/118.7 | 68.8/101.2 | 9/28 | 19 | 181/21 |
