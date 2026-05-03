import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const alveoDesignApprovals = pgTable("alveo_design_approvals", {
  id:              text("id").primaryKey().default(sql`gen_random_uuid()`),
  designId:        text("design_id").notNull(),
  ownerEmail:      text("owner_email").notNull(),
  designName:      text("design_name"),
  clientEmail:     text("client_email"),
  token:           text("token").unique().notNull(),
  status:          text("status").notNull().default("pending"),
  clientNote:      text("client_note"),
  designSnapshot:  jsonb("design_snapshot"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt:     timestamp("responded_at", { withTimezone: true }),
});

export type AlveoDesignApproval = typeof alveoDesignApprovals.$inferSelect;
export type InsertAlveoDesignApproval = typeof alveoDesignApprovals.$inferInsert;
