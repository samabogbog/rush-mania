# Mossvale B+ development plan

Updated: 2 October 2026 (Asia/Bangkok)

The B+ goal covers twelve product areas. This milestone implements the class/progression foundation; it is not a finished MMORPG or a claim that the product has reached B+ quality.

## Explicit requirements received

- Babylon.js browser runtime.
- Swordsman, Mage, Archer; ten skills per class.
- Maximum character level 100.
- Skill unlocks every ten levels: 10, 20, 30, …, 100. Basic attacks are available from level 1.
- Base damage formula: `Damage = ATK * (100 / (DEF + 100))`.
- Combat actions with readable feedback; monster attacks that can be anticipated and avoided.
- Game UI, item/skill/menu PNG icons, vivid colors.
- Skill loadout, cooldown and status feedback, tutorial.
- Area music and action/UI sound effects.
- Performance, persistence, operations and player-feedback tools.

The goal text delivered to this session contains a truncation marker for requirements 3–9. The user's exact additions for models, map/content, item farming, online systems, parties and economy must be recovered before those acceptance criteria are finalized. The earlier chat's proposed list is background, not a substitute for the missing user requirements.

## Delivered milestone

- Data-driven class/skill catalog (`src/game/classes.ts`), three class roles and ranges, 30 functional skills.
- DEF mitigation for player and monster damage. Attack rolls vary ±10%; critical chance starts at 6% with the default AGI and grows with AGI, capped at 35%.
- Level ceiling and automatic unlocks, attribute progression, backward-compatible local save migration.
- Direct attacks, target-centered and player-centered area attacks, healing, guard/attack buffs, stun, slow, damage over time and interruptible cast times.
- Four assigned skill slots (keys 1, 2, 5, 6); potions retain keys 3 and 4. Drag/drop or select-and-assign controls.
- Class selection outside combat; shared progression/refinement in this prototype.
- Distinct procedural outfits and sword/staff/bow silhouettes. These are not rigged GLB character assets.
- Monster attack windups and red ground warning circles; stepping out of melee range avoids the strike.
- Procedural attack/recoil/bob poses, synthesized combat/footstep/UI sounds with sound toggle. These are a foundation, not final animation or audio production.
- Unit and browser checks for all thirty skills, save migration, level cap, assignment, telegraphs, desktop/mobile controls and persistence.

## Remaining product gates

| Area | Current evidence | Remaining acceptance gate |
| --- | --- | --- |
| Combat | Skill mechanics, warning circles, defensive movement | Playtests for readable timings, meaningful decisions, satisfying full animations and balanced difficulty |
| Classes | Three classes, 30 functional skills, level cap and unlocks | Class/build balance throughout the level curve; equipment alternatives |
| Models/animation | Procedural class silhouettes and feedback poses | User's missing requirements; rigged optimized assets and complete animation sets |
| World/content | One existing map and three monster species | User's missing map/dungeon/boss/quest requirements and a cohesive progression path |
| Farming/equipment | Existing drops, merchant and refinement | User's missing loot/crafting/equipment requirements and target drop tables |
| Online | Single-player local simulation | User's missing server/concurrency/account requirements; authoritative simulation and server persistence |
| Social/party | Local activity log | User's missing party/social requirements; real multi-client integration tests |
| Economy | Local gold, NPC trades | User's missing player economy requirements; transactional persistence and economy balance |
| UI/tutorial | Class selection, skill loadout, cooldown/status feedback, handbook | Equipment comparison, inventory filtering/sorting and guided onboarding |
| Audio | Existing ambient melody plus synthesized local SFX | Finished area themes, species-specific sound banks, mixing and quality review |
| Performance/stability | Batched meshes; browser playtests and context recovery | Defined target devices, FPS budgets and measured multiplayer load/reconnect tests |
| Operations | Local tests and source/deployment versioning | Server logs, backups/restore drills, admin tools and consent-aware gameplay analytics |

## Dependencies and implementation order

1. Recover the missing requirements and fix target platform/concurrency budgets.
2. Specify server-owned accounts/characters/inventory/combat events and persistence transactions before adding player trading or parties.
3. Build a small real multiplayer slice and verify two clients, reconnect and atomic rewards.
4. Author/import rigged assets and animations with license records, GLB budgets and collision proxies.
5. Build the user's world/content slice, equipment progression and guided onboarding.
6. Add social/economy features on the verified server boundary.
7. Balance, test on target devices, run concurrency tests and add operational tools before broader launch.

No live service, additional account, paid asset or public audience has been created by this milestone. The existing Site retains its owner-private audience.
