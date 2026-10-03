# Refinement — v0.4

Select any owned equipment item in Forge: weapon, helmet, armor, gloves, boots or charm. The maximum is +10. Refinement increases the item's primary stats, including STR/VIT/AGI, after its rarity multiplier. Secondary affixes and set bonuses remain unchanged. It does not multiply character-level or allocated attribute stats. Values retain two decimal places.

Each step adds its percentage of the same original base stats; percentages are cumulative, not compounded. An item with base ATK 100 has ATK 245 at +10.

| Target | Added bonus | Total bonus | Common success | Rare success |
| --- | --- | --- | --- | --- |
| +1 | 10% | 10% | 100% | 100% |
| +2 | 11% | 21% | 100% | 100% |
| +3 | 12% | 33% | 80% | 100% |
| +4 | 13% | 46% | 60% | 100% |
| +5 | 14% | 60% | 40% | 80% |
| +6 | 15% | 75% | 20% | 40% |
| +7 | 16% | 91% | 10% | 20% |
| +8 | 17% | 108% | 6% | 12% |
| +9 | 18% | 126% | 3% | 6% |
| +10 | 19% | 145% | 1% | 2% |

## Stones, costs and failures

Every valid attempt consumes one selected stone and `60 + current refinement × 40` zeny, including failed attempts. Missing equipment, missing resources, invalid stone tiers and attempts at +10 consume nothing. The existing zeny formula is retained.

Only after a failed success roll is there a separate 15% downgrade roll. Common resets the item to +0; Rare lowers it by one level. The other 85% of failures leave the level unchanged. Rare doubles success chance, capped at 100%. Neither stone destroys equipment.

All monster species can drop stones. Initial drop weights per kill are Common 20%, Rare 3%, none 77%; bosses have Common 60%, Rare 20%, none 20%. This roll is independent of the equipment-drop roll. Solo drops appear on the ground; party stones use the existing rotating loot recipient, with a ground fallback if the bag is full. Stones use the existing transparent ice-shard and crystal-dust PNGs and stack in inventory. Bulk material sales preserve stones.

Forge → Materials converts five Common refine stones into one Rare refine stone without a zeny fee. Capacity checks allow conversion at a full bag if it consumes the entire Common stack or the Rare stack already exists.

## Saves and authority

Save version 6 clamps legacy equipment levels above +10 and preserves item identities, rarity and secondary rolls. Old refined basic weapons migrate to a class-appropriate starter weapon at the capped refinement level. A full bag postpones that conversion until a slot is available on a subsequent load. The old numeric basic-weapon rank is retained for historical save compatibility; the old flat +7 ATK formula is removed.

Online clients submit only equipment ID and stone tier. The server verifies ownership/resources and performs both rolls. Existing command sequence/replay protection prevents repeated requests from charging or rolling twice. Equipment transfers retain refinement. Decreasing HP/MP bonuses clamps current HP/MP to the new maxima; improving equipment does not create free health.

`tests/refinement.spec.ts` covers cumulative stats, all chances, conditional downgrades, payment, cache updates, material conversion, drops, migration and authoritative replay handling. `tests/refinement-ui.spec.ts` covers stone selection, displayed probabilities, armor refinement, stone crafting and mobile layout.
