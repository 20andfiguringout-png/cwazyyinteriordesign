import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const alveoEvents = pgTable("alveo_events", {
  id:         serial("id").primaryKey(),
  eventName:  text("event_name").notNull(),
  properties: jsonb("properties"),
  sessionId:  text("session_id"),
  createdAt:  timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export type AlveoEvent = typeof alveoEvents.$inferSelect;
export type InsertAlveoEvent = typeof alveoEvents.$inferInsert;
