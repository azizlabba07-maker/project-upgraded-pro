import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Uploaded files table - stores metadata about uploaded images and videos
 */
export const uploadedFiles = mysqlTable("uploaded_files", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // 'image' or 'video'
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  s3Key: varchar("s3Key", { length: 500 }).notNull(),
  s3Url: text("s3Url").notNull(),
  thumbnailUrl: text("thumbnailUrl"), // for videos
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;

/**
 * Generated metadata table - stores AI-generated titles, keywords, and descriptions
 */
export const generatedMetadata = mysqlTable("generated_metadata", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  keywords: text("keywords").notNull(), // JSON array of keywords
  keywordCount: int("keywordCount").default(0),
  language: varchar("language", { length: 10 }).default("en").notNull(), // 'en' or 'ar'
  aiModel: varchar("aiModel", { length: 50 }).default("gpt-4-vision").notNull(),
  processingTime: int("processingTime"), // in milliseconds
  isApproved: boolean("isApproved").default(false),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedMetadata = typeof generatedMetadata.$inferSelect;
export type InsertGeneratedMetadata = typeof generatedMetadata.$inferInsert;

/**
 * Processing history table - tracks user actions and processing events
 */
export const processingHistory = mysqlTable("processing_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileId: int("fileId"),
  metadataId: int("metadataId"),
  actionType: varchar("actionType", { length: 50 }).notNull(), // 'upload', 'generate', 'export', 'edit', 'delete'
  actionDetails: text("actionDetails"), // JSON object with additional details
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  simulatedDelay: int("simulatedDelay"), // in milliseconds for human-like behavior
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessingHistory = typeof processingHistory.$inferSelect;
export type InsertProcessingHistory = typeof processingHistory.$inferInsert;

/**
 * Keyword templates table - predefined keyword sets organized by category
 */
export const keywordTemplates = mysqlTable("keyword_templates", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // 'Nature', 'Business', 'Technology', etc.
  subcategory: varchar("subcategory", { length: 100 }),
  keywords: text("keywords").notNull(), // JSON array of keywords
  language: varchar("language", { length: 10 }).default("en").notNull(),
  description: text("description"),
  usageCount: int("usageCount").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KeywordTemplate = typeof keywordTemplates.$inferSelect;
export type InsertKeywordTemplate = typeof keywordTemplates.$inferInsert;

/**
 * User preferences table - stores user-specific settings
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("en").notNull(),
  enableHumanSimulation: boolean("enableHumanSimulation").default(true),
  delayBetweenActions: int("delayBetweenActions").default(2000), // in milliseconds
  randomDelayVariation: int("randomDelayVariation").default(1000), // in milliseconds
  maxFilesPerBatch: int("maxFilesPerBatch").default(10),
  autoApproveMetadata: boolean("autoApproveMetadata").default(false),
  notificationsEnabled: boolean("notificationsEnabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

/**
 * Batch jobs table - tracks batch processing operations
 */
export const batchJobs = mysqlTable("batch_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  batchName: varchar("batchName", { length: 255 }).notNull(),
  totalFiles: int("totalFiles").notNull(),
  processedFiles: int("processedFiles").default(0),
  failedFiles: int("failedFiles").default(0),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "paused"]).default("pending").notNull(),
  fileIds: text("fileIds").notNull(), // JSON array of file IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type BatchJob = typeof batchJobs.$inferSelect;
export type InsertBatchJob = typeof batchJobs.$inferInsert;