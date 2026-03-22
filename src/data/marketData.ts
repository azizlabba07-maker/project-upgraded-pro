export interface MarketTrend {
  topic: string;
  demand: 'high' | 'medium' | 'low';
  competition: 'high' | 'medium' | 'low';
  profitability: number;
  category: string;
  searches: number;
}

export interface SeasonalEvent {
  event: string;
  month: string;
  images: string;
}

// Full pool of market trends - a subset is selected daily
const allMarketTrends: MarketTrend[] = [
  { topic: 'AI و Machine Learning', demand: 'high', competition: 'high', profitability: 85, category: 'AI', searches: 15000 },
  { topic: 'Sustainability و Green Energy', demand: 'high', competition: 'medium', profitability: 90, category: 'Sustainability', searches: 12000 },
  { topic: 'Remote Work و Home Office', demand: 'high', competition: 'medium', profitability: 88, category: 'Work', searches: 11000 },
  { topic: 'Wellness و Mental Health', demand: 'high', competition: 'low', profitability: 95, category: 'Wellness', searches: 10000 },
  { topic: 'Diversity و Inclusion', demand: 'high', competition: 'low', profitability: 92, category: 'Diversity', searches: 9500 },
  { topic: 'Abstract Backgrounds', demand: 'medium', competition: 'high', profitability: 70, category: 'Design', searches: 8500 },
  { topic: 'Nature و Landscapes', demand: 'medium', competition: 'high', profitability: 68, category: 'Nature', searches: 8000 },
  { topic: 'Food Photography', demand: 'medium', competition: 'medium', profitability: 75, category: 'Food', searches: 7500 },
  { topic: 'Business Concepts', demand: 'high', competition: 'medium', profitability: 82, category: 'Business', searches: 9000 },
  { topic: 'Technology و Innovation', demand: 'high', competition: 'medium', profitability: 86, category: 'Technology', searches: 8800 },
  { topic: 'Minimalist Design', demand: 'medium', competition: 'low', profitability: 80, category: 'Design', searches: 6500 },
  { topic: 'Cyberpunk Aesthetic', demand: 'medium', competition: 'low', profitability: 85, category: 'Design', searches: 6000 },
  { topic: 'Retro و Vintage', demand: 'low', competition: 'medium', profitability: 65, category: 'Design', searches: 5000 },
  { topic: 'Urban Photography', demand: 'medium', competition: 'high', profitability: 72, category: 'Nature', searches: 7000 },
  { topic: 'Lifestyle Portraits', demand: 'medium', competition: 'high', profitability: 70, category: 'Business', searches: 6800 },
  // Additional trends for daily rotation
  { topic: 'Blockchain و Web3', demand: 'high', competition: 'low', profitability: 91, category: 'Technology', searches: 9200 },
  { topic: 'Electric Vehicles', demand: 'high', competition: 'medium', profitability: 87, category: 'Sustainability', searches: 10500 },
  { topic: 'Smart Home Devices', demand: 'high', competition: 'medium', profitability: 83, category: 'Technology', searches: 8700 },
  { topic: 'Meditation و Yoga', demand: 'medium', competition: 'low', profitability: 89, category: 'Wellness', searches: 7800 },
  { topic: 'Space Exploration', demand: 'high', competition: 'low', profitability: 93, category: 'Science', searches: 11200 },
  { topic: 'Drone Photography', demand: 'medium', competition: 'medium', profitability: 78, category: 'Technology', searches: 7200 },
  { topic: 'Plant-Based Food', demand: 'high', competition: 'low', profitability: 88, category: 'Food', searches: 9800 },
  { topic: 'Augmented Reality', demand: 'high', competition: 'low', profitability: 94, category: 'AI', searches: 10800 },
  { topic: 'Ocean Conservation', demand: 'medium', competition: 'low', profitability: 86, category: 'Nature', searches: 6900 },
  { topic: 'Fintech و Digital Banking', demand: 'high', competition: 'medium', profitability: 84, category: 'Business', searches: 9400 },
  { topic: 'Geometric Patterns', demand: 'medium', competition: 'medium', profitability: 74, category: 'Design', searches: 6200 },
  { topic: 'Cloud Computing', demand: 'high', competition: 'high', profitability: 81, category: 'Technology', searches: 8900 },
  { topic: 'Organic Farming', demand: 'medium', competition: 'low', profitability: 82, category: 'Sustainability', searches: 7100 },
  { topic: 'Robotics و Automation', demand: 'high', competition: 'medium', profitability: 89, category: 'AI', searches: 10200 },
  { topic: 'Watercolor Textures', demand: 'low', competition: 'low', profitability: 76, category: 'Design', searches: 5500 },
];

