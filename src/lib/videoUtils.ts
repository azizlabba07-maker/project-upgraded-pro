/**
 * Video handling utilities — specifically for Adobe Stock frame extraction.
 */

export async function extractVideoFrame(file: File): Promise<{
  base64: string; 
  mimeType: string; 
  thumbnailUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      // Extract frames at 20%, 50%, and 75% to avoid black fades or end screens
      const candidates = [
        Math.max(1, duration * 0.20),
        Math.max(1, duration * 0.50),
        Math.max(1, duration * 0.75),
      ];
      
      let idx = 0;
      const frames: { base64: string; brightness: number; thumbnailUrl: string }[] = [];
      
      const captureNext = () => {
        if (idx >= candidates.length) {
          // Choose the frame with the highest brightness to ensure a clear thumbnail
          frames.sort((a, b) => b.brightness - a.brightness);
          URL.revokeObjectURL(url);
          if (frames.length === 0) {
            reject(new Error("No frames captured"));
            return;
          }
          resolve({ 
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
        const scale = Math.min(640 / video.videoWidth, 480 / video.videoHeight, 1);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          captureNext();
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Calculate average brightness to avoid dark frames
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let brightness = 0;
        // Sampling for performance
        for (let i = 0; i < imageData.length; i += 16) {
          brightness += (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
        }
        brightness /= (imageData.length / 16);
        
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
        frames.push({ 
          base64: thumbnailUrl.split(",")[1], 
          brightness, 
          thumbnailUrl 
        });
        captureNext();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not load video"));
      };

      setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Extraction timeout"));
      }, 20000);

      captureNext();
    };
  });
}
