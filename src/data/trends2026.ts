import type { MarketTrend } from "./marketData";

// فئات إضافية لعام 2026 مع اتجاهات ناشئة
export const EMERGING_TRENDS_2026: MarketTrend[] = [
  {
    id: "quantum-tech",
    category: "Technology",
    topic: "Quantum Computing Visualization",
    searches: 45000,
    competition: 35,
    profitability: 92,
    description: "تمثيلات بصرية للحوسبة الكمية والذكاء الاصطناعي المتقدم"
  },
  {
    id: "space-tourism",
    category: "Travel",
    topic: "Space Tourism Era",
    searches: 38000,
    competition: 28,
    profitability: 88,
    description: "السياحة الفضائية والاستكشافات الكونية"
  },
  {
    id: "biohacking",
    category: "Health",
    topic: "Biohacking & Human Enhancement",
    searches: 32000,
    competition: 22,
    profitability: 85,
    description: "تحسين القدرات البشرية من خلال التكنولوجيا"
  },
  {
    id: "circular-economy",
    category: "Business",
    topic: "Circular Economy Solutions",
    searches: 29000,
    competition: 30,
    profitability: 87,
    description: "الاقتصاد الدائري والاستدامة البيئية"
  },
  {
    id: "metaverse-commerce",
    category: "Technology",
    topic: "Metaverse Commerce",
    searches: 41000,
    competition: 40,
    profitability: 90,
    description: "التجارة الإلكترونية في العوالم الافتراضية"
  },
  {
    id: "urban-farming",
    category: "Sustainability",
    topic: "Urban Vertical Farming",
    searches: 26000,
    competition: 18,
    profitability: 83,
    description: "الزراعة العمودية في المدن الحديثة"
  },
  {
    id: "ai-ethics",
    category: "Technology",
    topic: "AI Ethics & Governance",
    searches: 35000,
    competition: 25,
    profitability: 86,
    description: "الأخلاقيات في الذكاء الاصطناعي وحوكمته"
  },
  {
    id: "digital-nomad",
    category: "Lifestyle",
    topic: "Digital Nomad Communities",
    searches: 43000,
    competition: 45,
    profitability: 89,
    description: "مجتمعات المتنقلين الرقميين حول العالم"
  },
  {
    id: "climate-tech",
    category: "Sustainability",
    topic: "Climate Technology Solutions",
    searches: 37000,
    competition: 32,
    profitability: 91,
    description: "تقنيات مكافحة تغير المناخ"
  },
  {
    id: "nft-metaverse",
    category: "Technology",
    topic: "NFT & Metaverse Integration",
    searches: 39000,
    competition: 38,
    profitability: 88,
    description: "دمج الرموز غير القابلة للاستبدال مع الميتافيرس"
  }
];

// فئات فيديو إضافية للعام 2026
export const VIDEO_CATEGORIES_2026 = [
  "Quantum Computing Animations",
  "Space Tourism Experiences",
  "Biohacking Documentaries",
  "Circular Economy Explainers",
  "Metaverse Shopping Tours",
  "Urban Farming Time-lapse",
  "AI Ethics Discussions",
  "Digital Nomad Lifestyle",
  "Climate Tech Innovations",
  "NFT Marketplace Walkthroughs",
  "Virtual Reality Training",
  "Augmented Reality Commerce",
  "Sustainable Fashion Shows",
  "Electric Vehicle Charging",
  "Smart City Infrastructure",
  "Remote Work Productivity",
  "Mental Health Tech",
  "Cryptocurrency Mining",
  "Blockchain Supply Chain",
  "Autonomous Vehicle Fleets"
];

// كلمات مفتاحية شائعة لعام 2026
export const TRENDING_KEYWORDS_2026 = [
  "quantum computing",
  "space tourism",
  "biohacking",
  "circular economy",
  "metaverse commerce",
  "urban farming",
  "ai ethics",
  "digital nomad",
  "climate tech",
  "nft metaverse",
  "virtual reality",
  "augmented reality",
  "sustainable fashion",
  "electric vehicles",
  "smart cities",
  "remote work",
  "mental health tech",
  "cryptocurrency",
  "blockchain",
  "autonomous vehicles",
  "cybersecurity",
  "data privacy",
  "digital twins",
  "edge computing",
  "5g technology",
  "internet of things",
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "neural networks"
];

// ألوان اتجاهية لعام 2026
export const TREND_COLORS_2026 = {
  primary: "#00D4FF", // Electric Blue
  secondary: "#FF6B6B", // Coral Pink
  accent: "#4ECDC4", // Mint Green
  dark: "#2D3748", // Dark Gray
  light: "#F7FAFC", // Light Gray
  neon: "#39FF14", // Neon Green
  cyber: "#FF0080", // Cyber Pink
  earth: "#8B4513", // Earth Brown
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
  { name: "AR Overlay (4:3)", ratio: "1024x768", usage: "28%" }
];