// Seeded random for daily consistency
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function getDailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// Select and shuffle 15 trends daily from the pool
function getDailyMarketData(): MarketTrend[] {
  const seed = getDailySeed();
  const rng = seededRandom(seed);
  const shuffled = [...allMarketTrends].sort(() => rng() - 0.5);
  // Pick 15 items, then randomize search counts slightly for freshness
  return shuffled.slice(0, 15).map((item) => ({
    ...item,
    searches: Math.round(item.searches * (0.85 + rng() * 0.3)),
    profitability: Math.min(100, Math.max(50, Math.round(item.profitability + (rng() - 0.5) * 10))),
  }));
}

export const marketData: MarketTrend[] = getDailyMarketData();

// Topic-specific prompt components for varied, relevant local generation
export const topicPromptData: Record<string, { subjects: string[]; environments: string[]; details: string[] }> = {
  'AI و Machine Learning': {
    subjects: ['neural network visualization', 'robotic arm interacting with holographic data', 'circuit board with glowing pathways', 'AI brain concept with digital neurons', 'machine learning algorithm flowchart visualization', 'humanoid robot hand reaching forward', 'data processing pipeline visualization', 'quantum computing chip close-up'],
    environments: ['dark futuristic lab with blue ambient light', 'clean white tech workspace', 'holographic display room', 'data center with server racks', 'abstract digital void with floating data points', 'modern research facility'],
    details: ['glowing neon blue connections', 'binary code overlay', 'particle effects', 'metallic textures with LED accents', 'translucent holographic elements', 'depth of field with bokeh lights'],
  },
  'Sustainability و Green Energy': {
    subjects: ['solar panels on green hillside', 'wind turbines at golden hour', 'electric vehicle charging station', 'green city skyline with vertical gardens', 'recycling symbol made of leaves', 'sustainable bamboo products arrangement', 'hydroelectric dam aerial view', 'eco-friendly packaging display'],
    environments: ['lush green countryside', 'modern eco-city rooftop garden', 'sunny open field', 'coastal wind farm', 'sustainable greenhouse interior', 'forest clearing with sunlight'],
    details: ['vibrant green tones', 'golden sunlight rays', 'morning dew on leaves', 'clean blue sky', 'natural textures', 'earth tone color palette'],
  },
  'Remote Work و Home Office': {
    subjects: ['modern home office setup with dual monitors', 'laptop on wooden desk with coffee', 'ergonomic workspace arrangement', 'video conference on screen', 'coworking space with plants', 'digital nomad workspace by window', 'organized desk with stationery', 'standing desk setup'],
    environments: ['bright minimalist home office', 'cozy apartment corner workspace', 'Scandinavian-style room', 'loft space with brick walls', 'sunlit room with large windows', 'modern apartment with city view'],
    details: ['warm natural lighting', 'indoor plants', 'cable management details', 'clean organized aesthetic', 'soft shadows', 'neutral warm tones'],
  },
  'Wellness و Mental Health': {
    subjects: ['meditation stones stacked by water', 'yoga mat with accessories', 'herbal tea ceremony setup', 'aromatherapy diffuser with essential oils', 'zen garden with raked sand', 'journal and pen for mindfulness', 'healthy breakfast bowl', 'spa treatment arrangement'],
    environments: ['serene spa room', 'peaceful garden setting', 'calm lakeside at dawn', 'bamboo forest', 'minimalist meditation room', 'nature retreat cabin'],
    details: ['soft pastel colors', 'gentle morning light', 'water reflections', 'natural materials', 'calm and peaceful mood', 'shallow depth of field'],
  },
  'Diversity و Inclusion': {
    subjects: ['diverse hands forming a circle', 'multicultural team collaboration', 'inclusive workplace symbols', 'unity concept with colorful elements', 'diverse group of hands painting together', 'accessibility icons and symbols', 'rainbow color spectrum arrangement', 'global unity concept'],
    environments: ['modern inclusive office space', 'community center', 'outdoor public gathering space', 'bright colorful classroom', 'open-plan collaborative workspace', 'cultural festival setting'],
    details: ['vibrant multi-color palette', 'warm inviting lighting', 'dynamic composition', 'interconnected elements', 'harmonious color blending', 'celebratory mood'],
  },
  'Abstract Backgrounds': {
    subjects: ['fluid gradient waves', 'geometric polygon mesh', 'marble texture with gold veins', 'watercolor splash composition', 'digital particle flow', 'layered paper cut effect', 'fractal pattern', 'liquid chrome surface'],
    environments: ['infinite void', 'ethereal space', 'dimensional backdrop', 'cosmic nebula', 'underwater abstract', 'atmospheric fog'],
    details: ['smooth color transitions', 'metallic accents', 'iridescent sheen', 'gaussian blur layers', 'grain texture overlay', 'high contrast edges'],
  },
  'Nature و Landscapes': {
    subjects: ['mountain range at sunrise', 'wildflower meadow', 'ocean waves crashing on rocks', 'forest path in autumn', 'desert sand dunes at golden hour', 'waterfall in tropical jungle', 'snow-capped peaks reflection in lake', 'aerial view of river delta'],
    environments: ['remote wilderness', 'tropical paradise', 'alpine meadow', 'volcanic landscape', 'arctic tundra', 'Mediterranean coastline'],
    details: ['dramatic cloud formations', 'golden hour lighting', 'long exposure water', 'leading lines', 'aerial perspective', 'vivid natural colors'],
  },
  'Food Photography': {
    subjects: ['artisan bread on wooden board', 'colorful smoothie bowls top view', 'fresh sushi arrangement', 'gourmet burger with ingredients', 'chocolate dessert plating', 'fresh fruit and vegetable flatlay', 'coffee art latte closeup', 'cheese board with accompaniments'],
    environments: ['rustic kitchen countertop', 'marble surface with props', 'dark moody table setting', 'bright airy cafe', 'outdoor picnic setup', 'professional food studio'],
    details: ['steam rising from hot food', 'sauce drip freeze frame', 'garnish details', 'texture close-up', 'complementary color props', 'natural window light'],
  },
  'Business Concepts': {
    subjects: ['growth chart visualization', 'strategic planning board', 'handshake deal concept', 'startup workspace', 'financial data dashboard', 'innovation lightbulb concept', 'leadership chess piece', 'target and arrow bullseye'],
    environments: ['modern glass office', 'boardroom with city skyline', 'startup garage', 'executive lounge', 'conference hall', 'rooftop meeting space'],
    details: ['professional blue tones', 'clean sharp lines', 'upward trending elements', 'polished surfaces', 'confident composition', 'power stance angles'],
  },
  'Technology و Innovation': {
    subjects: ['smartphone displaying futuristic UI', 'VR headset with light trails', 'drone in flight', 'smart home device collection', 'wearable tech close-up', '5G tower with signal visualization', 'electric car dashboard', 'biotech lab equipment'],
    environments: ['tech showroom', 'innovation lab', 'smart city street', 'CES-style exhibition', 'futuristic living room', 'research and development facility'],
    details: ['sleek metallic finish', 'LED indicator lights', 'holographic display effect', 'clean product photography', 'tech blue accent lighting', 'precision engineering details'],
  },
  'Minimalist Design': {
    subjects: ['single object on plain surface', 'geometric shapes arrangement', 'minimal still life composition', 'clean typography mockup', 'negative space study', 'monochrome product shot', 'simple line art object', 'balanced asymmetric layout'],
    environments: ['white infinity background', 'concrete minimal space', 'light grey studio', 'Japanese-inspired room', 'Bauhaus interior', 'open white gallery'],
    details: ['precise shadows', 'limited color palette', 'intentional negative space', 'grid alignment', 'subtle texture', 'matte finish surfaces'],
  },
  'Cyberpunk Aesthetic': {
    subjects: ['neon-lit alleyway', 'futuristic motorcycle', 'holographic advertisement display', 'cybernetic implant concept', 'rain-soaked neon street', 'dystopian cityscape', 'glitch art composition', 'augmented reality interface'],
    environments: ['rain-soaked megacity', 'underground hacker den', 'neon marketplace', 'rooftop overlooking sprawl', 'abandoned tech facility', 'virtual reality landscape'],
    details: ['neon pink and cyan palette', 'chromatic aberration', 'rain reflections on wet surfaces', 'volumetric fog', 'glitch effects', 'noir lighting with color splashes'],
  },
  'Retro و Vintage': {
    subjects: ['vintage camera collection', 'retro radio and vinyl records', 'classic car detail', 'old typewriter with paper', 'antique clockwork mechanism', 'retro gaming console', 'vintage suitcase travel concept', 'old film reel and projector'],
    environments: ['1950s diner interior', 'vintage living room', 'old bookshop', 'retro garage', 'antique market stall', 'classic barbershop'],
    details: ['warm sepia tones', 'film grain texture', 'faded color palette', 'vignette effect', 'aged patina surfaces', 'nostalgic warm lighting'],
  },
  'Urban Photography': {
    subjects: ['city skyline silhouette', 'street scene with motion blur', 'architectural detail of modern building', 'subway station platform', 'graffiti art on brick wall', 'pedestrian crossing from above', 'bridge structure at night', 'rooftop cityscape panorama'],
    environments: ['downtown metropolitan area', 'industrial district', 'historic city quarter', 'modern financial district', 'waterfront promenade', 'elevated highway overpass'],
    details: ['leading lines architecture', 'contrast of old and new', 'urban geometry patterns', 'street-level perspective', 'twilight blue hour', 'dynamic diagonal composition'],
  },
  'Lifestyle Portraits': {
    subjects: ['professional headshot setup', 'casual lifestyle moment', 'fitness and wellness activity', 'creative artist at work', 'entrepreneur in workspace', 'outdoor adventure activity', 'family gathering moment', 'student studying in library'],
    environments: ['natural outdoor setting', 'urban café', 'modern gym', 'creative studio', 'park bench', 'beach at sunset'],
    details: ['authentic candid feel', 'natural skin tones', 'environmental context', 'emotional connection', 'storytelling composition', 'lifestyle brand aesthetic'],
  },
};

