# Mossvale alpha 0.2 — implementation and release gates

Implemented 2026-10-02 against the twelve B+ requirements. This is a playable systems alpha; the quality grade depends on measured performance, balance and human playtests.

| Requirement | Current implementation | Remaining quality gate |
|---|---|---|
| Combat | Defense formula, ±10% rolls, crit, casts/interrupts, CC, poison, buffs, circle/line/cone locked windups, Guardian cycles, sound/FX, delayed death/recovery | Tune timing and readable silhouettes with players; polish authored animation poses |
| Classes | Swordsman/Mage/Archer, ten skills each, unlock 10–100, attributes, four selectable skill slots | Validate multiple viable builds at early/mid/endgame |
| Art | 29 original GLBs, seven linked skeleton joints each, six clips; animated independent instances; armor/charm/weapon rune on equipped character | Replace or refine prototype geometry and rigid weights where art direction demands it |
| World | Safe town, four farm areas, party-instance dungeon, 26 monster kinds, six quest boards, clickable NPC guides/merchant/forge | Encounter variety and quest narrative polish; dungeon difficulty playtest |
| Farming | 18 gear definitions, material drop sources, class/level restrictions, three gear slots, unique item IDs and per-item +0..20 refinement | Adjust drop/XP/craft cost curves from real session data |
| Online | Sites dispatcher identity, D1 saves, server time/combat/loot/currency, shared rooms/peers, ordered replay-safe commands, reconnect | Multi-account production session, degraded latency, long soak and deployment recovery |
| Cooperation | Invite/accept friends/parties, 2–4 dungeon, equal nearby XP/gold, rotating material drops, nearby healing/guard/fury, swordsman guard taunt | Test class synergy and reward fairness with actual parties |
| Economy | NPC potions/material sales, mutual confirmed trade with reset on offer changes, server escrow market, 10% sale fee; atomic CAS commit and ledger | Long-running inflation/bot monitoring and pricing; granular item ledger exports |
| UI | Game HUD, 52 normalized PNGs, bag sort/filter, comparison on hover/focus/tap, skill drag/drop, cooldown/status, tutorial journal, party/trade/market controls | First-session usability playtests and accessibility review |
| Audio | Original Web Audio synthesis; per-area notes/tempo, steps, weapon/spell/hurt/monster windup/UI/level feedback; mute controls | Composed music and varied monster sound bank, consistent mix |
| Stability | Shared geometry/rig cache, low-poly GLBs, static batching, graphics context recovery, adaptive quality, real rolling FPS and p95, fault/replay tests | Real target-device FPS and production concurrent load, extended soak |
| Operations | Owner-email protected report, progression/tutorial/quest data, command counters, bug reports, economy logs, latest 20 backups/export, maintenance, restore and monster tuning | Production restore drill, scheduled backups, retention/cohort funnel and operational runbook |

## Data and architecture

- `src/game/content.ts`: six areas, 26 species, quests, visual and audio palette.
- `src/game/equipment.ts`: recipes and attribute bonuses; items retain identity/refinement when traded.
- `src/simulation.ts`: renderer-independent rules, legacy save migration and practice mode.
- `server/realm.ts`: clock and authoritative shared-room simulation; each monster advances once per server substep.
- `server/community.ts`: invitations, rewards, trade and market; rejected community actions are rolled back and acknowledged with an error event so the queue can continue.
- `server/store.ts`: one bounded realm aggregate, revision compare-and-swap; a transaction commits all involved players/items together.
- `server/operations.ts`: authenticated operator-only maintenance, backups and tuning; restore keeps a recovery backup and invalidates old sessions.
- `src/render/model-library.ts`: GLB cache and independent animated skeleton instances. Procedural fallback remains available while an asset loads.

