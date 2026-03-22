# Adobe Stock AI Partner v2.2.0 🚀

**منصة ذكية متكاملة لتحليل واستكشاف فرص سوق Adobe Stock باستخدام الذكاء الاصطناعي**

[![Edit with Lovable](https://lovable.dev/badge)](https://lovable.dev/projects/3f9a2272-3727-423b-9b62-355d2d301e0c)

## 🌟 الميزات الرئيسية

### 🤖 التكامل مع AI
- **Claude Proxy**: توليد أصول/SEO/تحليل مع حماية كاملة
- **Gemini**: توليد prompts فيديو وكلمات مفتاحية
- **Auto Pulse**: تحديث تلقائي للسوق كل 15-120 ثانية

### 📊 تحليل السوق المتقدم
- 30+ اتجاه سوق مع تصنيفات دقيقة
- Source Pulse Monitor لـ 7 منصات
- فلاتر متقدمة حسب الطلب والمنافسة

### ⚡ One-Click Opportunity
- توليد برومبتات كاملة بضغطة واحدة
- اختيار نوع المخرجات (صور/فيديو/Green Screen)
- تحليل سوق سريع + قائمة امتثال Adobe

### 🎬 توليد الأصول
- Prompts للصور مع فئات ومعايير منافسة
- Prompts للفيديو شاملة الحركة والإضاءة
- SEO Bundle: عناوين + وصف + كلمات مفتاحية (25-50)

### 💡 Inspiration Lab
- إلهام من فئات فيديو شائعة
- توسيع كلمات مفتاحية تلقائي
- لصق نتائج بحث يدوي

### 📁 متتبع المحفظة
- تخزين محلي للأصول
- تصفية وحساب الأرباح
- تتبع الحالة والتنزيلات

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- npm أو yarn

### التثبيت
```bash
git clone <repository-url>
cd adobe-stock-ai-partner-v2
npm install
```

### التشغيل المحلي
```bash
npm run dev
# يفتح على http://localhost:5173
```

### البناء للإنتاج
```bash
npm run build
npm run preview
```

## 🔧 إعداد Supabase (للميزات المتقدمة)

### 1. إنشاء مشروع Supabase
```bash
supabase init
supabase start
```

### 2. نشر Edge Functions
```bash
supabase functions deploy claude-proxy
supabase functions deploy market-pulse
```

### 3. إضافة الأسرار
```bash
supabase secrets set CLAUDE_API_KEY="your_claude_key"
supabase secrets set CLAUDE_PROXY_TOKEN="your_secure_token"
```

### 4. متغيرات البيئة
أنشئ ملف `.env`:
```env
VITE_GEMINI_API_KEY=your_gemini_key
VITE_CLAUDE_PROXY_URL=https://your-project.supabase.co/functions/v1/claude-proxy
VITE_CLAUDE_PROXY_TOKEN=your_token
VITE_MARKET_PULSE_URL=https://your-project.supabase.co/functions/v1/market-pulse
```

## 📋 قواعد الامتثال مع Adobe Stock

### ✅ المحظور
- أسماء فنانين أو شخصيات محمية
- بشر/وجوه/أيدي/نصوص في الصور
- علامات تجارية أو حقوق ملكية

### ✅ المتطلبات
- الحد الأدنى للدقة: 4 ميجابيكسل
- تنسيق sRGB
- Copy Space مناسب
- 25-50 كلمة مفتاحية

## 🏗️ هيكل المشروع

```
src/
├── components/          # المكونات الرئيسية
│   ├── ui/             # مكونات Shadcn UI (45+)
│   ├── MarketAnalysis.tsx
│   ├── OneClickOpportunity.tsx
│   ├── InspirationLab.tsx
│   └── ...
├── lib/                # المكتبات المخصصة
│   ├── claude.ts       # Claude API integration
│   ├── gemini.ts       # Gemini API integration
│   ├── livePulse.ts    # Auto Pulse system
│   └── adobeStockCompliance.ts
├── data/               # البيانات الثابتة
│   ├── marketData.ts   # اتجاهات السوق
│   └── adobeVideoInspiration.ts
├── hooks/              # React hooks مخصصة
└── pages/              # صفحات التطبيق

supabase/
└── functions/          # Edge Functions
    ├── claude-proxy/   # Proxy آمن لـ Claude
    └── market-pulse/   # جلب بيانات Google Trends
```

## 🎨 التصميم

- **Cyberpunk Theme**: ألوان نيون وتأثيرات Glow
- **Dark/Light Mode**: دعم كامل للوضعين
- **Responsive**: تصميم متجاوب لجميع الأجهزة
- **Bilingual**: دعم العربية والإنجليزية
- **Terminal Styling**: واجهة تشبه الطرفية

## 🧪 الاختبار

```bash
npm run test          # تشغيل جميع الاختبارات
npm run test:watch    # الاختبار المستمر
```

## 📦 التقنيات المستخدمة

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI Components
- **Framer Motion** - Animations

### AI & APIs
- **Anthropic Claude** - Advanced text generation
- **Google Gemini** - Video prompts & keywords
- **Supabase Edge Functions** - Serverless backend

### State & Data
- **TanStack Query** - Data fetching
- **Zod** - Schema validation
- **Local Storage** - Portfolio persistence

### Charts & Visualization
- **Recharts** - Data visualization

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للbranch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🔄 التحديثات الأخيرة (v2.2.0)

### ✨ الميزات الجديدة
- **اتجاهات 2026**: Quantum Computing, Space Tourism, Biohacking
- **تحليلات متقدمة**: توقعات النمو والمخاطر
- **Inspiration Lab محسّن**: حفظ النتائج ومحركات متعددة
- **منصات إضافية**: Unsplash, Pexels, Dribbble

### 🐛 الإصلاحات
- تحسين أداء البناء والتحميل
- إصلاح مشاكل RTL في الجداول
- تحسين رسائل الخطأ والتغذية الراجعة

### 🔧 التحسينات
- نظام ألوان Cyberpunk محدث
- دعم أحجام شاشات 2026
- تحسين الـ UX والـ UI

---

**Built with ❤️ using Lovable - Updated for 2026 Trends**
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Claude Proxy (recommended)

To avoid CORS errors and keep your Claude API key secure, run Claude calls through a backend proxy (Supabase Edge Function).

### 1) Deploy function

```sh
supabase functions deploy claude-proxy
```

### 2) Set secrets in Supabase

```sh
supabase secrets set CLAUDE_API_KEY=your_claude_key
supabase secrets set CLAUDE_PROXY_TOKEN=your_optional_shared_token
```

### 3) Configure frontend env

Create `.env` from `.env.example` and set:

```sh
VITE_CLAUDE_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/claude-proxy
VITE_CLAUDE_PROXY_TOKEN=your_optional_shared_token
```

When `VITE_CLAUDE_PROXY_URL` is present, the app uses proxy mode automatically.

### Market Pulse Backend (optional)

For live trend data from Google Trends RSS:

```sh
supabase functions deploy market-pulse
```

Then set in `.env`:

```sh
VITE_MARKET_PULSE_URL=https://<project-ref>.supabase.co/functions/v1/market-pulse
```

Auto Pulse will prefer backend data when available.