export const promptComponents = {
  subjects: [
    'منتج تقني حديث', 'مكتب عصري', 'فريق عمل متنوع', 'طبيعة خضراء', 'مدينة مستقبلية',
    'شخص يعمل على الكمبيوتر', 'لوحة ألوان زاهية', 'أجهزة ذكية', 'بيئة صحية', 'تصميم جرافيكي'
  ],
  environments: [
    'استوديو احترافي', 'مكتب حديث', 'طبيعة خضراء', 'خلفية بيضاء نظيفة', 'بيئة حضرية',
    'غرفة مضاءة بشكل طبيعي', 'خلفية رمادية محايدة', 'بيئة خارجية', 'مكان عمل مشترك', 'غرفة معيشة حديثة'
  ],
  lighting: [
    'soft natural lighting', 'professional balanced studio lighting', 'dramatic side lighting',
    'warm ambient golden hour light', 'cinematic rim lighting', 'bright daylight',
    'even diffused lighting', 'high contrast chiaroscuro', 'backlit silhouette glow', 'cool blue tone lighting'
  ],
  compositions: [
    'rule of thirds', 'centered symmetrical', 'close-up macro detail', 'shallow depth of field with bokeh',
    'dynamic diagonal', 'bird\'s eye aerial view', 'leading lines perspective', 'layered foreground-background',
    'negative space emphasis', 'wide establishing shot'
  ],
  styles: [
    'واقعي احترافي', 'مجرد حديث', '3D معاصر', 'فلات ديزاين', 'سينمائي',
    'فني مينيمالي', 'تصويري دقيق', 'فني معاصر', 'ديجيتال آرت', 'فوتوجرافي'
  ]
};

