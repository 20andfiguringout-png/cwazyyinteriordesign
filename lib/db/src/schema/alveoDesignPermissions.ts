import { pgTable, text } from "drizzle-orm/pg-core";

export const alveoDesignPermissions = pgTable("alveo_design_permissions", {
  designId:    text("design_id").primaryKey(),
  ownerEmail:  text("owner_email"),
  defaultRole: text("default_role").notNull().default("editor"),
  editors:     text("editors").array().notNull().default([]),
});

export type AlveoDesignPermission = typeof alveoDesignPermissions.$inferSelect;
export type InsertAlveoDesignPermission = typeof alveoDesignPermissions.$inferInsert;
