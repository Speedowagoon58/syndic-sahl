/**
 * Compresses mobile camera receipt photos client-side via Canvas so they stay fast on 4G
 * and fit comfortably in localStorage during MVP/demo mode.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1000,
  quality = 0.72
): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid image read result"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  if (typeof window === "undefined") return rawUrl;

  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const targetW = Math.max(1, Math.round(img.width * scale));
      const targetH = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(rawUrl);
    img.src = rawUrl;
  });
}
