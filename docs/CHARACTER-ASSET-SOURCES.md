# Character candidate: KayKit Adventurers

Downloaded from the original publisher's repository, not a mirror:
https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
Pinned source commit: `672074b73ba276876a19e8816ecdc5241817ab47`.
Original product: https://kaylousberg.itch.io/kaykit-adventurers
Author: Kay Lousberg. Repository README identifies the pack, original product link and CC0 license; root LICENSE.txt explicitly says “Creative Commons Zero, CC0” and permits personal, educational and commercial projects. Both retained with downloaded source in `art/vendor-candidates/kaykit-adventurers/`.

## Actual downloaded assets

| Game class | Source GLB | File bytes | Total source vertices | Skins | Materials/textures | Proposed props |
|---|---|---:|---:|---:|---:|---|
| Swordsman | Characters/gltf/Knight.glb | 3,659,532 | 7,024 | 1 | 1 / 1 | Knight_Helmet, Knight_Cape, 1H_Sword, Badge_Shield |
| Mage | Characters/gltf/Mage.glb | 3,589,240 | 5,279 | 1 | 1 / 1 | Mage_Hat, Mage_Cape, 2H_Staff |
| Archer | Characters/gltf/Rogue.glb | 3,616,284 | 5,901 | 1 | 1 / 1 | Rogue_Cape, 2H_Crossbow |

Each GLB has 76 actual clips. Vertex totals include all mutually exclusive accessories; rendered class configuration is smaller. Multiple skinned anatomical meshes share one skin. Assets are stylized authored low-poly geometry with modeled garments, faces and hair. Source archer is a green-clothed, red-haired rogue and its weapon is a crossbow, not a longbow. Calling its ranged clip `bowshot` would be an intentional gameplay alias.

## Proposed game motion aliases

| Motion | Knight | Mage | Rogue |
|---|---|---|---|
| idle | Idle | Idle | Idle |
| walk | Walking_A | Walking_A | Walking_A |
| run | Running_A | Running_A | Running_A |
| attack | 1H_Melee_Attack_Slice_Diagonal | Spellcast_Shoot | 2H_Ranged_Shoot |
| attack-heavy | 1H_Melee_Attack_Chop | Spellcast_Long | 2H_Ranged_Shooting |
| skill | 1H_Melee_Attack_Stab | Spellcast_Raise | 2H_Ranged_Shoot |
| skill-heal | Use_Item | Spellcast_Raise | Use_Item |
| skill-guard | Block | Spellcasting | Block |
| skill-ultimate | 2H_Melee_Attack_Spin | Spellcast_Long | 2H_Ranged_Shooting |
| hurt | Hit_A | Hit_A | Hit_A |
| death | Death_A | Death_A | Death_A |

Integration must intentionally hide unused prop nodes; source GLBs include overlapping alternative weapons/shields. Source units are meter scale, sole Y approximately 0, height approximately 2.2–2.3. Verify world bounds and front direction in the consuming scene. Binary root-track audit: Idle and Walking_A have no root travel; Running_A has only 0.05m Y bob, no X/Z travel. Dodge_Backward moves root Z by 0.65m and is excluded from the table; strip root X/Z if ever using dodge clips. Death_A has hips fall motion (Y/Z) without moving the root. Do not discard albedo texture when cloning the material: it contains the colored gradient atlas that defines the character appearance.

## Visual verification

`art/vendor-candidates/kaykit-contact-sheet.png` renders the actual downloaded GLBs in Blender with selected props (Knight/Mage/Rogue, left to right). Renderer script is retained as `art/vendor-candidates/render_candidates.py`; it renders actual geometry, skins and source textures, not marketing imagery. No runtime assets or game source changed during candidate research.
