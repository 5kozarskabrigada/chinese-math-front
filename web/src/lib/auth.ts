import type { Role } from "./role";

export interface AuthState {
  token: string;
  user: {
    id: string;
    name: string;
    role: Role;
  };
}

const authStorageKey = "secure_exam_auth";

export function getAuthState(): AuthState | null {
  const raw = localStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    localStorage.removeItem(authStorageKey);
    return null;
  }
}

export function setAuthState(state: AuthState): void {
  localStorage.setItem(authStorageKey, JSON.stringify(state));
}

export function clearAuthState(): void {
  localStorage.removeItem(authStorageKey);
}
