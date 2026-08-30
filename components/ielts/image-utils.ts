export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode_failed"));
    image.src = src;
  });
}

export async function fileToDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85
): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const image = await loadImage(original);
    const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
    if (scale === 1 && file.size < 900_000) return original;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return original;
  }
}
