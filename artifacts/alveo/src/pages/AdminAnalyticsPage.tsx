import { useEffect, useMemo, useState } from "react";
import {
  buildDailyStepTrend,
  buildFunnel,
  buildSessionJourneys,
  countByEventName,
  DateRangeFilter,
  filterEventsByRange,
} from "@/lib/analyticsInsights";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const FUNNEL_STEPS = [
  "landing_viewed",
  "configure_opened",
  "preview_opened",
  "export_pdf",
];

type EventPayloadValue = string | number | boolean | null;
type EventRecord = {
  name: string;
  props?: Record<string, EventPayloadValue>;
  at: string;
};

type CommentRecord = {
  id: string;
  designId: string;
  text: string;
  author: string;
  createdAt: string;
  mentions?: string[];
  parentId?: string;
  mentionRead?: boolean;
};

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminAnalyticsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [range, setRange] = useState<DateRangeFilter>("7d");
  const [eventFilter, setEventFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [mentionFilter, setMentionFilter] = useState("alex");
  const [mentionFromDate, setMentionFromDate] = useState("");
  const [mentionToDate, setMentionToDate] = useState("");
  const [mentionQueue, setMentionQueue] = useState<CommentRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("alveo-events-admin-token") ?? "";
    setToken(saved);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("alveo-events-admin-token", token);
    } else {
      localStorage.removeItem("alveo-events-admin-token");
    }
  }, [token]);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/events`, {
        method: "GET",
        headers: token ? { "x-admin-token": token } : undefined,
        cache: "no-store",
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized. Provide a valid admin token." : `Failed to load events (${res.status}).`);
        setEvents([]);
        return;
      }
      const data = (await res.json()) as { events?: EventRecord[] };
      setEvents(data.events ?? []);
    } catch {
      setError("Network error while loading events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMentionQueue() {
    try {
      const mention = mentionFilter.trim();
      const params = new URLSearchParams({ all: "1", sort: "newest" });
      if (mention) params.set("mention", mention);
      if (mentionFromDate) params.set("from", mentionFromDate);
      if (mentionToDate) params.set("to", mentionToDate);
      const res = await fetch(`${BASE}/api/design-comments?${params.toString()}`, {
        method: "GET",
        headers: token ? { "x-admin-token": token } : undefined,
        cache: "no-store",
      });
      if (!res.ok) { setMentionQueue([]); return; }
      const data = (await res.json()) as { comments?: CommentRecord[] };
      setMentionQueue(data.comments ?? []);
    } catch {
      setMentionQueue([]);
    }
  }

  async function setMentionRead(commentId: string, read: boolean) {
    const mentionUser = mentionFilter.trim();
    if (!mentionUser) return;
    const previousQueue = mentionQueue;
    setMentionQueue((current) =>
      current.map((comment) => comment.id === commentId ? { ...comment, mentionRead: read } : comment),
    );
    try {
      const res = await fetch(`${BASE}/api/design-comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
        body: JSON.stringify({ action: "mention-ack", mentionUser, commentId, read }),
      });
      if (!res.ok) { setMentionQueue(previousQueue); return; }
      void loadMentionQueue();
    } catch {
      setMentionQueue(previousQueue);
    }
  }

  useEffect(() => {
    void loadEvents();
    void loadMentionQueue();
    const timer = setInterval(() => {
      void loadEvents();
      void loadMentionQueue();
    }, 10_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void loadMentionQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionFilter, mentionFromDate, mentionToDate]);

  const filteredEvents = useMemo(() => {
    const inRange = filterEventsByRange(events, range);
    const needle = eventFilter.trim().toLowerCase();
    if (!needle) return inRange;
    return inRange.filter((event) => event.name.toLowerCase().includes(needle));
  }, [events, range, eventFilter]);

  const counts = useMemo(() => countByEventName(filteredEvents), [filteredEvents]);
  const funnel = useMemo(() => buildFunnel(filteredEvents, FUNNEL_STEPS), [filteredEvents]);
  const dailyTrend = useMemo(() => buildDailyStepTrend(filteredEvents, FUNNEL_STEPS, 7), [filteredEvents]);
  const sessionJourneys = useMemo(() => buildSessionJourneys(filteredEvents, FUNNEL_STEPS), [filteredEvents]);

  const funnelVisual = useMemo(() => {
    const first = funnel[0]?.count ?? 0;
    return funnel.map((step) => ({
      ...step,
      relativePct: first > 0 ? Math.max(6, Math.round((step.count / first) * 100)) : 0,
      dropOffPct: Math.max(0, 100 - step.conversionFromPrevPct),
    }));
  }, [funnel]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return filteredEvents.filter((event) => {
      const time = new Date(event.at).getTime();
      return !Number.isNaN(time) && time >= cutoff;
    }).length;
  }, [filteredEvents]);

  return (
    <main className="min-h-screen pt-24 pb-12 px-6 bg-cream-50 dark:bg-charcoal-600">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-taupe-400">Internal</p>
            <h1 className="font-serif text-4xl text-charcoal-600 dark:text-cream-100 mt-1">Analytics Dashboard</h1>
            <p className="text-sm text-charcoal-400 dark:text-cream-200 mt-2 max-w-2xl">Live operational feed for product usage and event funnel health.</p>
          </div>
          <button
            onClick={() => void loadEvents()}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-charcoal-600 text-white text-sm font-medium hover:bg-charcoal-500 transition-colors"
          >
            Refresh Now
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Events Cached", value: filteredEvents.length },
            { label: "Past 24h", value: last24h },
            { label: "Unique Event Types", value: counts.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
              <p className="text-xs uppercase tracking-wider text-taupe-400">{label}</p>
              <p className="mt-2 text-3xl font-serif text-charcoal-600 dark:text-cream-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-taupe-400" htmlFor="admin-token">Admin Token (optional)</label>
              <input id="admin-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste EVENTS_ADMIN_TOKEN" className="mt-2 w-full rounded-lg border border-cream-200 dark:border-charcoal-400 bg-white dark:bg-charcoal-600 px-3 py-2.5 text-sm text-charcoal-600 dark:text-cream-100" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taupe-400" htmlFor="date-range">Date Range</label>
              <select id="date-range" value={range} onChange={(e) => setRange(e.target.value as DateRangeFilter)} className="mt-2 w-full rounded-lg border border-cream-200 dark:border-charcoal-400 bg-white dark:bg-charcoal-600 px-3 py-2.5 text-sm text-charcoal-600 dark:text-cream-100">
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taupe-400" htmlFor="event-filter">Event Filter</label>
              <input id="event-filter" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} placeholder="e.g. export" className="mt-2 w-full rounded-lg border border-cream-200 dark:border-charcoal-400 bg-white dark:bg-charcoal-600 px-3 py-2.5 text-sm text-charcoal-600 dark:text-cream-100" />
            </div>
          </div>
          <p className="mt-2 text-xs text-charcoal-400 dark:text-cream-300">Token is stored only in this browser via localStorage.</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        <section className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Mention Queue</h2>
              <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">Recent comments that mention a target user.</p>
            </div>
            <div className="grid gap-2 md:grid-cols-3 w-full md:w-auto">
              <input value={mentionFilter} onChange={(e) => setMentionFilter(e.target.value)} placeholder="username (without @)" className="rounded-lg border border-cream-200 dark:border-charcoal-400 bg-white dark:bg-charcoal-600 px-3 py-2 text-sm" />
              <input type="date" value={mentionFromDate} onChange={(e) => setMentionFromDate(e.target.value)} className="rounded-lg border border-cream-200 dark:border-charcoal-400 bg-white dark:bg-charcoal-600 px-3 py-2 text-sm" />
              <input type="date" value={mentionToDate} onChange={(e) => setMentionToDate(e.target.value)} className="rounded-lg border border-cream-200 dark:border-charcoal-400 bg-white dark:bg-charcoal-600 px-3 py-2 text-sm" />
            </div>
          </div>
          {mentionQueue.length === 0 ? (
            <p className="mt-4 text-sm text-charcoal-400 dark:text-cream-300">No mentions found.</p>
          ) : (
            <ul className="mt-4 space-y-2 max-h-[260px] overflow-auto pr-1">
              {mentionQueue.slice(0, 20).map((comment) => (
                <li key={comment.id} className="rounded-lg border border-cream-100 dark:border-charcoal-400 p-3">
                  <p className="text-sm text-charcoal-600 dark:text-cream-100">{comment.text}</p>
                  <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">{comment.author} · design {comment.designId} · {formatTime(comment.createdAt)}</p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${comment.mentionRead ? "bg-cream-100 text-charcoal-500" : "bg-taupe-100 text-taupe-600"}`}>
                      {comment.mentionRead ? "read" : "unread"}
                    </span>
                    <button onClick={() => void setMentionRead(comment.id, !comment.mentionRead)} className="text-[11px] text-charcoal-500 hover:text-charcoal-700">
                      Mark as {comment.mentionRead ? "unread" : "read"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
          <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Funnel Snapshot</h2>
          <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">landing_viewed → configure_opened → preview_opened → export_pdf</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {funnel.map((item) => (
              <div key={item.step} className="rounded-xl border border-cream-100 dark:border-charcoal-400 p-3">
                <p className="text-xs uppercase tracking-wider text-taupe-400">{item.step}</p>
                <p className="mt-1 text-2xl font-serif text-charcoal-600 dark:text-cream-100">{item.count}</p>
                <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">{item.conversionFromPrevPct}% from previous step</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {funnelVisual.map((item) => (
              <div key={`bar-${item.step}`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="uppercase tracking-wider text-charcoal-400 dark:text-cream-300">{item.step}</span>
                  <span className="text-charcoal-400 dark:text-cream-300">Drop-off: {item.dropOffPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-cream-100 dark:bg-charcoal-600 overflow-hidden">
                  <div className="h-full bg-charcoal-600 dark:bg-cream-100 transition-all" style={{ width: `${item.relativePct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
            <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Top Events</h2>
            {loading ? (
              <p className="text-sm text-charcoal-400 dark:text-cream-200 mt-4">Loading...</p>
            ) : counts.length === 0 ? (
              <p className="text-sm text-charcoal-400 dark:text-cream-200 mt-4">No events found.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {counts.slice(0, 12).map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-sm border-b border-cream-100 dark:border-charcoal-400 pb-2">
                    <span className="text-charcoal-500 dark:text-cream-100">{item.name}</span>
                    <span className="text-charcoal-400 dark:text-cream-300">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
            <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Recent Stream</h2>
            {loading ? (
              <p className="text-sm text-charcoal-400 dark:text-cream-200 mt-4">Loading...</p>
            ) : filteredEvents.length === 0 ? (
              <p className="text-sm text-charcoal-400 dark:text-cream-200 mt-4">No events found.</p>
            ) : (
              <ul className="mt-4 space-y-3 max-h-[420px] overflow-auto pr-1">
                {filteredEvents.slice().reverse().slice(0, 30).map((event, index) => (
                  <li
                    key={`${event.name}-${event.at}-${index}`}
                    className="rounded-xl border border-cream-100 dark:border-charcoal-400 p-3 cursor-pointer hover:border-taupe-300 transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <p className="text-sm font-medium text-charcoal-600 dark:text-cream-100">{event.name}</p>
                    <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">{formatTime(event.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
            <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">7-Day Funnel Trend</h2>
            <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">Daily volume by funnel step.</p>
            <div className="mt-4 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-taupe-400 uppercase tracking-wider">
                    <th className="pb-2 pr-3">Day</th>
                    {FUNNEL_STEPS.map((step) => (<th key={step} className="pb-2 pr-3">{step}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((row) => (
                    <tr key={row.day} className="border-t border-cream-100 dark:border-charcoal-400">
                      <td className="py-2 pr-3 text-charcoal-500 dark:text-cream-100">{row.day}</td>
                      {FUNNEL_STEPS.map((step) => (<td key={`${row.day}-${step}`} className="py-2 pr-3 text-charcoal-400 dark:text-cream-300">{row.counts[step]}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
            <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Session Journeys</h2>
            <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">Recent sessions grouped by sessionId and observed funnel steps.</p>
            {sessionJourneys.length === 0 ? (
              <p className="mt-4 text-sm text-charcoal-400 dark:text-cream-300">No session-linked events yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 max-h-[330px] overflow-auto pr-1">
                {sessionJourneys.slice(0, 12).map((journey) => (
                  <li key={journey.sessionId} className="rounded-xl border border-cream-100 dark:border-charcoal-400 p-3">
                    <p className="text-xs uppercase tracking-wider text-taupe-400">Session</p>
                    <p className="text-sm font-medium text-charcoal-600 dark:text-cream-100 mt-1">{journey.sessionId}</p>
                    <p className="text-xs text-charcoal-400 dark:text-cream-300 mt-1">{journey.totalEvents} events · last {formatTime(journey.lastAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {journey.stepsSeen.length > 0 ? (
                        journey.stepsSeen.map((step) => (
                          <span key={`${journey.sessionId}-${step}`} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-cream-100 dark:bg-charcoal-600 text-charcoal-500 dark:text-cream-200">
                            {step}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-charcoal-400 dark:text-cream-300">No funnel steps recorded</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {selectedEvent && (
          <section className="rounded-2xl bg-white dark:bg-charcoal-500 border border-cream-200 dark:border-charcoal-400 p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Event Inspector</h2>
              <button onClick={() => setSelectedEvent(null)} className="px-3 py-1.5 rounded-md bg-cream-100 dark:bg-charcoal-600 text-xs text-charcoal-500 dark:text-cream-200">Close</button>
            </div>
            <p className="mt-2 text-sm text-charcoal-400 dark:text-cream-300">{selectedEvent.name} · {formatTime(selectedEvent.at)}</p>
            <pre className="mt-4 text-xs bg-cream-50 dark:bg-charcoal-600 border border-cream-200 dark:border-charcoal-400 rounded-xl p-4 overflow-auto max-h-[320px] text-charcoal-500 dark:text-cream-200">
{JSON.stringify(selectedEvent.props ?? {}, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
