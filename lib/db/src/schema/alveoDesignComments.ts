import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const alveoDesignComments = pgTable("alveo_design_comments", {
  id:          text("id").primaryKey(),
  designId:    text("design_id").notNull(),
  userEmail:   text("user_email").notNull(),
  authorName:  text("author_name").notNull(),
  text:        text("text").notNull(),
  parentId:    text("parent_id"),
  mentions:    text("mentions").array().notNull().default([]),
  mentionRead: boolean("mention_read").notNull().default(false),
  createdAt:   timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export type AlveoDesignComment = typeof alveoDesignComments.$inferSelect;
export type InsertAlveoDesignComment = typeof alveoDesignComments.$inferInsert;
