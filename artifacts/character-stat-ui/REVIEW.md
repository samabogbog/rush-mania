# Character stats and item overlay review

HP, MP, Attack and Defense now display rounded integer totals and rounded external contributions in the character panel and inventory worn summary. External contributions include equipped main stats, refinement, secondary stats and active sets; equipment VIT also contributes to HP/Defense and equipment STR or AGI contributes to class attack. This replaces the previous refine-only Attack bonus. Simulation formulas and underlying precision are unchanged.

Hover tooltip z-index is 180 and persistent item details 190, above the desktop editing hotbar at 110. Character stat values were compared for all three classes with the difference between the equipped character and the same character with equipment removed; all displayed totals/bonuses matched. Screenshots cover desktop and 390px mobile. Overlay screenshots deliberately move the tooltip/details over the visible desktop hotbar in the QA fixture to expose paint order; normal product positioning is unchanged.

`npm run build` passed with the existing large-chunk warning. All 3 existing inventory UI tests passed. `validation.json` records fixture results. No deployment or push was performed.
