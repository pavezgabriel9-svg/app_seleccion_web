import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { version } from "./package.json";

// ─── Metadatos de versión (calculados en build time) ─────────────────────────

/** Hash corto del commit. En Vercel viene por env; en local se lee de git. */
function resolveCommit(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
}

/** Fecha/hora de build en UTC, pre-formateada (evita mismatch de hidratación). */
function resolveBuildDate(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

const nextConfig: NextConfig = {
  // Fuente única de verdad de la versión: package.json.
  // Commit y fecha identifican exactamente qué build está corriendo.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_COMMIT: resolveCommit(),
    NEXT_PUBLIC_APP_BUILD_DATE: resolveBuildDate(),
  },
};

export default nextConfig;
