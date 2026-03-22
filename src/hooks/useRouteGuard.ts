const GUARD_KEY = "session_started";

export function markSessionStarted() {
  sessionStorage.setItem(GUARD_KEY, Date.now().toString());
}

export function isSessionStarted(): boolean {
  return !!sessionStorage.getItem(GUARD_KEY);
}
