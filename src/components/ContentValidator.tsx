import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, AlertTriangle, Zap, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { analyzeBeforeSubmission } from "@/lib/submissionAnalyzer";
import { generateDiversificationStrategy } from "@/lib/contentDiversifier";
import type { SubmissionAnalysis } from "@/lib/submissionAnalyzer";
import type { DiversificationStrategy } from "@/lib/contentDiversifier";

export default function ContentValidator() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    keywords: "",
    concept: "",
    contentType: "video" as "image" | "video",
    duration: "",
    hasMusic: false,
    hasIdentifiablePeople: false,
    hasPrivateLocations: false,
    resolutionQuality: "1080p",
    framerate: "30",
    soundQuality: "good",
  });

  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null);
  const [diversification, setDiversification] =
    useState<DiversificationStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "analysis" | "diversification" | "recommendations"
  >("analysis");

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAnalyze = async () => {
    if (!formData.title || !formData.description || !formData.concept) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    setLoading(true);
    try {
      const keywords = formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);

      const analysisResult = await analyzeBeforeSubmission({
        title: formData.title,
        description: formData.description,
        keywords,
        concept: formData.concept,
        contentType: formData.contentType,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        hasMusic: formData.hasMusic,
        hasIdentifiablePeople: formData.hasIdentifiablePeople,
        hasPrivateLocations: formData.hasPrivateLocations,
        resolutionQuality: formData.resolutionQuality as "4k" | "1080p" | "720p" | "lower",
        framerate: formData.framerate ? parseInt(formData.framerate) : undefined,
        soundQuality: formData.soundQuality as "professional" | "good" | "acceptable" | "poor",
      });

      const diversificationResult = await generateDiversificationStrategy(
        formData.concept,
        keywords,
        formData.contentType
      );

      setAnalysis(analysisResult);
      setDiversification(diversificationResult);
      setActiveTab("analysis");
      toast.success("تم تحليل المحتوى بنجاح!");
    } catch (error) {
      console.error("خطأ في التحليل:", error);
      toast.error("حدث خطأ أثناء التحليل. الرجاء المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    safe: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
    review_recommended: "bg-orange-500",
  };

  const recommendationColor = {
    submit_immediately: "bg-green-100 text-green-800",
    submit_with_improvements: "bg-blue-100 text-blue-800",
    major_revisions_needed: "bg-orange-100 text-orange-800",
    do_not_submit: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                محقق المحتوى الذكي
              </CardTitle>
              <CardDescription>
                تحليل شامل قبل الرفع - تجنب الرفض والتحسينات المستمرة
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بيانات المحتوى</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">العنوان *</label>
              <Input
                placeholder="عنوان الفيديو أو الصورة"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">المفهوم الرئيسي *</label>
              <Input
                placeholder="مثال: طهي الطعام، مقابلة عمل، تدريب رياضي"
                value={formData.concept}
                onChange={(e) => handleInputChange("concept", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">الوصف التفصيلي *</label>
            <Textarea
              placeholder="وصف مفصل لمحتوى الفيديو أو الصورة..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              الكلمات المفتاحية (مفصولة بفواصل)
            </label>
            <Textarea
              placeholder="كلمة1, كلمة2, كلمة3..."
              value={formData.keywords}
              onChange={(e) => handleInputChange("keywords", e.target.value)}
              className="min-h-16"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع المحتوى</label>
              <Select
                value={formData.contentType}
                onValueChange={(value) =>
                  handleInputChange(
                    "contentType",
                    value as "image" | "video"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">فيديو</SelectItem>
                  <SelectItem value="image">صورة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">جودة الدقة</label>
              <Select
                value={formData.resolutionQuality}
                onValueChange={(value) =>
                  handleInputChange("resolutionQuality", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4k">4K</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="lower">أقل من 720p</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.contentType === "video" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المدة (ثواني)</label>
                <Input
                  type="number"
                  placeholder="10-30"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">FPS</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.framerate}
                  onChange={(e) => handleInputChange("framerate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">جودة الصوت</label>
                <Select
                  value={formData.soundQuality}
                  onValueChange={(value) =>
                    handleInputChange("soundQuality", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">احترافي</SelectItem>
                    <SelectItem value="good">جيد</SelectItem>
                    <SelectItem value="acceptable">مقبول</SelectItem>
                    <SelectItem value="poor">ضعيف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium block">معلومات إضافية</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: "hasMusic", label: "يحتوي على موسيقى" },
                { key: "hasIdentifiablePeople", label: "أشخاص معروفين" },
                { key: "hasPrivateLocations", label: "مواقع خاصة" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData as any)[item.key]}
                    onChange={(e) =>
                      handleInputChange(item.key, e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full h-10"
            size="lg"
          >
            {loading ? "جاري التحليل..." : "🔍 تحليل المحتوى"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Acceptance Probability */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  احتمالية القبول
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">
                  {analysis.overallAcceptanceProbability}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.recommendation === "submit_immediately"
                    ? "جاهز للرفع فوراً"
                    : analysis.recommendation === "submit_with_improvements"
                    ? "جاهز مع تحسينات صغيرة"
                    : analysis.recommendation === "major_revisions_needed"
                    ? "يحتاج تحسينات كبيرة"
                    : "غير موصى به للرفع"}
                </p>
              </CardContent>
            </Card>

            {/* Risk Level */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  مستوى المخاطرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      statusColor[
                        analysis.riskLevel as keyof typeof statusColor
                      ] || "bg-gray-500"
                    }`}
                  />
                  <span className="font-semibold capitalize">
                    {analysis.riskLevel === "very_low"
                      ? "منخفض جداً"
                      : analysis.riskLevel === "low"
                      ? "منخفض"
                      : analysis.riskLevel === "moderate"
                      ? "متوسط"
                      : analysis.riskLevel === "high"
                      ? "عالي"
                      : "عالي جداً"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analysis.estimatedApprovalTime}
                </p>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  التوصية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className={
                    recommendationColor[
                      analysis.recommendation as keyof typeof recommendationColor
                    ]
                  }
                >
                  {analysis.recommendation === "submit_immediately"
                    ? "ارفع الآن"
                    : analysis.recommendation === "submit_with_improvements"
                    ? "ارفع مع تحسينات"
                    : analysis.recommendation === "major_revisions_needed"
                    ? "تحسينات كبيرة"
                    : "لا ترفع الآن"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(
              [
                { id: "analysis", label: "التحليل الشامل" },
                { id: "diversification", label: "تنويع المحتوى" },
                { id: "recommendations", label: "التوصيات" },
              ] as const
            ).map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className="text-sm"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Analysis Tab */}
          {activeTab === "analysis" && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير التحليل التفصيلي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Breakdown */}
                <div>
                  <h3 className="font-semibold mb-3">التقييمات</h3>
                  <div className="space-y-2">
                    {[
                      {
                        label: "التشابه",
                        value: analysis.breakdown.similarity,
                      },
                      {
                        label: "حقوق الملكية الفكرية",
                        value: analysis.breakdown.ipRights,
                      },
                      { label: "الجودة", value: analysis.breakdown.quality },
                      { label: "الاتجاهات", value: analysis.breakdown.trend },
                      {
                        label: "البيانات الوصفية",
                        value: analysis.breakdown.metadata,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{item.label}</span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${item.value}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">
                          {item.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* IP Rights Issues */}
                {analysis.detailedAnalysis.ipRights.issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      قضايا حقوق الملكية الفكرية
                    </h3>
                    <div className="space-y-2">
                      {analysis.detailedAnalysis.ipRights.issues.map(
                        (issue, idx) => (
                          <Alert key={idx} className="border-red-200 bg-red-50">
                            <AlertDescription className="text-sm">
                              <strong>{issue.element}</strong> ({issue.type}):{" "}
                              {issue.reason}
                              <p className="mt-1 text-xs font-semibold">
                                ✓ {issue.solution}
                              </p>
                            </AlertDescription>
                          </Alert>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Similarity Risks */}
                {analysis.detailedAnalysis.similarity.risks && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      مؤشرات التشابه
                    </h3>
                    <div className="space-y-2 text-sm">
                      {Object.entries(
                        analysis.detailedAnalysis.similarity.risks
                      ).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">
                            {key === "concept"
                              ? "المفهوم"
                              : key === "composition"
                              ? "المكونات"
                              : key === "keywords"
                              ? "الكلمات المفتاحية"
                              : "الاتجاهات"}
                          </span>
                          <span
                            className={
                              value > 70
                                ? "text-red-500 font-bold"
                                : value > 40
                                ? "text-yellow-500 font-semibold"
                                : "text-green-500"
                            }
                          >
                            {value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {analysis.actionItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      خطوات العمل
                    </h3>
                    <ul className="space-y-1">
                      {analysis.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Diversification Tab */}
          {activeTab === "diversification" && diversification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  استراتيجية تنويع المحتوى
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Variations */}
                <div>
                  <h3 className="font-semibold mb-3">تنويعات محتوى موصى بها</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {diversification.variations.map((variation, idx) => (
                      <Card
                        key={idx}
                        className="border-primary/10 cursor-pointer hover:border-primary/50 transition"
                      >
                        <CardContent className="pt-4">
                          <Badge className="mb-2" variant="secondary">
                            {variation.estimatedDemand}
                          </Badge>
                          <h4 className="font-semibold text-sm mb-1">
                            {variation.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {variation.description}
                          </p>
                          <div className="text-xs space-y-1">
                            <p>
                              <strong>الزاوية:</strong> {variation.angle}
                            </p>
                            <p>
                              <strong>الجمهور:</strong>{" "}
                              {variation.targetAudience}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Niches */}
                {diversification.niches.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">فرص النيش</h3>
                    <div className="space-y-2">
                      {diversification.niches.map((niche, idx) => (
                        <Card key={idx} className="border-primary/10">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-sm">
                                {niche.niche}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {niche.competitionLevel === "low"
                                  ? "🟢 منخفضة"
                                  : niche.competitionLevel === "medium"
                                  ? "🟡 متوسطة"
                                  : "🔴 عالية"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {niche.description}
                            </p>
                            <div className="text-xs space-y-1">
                              <p>
                                <strong>السوق:</strong> {niche.targetMarket}
                              </p>
                              <p>
                                <strong>الكلمات المفتاحية:</strong>{" "}
                                {niche.keywords.join(", ")}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations Tab */}
          {activeTab === "recommendations" && (
            <div className="space-y-4">
              {analysis.improvementSuggestions &&
                analysis.improvementSuggestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        اقتراحات التحسين
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.improvementSuggestions.map(
                          (suggestion, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-primary mt-1">💡</span>
                              <span>{suggestion}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )}

              {analysis.estimatedRejectionReasons.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      أسباب الرفض المحتملة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.estimatedRejectionReasons.map(
                        (reason, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-red-500">×</span>
                            <span>{reason}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {diversification &&
                diversification.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        التوصيات الإستراتيجية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {diversification.recommendations.map(
                          (rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-primary">→</span>
                              <span>{rec}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
