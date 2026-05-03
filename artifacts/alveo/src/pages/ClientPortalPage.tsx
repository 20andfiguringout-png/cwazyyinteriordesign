import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Clock, AlertCircle, ThumbsUp, ThumbsDown,
  MessageSquare, Send, ChevronRight, X,
} from "lucide-react";
import { ClosetConfiguration } from "@/types/closet";
import { ClosetLayoutEngine } from "@/engine/ClosetLayoutEngine";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Approval {
  id: string; design_id: string; design_name: string | null; owner_email: string;
  client_email: string | null; status: string; client_note: string | null;
  design_snapshot: Partial<ClosetConfiguration> | null;
  created_at: string; responded_at: string | null;
}

interface Comment {
  id: string; text: string; author_name: string; created_at: string; parent_id?: string;
}

function renderPreview(snapshot: Partial<ClosetConfiguration> | null): string | null {
  if (!snapshot?.dimensions || !snapshot?.wardrobe || !snapshot?.shoes || !snapshot?.userInfo) return null;
  try {
    const engine = new ClosetLayoutEngine({
      closetType: snapshot.closetType, dimensions: snapshot.dimensions,
      roomDimensions: snapshot.roomDimensions, wardrobe: snapshot.wardrobe,
      shoes: snapshot.shoes, userInfo: snapshot.userInfo,
      zoneOverrides: snapshot.zoneOverrides, amenities: snapshot.amenities,
    });
    const layout = engine.calculateLayout();
    const wall = layout.walls?.[0];
    const wallLayout = wall
      ? { ...layout, dimensions:{ width:wall.width, height:wall.height, depth:wall.unitDepth }, zones:wall.zones, walls:[wall] }
      : layout;
    const renderer = new ClosetSVGRenderer(wallLayout, {
      showDimensions: true, showLabels: true,
      style: snapshot.userInfo.stylePreference ?? "modern",
      woodFinish: snapshot.userInfo.woodFinish ?? "medium",
      lighting: snapshot.lighting, doorType: snapshot.doorType, roomContext: snapshot.roomContext,
    });
    return renderer.renderElevation();
  } catch { return null; }
}

