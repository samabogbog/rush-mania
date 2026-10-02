# Online foundation verification

2 October 2026. This verifies an alpha server boundary, not B+ production readiness.

- Server clock and normalized input determine movement. Client-submitted `save`, `gold`, `level` and position fields are not accepted as game state.
- Combat, monster AI/status/respawn, rewards, pickup, potions, class/skill assignment, attributes, NPC purchase/sale and refinement run in server Simulation.
- Auth comes from Sites dispatcher. Missing identity: 401. Foreign POST origin: 403. A bypass service credential does not create a player identity.
- Each character has one current command session. Another connection replaces it. Commands have sequential IDs; an already committed sequence is a no-op. Old sessions and gaps are rejected. Pending commands reuse their ID after a dropped response.
- D1 commit updates the realm only if its revision still matches. Conflict rereads/recomputes; malformed batches do not partially charge the player.
- SQLite-backed development Worker and two distinct identities verified peer visibility and text-only realm chat. One browser plus a second authenticated local API context avoids two simultaneous software WebGL scenes saturating this test host; production two-device latency/playability remains a separate beta gate.
- Browser test disconnects before buying, observes reconnect status and unchanged client gold, reconnects, verifies exactly one charge, then reloads and verifies the same server balance.
- Local concurrent API exercise: 20 identities, 280 requests, zero errors; repeated purchases charged once; p50 67 ms, p95 123 ms, maximum 152 ms. This is Node24/SQLite on this workspace, not Cloudflare/D1 deployment capacity, FPS or Internet-latency evidence.
- Owner operations verify dispatcher email against a Sites runtime secret. Other users receive 403. Report includes player progression and recent currency ledger; manual server backup and JSON export are available. Backup restore drills, retention and catalog tuning are later gates.

## Known alpha limits

One shared glade, existing three monster kinds, original procedural models, HTTP snapshots around 5 Hz. No rigged animation production, expanded world, crafting/build depth, friend/party/trade/market systems yet. Progression and social/economy content remain explicit work in BPLUS-PLAN.md.

Realm aggregate is bounded to 128 registered characters and 2 MB stored JSON. Requests serialize via revision CAS with eight conflict retries and bounded catch-up of 0.5 sec. This prevents offline farming and expensive inactive catch-up, but cannot be described as MMO-scale realtime architecture. Before beta: partition room state, measure production write contention/cost and adopt persistent room actors/WebSocket when supported.

Only the active simulation advances monsters. Offline characters retain their server save; reconnect after 10 sec clears old destination/target/auto. One account has one active command session; use separate Sites accounts for multiplayer. Sites remains owner-private until the owner chooses to share access.

Menu windows do not pause the server. Players should retreat to safety before browsing their bag. Network delay can affect the view; server position, range and windup checks determine damage.

## Alpha 0.2 update (2026-10-02)

Added rooms/worlds/rigged actors/equipment, parties/friends and shared rewards, trade/market escrow and operations maintenance/restore/tuning. Current evidence and open production/hardware gates are recorded in BPLUS-IMPLEMENTATION.md. Total verification: 22 rule/API tests and 8 browser scenarios passed across isolated runs. The new online party UI test also completed a mutual gold trade and sold an escrowed potion, verifying final server balances and zero page errors. Production audience remains unchanged.
