export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type ApiOptions = RequestInit & {
  token?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("nscope_token") ?? undefined;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, "NEXT_PUBLIC_API_URL is not configured.");
  }

  const { token: explicitToken, ...fetchOptions } = options;
  const token = explicitToken ?? getStoredToken();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 2500)
  );

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      cache: "no-store",
      signal: fetchOptions.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "Backend API request timed out.");
    }
    throw new ApiError(0, "Backend API is unavailable. Please check the server connection.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const fallbackMessage = response.status === 404
      ? "API route not available yet."
      : "API request failed.";
    throw new ApiError(response.status, payload.message ?? fallbackMessage);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