export default function ClientPortalPage() {
  const [, params] = useRoute("/portal/:token");
  const token = params?.token ?? "";

  const [approval, setApproval] = useState<Approval|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [svgPreview, setSvgPreview] = useState<string|null>(null);

  // Tabs: "review" | "comments"
  const [activeTab, setActiveTab] = useState<"review"|"comments">("review");

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("General");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/approvals/portal/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((d: { error?: string }) => Promise.reject(d.error ?? "Not found")))
      .then((data: { approval: Approval }) => {
        setApproval(data.approval);
        if (data.approval.design_snapshot) setSvgPreview(renderPreview(data.approval.design_snapshot));
      })
      .catch((e: string) => setError(typeof e==="string" ? e : "This link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!approval?.design_id || activeTab !== "comments") return;
    setCommentsLoading(true);
    fetch(`${BASE}/api/design-comments?designId=${encodeURIComponent(approval.design_id)}`)
      .then(r => r.ok ? r.json() : { comments:[] })
      .then((data: { comments?: Comment[] }) => setComments(data.comments ?? []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [approval?.design_id, activeTab]);

  const postComment = async () => {
    if (!commentText.trim() || !approval) return;
    setPostingComment(true);
    const prefix = selectedModule !== "General" ? `[${selectedModule}] ` : "";
    const fullText = prefix + commentText.trim();
    try {
      const res = await fetch(`${BASE}/api/design-comments`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          designId: approval.design_id,
          text: fullText,
          authorName: approval.client_email ?? "Client",
          userEmail: approval.client_email ?? "client@portal",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { comment: Comment };
        setComments(prev => [data.comment, ...prev]);
        setCommentText("");
      }
    } catch { /* ignore */ } finally { setPostingComment(false); }
  };

  async function respond(status: "approved" | "rejected") {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/approvals/portal/${token}/respond`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ status, note: note||undefined }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setApproval(a => a ? {...a, status, client_note:note||null} : a);
      setSubmitted(true);
    } catch {
      setError("Failed to submit your response. Please try again.");
    } finally { setSubmitting(false); }
  }

  // Derive modules from snapshot for module-level comments
  const snapshotModules = (() => {
    const snap = approval?.design_snapshot as (Partial<ClosetConfiguration> & { builderModules?: Array<{ label: string }> }) | null;
    if (!snap) return [];
    if (snap.builderModules && Array.isArray(snap.builderModules)) {
      return snap.builderModules.map((m) => m.label).filter(Boolean) as string[];
    }
    return [];
  })();
  const moduleOptions = ["General", ...snapshotModules];

  if (loading) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-taupe-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-charcoal-400">Loading your design review…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center pt-16 px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={40}/>
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

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-taupe-400 font-medium mb-3">Design Review</p>
          <h1 className="font-serif text-4xl text-charcoal-600 mb-2">
            {approval.design_name ?? "Your Closet Design"}
          </h1>
          <p className="text-charcoal-400 text-sm">
            Shared by {approval.owner_email} · {new Date(approval.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1 max-w-xs mx-auto">
          {([
            { id:"review", label:"Design Review", icon: CheckCircle2 },
            { id:"comments", label:"Comments", icon: MessageSquare },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                ${activeTab===id ? "bg-white text-charcoal-700 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>
              <Icon size={12}/>{label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "review" ? (
            <motion.div key="review" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}>

              {/* SVG Preview */}
              {svgPreview ? (
                <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
                  className="bg-white rounded-2xl border border-cream-200 p-6 mb-6 overflow-hidden">
                  <p className="text-xs uppercase tracking-widest text-charcoal-400 font-medium mb-4">Elevation View</p>
                  <div className="w-full" dangerouslySetInnerHTML={{ __html: svgPreview }}/>
                </motion.div>
              ) : (
                <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center mb-6">
                  <p className="text-charcoal-400 text-sm">Design preview not available.</p>
                </div>
              )}

              {alreadyResponded || submitted ? (
                <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}
                  className={`rounded-2xl border p-8 text-center mb-6 ${approval.status==="approved" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  {approval.status === "approved" ? (
                    <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={36}/>
                  ) : (
                    <Clock className="mx-auto mb-3 text-amber-500" size={36}/>
                  )}
                  <h2 className="font-serif text-2xl text-charcoal-600 mb-1">
                    {approval.status==="approved" ? "Design Approved" : "Revision Requested"}
                  </h2>
                  <p className="text-charcoal-400 text-sm">
                    {submitted ? "Your response has been recorded." : `Responded on ${new Date(approval.responded_at!).toLocaleDateString()}`}
                  </p>
                  {approval.client_note && (
                    <p className="text-charcoal-500 text-sm mt-3 italic bg-white/60 rounded-lg px-4 py-2">"{approval.client_note}"</p>
                  )}
                  {approval.status === "rejected" && !submitted && (
                    <p className="text-xs text-amber-600 mt-3">Your revision request has been sent to the designer.</p>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
                  className="bg-white rounded-2xl border border-cream-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={16} className="text-amber-500"/>
                    <span className="text-sm font-medium text-charcoal-600">Awaiting your review</span>
                  </div>
                  <p className="text-charcoal-400 text-sm mb-5">
                    Review the design above and share your decision. You can leave a note for the designer.
                  </p>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-charcoal-600 mb-2">Your note (optional)</label>
                    <textarea value={note} onChange={e=>setNote(e.target.value)}
                      placeholder="Describe any changes you'd like, or approve as-is…"
                      rows={3}
                      className="w-full px-4 py-3 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 resize-none"/>
                  </div>

                  {/* Leave comments prompt */}
                  <div className="mb-5 bg-stone-50 rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-stone-400"/>
                      <p className="text-xs text-stone-500">Have specific feedback on a module? Use the Comments tab.</p>
                    </div>
                    <button onClick={() => setActiveTab("comments")}
                      className="flex items-center gap-1 text-xs text-taupe-600 hover:text-taupe-700 font-medium whitespace-nowrap">
                      Comments <ChevronRight size={11}/>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => respond("rejected")} disabled={submitting}
                      className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-amber-200 text-amber-700 rounded-xl font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors">
                      <ThumbsDown size={18}/> Request Changes
                    </button>
                    <button onClick={() => respond("approved")} disabled={submitting}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                      {submitting ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      ) : <ThumbsUp size={18}/>}
                      Approve Design
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="comments" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}>
              <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">

                {/* Comment form */}
                <div className="p-5 border-b border-stone-100">
                  <p className="text-sm font-semibold text-charcoal-600 mb-3">Leave a comment</p>

                  {/* Module selector */}
                  {moduleOptions.length > 1 && (
                    <div className="mb-3">
                      <p className="text-xs text-stone-400 mb-2">Commenting on:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {moduleOptions.map((m) => (
                          <button key={m} onClick={() => setSelectedModule(m)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all
                              ${selectedModule===m ? "bg-taupe-500 text-white border-taupe-500" : "bg-stone-50 text-stone-500 border-stone-200 hover:border-taupe-300"}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={e=>setCommentText(e.target.value)}
                      onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();postComment();} }}
                      placeholder={selectedModule==="General"
                        ? "Leave a general comment about this design…"
                        : `Comment about ${selectedModule}…`}
                      rows={2}
                      className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 text-charcoal-600 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 resize-none"/>
                    <button onClick={postComment} disabled={!commentText.trim()||postingComment}
                      className="flex-shrink-0 self-end flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-charcoal-600 hover:bg-charcoal-500 disabled:opacity-40 transition-colors">
                      {postingComment ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={13}/>}
                      Send
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-300 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
                </div>

                {/* Comments list */}
                <div className="max-h-80 overflow-y-auto">
                  {commentsLoading && (
                    <div className="flex items-center justify-center py-8 gap-2 text-stone-400">
                      <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin"/>
                      Loading comments…
                    </div>
                  )}
                  {!commentsLoading && comments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-stone-300 gap-2">
                      <MessageSquare size={24} className="opacity-40"/>
                      <p className="text-sm">No comments yet</p>
                      <p className="text-xs">Be the first to leave feedback above</p>
                    </div>
                  )}
                  {!commentsLoading && comments.map((c) => {
                    const moduleTag = c.text.match(/^\[([^\]]+)\]\s*/);
                    const displayText = moduleTag ? c.text.replace(moduleTag[0],"") : c.text;
                    const tag = moduleTag?.[1];
                    return (
                      <div key={c.id} className="px-5 py-3.5 border-b border-stone-50 last:border-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-6 h-6 rounded-full bg-taupe-100 flex items-center justify-center text-[10px] font-bold text-taupe-600 flex-shrink-0">
                            {c.author_name?.[0]?.toUpperCase() ?? "?"}
                          </span>
                          <span className="text-xs font-semibold text-charcoal-600">{c.author_name}</span>
                          {tag && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-taupe-50 border border-taupe-200 text-taupe-600">{tag}</span>
                          )}
                          <span className="text-[10px] text-stone-400 ml-auto">
                            {new Date(c.created_at).toLocaleDateString(undefined, { month:"short", day:"numeric" })}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal-600 pl-8 leading-relaxed">{displayText}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return to review */}
              <div className="mt-4 text-center">
                <button onClick={() => setActiveTab("review")}
                  className="flex items-center gap-2 mx-auto text-sm text-taupe-600 hover:text-taupe-700 font-medium">
                  <X size={13}/> Return to Design Review
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-charcoal-400 mt-8">
          Powered by <span className="font-serif">Alvéo</span> · Closet Design Platform
        </p>
      </div>
    </main>
  );
}