export const dailyTips = [
  '💡 ركز على الصور التي تحتوي على عناصر متعددة - فهي أكثر قابلية للاستخدام',
  '💡 استخدم ألوان محايدة وقابلة للتكيف - تزيد من احتمالية الشراء',
  '💡 أضف مساحة فارغة في الصور - تسمح للعملاء بإضافة نصوص',
  '💡 تجنب الشعارات والعلامات التجارية - قد تقلل من قيمة الصورة',
  '💡 صور الأشخاص المتنوعة لها طلب عالي جداً - استثمر فيها',
  '💡 تحديث محفظتك بانتظام - الخوارزميات تفضل المحتوى الحديث',
  '💡 استخدم كلمات مفتاحية دقيقة - تزيد من ظهور صورك في البحث',
  '💡 صور الطعام والمشروبات لها طلب موسمي عالي - خطط مسبقاً',
  '💡 التصميمات المينيمالية أكثر مرونة وقابلية للاستخدام',
  '💡 راقب التراندات على Google Trends و Pinterest - تنبؤ بالطلب المستقبلي'
];

export const seasonalEvents: SeasonalEvent[] = [
  { event: 'عيد الأم', month: 'مايو', images: 'صور عائلية دافئة، هدايا، ورود' },
  { event: 'رمضان', month: 'مارس-أبريل', images: 'صور روحانية، تجمعات عائلية، إفطار' },
  { event: 'الكريسماس', month: 'ديسمبر', images: 'زينة، هدايا، عائلات، ثلج' },
  { event: 'Black Friday', month: 'نوفمبر', images: 'تسوق، عروض، منتجات' },
  { event: 'العودة للدراسة', month: 'سبتمبر', images: 'طلاب، كتب، مكاتب' },
  { event: 'العام الجديد', month: 'يناير', images: 'احتفالات، أهداف، بدايات جديدة' }
];

