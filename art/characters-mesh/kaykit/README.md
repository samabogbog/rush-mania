# KayKit playable hero source package

Author: Kay Lousberg. License: CC0 1.0 (LICENSE.txt). Original publisher:
https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
Pinned commit: `672074b73ba276876a19e8816ecdc5241817ab47`.
Product: https://kaylousberg.itch.io/kaykit-adventurers

The three untouched original GLBs in `source/` contain the meshes, rig, 76 source
animations and embedded gradient textures. No nested Git repository or full
upstream asset collection is needed to reproduce the playable exports.

Run `node tools/export-mesh-characters.mjs` from the project root. It selects
Knight → swordsman, Mage → mage, Rogue → archer with a two-handed crossbow;
retains fitted garments and selected props; removes overlapping alternatives;
aliases eleven source animations; and applies a common 0.82 scale. Exact aliases,
source SHA256, author/license/pin and budgets are in public/models/manifest.json.
The one-handed swordsman ultimate uses a horizontal sword sweep, not a
two-handed spin. Archer guard uses in-place Block; no Dodge_Backward root travel.
Locomotion and death source channels are preserved. The archer uses a crossbow
rather than a longbow. Mage heal shares its raised-staff casting source clip.

`npm run assets:build` preserves these final heroes while rebuilding original
project-authored monsters, then regenerates heroes from these canonical sources.
Low/high quality both retain the embedded atlas; low quality simplifies lighting.
