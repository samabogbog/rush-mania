import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const realms = sqliteTable('realms', { id:text('id').primaryKey(), revision:integer('revision').notNull(), state:text('state').notNull(), updatedAt:integer('updated_at').notNull() });
export const backups = sqliteTable('backups', { id:text('id').primaryKey(), revision:integer('revision').notNull(), state:text('state').notNull(), createdAt:integer('created_at').notNull() });
