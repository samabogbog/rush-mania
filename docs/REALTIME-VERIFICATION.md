# Realtime verification — 2026-10-07

Implementation: continuous single-owner realm, 20Hz simulation /10Hz snapshots, immediate movement presentation, signed session tickets, background checkpoints and durable command acknowledgments. Frontend remains Vercel; Railway deployment is not yet active.

## Verified

- `npm run build` and `npm run build:realtime` pass.
- 32 tests pass across account-auth, online-authority, realtime-client, realtime-server, realtime-websocket, vercel-node-package and vercel-turso suites. After strengthening the restart case to buy a potion and check the exact15 gold cost, all5 realtime-server tests pass again.
- Real Node WebSocket connection authenticates against account/session rows, advances movement without HTTP game polling, reconnects to the same command session, rejects reused tickets, and blocks concurrent legacy HTTP writes.
- Delayed database checkpoint does not block in-memory movement. Durable acknowledgment remains pending until commit. Database failure freezes the realm rather than accepting more actions.
- Process restart preserves saved character/session; replayed purchase charges once. A second realm owner and HTTP revision writes cannot overwrite the active realm.
- Native Node24 imports the emitted unbundled Vercel API graph, including realtime-ticket, without extension/module errors. Additive migration SQL, checksums and idempotence pass.

## Browser evidence

Local Chromium with SwiftShader,1200×800, low graphics, same final source and local SQLite. Playwright WebSocket bridge adds250ms or700ms in **each** direction. Private captures/logs remain in `.local/websocket-final-{250,700}.{png,json}`. Zero page errors; model loading completed with modelErrors0. Diagnostics report transportwebsocket,20Hz/10Hz and no HTTP game requests.

| Added one-way delay | Observed RTT | Authoritative movement over~4.7s | Presentation movement |
| --- | --- | --- | --- |
|250ms|~615ms|16.44 world units|17.42 world units|
|700ms|~1471ms|12.08 world units|15.57 world units|

Software rendering in this execution environment is slow (15–16 sampled frames in the interval). These captures verify state flow and prediction under delayed packets, **not**60FPS or perceived smoothness on the user's device. At extreme latency prediction still has correction and pauses; no claim that all visible stutter is eliminated. Actual Railway→Turso latency and gameplay must be checked after service provisioning.

## Deployment limits

No Railway account connector, CLI login or token is available in this workspace. Turso credentials are sensitive Vercel envs and cannot be copied through the connector. User must provision the Railway service and set its variables without sending secrets in chat. Vercel code can ship with realtime disabled until the service is healthy. See RAILWAY-REALTIME-TH.md for exact steps/cutover order.

Single replica only. Checkpoints may lose up to~5s progress after an abrupt process crash; reconnect replays unacknowledged commands. Lease timeout30s may delay crash restart. This prototype is not a high-availability distributed realm.

## Recovery fix — 2026-10-08

User's Railway log shows successful startup followed by a generic persistence/ownership failure. App Sleeping is off. That log does not identify the original cause.

Fixed fatal realm failures leaving the HTTP process alive: CLI now closes connections and exits1, allowing Railway ON_FAILURE restart. Factory callers remain in control and never exit the test process. Startup can wait up to35s for a prior lease without stealing it; renew requests are singleflight. Classified logs distinguish lease expiry/conflict, revision conflict and database failure, with safe code/context only (no raw database messages/tokens/URLs).

27 focused regression tests passed, including a spawned CLI process that loses ownership and exits1 while retaining the other owner's lease. An additional realSQLite startup-wait test passed, proving the old owner cannot checkpoint over the replacement. Both TypeScript checks and realtime bundle build pass. No live database writes or manual lease deletion were performed. Live recovery still requires the new Railway deployment and a healthy /health result; underlying production fault remains unconfirmed until classified logs are observed.

## Pickup command backlog — 2026-10-08

Reproduced a client transmission defect:8 transient actions were already applied by the server, but not yet checkpointed; sending only the first8 retained commands repeatedly withheld a subsequent collect action until durability advanced. Client now tracks applied command sequence for transmission only, while retaining all commands until durable acknowledgment. New connections reset the applied watermark from the hello snapshot, allowing original-ID replay when a restarted server resumes an older checkpoint. Drop odds and reward formulas are unchanged.

Build and16 focused tests pass (client, loot, realm, realWebSocket). Tests verify exact2 boss equipment drops, collection/checkpoint/restart preservation, pre-WebSocket ground loot collection without duplicate pickup, and backlog/reconnect replay.

Local realbrowser fixture: actual account/session and WebSocket service with SQLite; boss reduced to1HP and Lv100 hero positioned nearby solely to exercise kill/drop/pickup deterministically. Chromium SwiftShader,1200×800, low graphics; waited for all expected models and modelErrors0. Clicked Loot to collect1 pre-existing potion; clicked nearest target to kill boss; clicked Loot to collect4 resulting drops. Potion count increased1, equipment count increased2, groundloot0, pendingCommands0, applied/durableCommandSequence3, zero page errors. Private proof `.local/loot-browser-final.png` and `.local/loot-browser-result.json`. No production player data or database edited. This confirms the tested solo flow; the user's separate report of no visible drops was not independently reproduced on their account.
