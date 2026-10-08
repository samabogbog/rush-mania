CREATE TABLE game_characters (
 id TEXT PRIMARY KEY NOT NULL,
 account_id TEXT NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
 name TEXT NOT NULL,
 job TEXT NOT NULL CHECK(job IN ('swordsman','mage','archer')),
 created_at INTEGER NOT NULL,
 UNIQUE(account_id,slot)
);
ALTER TABLE game_sessions ADD COLUMN selected_character_id TEXT REFERENCES game_characters(id);
