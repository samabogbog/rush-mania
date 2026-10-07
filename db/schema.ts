import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const realms = sqliteTable('realms', { id:text('id').primaryKey(), revision:integer('revision').notNull(), state:text('state').notNull(), updatedAt:integer('updated_at').notNull() });
export const backups = sqliteTable('backups', { id:text('id').primaryKey(), revision:integer('revision').notNull(), state:text('state').notNull(), createdAt:integer('created_at').notNull() });

export const gameAccounts=sqliteTable('game_accounts',{id:text('id').primaryKey(),username:text('username').notNull().unique(),playerId:text('player_id').notNull().unique(),legacySiteId:text('legacy_site_id').unique(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),createdAt:integer('created_at').notNull()});
export const gameSessions=sqliteTable('game_sessions',{tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>gameAccounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()});
export const authAttempts=sqliteTable('auth_attempts',{key:text('key').primaryKey(),window:integer('window').notNull(),attempts:integer('attempts').notNull()});
export const realtimeLeases=sqliteTable('realtime_leases',{id:text('id').primaryKey(),owner:text('owner').notNull(),expiresAt:integer('expires_at').notNull()});
