import { pgTable, text, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const alveoDesigns = pgTable("alveo_designs", {
  id:        text("id").notNull(),
  userEmail: text("user_email").notNull(),
  name:      text("name").notNull(),
  config:    jsonb("config"),
  savedAt:   timestamp("saved_at", { withTimezone: false }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userEmail, table.id] }),
}));

export type AlveoDesign = typeof alveoDesigns.$inferSelect;
export type InsertAlveoDesign = typeof alveoDesigns.$inferInsert;
