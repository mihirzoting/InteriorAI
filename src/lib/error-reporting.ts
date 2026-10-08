type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;

declare global {
  interface Window {
    __reportError?: ErrorReporter;
  }
}

/**
 * Forward boundary-caught errors to an optional host-provided reporter. Outside
 * an embedding host this is a no-op — the boundary already logs to the console.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__reportError?.(error, {
    route: window.location.pathname,
    ...context,
  });
}
