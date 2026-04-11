import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  FileUp,
  Zap,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeBeforeSubmission } from "@/lib/submissionAnalyzer";
import { generateDiversificationStrategy } from "@/lib/contentDiversifier";
import type { SubmissionAnalysis } from "@/lib/submissionAnalyzer";

interface ContentItem {
  title: string;
  description: string;
  keywords: string[];
  concept: string;
  contentType: "image" | "video";
}

interface AnalysisResult {
  index: number;
  item: ContentItem;
  analysis: SubmissionAnalysis;
  status: "success" | "error" | "processing";
  error?: string;
}

export default function ContentValidatorBatch() {
  const [uploadedFiles, setUploadedFiles] = useState<{
    data?: File;
    videos?: File;
  }>({});

  const [items, setItems] = useState<ContentItem[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"upload" | "results">("upload");

  // معالجة رفع الملف
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "data" | "videos") => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles((prev) => ({
        ...prev,
        [type === "data" ? "data" : "videos"]: file,
      }));
      toast.success(`تم رفع ملف "${file.name}"`);
    }
  };

  // قراءة ملف CSV
  const readCSV = (file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());
          const data = lines.slice(1)
            .filter((line) => line.trim())
            .map((line) => {
              const values = line.split(",").map((v) => v.trim());
              const obj: Record<string, string> = {};
              headers.forEach((header, i) => {
                obj[header] = values[i] || "";
              });
              return obj;
            });
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  };

  // قراءة ملف JSON
  const readJSON = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(Array.isArray(data) ? data : [data]);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  };

  // معالجة الملفات
  const handleProcessFiles = async () => {
    if (!uploadedFiles.data) {
      toast.error("الرجاء رفع ملف البيانات أولاً");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    const newResults: AnalysisResult[] = [];

    try {
      // قراءة ملف البيانات
      let dataArray: Record<string, string>[] = [];

      if (uploadedFiles.data.name.endsWith(".csv")) {
        dataArray = await readCSV(uploadedFiles.data);
      } else if (uploadedFiles.data.name.endsWith(".json")) {
        dataArray = await readJSON(uploadedFiles.data);
      } else {
        toast.error("صيغة الملف غير مدعومة (CSV أو JSON فقط)");
        setIsProcessing(false);
        return;
      }

      // تحويل البيانات إلى ContentItem
      const contentItems: ContentItem[] = dataArray.map((item) => ({
        title: item.title || item.العنوان || "",
        description: item.description || item.الوصف || "",
        keywords: (item.keywords || item.الكلمات || "")
          .split(",")
          .map((k) => k.trim()),
        concept: item.concept || item.المفهوم || "",
        contentType: (item.contentType || item.النوع || "video") as "image" | "video",
      }));

      setItems(contentItems);

      // تحليل كل عنصر
      for (let i = 0; i < contentItems.length; i++) {
        try {
          const item = contentItems[i];
          const analysis = await analyzeBeforeSubmission({
            title: item.title,
            description: item.description,
            keywords: item.keywords,
            concept: item.concept,
            contentType: item.contentType,
          });

          newResults.push({
            index: i + 1,
            item,
            analysis,
            status: "success",
          });

          setProgress(Math.round(((i + 1) / contentItems.length) * 100));
        } catch (error) {
          newResults.push({
            index: i + 1,
            item: contentItems[i],
            analysis: {} as SubmissionAnalysis,
            status: "error",
            error: error instanceof Error ? error.message : "خطأ غير معروف",
          });
        }
      }

      setResults(newResults);
      setActiveTab("results");
      toast.success(`تم تحليل ${newResults.length} عنصر بنجاح!`);
    } catch (error) {
      toast.error("حدث خطأ في معالجة الملف");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // تصدير النتائج
  const exportResults = () => {
    const exportData = results.map((r) => ({
      index: r.index,
      title: r.item.title,
      acceptanceProbability: r.analysis.overallAcceptanceProbability || "N/A",
      recommendation: r.analysis.recommendation || "N/A",
      riskLevel: r.analysis.riskLevel || "N/A",
      status: r.status,
    }));

    const csv =
      "index,title,acceptanceProbability,recommendation,riskLevel,status\n" +
      exportData
        .map(
          (r) =>
            `${r.index},"${r.title}",${r.acceptanceProbability},${r.recommendation},${r.riskLevel},${r.status}`
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("تم تصدير النتائج بنجاح!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                معالج الدفعات الذكي
              </CardTitle>
              <CardDescription>
                رفع ملفات متعددة وتحليلها تلقائياً في دقائق
              </CardDescription>
            </div>
            <FileUp className="w-12 h-12 text-primary/30" />
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "upload" ? "default" : "outline"}
          onClick={() => setActiveTab("upload")}
        >
          📤 رفع الملفات
        </Button>
        {results.length > 0 && (
          <Button
            variant={activeTab === "results" ? "default" : "outline"}
            onClick={() => setActiveTab("results")}
          >
            📊 النتائج ({results.length})
          </Button>
        )}
      </div>

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          {/* Data File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1️⃣ ملف البيانات</CardTitle>
              <CardDescription>
                CSV أو JSON يحتوي على: العنوان، الوصف، الكلمات المفتاحية، المفهوم، النوع
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File Input */}
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => handleFileUpload(e, "data")}
                    className="hidden"
                    id="data-file"
                  />
                  <label
                    htmlFor="data-file"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="font-semibold">
                      {uploadedFiles.data
                        ? uploadedFiles.data.name
                        : "اختر ملف CSV أو JSON"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      أو اسحب الملف هنا
                    </span>
                  </label>
                </div>

                {/* Example Format */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    <strong>صيغة CSV:</strong> title, description, keywords,
                    concept, contentType
                    <br />
                    <strong>مثال:</strong> "فيديو طهي", "وصف...", "cooking,
                    food", "طهي", "video"
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Process Button */}
          <Button
            onClick={handleProcessFiles}
            disabled={!uploadedFiles.data || isProcessing}
            className="w-full h-10"
            size="lg"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                جاري المعالجة... {progress}%
              </>
            ) : (
              "🚀 بدء التحليل"
            )}
          </Button>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                تم معالجة {Math.round((progress / 100) * items.length)} من{" "}
                {items.length} عنصر
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && results.length > 0 && (
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {results.length}
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {results.filter((r) => r.status === "success").length}
                  </div>
                  <div className="text-sm text-muted-foreground">نجح</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {results.filter((r) => r.status === "error").length}
                  </div>
                  <div className="text-sm text-muted-foreground">فشل</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(
                      results
                        .filter((r) => r.status === "success")
                        .reduce(
                          (acc, r) =>
                            acc + (r.analysis.overallAcceptanceProbability || 0),
                          0
                        ) /
                        results.filter((r) => r.status === "success").length || 0
                    )}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">متوسط القبول</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <Button
            onClick={exportResults}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            تصدير النتائج (CSV)
          </Button>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل النتائج</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-2">#</th>
                      <th className="text-right py-2 px-2">العنوان</th>
                      <th className="text-right py-2 px-2">احتمالية القبول</th>
                      <th className="text-right py-2 px-2">التوصية</th>
                      <th className="text-right py-2 px-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr
                        key={result.index}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-2">{result.index}</td>
                        <td className="py-3 px-2">
                          <span className="truncate block max-w-xs">
                            {result.item.title}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {result.status === "success" ? (
                            <span className="font-semibold text-primary">
                              {result.analysis.overallAcceptanceProbability}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {result.status === "success" ? (
                            <Badge
                              className={
                                result.analysis.recommendation ===
                                "submit_immediately"
                                  ? "bg-green-100 text-green-800"
                                  : result.analysis.recommendation ===
                                    "submit_with_improvements"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-orange-100 text-orange-800"
                              }
                            >
                              {result.analysis.recommendation === "submit_immediately"
                                ? "ارفع الآن"
                                : result.analysis.recommendation ===
                                  "submit_with_improvements"
                                ? "مع تحسينات"
                                : "إعادة تفكير"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">خطأ</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {result.status === "success" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">📋 التفاصيل الكاملة</h3>
            {results
              .filter((r) => r.status === "success")
              .map((result) => (
                <Card key={result.index} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          #{result.index} - {result.item.title}
                        </CardTitle>
                      </div>
                      <Badge
                        className={
                          result.analysis.overallAcceptanceProbability > 75
                            ? "bg-green-100 text-green-800"
                            : result.analysis.overallAcceptanceProbability > 50
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {result.analysis.overallAcceptanceProbability}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <strong>المفهوم:</strong> {result.item.concept}
                    </div>
                    <div>
                      <strong>النوع:</strong> {result.item.contentType}
                    </div>
                    <div>
                      <strong>مستوى المخاطرة:</strong>{" "}
                      <Badge variant="outline">{result.analysis.riskLevel}</Badge>
                    </div>
                    {result.analysis.actionItems &&
                      result.analysis.actionItems.length > 0 && (
                        <div>
                          <strong>خطوات العمل:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {result.analysis.actionItems
                              .slice(0, 3)
                              .map((item, i) => (
                                <li key={i} className="text-xs">
                                  {item}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
