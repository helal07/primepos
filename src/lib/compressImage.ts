/**
 * Client-side image compression. Resizes & re-encodes images to reduce upload size.
 * - Skips non-image files (returns the original).
 * - Skips already-small images (under `skipUnderKB`).
 * - GIFs are returned as-is to preserve animation.
 */
export interface CompressOptions {
  maxWidth?: number;       // default 1600
  maxHeight?: number;      // default 1600
  quality?: number;        // 0..1, default 0.8
  mimeType?: "image/webp" | "image/jpeg"; // default webp
  skipUnderKB?: number;    // default 80
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    mimeType = "image/webp",
    skipUnderKB = 80,
  } = opts;

  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= skipUnderKB * 1024) return file;

  try {
    const img = await loadImage(file);
    let { width, height } = img;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    if (!blob) return file;

    // If compression actually made it bigger, keep the original.
    if (blob.size >= file.size) return file;

    const ext = mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Compress an image file if it's an image; otherwise return as-is. Convenience
 * wrapper for upload sites that may receive PDFs alongside images.
 */
export async function compressIfImage(file: File, opts?: CompressOptions): Promise<File> {
  return file.type.startsWith("image/") ? compressImage(file, opts) : file;
}