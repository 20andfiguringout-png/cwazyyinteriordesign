"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent("app_error", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main className="min-h-screen pt-24 px-6 bg-cream-50 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white border border-cream-200 rounded-2xl p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-taupe-400">Something went wrong</p>
        <h1 className="font-serif text-4xl text-charcoal-600 mt-3">We hit an unexpected issue</h1>
        <p className="text-sm text-charcoal-400 mt-4">
          The team has been notified. You can retry now or return home.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-lg bg-charcoal-600 text-white text-sm font-medium"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg bg-cream-100 text-charcoal-600 text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
