import { readFileSync } from 'fs';
import { resolve } from 'path';

// read the .env for keys
const envPath = resolve(process.cwd(), '.env');
const env = readFileSync(envPath, 'utf-8');
const geminiKey = env.split('\n').find(l => l.startsWith('VITE_GEMINI_API_KEY'))?.split('=')[1]?.trim();

async function testGemini() {
  const apiKey = geminiKey;
  if (!apiKey) {
    console.log("No Gemini API key found in .env");
    return;
  }

  const category = "Technology";
  const count = 15;
  const seed = `${Date.now()}`;
  const topicHint = "Remote Workspaces. Futuristic concepts.";

  const prompt = `You are an expert Adobe Stock prompt engineer. Generate exactly ${count} prompts.

REQUIRED CATEGORY: "${category}" — EVERY prompt MUST be about this topic ONLY.

UNIQUENESS SEED: ${seed}
OUTPUT TYPE: VIDEO prompts ONLY (camera movement, 10-30s)
COMPETITION: low-to-medium competition
USER TITLE/TOPIC TO FOLLOW STRICTLY: "${topicHint}". Every prompt must stay aligned with this title and category.

CRITICAL DIVERSITY INSTRUCTION:
Even though you are strictly following the assigned topic, YOU MUST MAKE EVERY SINGLE PROMPT COMPLETELY UNIQUE.
1. Change the camera angles (extreme close-up, wide shot, aerial, low angle).
2. Change the lighting setups (cinematic, warm golden hour, moody neon, stark studio lighting).
3. Change the specific subject matter and setting details for each of the ${count} prompts.
NO TWO PROMPTS CAN BE IDENTICAL OR TOO SIMILAR. YOU MUST INVENT DIFFERENT VISUAL STORIES FOR EVERY PROMPT.

Return ONLY valid JSON array:
[{"number":1,"category":"${category}","type":"video","demand":"low","prompt":"FULL DETAILED PROMPT 60+ words","title":"SEO title max 70 chars","keywords":["kw1"]}]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 },
    }),
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("RAW TEXT RESPONSE:");
  console.log(text?.substring(0, 500) + "...");
  
  if (text) {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      console.log(`Parsed Array Length: ${parsed.length}`);
      console.log(`Prompt 1:`, parsed[0]?.prompt);
      console.log(`Prompt 2:`, parsed[1]?.prompt);
      console.log(`Prompt 3:`, parsed[2]?.prompt);
      if (parsed[0]?.prompt === parsed[1]?.prompt) {
        console.log("DUPLICATES DETECTED!");
      } else {
        console.log("Prompts are unique.");
      }
    }
  }
}

testGemini().catch(console.error);
