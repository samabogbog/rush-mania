# Account character entry

Every page visit waits on login and character selection. `Start adventure` selects the owned character for the current authenticated session; only then does `main.ts` create the map, renderer, input handlers, and game connection. Refreshing an authenticated page returns to the roster. Device practice also requires an explicit Start.

Accounts have three slots, enforced by SQLite CHECK/UNIQUE constraints and a single atomic free-slot INSERT. Each character has its own player ID, class, save, inventory, and progression. Existing persisted account heroes are registered in slot 1 using the original player ID and save. Character creation/selection do not rewrite the authoritative realm blob.

Settings provides Switch character and Log out. Both close the active network simulation and return to the entry page. The WebSocket ticket carries the selected character's identity and class; the server checks account ownership and session selection at handshake and during session renewal.

Database changes are additive in `drizzle/0003_account_characters.sql` and the equivalent `server/migrations.json`. Both local SQLite and deployed Turso use these migrations. API routes: GET/POST `/api/characters`, POST `/api/characters/create`, POST `/api/characters/select`.

## Verification

- Backend suite: 37 checks passed, including original save preservation, concurrent three-slot limits, cross-account rejection, authenticated selection, realtime reconnect/session checks, Turso migration parity, and unbundled Node24 API packaging.
- Browser flow on local SQLite: created Swordsman, Mage, Archer; entered each explicitly; purchased a potion on the first hero; switched through all three; restored the original gold (105) and inventory while other heroes retained starting gold (120); logged out and logged in; refreshed back to roster. No page errors.
- Desktop and 390×600 roster screenshots are under `artifacts/character-entry/`. These checks used Chromium with software ANGLE SwiftShader and Low graphics; they are functional checks, not hardware FPS measurements.

Existing gameplay browser fixtures now click Start practice after navigating to device practice, matching the new entry flow.
