# Bespoke skill artwork

All 60 skill icons are original OpenAI `image_gen` illustrations authored for Mossvale on 2026-10-03. They are not downloaded asset packs, emoji, or generic menu-icon aliases. There are three source atlases, each containing a distinct 20-skill class set in a 4 × 5 grid. The first ten cells are path A; the next ten are path B. Order exactly follows `src/game/classes.ts`.

Art direction: polished painted chibi fantasy emblems, bold navy contours, vivid gem highlights, strong dominant silhouettes, emerald/gold for archers, purple/elemental and living-green for mages, steel/gold/coral for swordsmen. Later stages add ornate weapons, laurels, powerful elemental plumes and legendary motifs.

Source PNGs are retained here for provenance and subsequent art direction. `manifest.json` records the original atlas cell, final file, SHA-256, size, and visible alpha bounds for every skill. Game assets are transparent RGBA PNGs in `public/icons/skill-*.png`.

`python tools/art/extract_skill_icons.py` performs mechanical extraction and normalization only; it does not paint or invent imagery. Pillow is required for this authoring utility, not at runtime. Each 192 × 192 icon's visible bounds fit inside 138 × 138 pixels (at least 14% padding per side). Images are centered and downsampled with Lanczos. The atlas generator did not perfectly honor source-cell padding; normalization corrects the delivered assets consistently.

`contact-sheet.png` presents both large previews and actual 48px versions against the game's dark backdrop. Runtime mapping is derived from each stable skill ID, without changing game balance or save IDs. Future skills must supply their own artwork and a new manifest entry instead of reusing another skill icon.

Visual review iteration: four nature skills (Bramble Bolt, Root Prison, Snaring Arrow, Entangling Volley) were re-authored using `image_gen` in `nature-readability-atlas.png`. Their brighter lime/cyan contours and simpler forms improve hotbar readability compared with the original darker, intricate thornwood. The manifest points to the revised source cells.
