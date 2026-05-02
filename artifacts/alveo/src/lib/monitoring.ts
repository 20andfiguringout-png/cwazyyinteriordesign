type MonitoringMeta = Record<string, string | number | boolean | null | undefined>;

export async function reportServerError(
  source: string,
  error: unknown,
  meta?: MonitoringMeta,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Keep local logs for immediate visibility in server/runtime logs.
  console.error(`[monitoring] ${source}: ${message}`, { meta, stack });

  const webhook = process.env.MONITORING_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        message,
        stack,
        meta,
        at: new Date().toISOString(),
      }),
      cache: 'no-store',
    });
  } catch {
    // Do not throw from monitoring to avoid masking the original failure.
  }
}
