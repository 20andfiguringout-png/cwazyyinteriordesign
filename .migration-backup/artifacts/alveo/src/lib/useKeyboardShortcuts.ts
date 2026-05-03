import { useEffect } from "react";

type ShortcutHandler = () => void;

export function useKeyboardShortcuts(bindings: Record<string, ShortcutHandler>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const parts: string[] = [];

      if (event.ctrlKey) parts.push("ctrl");
      if (event.metaKey) parts.push("meta");
      if (event.altKey) parts.push("alt");
      if (event.shiftKey) parts.push("shift");

      const key = event.key.toLowerCase();
      const normalizedKey = key === "arrowleft" ? "left" : key === "arrowright" ? "right" : key;
      parts.unshift(normalizedKey);
      const combo = parts.join("+");

      const callback = bindings[combo];
      if (!callback) return;

      event.preventDefault();
      callback();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [bindings]);
}
