// Client-side fetch helper — relative paths only (gateway requirement)

export async function api<T = unknown>(
  path: string,
  options?: {
    method?: string;
    json?: unknown;
  }
): Promise<T> {
  const method = options?.json !== undefined ? (options?.method ?? "POST") : (options?.method ?? "GET");
  const res = await fetch(path, {
    method,
    headers: options?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options?.json !== undefined ? JSON.stringify(options.json) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-json response */
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
