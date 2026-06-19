import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export function resolveAssetPath(relativePath: string): string | undefined {
  const fullPath = path.resolve(projectRoot, relativePath);
  return existsSync(fullPath) ? fullPath : undefined;
}

export function getProjectRoot(): string {
  return projectRoot;
}
