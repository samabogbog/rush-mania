# Full-bleed skill artwork, version 2

Original OpenAI image_gen illustrations created for Mossvale on 2026-10-09. All 60 skills have independent opaque square PNG artwork. Class-specific action imagery fills each tile: swords/shields/impact, elemental/nature magic, and enchanted arrows/hunting. No text or transparent padding is baked into the art.

Sources: three 20-cell atlases retained here. The generator did not produce uniform grid dimensions, so extraction uses visually checked explicit boundaries and a three-pixel seam inset. Square cover cropping keeps subject proportions. `python tools/art/extract_fullbleed_skill_icons.py` only extracts/downsamples source art; it does not paint imagery. It writes RGB192PNG, SHA-256 provenance in manifest.json, and a review sheet at112px and40px.

Runtime uses `/icons/skills-v2/skill-${id}.png` in hotbar, skill cards, and loadout. The distinct path prevents old static image caches from retaining the previous transparent artwork. Skill IDs, learning rules, cooldowns, combat, and saves are unchanged. Earlier art is retained as historical source material.

QA: `tests/fullbleed-skills-ui.spec.ts` covers all three classes at desktop1200×800 and mobile390×844, confirms images load and occupy frame interiors with object-fit cover, and captures actual UI screenshots after character/monster models load. This is local practice visual QA, not production player data or a device FPS benchmark.

Final verification: all three browser cases passed after the final label fitting change, with no page errors. All60 delivered files are unique RGB192×192 PNGs and match their built copies. Desktop and mobile screenshots plus the112px/40px contact sheet were visually reviewed. Production build passed; existing bundle-size warning remains.
