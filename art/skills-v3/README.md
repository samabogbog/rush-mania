# Cute readable skill art, version 3

Original OpenAI image_gen artwork for Mossvale, 2026-10-09. This replaces the overly intricate hard-fantasy version with cheerful casual-fantasy emblems: one large rounded subject, bold colored contours, simple cel shading, and only a few large effect shapes. No battle scenery, fine texture, ornate metal, tiny particles, typography, or transparency. Background colors fill every tile and contrast with the focal shape.

Three source atlases contain all60 individual skills in class-config order, four columns and five rows per class. `extract_cute_skill_icons.py` mechanically extracts tiles from visually verified dividers, removes boundary seams, and preserves proportions with square cover cropping. Runtime files are opaque RGB192×192 PNGs, using the new `/icons/skills-v3/` path to bypass earlier static image caches. No combat or save data changes.

The contact sheet shows112px artwork and40px/32px previews for actual small-screen readability. The final images must be reviewed at both small sizes, not judged only from large atlas art. `tests/fullbleed-skills-ui.spec.ts` checks every class in actual skill UI, full-frame fitting, successful image decode, no overflow, and page errors; desktop1200×800 and mobile390×844 screenshots are captured after scene models finish loading. Practice fixtures are isolated from real player data.

Final acceptance: the112px/40px/32px contact sheet and real desktop/mobile UI captures were reviewed. All60 final files are unique RGB192PNG with opaque full-frame backgrounds; built copies match. All three browser cases passed on final source with no page errors. Production build passed with the existing bundle-size warning.
