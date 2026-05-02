type MonitoringMeta = Record<string, string | number | boolean | null | undefined>;

/**
 * Optional webhook URL for error reporting.
 * Set VITE_MONITORING_WEBHOOK_URL in your environment to enable.
 * Uses import.meta.env (Vite-compatible) instead of process.env.
 */
const WEBHOOK = import.meta.env.VITE_MONITORING_WEBHOOK_URL as string | undefined;

export async function reportServerError(
  source: string,
  error: unknown,
  meta?: MonitoringMeta,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack   = error instanceof Error ? error.stack   : undefined;

  console.error(`[monitoring] ${source}: ${message}`, { meta, stack });

  if (!WEBHOOK) return;

  try {
    await fetch(WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ source, message, stack, meta, at: new Date().toISOString() }),
      cache:   'no-store',
    });
  } catch {
    // Do not throw from monitoring to avoid masking the original failure.
  }
}
