/**
 * Client-side downscale, run just before the upload POST.
 *
 * Vercel rejects request bodies over 4.5 MB at the edge with its own raw
 * FUNCTION_PAYLOAD_TOO_LARGE — the route's friendly 413 never gets a chance to
 * run. Shrinking in the browser keeps every upload well under that, and cuts
 * vision tokens and latency as a bonus.
 *
 * This is best-effort: any failure returns the original file and the route's
 * size guard stays the backstop.
 */

// Claude downsamples images whose longer edge exceeds 1568px anyway, so pixels
// past this cost bytes and tokens without adding detail the model can see.
const MAX_EDGE = 1568;

// Under this, the original is already small enough that re-encoding would
// trade fidelity (and PNG's crisp lines) for a saving nobody needs.
const KEEP_ORIGINAL_BYTES = 1024 * 1024;

// Wireframes are flat line art with few gradients; 0.85 is visually lossless
// on them and a large size win over PNG.
const JPEG_QUALITY = 0.85;

function jpegName(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, "") || "wireframe"}.jpg`;
}

/**
 * Returns a JPEG copy of `file` scaled so its longer edge is at most MAX_EDGE,
 * or the file itself when it is already small or the resize fails. Never
 * upscales.
 */
export async function downscaleForUpload(file: File): Promise<File> {
  if (file.size <= KEEP_ORIGINAL_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d canvas context");

    // JPEG has no alpha: without this, a wireframe drawn on a transparent PNG
    // background composites onto black and the lines vanish.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("canvas.toBlob returned null");

    return new File([blob], jpegName(file.name), { type: "image/jpeg" });
  } catch (err) {
    console.warn("[downscale] falling back to the original file:", err);
    return file;
  }
}
