// Supabase Edge Function: claude-proxy
// Deploy path:
//   supabase functions deploy claude-proxy
//
// Required secrets:
//   supabase secrets set CLAUDE_API_KEY=...
// Optional:
//   supabase secrets set CLAUDE_PROXY_TOKEN=your-shared-token
//
// Frontend env:
//   VITE_CLAUDE_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/claude-proxy
//   VITE_CLAUDE_PROXY_TOKEN=your-shared-token (if configured above)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const requiredToken = Deno.env.get("CLAUDE_PROXY_TOKEN") || "";
    if (requiredToken) {
      const auth = req.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (!token || token !== requiredToken) {
        return new Response(JSON.stringify({ error: "Unauthorized proxy request" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const userPrompt = String(body.userPrompt || "");
    const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : undefined;
    const maxTokens = Number(body.maxTokens || 4096);

    if (!userPrompt.trim()) {
      return new Response(JSON.stringify({ error: "Missing userPrompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing CLAUDE_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeBody: Record<string, unknown> = {
      model: CLAUDE_MODEL,
      max_tokens: Number.isFinite(maxTokens) ? Math.min(Math.max(maxTokens, 64), 8192) : 4096,
      messages: [{ role: "user", content: userPrompt }],
    };
    if (systemPrompt?.trim()) claudeBody.system = systemPrompt.trim();

    const claudeRes = await fetch(CLAUDE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(claudeBody),
    });

    const data = await claudeRes.json().catch(() => ({}));
    if (!claudeRes.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || `Claude error ${claudeRes.status}` }), {
        status: claudeRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = data?.content?.[0]?.text || "";
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected proxy failure";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

