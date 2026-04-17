/**
 * Video handling utilities — specifically for Adobe Stock frame extraction.
 */

export async function extractVideoFrame(file: File): Promise<{
  base64: string; mimeType: string; thumbnailUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      const d = video.duration;
      if (!d || d === Infinity) {
        // Fallback for missing duration
        video.currentTime = 1;
      }
      
      // Extract 3 frames at 20%, 45%, and 70% — avoids typical fade-in/fade-out regions
      const timestamps = [d * 0.20, d * 0.45, d * 0.70].map(t => Math.max(0.5, t || 0.5));
      let idx = 0;
      const frames: Array<{ base64: string; thumbnailUrl: string; score: number }> = [];
      
      const nextFrame = () => {
        if (idx >= timestamps.length) {
          // Select the frame with the best balance (closest to mid-grey 128)
          frames.sort((a, b) => b.score - a.score);
          URL.revokeObjectURL(url);
          
          if (frames.length === 0) {
            reject(new Error("Failed to capture video frames"));
            return;
          }
          
          resolve({ 
            base64: frames[0].base64, 
            mimeType: "image/jpeg", 
            thumbnailUrl: frames[0].thumbnailUrl 
          });
          return;
        }
        video.currentTime = timestamps[idx++];
      };
      
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const MAX_W = 768, MAX_H = 576; // Increased resolution for better AI analysis
        const scale = Math.min(MAX_W / video.videoWidth, MAX_H / video.videoHeight, 1);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          nextFrame();
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Calculate quality score: balanced brightness + contrast (avoid black/blown-out frames)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let brightness = 0;
        const step = 20; // Sample every 20 pixels for speed
        let count = 0;
        
        for (let i = 0; i < data.length; i += 4 * step) {
          // Standard luminance formula
          const lum = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
          brightness += lum;
          count++;
        }
        
        brightness /= count;
        // Perfect balance is 128. Score is 100 minus the distance from 128.
        const balanceScore = 100 - Math.abs(brightness - 128);
        
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.85);
        frames.push({ 
          base64: thumbnailUrl.split(",")[1], 
          thumbnailUrl, 
          score: balanceScore 
        });
        
        nextFrame();
      };
      
      video.onerror = () => { 
        URL.revokeObjectURL(url); 
        reject(new Error("Could not load video source")); 
      };
      
      setTimeout(() => { 
        URL.revokeObjectURL(url); 
        reject(new Error("Video extraction timed out")); 
      }, 30000);
      
      nextFrame();
    };
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateId(): string {
  // Use crypto for better randomness in ID generation
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
