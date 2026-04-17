/**
 * Video handling utilities — specifically for Adobe Stock frame extraction.
 */

const MAX_FILE_SIZE_MB = 500;

export function validateVideoFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `حجم الملف كبير جداً (${(file.size / 1024 / 1024).toFixed(0)}MB). الحد الأقصى هو ${MAX_FILE_SIZE_MB}MB`;
  }
  return null;
}

export async function extractVideoFrame(file: File): Promise<{
  base64: string; mimeType: string; thumbnailUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    let settled = false;
    const cleanup = () => { 
      try { URL.revokeObjectURL(url); } catch (e) {} 
    };

    const done = (result: { base64: string; mimeType: string; thumbnailUrl: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(msg));
    };

    video.onloadedmetadata = () => {
      const d = video.duration;
      if (!d || d === Infinity || isNaN(d)) {
        video.currentTime = 1;
        return;
      }
      
      // 3 candidate timestamps — avoid first 20% and last 28%
      const candidates = [
        Math.max(0.5, d * 0.20),
        Math.max(0.5, d * 0.45),
        Math.max(0.5, d * 0.72),
      ];
      
      let idx = 0;
      const frames: Array<{ base64: string; thumbnailUrl: string; balanceScore: number }> = [];
      
      const captureFrame = () => {
        if (idx >= candidates.length) {
          if (frames.length === 0) {
            fail("فشل استخراج لقطات من الفيديو");
            return;
          }
          // Pick frame with best balance score (closest luminance to 128)
          frames.sort((a, b) => b.balanceScore - a.balanceScore);
          done({ 
            base64: frames[0].base64, 
            mimeType: "image/jpeg", 
            thumbnailUrl: frames[0].thumbnailUrl 
          });
          return;
        }
        video.currentTime = candidates[idx++];
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const MAX_W = 800, MAX_H = 600;
        const scale = Math.min(MAX_W / video.videoWidth, MAX_H / video.videoHeight, 1);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        
        const ctx = canvas.getContext("2d");
        if (!ctx) { 
          idx++; 
          captureFrame(); 
          return; 
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Compute average luminance to pick the best-exposed frame
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let luminanceSum = 0, samples = 0;
        for (let i = 0; i < imgData.length; i += 4 * 16) {
          luminanceSum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
          samples++;
        }
        
        const avgLuminance = luminanceSum / Math.max(1, samples);
        const balanceScore = 100 - Math.abs(avgLuminance - 128);
        
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.82);
        const base64 = thumbnailUrl.split(",")[1];
        
        frames.push({ base64, thumbnailUrl, balanceScore });
        captureFrame();
      };

      video.onerror = () => fail("تعذر فك تشفير الفيديو — قد يكون التنسيق غير مدعوم");
      captureFrame();
    };

    video.onerror = () => fail("تعذر تحميل ملف الفيديو");
    
    setTimeout(() => {
      fail("انتهت مهلة تحميل الفيديو (25 ثانية)");
    }, 25000);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}
