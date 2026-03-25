// Local-first memory system to allow the prompt generator to evolve concepts daily

const MEMORY_KEY_PREFIX = "stock_prompt_memory_";
const MAX_MEMORY_LIMIT = 20;

export interface PromptMemoryEntry {
  category: string;
  topic: string;
  date: number;
}

export function saveToPromptMemory(category: string, topics: string[]): void {
  try {
    const key = `${MEMORY_KEY_PREFIX}${category}`;
    const existingRaw = localStorage.getItem(key);
    let memory: PromptMemoryEntry[] = existingRaw ? JSON.parse(existingRaw) : [];

    // Add new ones
    const now = Date.now();
    topics.forEach((t) => {
      memory.push({ category, topic: t, date: now });
    });

    // Keep only the most recent N items
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

    const pastTopics = memory.map(m => m.topic).join(", ");
    return `PAST GENERATIONS GENERATED RECENTLY: [ ${pastTopics} ]. YOU MUST AVOID REPEATING THESE EXACT SCENARIOS/SUBJECTS. EVOLVE THE CONCEPT TO A NEW LEVEL OR ENTIRELY DIFFERENT SUB-TOPIC.`;
  } catch (e) {
    return "";
  }
}