export const checklistItems = [
  'الأبعاد: 4000×4000 بكسل على الأقل (4 ميجابكسل)',
  'الصيغة: JPEG بجودة 95%',
  'الحجم: أقل من 45 MB',
  'مساحة الألوان: sRGB',
  'لا توجد علامات مائية أو شعارات',
  'لا توجد نصوص مرئية واضحة',
  'الصورة حادة وواضحة (Sharpness عالي)',
  'التباين والإضاءة احترافية',
  'لا توجد أشخاص بدون تصريح (أو صور معروفة)',
  'الصورة خالية من المحتوى المسيء',
  'كلمات مفتاحية دقيقة وملائمة (25-50 كلمة)',
  'وصف دقيق وجذاب للصورة',
  'الصورة لا تنتهك حقوق الملكية الفكرية',
  'الصورة تتبع معايير Adobe Stock'
];

export const categories = [
  { value: '', label: 'جميع الفئات' },
  { value: 'AI', label: 'ذكاء اصطناعي' },
  { value: 'Sustainability', label: 'استدامة' },
  { value: 'Work', label: 'العمل' },
  { value: 'Wellness', label: 'الصحة' },
  { value: 'Diversity', label: 'التنوع' },
  { value: 'Design', label: 'التصميم' },
  { value: 'Nature', label: 'الطبيعة' },
  { value: 'Food', label: 'الطعام' },
  { value: 'Business', label: 'الأعمال' },
  { value: 'Technology', label: 'التكنولوجيا' },
  { value: 'Science', label: 'العلوم' },
];
