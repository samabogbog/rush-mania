# Six skill slots, four auxiliary slots and two skill paths

Each of Swordsman, Mage and Archer has **20 playable skills**: 10 stages with two alternatives at each stage. Skill branches:

| Class | Path A | Path B |
| --- | --- | --- |
| Swordsman | Vanguard | Sentinel |
| Mage | Elementalist | Verdant Warden |
| Archer | Marksman | Trapper |

Stages open at levels 10, 20, … 100. Choose **one** alternative per stage, after choosing the preceding stage. Alternatives can be mixed freely across stages; a level-100 build learns 10 of its class's 20 skills. Choice is not automatic on leveling up. The choice consumes that stage's opportunity, not attribute points. Both paths have real damage, control, healing or buff effects with distinct powers, mana costs and cooldowns. Support uses the existing party-sharing rules.

The Skills window shows the two paths side by side, learned choices, locks and requirements. Learning fills the first empty skill slot. Drag learned cards to the toolbar or use their custom slot dropdown and Assign. Clear a slot with its × button. Assigning a skill already in another slot swaps the skills instead of duplicating them. Only learned skills of the current class can be assigned or cast, even through direct API commands.

## Slot rules

- **1–6:** Six skill slots. Potions, gear, stones and materials are rejected.
- **7, 8, 9, 0:** Four auxiliary slots. Only the explicit `auxiliaryItems` registry is accepted. Currently this contains Red potion and Blue potion; no buff consumables have been invented yet. Default 7 heals HP, 8 restores MP and 9/0 are empty.
- Configure auxiliary slots in Skills or drag a recovery item from Bag to the toolbar. During these menus, the toolbar remains visible for assignment and casts/consumption from it are disabled.
- Potions share a two-second cooldown across all auxiliary slots and Bag clicks. Full resources, zero stock and death reject use without consuming an item or starting a cooldown. Count and cooldown appear on the toolbar. Moving or swapping assignments does not reset cooldowns.
- Recovery values remain 65 HP or 40 MP, modified by healing bonuses.

## Reset and persistence

Prototype resets are free from the Skills window. Reset is rejected while targeting/in combat, casting, buffed, or while any skill cooldown remains. Reset clears the current class's choices and skill hotbar; items and other class choices remain. Class changes keep cooldowns to prevent clearing them by switching classes. Choices persist separately for each class.

Save version **7** migrates versioned older saves by learning Path A for stages already reached, preserving the formerly available skills. Existing four skill assignments move into slots 1–4; 5–6 are empty. The auxiliary bar starts with Red/Blue potions. Item identity, gold, equipment, quests and progress stay intact. Version-7 saves retain deliberate A/B selections and discard invalid/cross-class/duplicate/unlearned slot contents when loaded.

Online commands `chooseSkill`, `resetSkills`, `assignSkill`, `assignAuxiliary` and `useAuxiliary` are executed and validated by the server. Choices, inventory and cooldowns are captured in the SQLite/D1 realm snapshot. Sequence acknowledgements and revision commits prevent replayed item use from consuming twice. Offline practice saves build choices in the browser.
