# Lv80 VFX review

Performance samples use Chromium151 ANGLE SwiftShader; software renderer measurements are comparisons on this machine, not player-device FPS. Frame p50/p95 and draw counts below compare idle with frozen impact frames. Preview is render-only; genuine casts use learned rank1 skills through UI. Raw WebM remains local.

| Skill | Quality | Idle p50/p95 ms | Impact p50/p95 ms | Draw calls idle/impact | VFX draws | Meshes/materials |
| --- | --- | --- | --- | --- | --- | --- |
| swordsman-8 | High | 82.2/263.7 | 151.2/224.3 | 11/67 | 56 | 76/6 |
| swordsman-9 | High | 82.2/263.7 | 104.8/192.0 | 11/82 | 71 | 146/11 |
| swordsman-b-8 | High | 82.2/263.7 | 121.8/212.7 | 11/66 | 55 | 149/15 |
| swordsman-b-9 | High | 82.2/263.7 | 92.5/174.8 | 11/75 | 64 | 162/21 |
| swordsman-8 | Low | 40.8/89.2 | 96.9/135.0 | 11/29 | 18 | 162/23 |
| swordsman-9 | Low | 40.8/89.2 | 77.3/109.0 | 11/42 | 31 | 162/23 |
| swordsman-b-8 | Low | 40.8/89.2 | 77.0/110.6 | 11/28 | 17 | 162/23 |
| swordsman-b-9 | Low | 40.8/89.2 | 94.4/135.5 | 11/35 | 24 | 162/23 |
| mage-8 | High | 39.1/147.9 | 199.7/387.3 | 10/70 | 60 | 78/6 |
| mage-9 | High | 39.1/147.9 | 73.6/102.4 | 10/66 | 56 | 138/10 |
| mage-b-8 | High | 39.1/147.9 | 107.7/232.8 | 10/64 | 54 | 180/14 |
| mage-b-9 | High | 39.1/147.9 | 89.8/170.4 | 10/78 | 68 | 182/18 |
| mage-8 | Low | 55.6/113.8 | 119.9/237.5 | 10/32 | 22 | 182/20 |
| mage-9 | Low | 55.6/113.8 | 70.8/145.1 | 10/26 | 16 | 182/20 |
| mage-b-8 | Low | 55.6/113.8 | 93.1/173.8 | 10/26 | 16 | 182/20 |
| mage-b-9 | Low | 55.6/113.8 | 85.9/190.0 | 10/38 | 28 | 182/20 |
| archer-8 | High | 36.4/165.7 | 79.6/200.6 | 9/67 | 58 | 77/6 |
| archer-9 | High | 36.4/165.7 | 87.6/133.3 | 9/71 | 62 | 94/11 |
| archer-b-8 | High | 36.4/165.7 | 91.2/127.9 | 9/73 | 64 | 153/15 |
| archer-b-9 | High | 36.4/165.7 | 87.8/133.9 | 9/68 | 59 | 182/20 |
| archer-8 | Low | 59.5/86.3 | 89.0/163.9 | 9/29 | 20 | 182/22 |
| archer-9 | Low | 59.5/86.3 | 78.0/152.9 | 9/31 | 22 | 182/22 |
| archer-b-8 | Low | 59.5/86.3 | 56.4/101.6 | 9/35 | 26 | 182/22 |
| archer-b-9 | Low | 59.5/86.3 | 81.7/117.9 | 9/28 | 19 | 182/22 |
