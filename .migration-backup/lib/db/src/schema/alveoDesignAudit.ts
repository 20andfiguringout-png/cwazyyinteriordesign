import { pgTable, bigserial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const alveoDesignAudit = pgTable("alveo_design_audit", {
  id:         bigserial("id", { mode: "bigint" }).primaryKey(),
  actorEmail: text("actor_email"),
  action:     text("action").notNull(),
  designId:   text("design_id"),
  targetId:   text("target_id"),
  beforeData: jsonb("before_data"),
  afterData:  jsonb("after_data"),
  createdAt:  timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export type AlveoDesignAudit = typeof alveoDesignAudit.$inferSelect;
export type InsertAlveoDesignAudit = typeof alveoDesignAudit.$inferInsert;
