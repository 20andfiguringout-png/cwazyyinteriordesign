import { pgTable, text, boolean, primaryKey } from "drizzle-orm/pg-core";

export const alveoMentionReads = pgTable("alveo_mention_reads", {
  mentionUser: text("mention_user").notNull(),
  commentId:   text("comment_id").notNull(),
  read:        boolean("read").notNull().default(true),
}, (table) => ({
  pk: primaryKey({ columns: [table.mentionUser, table.commentId] }),
}));

export type AlveoMentionRead = typeof alveoMentionReads.$inferSelect;
export type InsertAlveoMentionRead = typeof alveoMentionReads.$inferInsert;
