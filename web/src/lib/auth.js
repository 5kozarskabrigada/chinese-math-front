const authStorageKey = "secure_exam_auth";
export function getAuthState() {
    const raw = localStorage.getItem(authStorageKey);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        localStorage.removeItem(authStorageKey);
        return null;
    }
}
export function setAuthState(state) {
    localStorage.setItem(authStorageKey, JSON.stringify(state));
}
export function clearAuthState() {
    localStorage.removeItem(authStorageKey);
}
