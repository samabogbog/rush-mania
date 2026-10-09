# Bright fantasy action skill icons, version 4

Original OpenAI image_gen artwork authored for Mossvale on2026-10-09. The user requested a midpoint between intricate hard-fantasy paintings and overly childish static emblems. Each icon now depicts a skill happening: sword or shield strikes, directional spell casting, bow release, arrows hitting, evasive motion or area impacts.

Art direction: colorful youthful heroic fantasy, clear poses and broad directional trails, moderate cel shading and controlled details. One dominant action and a few large supporting shapes keep the icon legible at32–40px. No ornate ancient-metal rendering, busy realistic battle scenery, baby faces or static inventory-item presentation. Opaque full-frame backgrounds remain.

Three source atlases map twenty icons per class in class-config order. `extract_action_skill_icons.py` mechanically extracts visually verified cell boundaries, removes seams and downsamples to square RGB192PNG. SHA-256 provenance is recorded in the manifest. The contact sheet compares112px artwork with40px and32px versions. Runtime uses `/icons/skills-v4/` to avoid prior cached artwork.

`tests/fullbleed-skills-ui.spec.ts` validates all classes' actual hotbar, skill-card and loadout frames, image decode, overflow and page errors. Practice screenshots are captured after model loading at desktop1200×800 and mobile390×844. Combat, cooldown rules and player saves are unchanged.

Final verification: contact sheet at112px/40px/32px and actual desktop/mobile hotbars reviewed. All60 files are unique opaque RGB192PNG and match built copies. All three final browser cases passed with no page errors; production build passed with the existing bundle-size warning.
