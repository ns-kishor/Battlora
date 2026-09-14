import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { NextResponse } from "next/server";

// ============================================================
// Shared route helpers: error handling, JSON body parsing
// ============================================================

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data as Record<string, unknown>, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(e: unknown) {
  if (e instanceof ApiError) return fail(e.message, e.status);
  console.error("[api-error]", e);
  const message = e instanceof Error ? e.message : "Unexpected server error";
  return fail(message, 500);
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

export function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

/** Ensures a string field length, throws a friendly ApiError. */
export function requireField(value: unknown, label: string, max = 500): string {
  const s = str(value);
  if (!s) throw new ApiError(`${label} is required.`, 400);
  if (s.length > max) throw new ApiError(`${label} is too long.`, 400);
  return s;
}

export async function getSettings() {
  let settings = await db.platformSettings.findUnique({ where: { id: "main" } });
  if (!settings) {
    settings = await db.platformSettings.create({ data: { id: "main" } });
  }
  return settings;
}

/** Masks room credentials until release time (PRD section 15). */
export function maskIfNotReleased(
  value: string | null,
  releaseAt: Date | null,
  isAdmin: boolean
): { value: string | null; hidden: boolean; availableAt: string | null } {
  const released = !releaseAt || new Date(releaseAt) <= new Date();
  if (isAdmin || released) return { value, hidden: false, availableAt: null };
  return {
    value: null,
    hidden: true,
    availableAt: releaseAt.toISOString(),
  };
}

/** Basic data-URL image validation for uploads (PRD sections 44–45). */
export function validateDataUrlImage(url: unknown, maxBytes = 900_000): string | null {
  if (url === null || url === undefined || url === "") return null;
  if (typeof url !== "string") throw new ApiError("Invalid file payload.", 400);
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(url)) {
    throw new ApiError("Only PNG, JPG, WEBP or GIF images are allowed.", 400);
  }
  if (url.length > maxBytes) {
    throw new ApiError("Image is too large — please upload under ~600KB.", 400);
  }
  return url;
}
