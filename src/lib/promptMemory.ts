// src/lib/promptMemory.ts
import Cache from "./Cache";

const MEMORY_KEY_PREFIX = "prompt_memory_";
const MEMORY_TTL = 72 * 60 * 60 * 1000; // 3 days
const MAX_PER_CATEGORY = 30;

export interface PromptMemoryEntry {
  category: string;
  topic: string; 
  date: number;
}

/**
 * Saves subjects to a category-specific memory pool in Cache.
 */
export function saveToPromptMemory(category: string, topics: string[]): void {
  try {
    const key = MEMORY_KEY_PREFIX + category;
    const existing = Cache.get<PromptMemoryEntry[]>(key) || [];
    const now = Date.now();

    const newEntries: PromptMemoryEntry[] = topics.map(t => ({
      category,
      topic: t,
      date: now
    }));

    // Combine, unique by topic, limit, and sort
    const combined = [...newEntries, ...existing];
    const unique = combined.filter((v, i, a) => a.findIndex(t => t.topic === v.topic) === i);
    const result = unique.sort((a, b) => b.date - a.date).slice(0, MAX_PER_CATEGORY);

    Cache.set(key, result, MEMORY_TTL);
  } catch (e) {
    console.warn("Could not save prompt memory:", e);
  }
}

/**
 * Retrieves the memory pool for a specific category as a formatted string for AI.
 */
export function getPromptMemory(category: string): string {
  try {
    const key = MEMORY_KEY_PREFIX + category;
    const memory = Cache.get<PromptMemoryEntry[]>(key) || [];
    
    if (memory.length === 0) return "";

    const pastTopics = memory.map(m => m.topic).join(" | ");
    
    return `
RECOGNIZED PORTFOLIO MEMORY:
The system has recently generated the following topics/compositions in the "${category}" category:
[ ${pastTopics} ]

INSTRUCTION: Ensure your new generations provide FRESH visual diversity. Iterate into unexplored niches or unique lighting/compositional styles not mentioned above.
`;
  } catch (e) {
    return "";
  }
}

/**
 * Total cleanup of memory for a category.
 */
export function clearPromptMemory(category: string): void {
  Cache.set(MEMORY_KEY_PREFIX + category, [], 0);
}
