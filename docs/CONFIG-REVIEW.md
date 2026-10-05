# Balance configuration extraction verification

Defaults are preserved from source baseline dddb8eb479299589c8d6aea0de961a635620a289. Six JSON categories feed shared browser/Worker gameplay code. Whole catalog golden parity includes all 58 equipment definitions, 60 skills, classes, five sets, 37 monster species, zones and quests. Config-edit tests exercise changed progression, refinement, gear multipliers/set bonuses/drop chance, monster HP and skill power. Bad config checks reject unsafe values with paths before gameplay.

Final frozen checks: TypeScript/Vite/Worker build passed; 53 targeted Playwright logic/API tests passed; two browser cases passed (character secondary info, forge odds/refine/craft). Browser screenshots character-info.png and refinement-desktop.png were opened and reviewed. Chromium ANGLE SwiftShader is used only for functional/visual validation, not hardware FPS claims.

Pre-existing party fixture used old positions and expected Fire Bolt damage before cast time. Corrected to actual spawn, clear range, disabled normal auto attack to avoid stealing the tested kill, verified cast exists, advanced authoritative time and retained reward/material/support assertions. Baseline failure reproduced separately before fixture correction.

IDs, save version, default balance and server authority are retained. Config files are bundled at build/import time, not live-server settings. Deploy client and server together. Existing admin monster overrides take precedence over defaults. Level100/bag144 and content counts are structural contracts; other remaining geometry/animation/network logic is outside balance config. Thai guide documents units, examples, reload and limits.
