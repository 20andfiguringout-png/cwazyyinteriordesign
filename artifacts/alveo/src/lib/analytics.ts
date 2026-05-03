
type EventPayload = {
  name: string;
  props?: Record<string, string | number | boolean | null>;
};

function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const key = "alveo-analytics-session-id";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(key, next);
  return next;
}

export async function trackEvent(name: string, props?: EventPayload["props"]) {
  try {
    const sessionId = getOrCreateSessionId();
    const payload: EventPayload = {
      name,
      props: sessionId ? { ...(props ?? {}), sessionId } : props,
    };
    if (typeof window !== "undefined") {
      const key = "alveo-analytics-buffer";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as EventPayload[];
      localStorage.setItem(key, JSON.stringify([...current.slice(-49), payload]));
    }

    const base = (typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : "") ?? "";
    await fetch(`${base.replace(/\/$/, "")}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // intentionally swallow analytics failures
  }
}
