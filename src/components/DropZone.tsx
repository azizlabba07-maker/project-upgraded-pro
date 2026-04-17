import React, { useCallback } from "react";
import { toast } from "sonner";
import { validateVideoFile } from "@/lib/videoUtils";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  processing: boolean;
}

const MAX_FILES = 50;

export default function DropZone({ onFilesSelected, processing }: DropZoneProps) {
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    if (processing) {
      toast.error("جاري التحليل حالياً، يرجى الانتظار");
      return;
    }

    const fileList = Array.from(files);
    
    if (fileList.length > MAX_FILES) {
      toast.warning(`تم اختيار عدد كبير من الملفات. سنقوم بمعالجة أول ${MAX_FILES} ملف فقط.`);
    }

    const validFiles = fileList
      .slice(0, MAX_FILES)
      .filter((file) => {
        const isSupported = file.type.startsWith("image/") || file.type.startsWith("video/");
        if (!isSupported) {
          toast.error(`الملف ${file.name} غير مدعوم`);
          return false;
        }

        if (file.type.startsWith("video/")) {
          const error = validateVideoFile(file);
          if (error) {
            toast.error(error);
            return false;
          }
        }
        return true;
      });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, processing]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="group relative border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all cursor-pointer overflow-hidden"
    >
      <input
        type="file"
        multiple
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={processing}
      />
      <div className="relative z-10">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <span className="text-3xl">📤</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">أضف ملفاتك هنا</h3>
        <p className="text-sm text-slate-500 mb-1">اسحب وأفلت الصور والفيديوهات أو اضغط للاختيار</p>
        <p className="text-[10px] text-slate-600">
          الحد الأقصى: 500MB للفيديو | 50 ملف في الدفعة
        </p>
      </div>
    </div>
  );
}
