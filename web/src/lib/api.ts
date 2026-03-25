import type { AuthState } from "./auth";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function apiRequest<T>(input: {
  path: string;
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  auth?: AuthState | null;
}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${input.path}`, {
    method: input.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(input.auth?.token ? { Authorization: `Bearer ${input.auth.token}` } : {})
    },
    body: input.body ? JSON.stringify(input.body) : undefined
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
    throw new Error(errorPayload.error ?? "Request failed");
  }

  return (await response.json()) as T;
}
