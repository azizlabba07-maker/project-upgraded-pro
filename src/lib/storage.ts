import { supabase, checkAuthStatus } from "./supabase";

/**
 * 3. HYBRID DATA LAYER
 * Handles seamless switching between LocalStorage (Guest Mode) 
 * and Supabase Cloud (Authenticated Mode).
 */

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = "stock_saved_prompts_hybrid";

export async function savePrompt(promptData: Omit<SavedPrompt, "id" | "createdAt">): Promise<boolean> {
  const { isGuest, user } = await checkAuthStatus();
  
  const newItem: SavedPrompt = {
    ...promptData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  if (isGuest || !user) {
    // Guest Mode: Local Storage
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(newItem);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      return true;
    } catch {
      return false;
    }
  } else {
    // Cloud Mode: Supabase
    try {
      const { error } = await supabase
        .from("saved_prompts")
        .insert([{
          user_id: user.id,
          title: newItem.title,
          prompt: newItem.prompt,
          category: newItem.category,
          created_at: newItem.createdAt
        }]);
      
      if (error) {
          console.error("Supabase Save Error:", error);
          return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

export async function getSavedPrompts(): Promise<SavedPrompt[]> {
  const { isGuest, user } = await checkAuthStatus();

  if (isGuest || !user) {
    // Guest Mode
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  } else {
    // Cloud Mode
    try {
      const { data, error } = await supabase
        .from("saved_prompts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error || !data) return [];
      
      return data.map(row => ({
        id: row.id,
        title: row.title,
        prompt: row.prompt,
        category: row.category,
        createdAt: row.created_at
      }));
    } catch {
      return [];
    }
  }
}

export async function deleteSavedPrompt(id: string): Promise<boolean> {
  const { isGuest, user } = await checkAuthStatus();

  if (isGuest || !user) {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!existingStr) return false;
      let existing: SavedPrompt[] = JSON.parse(existingStr);
      existing = existing.filter(p => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      return true;
    } catch {
      return false;
    }
  } else {
    try {
      const { error } = await supabase
        .from("saved_prompts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      return !error;
    } catch {
      return false;
    }
  }
}

// ── Generic Notes / Prompt Texts ──
const NOTES_LOCAL_KEY = "tools_notes_archive_v1";

export async function saveNote(noteText: string): Promise<boolean> {
  const { isGuest, user } = await checkAuthStatus();
  
  if (isGuest || !user) {
    try {
      const existingStr = localStorage.getItem(NOTES_LOCAL_KEY);
      const existing: string[] = existingStr ? JSON.parse(existingStr) : [];
      if (!existing.includes(noteText)) {
        existing.unshift(noteText);
        localStorage.setItem(NOTES_LOCAL_KEY, JSON.stringify(existing.slice(0, 20)));
      }
      return true;
    } catch { return false; }
  } else {
    try {
      // In Supabase, we can use saved_prompts with a generic category
      const { error } = await supabase.from("saved_prompts").insert([{
        user_id: user.id,
        title: "ملاحظة سريعة",
        prompt: noteText,
        category: "note",
        created_at: new Date().toISOString()
      }]);
      return !error;
    } catch { return false; }
  }
}

export async function getNotes(): Promise<{ id: string, text: string }[]> {
  const { isGuest, user } = await checkAuthStatus();
  
  if (isGuest || !user) {
    try {
      const existingStr = localStorage.getItem(NOTES_LOCAL_KEY);
      const existing: string[] = existingStr ? JSON.parse(existingStr) : [];
      return existing.map((text, i) => ({ id: i.toString(), text }));
    } catch { return []; }
  } else {
    try {
      const { data, error } = await supabase
        .from("saved_prompts")
        .select("id, prompt")
        .eq("user_id", user.id)
        .eq("category", "note")
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map(row => ({ id: row.id, text: row.prompt }));
    } catch { return []; }
  }
}

export async function deleteNote(id: string, text: string): Promise<boolean> {
  const { isGuest, user } = await checkAuthStatus();
  
  if (isGuest || !user) {
    try {
      const existingStr = localStorage.getItem(NOTES_LOCAL_KEY);
      if (!existingStr) return false;
      let existing: string[] = JSON.parse(existingStr);
      existing = existing.filter(n => n !== text);
      localStorage.setItem(NOTES_LOCAL_KEY, JSON.stringify(existing));
      return true;
    } catch { return false; }
  } else {
    try {
      const { error } = await supabase.from("saved_prompts").delete().eq("id", id).eq("user_id", user.id);
      return !error;
    } catch { return false; }
  }
}
