# Equipment and inventory — v0.3.1

## Sets and drops

| Set | Required level | Monster level |
| --- | --- | --- |
| Thornwood | 10 | 1–29 |
| Suncrest | 30 | 30–49 |
| Moonveil | 50 | 50–69 |
| Frostguard | 70 | 70–89 |
| Starfall | 90 | 90+ |

Each set has a swordsman blade, mage staff, archer bow, helmet, coat, gloves, boots and charm: 40 new definitions, alongside 18 existing craftable definitions. A character wears six pieces, including one class weapon. Set bonuses activate at 2, 4 and 6 pieces.

Normal monsters have a 16% equipment-drop chance; bosses have 75%. Once equipment drops, normal-monster rarity weights are 70/23/6/1% and boss weights are 20/40/30/10% for Common/Rare/Epic/Legend. These are initial prototype balance values, configured in `src/game/equipment.ts`.

Every item has primary stats. Common/Rare/Epic/Legend add 0/1/2/3 unique secondary affixes respectively. New dropped equipment scales primary stats by 1/1.1/1.25/1.45. Secondary ranges scale with item level, except HP regeneration: 0.1–0.5% of Max HP per second on every tier. Existing saved gear keeps its identity and refinement; migration does not reroll affixes. HP-regeneration affixes now use percentage units and old values above 0.5 are clamped to 0.5 per item. New crafted gear also receives its rarity's affixes. Drop-only equipment cannot be crafted.

## Stats

Primary stats: ATK, DEF, maximum HP/MP, STR, VIT and AGI. Secondary affixes: critical chance/damage, damage bonus, skill damage, lifesteal, HP/MP regeneration per second, attack speed, movement speed, armor penetration, damage reduction, dodge, EXP bonus, zeny bonus, healing received and cooldown reduction.

Damage retains the defense formula `ATK × 100 / (DEF + 100)`. Crit, damage bonuses and skill bonuses multiply damage; penetration reduces effective enemy DEF. Lifesteal uses actual damage dealt, excluding overkill. Base HP regeneration is 0.5% of Max HP per second, plus equipment and set bonuses; it never heals above Max HP or bypasses the death timer. MP regeneration remains flat MP/second. Regen, attack/movement speed, reward bonuses and cooldown/healing modifiers affect gameplay directly.

Effective caps: critical chance 60%, lifesteal 25%, movement-speed bonus 50%, attack-speed bonus 100%, penetration 60%, damage reduction 60%, dodge 35%, healing bonus 100%, cooldown reduction 40%. The character window shows effective values. Set bonuses combine with item affixes before caps apply.

## Inventory and persistence

Inventory has three pages of 8 × 6 cells, for 144 item slots. Stacks occupy one cell; equipped items retain their inventory cell and display an E badge. Six worn slots appear alongside the bag. Click gear to equip; use the worn-slot remove button to unequip. Gear checks level and class. Hover or keyboard focus opens the floating comparison tooltip. Filtering and sorting apply across all three pages.

Online rolls originate on the server. Equipment receives its UUID and affixes before collection. Collection, save/reload, trading and market transfers preserve that exact instance; a full bag leaves it on the ground without rerolling. Replayed collection commands do not duplicate equipment. Party equipment uses the existing round-robin loot recipient. Save version 6 retains older saves and normalizes HP-regeneration affixes and clamps equipment refinement to +10. No D1 schema migration is required.

## Verification

Craft recipes use categorized eight-column grids with selected-recipe stats, materials and a craft action. The character info button opens secondary stats on hover, keyboard focus or click; click pins it for touch use. Forty generated set icons are normalized to 128×128 PNGs with 16px minimum margins (`tools/prepare_set_icons.py`).

`tests/regen-crafting.spec.ts` verifies percent regeneration, affix caps, save normalization and 144-slot crafting. `tests/craft-ui.spec.ts` covers recipe categories, actual crafting, info disclosure and mobile layout. `tests/equipment-drops.spec.ts` exercises tier/rarity rolls, capacity, collection identity, persistence, damage, lifesteal, regeneration, sets, rewards, avoidance and server authority. `tests/inventory-ui.spec.ts` verifies 48 cells per page, three pages, hover comparison, one-click equip/unequip and mobile layout. Economy tests preserve rolls during transfers. Existing progression, online, world, UI and performance checks remain part of the regression suite.

Refinement now applies cumulative base-stat percentages to all six gear slots. See [Refinement](REFINEMENT.md) for stones, success chances, failure outcomes and migration.