Current alpha limit is **128 persisted accounts**, **4 per party**, **60 inventory slots**, **100 market listings** and **20 owner backups**. Proposed first load target is **20 concurrent players**. A single realm aggregate is intentionally bounded; production expansion requires sharding rooms/instances and separate transactional player/item storage rather than increasing this cap blindly.

No client save, client damage, client gold or client inventory is accepted by the online API. Practice remains on the existing `mossvale-save` key and never imports itself into an online account. The existing production D1 migration is unchanged; v1 realm and v2 save upgrades happen while hydrating trusted state.

Online dungeon entry requires at least two party members, all Lv40+. Each member enters through a portal. Leaving a party with fewer than two members closes its dungeon participation and returns remaining members to town. Offline party membership persists for reconnect; only active nearby members share combat rewards.

## Asset provenance and budget

All model geometry, rigs, clips and synthesized audio are project-authored, not downloaded free models. Babylon libraries are Apache-2.0. Icons are generated original PNG artwork from the retained source atlases in `artwork/`; preparation only crops/resizes/centers the generated artwork.

The 29 optimized models total **1,109,432 bytes**; largest model **48,564 bytes / 660 vertices**. Each has one skin, seven joints and six verified animation names. `npm run assets:build` reproduces authoring and glTF Transform dedup/prune verification. Runtime loads classes/current-area kinds and reuses asset containers; no Draco decoder is required.

PNG icon canvases are 128×128; longest artwork side is 96 px with at least 16 px padding. Sixteen additional material/armor/charm icons follow the same footprint as the existing thirty-six.

## Verification and what the numbers mean

- 22 rule/API/SQLite transaction tests pass: damage/progression/class gates, legacy migrations, independent rooms, craft/equipment/refine, party/friends/dungeon, shared rewards/heal, trade offer reset, market escrow/fees/replay/full bag, owner identity and maintenance/backup/restore/tuning.
- Original browser flows cover combat→loot→upgrade→shop→quest/save, class/loadout/cast, mobile menus, DPR2 picking and context recovery. New browser checks cover six area visuals/rig loading/equipment comparisons, online peer/chat/reconnect and the party→confirmed trade→market menu flow. All eight browser checks pass across isolated runs (30 tests total with the rule/API checks).
- Latest local load: **20 accounts, 280 requests, 0 errors, replay invariant true; p50 200 ms / p95 401 ms / max 509 ms**, while Chromium software rendering was also using the CPU. This is a local Node24/SQLite Worker adapter measurement, **not Cloudflare D1 capacity**.
- A real browser loaded 20 active rig instances with **0 model errors**. Hardware acceleration is unavailable in the QA container, so its SwiftShader FPS cannot establish gaming-device performance.

Proposed minimum device: Windows 10/11, modern four-core CPU, 8 GB RAM, Intel Iris Xe or comparable GPU, current Chrome/Edge with hardware acceleration. Acceptance target: 1280×720 Low at >=30 FPS and p95 frame <=40 ms while combat and visible peers are active. High/Auto should be measured separately at 1920×1080. These are **targets awaiting a device test**, not completed benchmark claims. Settings shows the user's actual rolling FPS and p95; Auto reduces shadows/resolution when sustained frames exceed 80 ms.

Production audience stays owner-private. To test real parties, the owner must grant Sites access to the intended test accounts. No audience changes or production restore were performed during development. Operator restore was exercised against an isolated SQLite database.

## Next acceptance session

1. Three new players complete movement, dodge, loot, craft, equip and travel without verbal guidance; record confusion through bug reports and tutorial progress.
2. A 2–4-player team reaches the Guardian, uses each class role, leaves/rejoins, and completes reward distribution without duplicated items.
3. Measure 30-minute progression and gear choices at Lv20/40/65/100; adjust tuning/costs from observed time-to-kill and progression.
4. Run an authorized 20-player production load/soak, interrupted trade/market response tests, and the above GPU benchmarks.
5. Schedule backups and run a maintenance/recovery drill on the intended production environment before public launch.
