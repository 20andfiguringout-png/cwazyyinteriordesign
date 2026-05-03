import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const alveoClients = pgTable("alveo_clients", {
  id:          text("id").notNull().primaryKey(),
  ownerEmail:  text("owner_email").notNull(),
  name:        text("name").notNull(),
  email:       text("email"),
  phone:       text("phone"),
  address:     text("address"),
  projectType: text("project_type"),
  status:      text("status").default("active").notNull(),
  notes:       text("notes"),
  budget:      text("budget"),
  createdAt:   timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export type AlveoClient    = typeof alveoClients.$inferSelect;
export type InsertAlveoClient = typeof alveoClients.$inferInsert;
