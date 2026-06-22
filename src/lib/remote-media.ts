import { createWriteStream } from "node:fs";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { resolveAssetPath } from "./assets.js";

function isRemoteUrl(source: string): boolean {
  return source.startsWith("http://") || source.startsWith("https://");
}

function extensionFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

export async function downloadToTempFile(
  url: string,
  fallbackExt = ".bin",
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }

  const dir = await mkdtemp(path.join(tmpdir(), "maivy-media-"));
  const ext = extensionFromUrl(url, fallbackExt);
  const filePath = path.join(dir, `media${ext}`);
  const fileStream = createWriteStream(filePath);

  if (!response.body) {
    throw new Error("Empty media response body");
  }

  await pipeline(response.body, fileStream);
  return filePath;
}

export async function resolveLocalMediaSource(
  source: string,
): Promise<string | undefined> {
  if (isRemoteUrl(source)) {
    const ext = source.includes(".mp4") || source.includes("video") ? ".mp4" : ".jpg";
    try {
      return await downloadToTempFile(source, ext);
    } catch (error) {
      console.warn("Не удалось скачать медиа:", error);
      return undefined;
    }
  }

  if (path.isAbsolute(source) && existsSync(source)) {
    return source;
  }

  if (existsSync(source)) {
    return source;
  }

  return resolveAssetPath(source);
}

export function isHttpMediaSource(source: string): boolean {
  return isRemoteUrl(source);
}
