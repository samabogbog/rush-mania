# Item categories, testing tools and SQLite

All item creation and save loading classifies items from their authoritative definition: weapons, armor (helmet/coat/gloves/boots), accessories, potions, materials and refine stones. Old saves migrate categories without changing item IDs, equipment or quantities. Inventory has category tabs with occupied-slot counts, name/quantity sorting, 48 cells per page and three pages for each filtered view. Equipped items remain in the bag.

## Admin item testing

Settings → **Admin: spawn items** appears for an authorized online account. Select category, item and quantity. Equipment also offers Common/Rare/Epic/Legend and +0–+10 refinement. Affixes are rolled on the server using the existing rarity rules. Up to 20 equipment pieces or 9,999 stackable items per command. Grants target the signed-in administrator's own character. Full bags reject a grant as a whole; existing material stacks can still grow. Grants do not bypass equipment class or level requirements.

The Worker derives admin rights from Sites' trusted authenticated email and the existing `ADMIN_EMAIL` server secret. Clients cannot grant themselves rights by submitting `admin: true`, saves or headers outside the Sites identity gateway. The same sequential command IDs and SQLite revision compare-and-swap used by gameplay prevent duplicate grants after response loss. Each successful grant is recorded in the realm's bounded economy ledger and command metrics. Use Realm operations to inspect the history.

## Run locally with SQLite

Requires Node 22.13+ (Node 24 recommended).

```
npm ci
npm run dev:server
```

In another terminal:

```
npm run dev
```

Open `http://localhost:5173/?online=1`. The API listens only on **127.0.0.1:8787**, applies SQL migrations and writes `.local/game.sqlite`. Restarting preserves characters, items, quests and realm state. SQLite runs with WAL, FULL synchronous durability and a five-second busy timeout. Commits check the stored revision to avoid overwriting concurrent changes. `.local` is ignored by Git and excluded from distributed sources.

The loopback development identity `local-sprout` is a testing administrator. `MOSSVALE_DEV_ADMIN_ID` changes the sole local admin identity; `MOSSVALE_DB_PATH` selects another SQLite file. The `mossvale-dev` cookie simulates separate development accounts. This simulator is **local testing only**, never bundled into the production Worker. Caller-supplied authenticated email headers are discarded. Do not expose the development API publicly.

`?practice=1` is intentionally offline and continues to use the browser save; it does not access SQLite or show server admin tools.

## Sites database

Sites already binds **DB** to Cloudflare D1, which is backed by SQLite. Production keeps that binding and its existing player data. Local and hosted APIs use the same schema (`realms`, `backups`) and prepared-statement adapter. The current alpha stores the realm's characters and item instances in a JSON snapshot in the `realms` table; this is persistent SQLite storage, not separate relational item/player tables. The existing 128-account and two-megabyte realm limits still apply. A larger live MMORPG will need a separate per-player/transaction schema and a more suitable continuously running simulation server.

For backups use Realm operations; for a local file backup while the API is stopped, copy the database and any remaining WAL/SHM companions together. Never commit player databases or server secrets.
