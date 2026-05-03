import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Clock, AlertCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { ClosetConfiguration } from "@/types/closet";
import { ClosetLayoutEngine } from "@/engine/ClosetLayoutEngine";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Approval {
  id: string;
  design_id: string;
  design_name: string | null;
  owner_email: string;
  client_email: string | null;
  status: string;
  client_note: string | null;
  design_snapshot: Partial<ClosetConfiguration> | null;
  created_at: string;
  responded_at: string | null;
}

function renderPreview(snapshot: Partial<ClosetConfiguration> | null): string | null {
  if (!snapshot?.dimensions || !snapshot?.wardrobe || !snapshot?.shoes || !snapshot?.userInfo) return null;
  try {
    const layout = ClosetLayoutEngine.calculate({
      closetType: snapshot.closetType,
      dimensions: snapshot.dimensions,
      roomDimensions: snapshot.roomDimensions,
      wardrobe: snapshot.wardrobe,
      shoes: snapshot.shoes,
      userInfo: snapshot.userInfo,
      zoneOverrides: snapshot.zoneOverrides,
      amenities: snapshot.amenities,
    });
    const renderer = new ClosetSVGRenderer(layout, {
      showDimensions: true,
      showLabels: true,
      style: snapshot.userInfo.stylePreference ?? "modern",
      woodFinish: snapshot.userInfo.woodFinish ?? "medium",
      lighting: snapshot.lighting,
      doorType: snapshot.doorType,
      roomContext: snapshot.roomContext,
    });
    return renderer.renderElevation();
  } catch {
    return null;
  }
}

export default function ClientPortalPage() {
  const [, params] = useRoute("/portal/:token");
  const token = params?.token ?? "";

  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/approvals/portal/${token}`)
      .then((r) => (r.ok ? r.json() : r.json().then((d: { error?: string }) => Promise.reject(d.error ?? "Not found"))))
      .then((data: { approval: Approval }) => {
        setApproval(data.approval);
        if (data.approval.design_snapshot) {
          setSvgPreview(renderPreview(data.approval.design_snapshot));
        }
      })
      .catch((e: string) => setError(typeof e === "string" ? e : "This link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(status: "approved" | "rejected") {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/approvals/portal/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || undefined }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setApproval((a) => a ? { ...a, status, client_note: note || null } : a);
      setSubmitted(true);
    } catch {
      setError("Failed to submit your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-taupe-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal-400">Loading your design review…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center pt-16 px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={40} />
          <h1 className="font-serif text-2xl text-charcoal-600 mb-2">Link not found</h1>
          <p className="text-charcoal-400 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!approval) return null;

  const alreadyResponded = approval.status !== "pending";

  return (
    <main className="min-h-screen bg-cream-50 pt-16">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-taupe-400 font-medium mb-3">Design Review</p>
          <h1 className="font-serif text-4xl text-charcoal-600 mb-2">
            {approval.design_name ?? "Your Closet Design"}
          </h1>
          <p className="text-charcoal-400 text-sm">
            Shared by {approval.owner_email} · {new Date(approval.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {svgPreview ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-cream-200 p-6 mb-6 overflow-hidden"
          >
            <p className="text-xs uppercase tracking-widest text-charcoal-400 font-medium mb-4">Elevation View</p>
            <div
              className="w-full"
              dangerouslySetInnerHTML={{ __html: svgPreview }}
            />
          </motion.div>
        ) : (
          <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center mb-6">
            <p className="text-charcoal-400 text-sm">Design preview not available.</p>
          </div>
        )}

        {alreadyResponded || submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl border p-8 text-center mb-6 ${
              approval.status === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            }`}
          >
            {approval.status === "approved" ? (
              <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={36} />
            ) : (
              <XCircle className="mx-auto mb-3 text-red-500" size={36} />
            )}
            <h2 className="font-serif text-2xl text-charcoal-600 mb-1">
              {approval.status === "approved" ? "Design Approved" : "Design Rejected"}
            </h2>
            <p className="text-charcoal-400 text-sm">
              {submitted ? "Your response has been recorded." : `Responded on ${new Date(approval.responded_at!).toLocaleDateString()}`}
            </p>
            {approval.client_note && (
              <p className="text-charcoal-500 text-sm mt-3 italic bg-white/60 rounded-lg px-4 py-2">
                "{approval.client_note}"
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-cream-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-500" />
              <span className="text-sm font-medium text-charcoal-600">Awaiting your review</span>
            </div>
            <p className="text-charcoal-400 text-sm mb-5">
              Please review the design above and share your decision. You can optionally leave a note for the designer.
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-charcoal-600 mb-2">Your note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any comments or revision requests…"
                rows={3}
                className="w-full px-4 py-3 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => respond("rejected")}
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <ThumbsDown size={18} />
                Request changes
              </button>
              <button
                onClick={() => respond("approved")}
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ThumbsUp size={18} />
                )}
                Approve design
              </button>
            </div>
          </motion.div>
        )}

        <p className="text-center text-xs text-charcoal-400 mt-8">
          Powered by <span className="font-serif">Alvéo</span> · Closet Design Platform
        </p>
      </div>
    </main>
  );
}
