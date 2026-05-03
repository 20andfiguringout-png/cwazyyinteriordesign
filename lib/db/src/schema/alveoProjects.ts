import { sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const alveoProjects = pgTable("alveo_projects", {
  id:          text("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerEmail:  text("owner_email").notNull(),
  name:        text("name").notNull(),
  clientName:  text("client_name"),
  status:      text("status").notNull().default("active"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AlveoProject = typeof alveoProjects.$inferSelect;
export type InsertAlveoProject = typeof alveoProjects.$inferInsert;
