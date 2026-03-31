import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  uploadedFiles, InsertUploadedFile,
  generatedMetadata, InsertGeneratedMetadata,
  userPreferences, InsertUserPreferences,
  keywordTemplates,
  processingHistory, InsertProcessingHistory,
  batchJobs, InsertBatchJob
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// File management queries
export async function createUploadedFile(file: InsertUploadedFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(uploadedFiles).values(file);
  return result;
}

export async function getUploadedFilesByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(uploadedFiles).where(eq(uploadedFiles.userId, userId));
}

export async function getUploadedFileById(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, fileId)).limit(1);
  return result[0];
}

// Metadata queries
export async function createGeneratedMetadata(metadata: InsertGeneratedMetadata) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generatedMetadata).values(metadata);
  return result;
}

export async function getMetadataByFileId(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(generatedMetadata).where(eq(generatedMetadata.fileId, fileId)).limit(1);
  return result[0];
}

export async function getMetadataByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(generatedMetadata).where(eq(generatedMetadata.userId, userId));
}

export async function updateMetadata(metadataId: number, updates: Partial<InsertGeneratedMetadata>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(generatedMetadata).set(updates).where(eq(generatedMetadata.id, metadataId));
}

// User preferences queries
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0];
}

export async function createOrUpdateUserPreferences(userId: number, prefs: Partial<InsertUserPreferences>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserPreferences(userId);
  if (existing) {
    return db.update(userPreferences).set(prefs).where(eq(userPreferences.userId, userId));
  } else {
    return db.insert(userPreferences).values({ userId, ...prefs });
  }
}

// Keyword templates queries
export async function getKeywordTemplatesByCategory(category: string, language: string = 'en') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(keywordTemplates)
    .where(and(eq(keywordTemplates.category, category), eq(keywordTemplates.language, language), eq(keywordTemplates.isActive, true)));
}

export async function getAllKeywordTemplates(language: string = 'en') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(keywordTemplates)
    .where(and(eq(keywordTemplates.language, language), eq(keywordTemplates.isActive, true)));
}

// Processing history queries
export async function createProcessingHistory(history: InsertProcessingHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(processingHistory).values(history);
}

export async function getProcessingHistoryByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(processingHistory)
    .where(eq(processingHistory.userId, userId))
    .orderBy(desc(processingHistory.createdAt))
    .limit(limit);
}

// Batch job queries
export async function createBatchJob(job: InsertBatchJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(batchJobs).values(job);
}

export async function getBatchJobsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(batchJobs).where(eq(batchJobs.userId, userId));
}

export async function updateBatchJob(jobId: number, updates: Partial<InsertBatchJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(batchJobs).set(updates).where(eq(batchJobs.id, jobId));
}

// TODO: add more feature queries here as your schema grows.
