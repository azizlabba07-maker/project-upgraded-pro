// Supabase Edge Function: market-pulse
// Returns live/trending-like data for Adobe Stock market dashboard.
// Deploy: supabase functions deploy market-pulse
//
// Frontend env:
//   VITE_MARKET_PULSE_URL=https://<project-ref>.supabase.co/functions/v1/market-pulse

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TRENDS_RSS_URL = "https://trends.google.com/trending/rss?geo=US";

interface TrendItem {
  topic: string;
  demand: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  profitability: number;
  category: string;
  searches: number;
}

function parseGoogleTrendsRSS(xml: string): {topic: string, traffic: number}[] {
  const items: {topic: string, traffic: number}[] = [];
  const parts = xml.split("</item>");
  for (const part of parts) {
    if (!part.includes("<item>")) continue;
    const titleMatch = part.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i);
    const trafficMatch = part.match(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/i);
    
    if (titleMatch && trafficMatch) {
      const title = titleMatch[1].replace(/^Daily Search Trends:\s*/i, "").trim();
      const trafficStr = trafficMatch[1].replace(/,/g, "").replace(/\+/, "").trim();
      const traffic = parseInt(trafficStr, 10) || 5000;
      if (title && title.length < 80) items.push({ topic: title, traffic });
    }
  }
  return items.slice(0, 20);
}

function mapToTrendItems(parsedItems: {topic: string, traffic: number}[]): TrendItem[] {
  const categories = ["AI", "Sustainability", "Technology", "Business", "Science", "Nature", "Design", "Wellness", "Food"];

  if (parsedItems.length === 0) {
    return [
      { topic: "AI and Machine Learning", demand: "high", competition: "high", profitability: 87, category: "AI", searches: 200000 },
      { topic: "Sustainability and Green Energy", demand: "high", competition: "medium", profitability: 89, category: "Sustainability", searches: 150000 },
      { topic: "Remote Work and Home Office", demand: "high", competition: "medium", profitability: 86, category: "Technology", searches: 100000 },
    ];
  }

  const maxTraffic = Math.max(...parsedItems.map(i => i.traffic), 1);

  return parsedItems.slice(0, 15).map((item, i) => {
    const cat = categories[i % categories.length];
    
    // Deterministic Demand based on real Traffic
    const normalizedTraffic = item.traffic / maxTraffic;
    let demand: TrendItem["demand"] = "low";
    if (item.traffic >= 100000 || normalizedTraffic >= 0.7) demand = "high";
    else if (item.traffic >= 20000 || normalizedTraffic >= 0.3) demand = "medium";
    
    // Competition heuristic based on topic breadth (word count)
    let competition: TrendItem["competition"] = "medium";
    const words = item.topic.split(" ").length;
    if (words <= 2 && demand === "high") competition = "high";
    else if (words >= 4) competition = "low";
    
    // Profitability Algorithm
    let profitability = 65; 
    if (demand === "high") profitability += 20;
    else if (demand === "medium") profitability += 10;
    
    if (competition === "low") profitability += 14;
    else if (competition === "high") profitability -= 10;
    
    profitability = Math.min(99, Math.max(50, profitability));
    
    return { 
      topic: item.topic, 
      demand, 
      competition, 
      profitability, 
      category: cat, 
      searches: item.traffic 
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let parsedItems: {topic: string, traffic: number}[] = [];

    try {
      const res = await fetch(TRENDS_RSS_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StockPulse/1.0)" },
      });
      if (res.ok) {
        const xml = await res.text();
        parsedItems = parseGoogleTrendsRSS(xml);
      }
    } catch {
      // Fallback: no external fetch
    }

    const trends = mapToTrendItems(parsedItems);
    let geo = "US";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        geo = (body?.geo as string) || geo;
      } catch {}
    } else {
      const u = new URL(req.url);
      geo = u.searchParams.get("geo") || geo;
    }

    return new Response(
      JSON.stringify({
        success: true,
        geo,
        trends,
        source: parsedItems.length > 0 ? "google_trends_rss" : "fallback",
        fetchedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
