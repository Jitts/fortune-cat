/**
 * Resolves the "@/..." path alias so tests can import real application
 * modules under Node's type-stripping, without a bundler.
 *
 * Why this exists: the alternative is transcribing logic into the test, and a
 * transcription passes happily while the real module is broken. Everything
 * worth testing here — currency resolution, sender scoping, forward
 * unwrapping, categorisation — lives behind a "@/" import.
 *
 * Extensionless specifiers get ".ts" appended, matching how the app writes
 * imports; ".ts" is tried before "/index.ts" so a file wins over a directory.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", ".mts", ".js", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, next) {
  if (!specifier.startsWith("@/")) return next(specifier, context);

  const base = path.join(root, specifier.slice(2));
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (existsSync(candidate)) {
      return next(pathToFileURL(candidate).href, context);
    }
  }
  // Fall through unresolved rather than inventing a path, so the error names
  // the specifier that actually failed.
  return next(specifier, context);
}
