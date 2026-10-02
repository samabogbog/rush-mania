# Equipment and inventory — v0.3

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

Every item has primary stats. Common/Rare/Epic/Legend add 0/1/2/3 unique secondary affixes respectively. New dropped equipment scales primary stats by 1/1.1/1.25/1.45. Secondary ranges scale with item level. Existing saved gear keeps its identity, refinement and stats; migration does not reroll old items. New crafted gear also receives its rarity's affixes. Drop-only equipment cannot be crafted.

## Stats

Primary stats: ATK, DEF, maximum HP/MP, STR, VIT and AGI. Secondary affixes: critical chance/damage, damage bonus, skill damage, lifesteal, HP/MP regeneration per second, attack speed, movement speed, armor penetration, damage reduction, dodge, EXP bonus, zeny bonus, healing received and cooldown reduction.

Damage retains the defense formula `ATK × 100 / (DEF + 100)`. Crit, damage bonuses and skill bonuses multiply damage; penetration reduces effective enemy DEF. Lifesteal uses actual damage dealt, excluding overkill. Regen, attack/movement speed, reward bonuses and cooldown/healing modifiers affect gameplay directly.

Effective caps: critical chance 60%, lifesteal 25%, movement-speed bonus 50%, attack-speed bonus 100%, penetration 60%, damage reduction 60%, dodge 35%, healing bonus 100%, cooldown reduction 40%. The character window shows effective values. Set bonuses combine with item affixes before caps apply.

## Inventory and persistence

Inventory has three pages of 8 × 6 cells, for 144 item slots. Stacks occupy one cell; equipped items retain their inventory cell and display an E badge. Six worn slots appear alongside the bag. Click gear to equip; use the worn-slot remove button to unequip. Gear checks level and class. Hover or keyboard focus opens the floating comparison tooltip. Filtering and sorting apply across all three pages.

Online rolls originate on the server. Equipment receives its UUID and affixes before collection. Collection, save/reload, trading and market transfers preserve that exact instance; a full bag leaves it on the ground without rerolling. Replayed collection commands do not duplicate equipment. Party equipment uses the existing round-robin loot recipient. Save version 4 adds the new slots while retaining older saves. No D1 schema migration is required.

## Verification

`tests/equipment-drops.spec.ts` exercises tier/rarity rolls, capacity, collection identity, persistence, damage, lifesteal, regeneration, sets, rewards, avoidance and server authority. `tests/inventory-ui.spec.ts` verifies 48 cells per page, three pages, hover comparison, one-click equip/unequip and mobile layout. Economy tests preserve rolls during transfers. Existing progression, online, world, UI and performance checks remain part of the regression suite.
