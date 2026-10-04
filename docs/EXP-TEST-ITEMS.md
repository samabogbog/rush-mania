# EXP testing items

EXP Tome grants a fixed **1,000 EXP** per click in Bag → Consumables, using existing level progression and attribute rewards. This amount is an implementation assumption for the requested testing item. The existing handbook PNG (`/icons/help.png`) supplies its book icon. It cannot enter auxiliary hotbar slots. Level 100 keeps the item; dead characters cannot consume it.

The next signed-in connection of a server-verified `ADMIN_EMAIL` account receives **9,999 EXP Tomes in its bag** once per player. Existing characters qualify. A full bag defers the whole grant until a later connection with space; existing tome stacks accept the grant without a new slot. Optional `Player.expTestGrant` persists in the realm JSON independently of the rotating audit ledger, so no D1 migration is needed. Realm revision commits make the stack, marker, and audit entry atomic and safe under retries.

Only server identity grants admin authority. The existing admin item catalog also includes EXP Tome for later refills. Ordinary accounts receive no free grant. Consumption commands accept only an item name, never EXP or quantity. Session sequence replay protection prevents duplicate consumption; successful use and grants are audited.

Validation: `npx playwright test tests/exp-items.spec.ts tests/item-admin.spec.ts` and `npx tsc --noEmit`. No deployment is performed by this change; the connection grant takes effect once the updated worker is deployed.
