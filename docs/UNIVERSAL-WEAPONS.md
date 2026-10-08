# Universal weapons

Each weapon family has one gear ID: Sprout Weapon, Amber Weapon, Frost Weapon, and one Weapon for each of the five level sets. Weapons equip on all three classes and remain equipped when changing class. The displayed icon uses the existing blade, staff or bow PNG for the current class; the equipped 3D model still follows the class.

All classes receive the same weapon main bonuses. The existing blade ATK formulas and shared STR formula are the canonical baseline; old bow-specific AGI/ATK and staff-specific formulas are unified to this baseline. This changes old variant base stats, while preserving rarity, refinement, secondary affixes, count, item UUID and equipped UUID. Class base stats, attack formulas and animations still differ.

Old crafted and set blade/staff/bow gear IDs remain lookup and craft-command aliases. Old set Gloves IDs resolve to canonical Pants IDs. New rolls and recipes contain only canonical IDs, with six pieces per set, so weapons have one pool entry per set. The old item instances migrate in device saves, online saves, ground loot and market escrow. Accounts, gold and item ownership remain intact. Save version 10 and realm item revision 2 record this migration. Migration does not downgrade version-9 Legend items.

Focused checks cover all legacy weapon IDs, class switching, icon selection, six-slot drops, preserved item metadata and escrow/ground-loot migration in `tests/universal-weapons.spec.ts`.
