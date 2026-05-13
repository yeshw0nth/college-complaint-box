/**
 * Best-effort vibration using the Vibration API (common on Android).
 * No-ops on desktop and when the API is missing or unsupported.
 */
export function triggerHaptic(pattern: number | number[] = 50) {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers expose vibrate but throw when called (e.g. insecure context).
  }
}
