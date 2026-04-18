import type { MarketTrend } from "./marketData";

/**
 * اتجاهات ناشئة لعام 2025-2026
 * ═══════════════════════════════
 * المصادر:
 * - Adobe Stock Creative Trends 2025
 * - Shutterstock Creative Trends Report 2025
 * - Pinterest Predicts 2025
 * - Google Trends Q1 2025
 * 
 * ⚠️ تم إصلاح توافق الأنواع مع MarketTrend interface
 */
export const EMERGING_TRENDS_2026: MarketTrend[] = [
  {
    category: "Technology",
    topic: "Quantum Computing Visualization",
    searches: 45000,
    competition: "low",
    demand: "high",
    profitability: 92,
  },
  {
    category: "Travel",
    topic: "Space Tourism Era",
    searches: 38000,
    competition: "low",
    demand: "high",
    profitability: 88,
  },
  {
    category: "Wellness",
    topic: "Biohacking Human Enhancement",
    searches: 32000,
    competition: "low",
    demand: "high",
    profitability: 85,
  },
  {
    category: "Business",
    topic: "Circular Economy Solutions",
    searches: 29000,
    competition: "medium",
    demand: "high",
    profitability: 87,
  },
  {
    category: "Technology",
    topic: "Metaverse Commerce",
    searches: 41000,
    competition: "medium",
    demand: "high",
    profitability: 90,
  },
  {
    category: "Sustainability",
    topic: "Urban Vertical Farming",
    searches: 26000,
    competition: "low",
    demand: "medium",
    profitability: 83,
  },
  {
    category: "Technology",
    topic: "AI Ethics Governance",
    searches: 35000,
    competition: "low",
    demand: "high",
    profitability: 86,
  },
  {
    category: "Lifestyle",
    topic: "Digital Nomad Communities",
    searches: 43000,
    competition: "medium",
    demand: "high",
    profitability: 89,
  },
  {
    category: "Sustainability",
    topic: "Climate Technology Solutions",
    searches: 37000,
    competition: "medium",
    demand: "high",
    profitability: 91,
  },
  {
    category: "Lifestyle",
    topic: "Intentional Slow Living",
    searches: 22000,
    competition: "low",
    demand: "medium",
    profitability: 84,
  },
];

// فئات فيديو إضافية — آمنة من حقوق الملكية
export const VIDEO_CATEGORIES_2026 = [
  "Quantum Computing Animations",
  "Space Exploration Concepts",
  "Biohacking Recovery Rituals",
  "Sustainable Economy Explainers",
  "Virtual Shopping Experiences",
  "Urban Farming Time-lapse",
  "Ethical AI Discussions",
  "Digital Nomad Lifestyle",
  "Climate Technology Innovations",
  "Virtual Reality Training Simulations",
  "Augmented Reality Interfaces",
  "Sustainable Textile Production",
  "Electric Vehicle Charging",
  "Smart City Infrastructure",
  "Remote Work Productivity",
  "Mental Health Awareness",
  "Decentralized Finance Concepts",
  "Supply Chain Transparency",
  "Autonomous Navigation Systems",
  "Regenerative Agriculture",
];

// كلمات مفتاحية شائعة — خالية من حقوق الملكية
export const TRENDING_KEYWORDS_2026 = [
  "quantum computing",
  "space exploration",
  "biohacking",
  "circular economy",
  "virtual commerce",
  "urban farming",
  "ai ethics",
  "digital nomad",
  "climate tech",
  "virtual world",
  "virtual reality",
  "augmented reality",
  "sustainable textile",
  "electric vehicles",
  "smart cities",
  "remote work",
  "mental health awareness",
  "decentralized finance",
  "supply chain",
  "autonomous navigation",
  "cybersecurity",
  "data privacy",
  "digital twins",
  "edge computing",
  "connectivity",
  "internet of things",
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "neural networks",
];

// ألوان اتجاهية لعام 2026
export const TREND_COLORS_2026 = {
  primary: "#00D4FF",   // Electric Blue
  secondary: "#FF6B6B", // Coral Pink
  accent: "#4ECDC4",    // Mint Green
  dark: "#2D3748",      // Dark Gray
  light: "#F7FAFC",     // Light Gray
  neon: "#39FF14",      // Neon Green
  cyber: "#FF0080",     // Cyber Pink
  earth: "#8B4513",     // Earth Brown
};

// أحجام شاشات شائعة لعام 2026
export const POPULAR_SCREEN_SIZES_2026 = [
  { name: "Mobile (9:16)", ratio: "1080x1920", usage: "85%" },
  { name: "Tablet (3:4)", ratio: "1536x2048", usage: "65%" },
  { name: "Desktop (16:9)", ratio: "1920x1080", usage: "78%" },
  { name: "Square (1:1)", ratio: "1080x1080", usage: "92%" },
  { name: "Story (9:16)", ratio: "1080x1920", usage: "88%" },
  { name: "Banner (3:1)", ratio: "1800x600", usage: "45%" },
  { name: "VR (16:9)", ratio: "3840x2160", usage: "35%" },
  { name: "AR Overlay (4:3)", ratio: "1024x768", usage: "28%" },
];