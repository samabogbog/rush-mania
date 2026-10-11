# Lv80 VFX review

Performance samples use Chromium151 ANGLE SwiftShader; software renderer measurements are comparisons on this machine, not player-device FPS. Frame p50/p95 and draw counts below compare idle with frozen impact frames. Preview is render-only; genuine casts use learned rank1 skills through UI. Raw WebM remains local.

| Skill | Quality | Idle p50/p95 ms | Impact p50/p95 ms | Draw calls idle/impact | VFX draws | Meshes/materials |
| --- | --- | --- | --- | --- | --- | --- |
| swordsman-7 | High | 113.1/327.1 | 198.3/294.1 | 11/59 | 48 | 67/6 |
| swordsman-8 | High | 113.1/327.1 | 263.4/593.2 | 11/67 | 56 | 79/10 |
| swordsman-b-7 | High | 113.1/327.1 | 186.4/329.4 | 11/64 | 53 | 125/14 |
| swordsman-b-8 | High | 113.1/327.1 | 104.3/223.9 | 11/66 | 55 | 128/18 |
| swordsman-7 | Low | 37.7/99.4 | 83.0/98.6 | 11/29 | 18 | 128/20 |
| swordsman-8 | Low | 37.7/99.4 | 78.4/97.1 | 11/29 | 18 | 128/20 |
| swordsman-b-7 | Low | 37.7/99.4 | 84.1/114.3 | 11/34 | 23 | 128/20 |
| swordsman-b-8 | Low | 37.7/99.4 | 78.6/146.9 | 11/28 | 17 | 128/20 |
| mage-7 | High | 57.2/115.5 | 87.3/157.8 | 10/65 | 55 | 73/6 |
| mage-8 | High | 57.2/115.5 | 187.0/375.8 | 10/70 | 60 | 134/10 |
| mage-b-7 | High | 57.2/115.5 | 94.2/136.2 | 10/64 | 54 | 178/14 |
| mage-b-8 | High | 57.2/115.5 | 104.0/194.1 | 10/64 | 54 | 181/18 |
| mage-7 | Low | 52.1/113.8 | 76.0/103.9 | 10/35 | 25 | 181/20 |
| mage-8 | Low | 52.1/113.8 | 115.4/208.2 | 10/32 | 22 | 181/20 |
| mage-b-7 | Low | 52.1/113.8 | 77.2/112.0 | 10/34 | 24 | 181/20 |
| mage-b-8 | Low | 52.1/113.8 | 86.2/177.7 | 10/26 | 16 | 181/20 |
| archer-7 | High | 59.9/218.7 | 77.4/108.0 | 9/64 | 55 | 72/7 |
| archer-8 | High | 59.9/218.7 | 99.3/159.6 | 9/67 | 58 | 131/11 |
| archer-b-7 | High | 59.9/218.7 | 97.3/146.0 | 9/62 | 52 | 180/17 |
| archer-b-8 | High | 59.9/218.7 | 86.3/116.3 | 9/73 | 64 | 180/21 |
| archer-7 | Low | 50.9/134.0 | 69.4/101.5 | 9/34 | 25 | 180/22 |
| archer-8 | Low | 50.9/134.0 | 88.4/154.5 | 9/29 | 20 | 180/22 |
| archer-b-7 | Low | 50.9/134.0 | 78.9/115.2 | 9/32 | 22 | 180/22 |
| archer-b-8 | Low | 50.9/134.0 | 72.6/100.2 | 9/35 | 26 | 180/22 |
