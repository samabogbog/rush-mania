# Lv70 VFX review

Performance samples use Chromium151 ANGLE SwiftShader; software renderer measurements are comparisons on this machine, not player-device FPS. Frame p50/p95 and draw counts below compare idle with frozen impact frames. Preview is render-only; genuine casts use learned rank1 skills through UI. Raw WebM remains local.

| Skill | Quality | Idle p50/p95 ms | Impact p50/p95 ms | Draw calls idle/impact | VFX draws | Meshes/materials |
| --- | --- | --- | --- | --- | --- | --- |
| swordsman-6 | High | 54.8/120.7 | 58.9/182.2 | 11/52 | 41 | 60/6 |
| swordsman-7 | High | 54.8/120.7 | 87.7/155.0 | 11/59 | 48 | 72/10 |
| swordsman-b-6 | High | 54.8/120.7 | 61.9/153.1 | 11/54 | 43 | 76/15 |
| swordsman-b-7 | High | 54.8/120.7 | 71.7/204.3 | 11/64 | 53 | 125/19 |
| swordsman-6 | Low | 47.5/90.9 | 78.6/112.0 | 11/28 | 17 | 125/21 |
| swordsman-7 | Low | 47.5/90.9 | 76.9/164.7 | 11/29 | 18 | 125/21 |
| swordsman-b-6 | Low | 47.5/90.9 | 77.4/104.2 | 11/30 | 19 | 125/21 |
| swordsman-b-7 | Low | 47.5/90.9 | 81.5/116.2 | 11/34 | 23 | 125/21 |
| mage-6 | High | 53.3/124.0 | 75.8/116.1 | 10/54 | 44 | 63/10 |
| mage-7 | High | 53.3/124.0 | 79.2/188.4 | 10/65 | 55 | 115/14 |
| mage-b-6 | High | 53.3/124.0 | 82.3/146.6 | 10/56 | 46 | 154/20 |
| mage-b-7 | High | 53.3/124.0 | 90.8/140.6 | 10/64 | 54 | 180/24 |
| mage-6 | Low | 49.7/98.0 | 83.7/158.6 | 10/30 | 20 | 180/26 |
| mage-7 | Low | 49.7/98.0 | 83.9/122.0 | 10/35 | 25 | 180/26 |
| mage-b-6 | Low | 49.7/98.0 | 67.1/116.9 | 10/32 | 22 | 180/26 |
| mage-b-7 | Low | 49.7/98.0 | 75.1/107.7 | 10/34 | 24 | 180/26 |
| archer-6 | High | 43.2/108.7 | 59.6/102.5 | 9/56 | 47 | 66/7 |
| archer-7 | High | 43.2/108.7 | 68.3/124.3 | 9/64 | 55 | 82/12 |
| archer-b-6 | High | 43.2/108.7 | 58.1/82.8 | 9/52 | 43 | 123/16 |
| archer-b-7 | High | 43.2/108.7 | 79.7/118.2 | 9/62 | 52 | 175/22 |
| archer-6 | Low | 50.6/94.7 | 72.2/106.0 | 9/32 | 23 | 175/23 |
| archer-7 | Low | 50.6/94.7 | 75.3/101.5 | 9/34 | 25 | 175/23 |
| archer-b-6 | Low | 50.6/94.7 | 50.5/104.0 | 9/28 | 19 | 175/23 |
| archer-b-7 | Low | 50.6/94.7 | 83.9/119.8 | 9/32 | 22 | 175/23 |
