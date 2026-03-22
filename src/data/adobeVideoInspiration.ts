/**
 * إرشادات علنية: فئات فيديو شائعة في سوق الستوك عموماً (ليست بيانات مبيعات رسمية من Adobe).
 * المصدر: ممارسات صناعة المحتوى والمساهمين العامة — راجع دائماً بوابة Adobe Stock للتحديثات.
 */
export interface VideoThemeIdea {
  id: string;
  titleEn: string;
  titleAr: string;
  seedKeywords: string[];
  why: string;
}

export const CURATED_HIGH_DEMAND_VIDEO_THEMES: VideoThemeIdea[] = [
  {
    id: "nature-broll",
    titleEn: "Nature & landscapes B-roll",
    titleAr: "طبيعة ومناظر (لقطات خلفية)",
    seedKeywords: ["aerial drone", "golden hour", "ocean waves", "forest path", "mountain sunrise"],
    why: "طلب مستمر لإعلانات السفر والعافية والوثائق.",
  },
  {
    id: "abstract-tech",
    titleEn: "Abstract technology & data",
    titleAr: "تقنية مجردة وبيانات",
    seedKeywords: ["circuit pattern", "data visualization", "holographic light", "futuristic grid", "neon particles"],
    why: "مناسب للشركات والتقنية دون ظهور أشخاص محددين.",
  },
  {
    id: "food-macro",
    titleEn: "Food & beverage (macro)",
    titleAr: "طعام ومشروبات (ماكرو)",
    seedKeywords: ["steam rising", "coffee pour", "fresh herbs", "dark slate", "slow motion pour"],
    why: "استخدامات مطاعم وعلامات غذائية؛ ركز على مشاهد بدون علامات تجارية.",
  },
  {
    id: "business-abstract",
    titleEn: "Business concepts (no people)",
    titleAr: "أعمال مفاهيمية (بدون أشخاص)",
    seedKeywords: ["minimal desk objects", "abstract growth chart", "glass architecture", "network nodes", "compass light"],
    why: "يُستخدم في عروض تقديمية وتقارير عند تجنب وجوه حقيقية.",
  },
  {
    id: "wellness-calm",
    titleEn: "Wellness & calm scenes",
    titleAr: "عافية وهدوء",
    seedKeywords: ["zen stones", "candle flame", "essential oil", "yoga mat still life", "soft morning light"],
    why: "طلب موسمي للتطبيقات والصحة النفسية.",
  },
  {
    id: "sustainability",
    titleEn: "Sustainability & green energy",
    titleAr: "استدامة وطاقة خضراء",
    seedKeywords: ["solar panels", "wind turbine silhouette", "electric vehicle charging", "recycling texture", "vertical garden"],
    why: "محتوى ESG للعلامات والتقارير.",
  },
];
