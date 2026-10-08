# Maximum-roll administrator equipment

Settings → Admin: spawn items now has an equipment-only **Max secondary rolls** switch. It starts off; the choice stays in memory when the admin window is reopened during the same visit.

When enabled, every selected secondary stat receives `secondaryRollMaximum(stat, equipment.level)`. Affix types still vary randomly, and rarity still determines the number of affixes. Fixed primary stats, refinement, normal drops, and crafting retain their rules. Materials and consumables hide/disable the switch.

The fifth `adminSpawn` argument is an optional boolean. The server validates it and checks administrator rights before granting anything. Missing/false preserves ordinary random rolls; the random stream consumes the same draws in either mode. The economy ledger records effective `max=true` or `max=false`; non-equipment never receives affixes.

Verification: six focused backend checks pass (maxima/counts/types, ordinary-roll parity, admin/argument rejection, grants/audit, and administrator access across three characters). Browser QA registers an isolated local testing admin, starts a character, enables the switch, grants Legend equipment, checks every affix against its maximum, reopens the menu, and checks hide/restore/off behavior. Screenshot: `artifacts/admin-max-roll/desktop.png`.

An unrelated existing refinement migration test still expects save version 9 while the current game uses version 10; this is not a max-roll behavior failure. Other refinement checks passed.
