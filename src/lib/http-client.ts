"use client";

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function responseErrorMessage(response: Response, body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  const status = [response.status, response.statusText].filter(Boolean).join(" ");
  return status ? `${fallback} (${status}).` : fallback;
}
