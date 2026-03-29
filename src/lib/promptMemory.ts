// Local-first memory system to allow the prompt generator to evolve concepts daily

const MEMORY_KEY_PREFIX = "stock_prompt_memory_";
const MAX_MEMORY_LIMIT = 50; // Increased limit for better long-term uniqueness

export interface PromptMemoryEntry {
  category: string;
  topic: string; // The specific subject or prompt snapshot
  date: number;
}

export function saveToPromptMemory(category: string, topics: string[]): void {
  try {
    const key = `${MEMORY_KEY_PREFIX}${category}`;
    const existingRaw = localStorage.getItem(key);
    let memory: PromptMemoryEntry[] = existingRaw ? JSON.parse(existingRaw) : [];

    const now = Date.now();
    topics.forEach((t) => {
      // Don't save duplicates
      if (!memory.find(m => m.topic === t)) {
        memory.push({ category, topic: t, date: now });
      }
    });

    memory = memory.sort((a, b) => b.date - a.date).slice(0, MAX_MEMORY_LIMIT);
    localStorage.setItem(key, JSON.stringify(memory));
  } catch (e) {
    console.warn("Could not save to prompt memory", e);
  }
}

export function getPromptMemory(category: string): string {
  try {
    const key = `${MEMORY_KEY_PREFIX}${category}`;
    const existingRaw = localStorage.getItem(key);
    if (!existingRaw) return "";
    
    const memory: PromptMemoryEntry[] = JSON.parse(existingRaw);
    if (memory.length === 0) return "";

    const pastTopics = memory.map(m => m.topic).join(" | ");
    return `CRITICAL MEMORY KNOWLEDGE (PAST GENERATIONS):\n[\n${pastTopics}\n]\n\nDO NOT repeat the exact subjects, specific compositions, or unique visual features listed above. Your goal is to EXCLUSIVELY invent NEW visual scenarios, lighting setups, or completely different sub-topics that have NOT been done recently in this category.`;
  } catch (e) {
    return "";
  }
}
