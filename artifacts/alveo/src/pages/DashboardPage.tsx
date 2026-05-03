import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderOpen, Users, LayoutGrid, Clock, CheckCircle2,
  AlertCircle, Pencil, Trash2, X, ChevronRight, BarChart2,
  Sparkles, Send, ArrowRight, Tag, GitCompare, Share2, Bell, Copy, Check,
  History, RotateCcw, Search, Wand2, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getStoredToken } from "@/lib/AuthContext";
import { useToast } from "@/lib/toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function tagColor(tag: string): string {
  const palettes = [
    "bg-violet-50 text-violet-700 border-violet-200",
    "bg-sky-50 text-sky-700 border-sky-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-rose-50 text-rose-700 border-rose-200",
    "bg-cyan-50 text-cyan-700 border-cyan-200",
    "bg-orange-50 text-orange-700 border-orange-200",
    "bg-teal-50 text-teal-700 border-teal-200",
  ];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h);
  return palettes[Math.abs(h) % palettes.length];
}

function formatReminded(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface Project {
  id: string; name: string; client_name: string | null; status: string;
  notes: string | null; design_count: number; created_at: string; updated_at: string;
}
interface Approval {
  id: string; design_id: string; design_name: string | null; client_email: string | null;
  status: string; created_at: string; responded_at: string | null; client_note: string | null;
  token?: string;
}
interface SavedDesign {
  id: string; name: string; savedAt: string; config?: Record<string, unknown>;
}
interface DesignVersion {
  savedAt: string;
  name?: string;
  finish?: string;
  closetKind?: string;
  source?: string;
  tags?: string[];
  wallDimensions?: { width?: number; height?: number; depth?: number };
  builderModules?: Array<{ type?: string; label?: string; width?: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  "on-hold": "bg-amber-50 text-amber-700 border-amber-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
};

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function daysSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

// ─── Design comparison modal ──────────────────────────────────────────────────

function CompareModal({ a, b, onClose }: { a: SavedDesign; b: SavedDesign; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const fields = (d: SavedDesign) => {
    const cfg = d.config ?? {};
    const dims = (cfg.wallDimensions as { width?: number; height?: number; depth?: number } | undefined);
    const mods = (cfg.builderModules as unknown[] | undefined) ?? [];
    const tags = (cfg.tags as string[] | undefined) ?? [];
    const src  = (cfg.source as string | undefined) ?? "—";
    return { dims, mods, tags, src };
  };
  const fa = fields(a), fb = fields(b);
  const diffClass = (va: unknown, vb: unknown) => va !== vb ? "bg-amber-50 text-amber-700 rounded px-1" : "";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.97}}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-taupe-500"/>
            <span className="font-semibold text-charcoal-700 text-sm">Design Comparison</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X size={14}/></button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-stone-100">
          {[{d:a,f:fa},{d:b,f:fb}].map(({d,f},i) => (
            <div key={i} className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Design {i===0?"A":"B"}</p>
                <p className="font-semibold text-charcoal-700 text-sm">{d.name}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{new Date(d.savedAt).toLocaleDateString()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Dimensions</p>
                {f.dims ? (
                  <p className={`text-sm font-mono ${diffClass(JSON.stringify(fa.dims), JSON.stringify(fb.dims))}`}>
                    {f.dims.width}″ × {f.dims.height}″ × {f.dims.depth}″
                  </p>
                ) : <p className="text-xs text-stone-300">—</p>}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Modules</p>
                <p className={`text-sm ${diffClass(fa.mods.length, fb.mods.length)}`}>{f.mods.length} module{f.mods.length!==1?"s":""}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Source</p>
                <p className={`text-sm capitalize ${diffClass(fa.src, fb.src)}`}>{f.src}</p>
              </div>
              {f.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {f.tags.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-taupe-50 border border-taupe-200 text-taupe-700">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
          <p className="text-xs text-stone-400">Highlighted cells indicate differences between designs</p>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Share modal ──────────────────────────────────────────────────────────────

function ShareModal({ design, approvals, onClose }: { design: SavedDesign; approvals: Approval[]; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const existing = approvals.find((a) => a.design_id === design.id);
  const [copied, setCopied] = useState(false);

  const portalUrl = existing
    ? `${window.location.origin}${import.meta.env.BASE_URL?.replace(/\/$/, "")}/portal/${existing.token ?? ""}`
    : null;

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.97}}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-taupe-500"/>
            <span className="font-semibold text-charcoal-700 text-sm">Share Design</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X size={14}/></button>
        </div>
        <p className="text-sm text-charcoal-600 font-medium mb-1">{design.name}</p>
        {existing ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-stone-500">An approval link exists for this design. Share it with your client:</p>
            <div className="flex gap-2">
              <input readOnly value={`${window.location.origin}${import.meta.env.BASE_URL?.replace(/\/$/, "")}/portal/${(existing as Approval & { token?: string }).token ?? ""}`}
                className="flex-1 text-xs border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-600 font-mono truncate focus:outline-none"/>
              <button onClick={() => portalUrl && copy(portalUrl)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-charcoal-600 hover:bg-charcoal-500 text-white transition-colors">
                {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
              </button>
            </div>
            <p className={`text-[10px] text-emerald-600 transition-opacity ${copied ? "opacity-100" : "opacity-0"}`}>Link copied to clipboard!</p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs text-stone-500 mb-4">Send this design to a client for approval first, then you'll get a shareable link. Go to the Configure page to send an approval request.</p>
            <Link href="/configure" onClick={onClose}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-charcoal-600 hover:bg-charcoal-500 text-white transition-colors">
              <Send size={14}/> Send for Approval
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Version history modal ────────────────────────────────────────────────────

const FINISH_SWATCHES: Record<string, { bg: string; label: string }> = {
  light:  { bg: "#f0ebe3", label: "Light Oak"     },
  medium: { bg: "#d4c2a8", label: "Warm Walnut"   },
  dark:   { bg: "#8d7060", label: "Dark Espresso" },
  white:  { bg: "#f8f8f6", label: "Painted White" },
};

function VersionHistoryModal({
  design, onClose, onRestore, restoring, onDuplicate, duplicating,
}: {
  design: SavedDesign;
  onClose: () => void;
  onRestore: (versionIdx: number) => void;
  restoring: number | null;
  onDuplicate: (versionIdx: number) => void;
  duplicating: number | null;
}) {
  const versions = (design.config?.versions as DesignVersion[] | undefined) ?? [];
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-taupe-50 rounded-lg border border-taupe-100">
              <History size={14} className="text-taupe-600"/>
            </div>
            <div>
              <p className="font-semibold text-charcoal-700 text-sm leading-tight">Version History</p>
              <p className="text-[10px] text-stone-400 mt-0.5">{design.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"><X size={14}/></button>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 64px)" }}>
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="p-3 bg-stone-50 rounded-full mb-3">
                <History size={22} className="text-stone-300"/>
              </div>
              <p className="text-sm font-medium text-charcoal-500 mb-1">No previous versions yet</p>
              <p className="text-xs text-stone-400 max-w-xs">Each time you save this design, the previous state is automatically stored here. Save a new version to start tracking history.</p>
            </div>
          ) : (
            <div className="p-5">
              {/* Current version entry */}
              <div className="flex gap-3 mb-1">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Check size={12} className="text-white"/>
                  </div>
                  {versions.length > 0 && <div className="w-px flex-1 bg-stone-200 mt-1"/>}
                </div>
                <div className="pb-5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-charcoal-700">Current version</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full px-2 py-0.5">Latest</span>
                  </div>
                  <p className="text-[10px] text-stone-400">{new Date(design.savedAt).toLocaleString()}</p>
                  {(() => {
                    const cfg = design.config ?? {};
                    const mods = (cfg.builderModules as unknown[] | undefined) ?? [];
                    const dims = cfg.wallDimensions as { width?: number; height?: number; depth?: number } | undefined;
                    const finish = cfg.finish as string | undefined;
                    return (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {mods.length > 0 && <span className="text-[10px] text-stone-500 bg-stone-50 border border-stone-100 rounded-md px-2 py-0.5">{mods.length} module{mods.length !== 1 ? "s" : ""}</span>}
                        {dims?.width && <span className="text-[10px] text-stone-500 bg-stone-50 border border-stone-100 rounded-md px-2 py-0.5 font-mono">{dims.width}″ × {dims.height}″</span>}
                        {finish && FINISH_SWATCHES[finish] && (
                          <span className="flex items-center gap-1 text-[10px] text-stone-500">
                            <span className="w-3 h-3 rounded-full border border-stone-200 shrink-0 inline-block" style={{ background: FINISH_SWATCHES[finish]!.bg }}/>
                            {FINISH_SWATCHES[finish]!.label}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Past versions */}
              {versions.map((v, idx) => {
                const mods = v.builderModules ?? [];
                const dims = v.wallDimensions;
                const isRestoring = restoring === idx;
                const vNum = versions.length - idx;
                return (
                  <div key={idx} className="flex gap-3 mb-1">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center shrink-0 text-[9px] font-bold text-stone-400">
                        v{vNum}
                      </div>
                      {idx < versions.length - 1 && <div className="w-px flex-1 bg-stone-200 mt-1"/>}
                    </div>
                    <div className={`pb-5 flex-1 min-w-0 ${idx < versions.length - 1 ? "" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-charcoal-600">Version {vNum}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{new Date(v.savedAt).toLocaleString()}</p>
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            {mods.length > 0 && <span className="text-[10px] text-stone-500 bg-stone-50 border border-stone-100 rounded-md px-2 py-0.5">{mods.length} module{mods.length !== 1 ? "s" : ""}</span>}
                            {dims?.width && <span className="text-[10px] text-stone-500 bg-stone-50 border border-stone-100 rounded-md px-2 py-0.5 font-mono">{dims.width}″ × {dims.height}″</span>}
                            {v.finish && FINISH_SWATCHES[v.finish] && (
                              <span className="flex items-center gap-1 text-[10px] text-stone-500">
                                <span className="w-3 h-3 rounded-full border border-stone-200 shrink-0 inline-block" style={{ background: FINISH_SWATCHES[v.finish]!.bg }}/>
                                {FINISH_SWATCHES[v.finish]!.label}
                              </span>
                            )}
                            {v.closetKind && <span className="text-[10px] text-stone-500 bg-stone-50 border border-stone-100 rounded-md px-2 py-0.5 capitalize">{v.closetKind}</span>}
                            {v.tags && v.tags.length > 0 && v.tags.map((t) => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-taupe-50 border border-taupe-100 text-taupe-600">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col gap-1">
                          <button
                            onClick={() => onRestore(idx)}
                            disabled={isRestoring || duplicating === idx}
                            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all
                              bg-white border-stone-200 text-stone-500 hover:border-taupe-400 hover:text-taupe-600 hover:bg-taupe-50 disabled:opacity-50">
                            {isRestoring ? (
                              <span className="flex items-center gap-1"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="inline-block"><RotateCcw size={10}/></motion.span> Restoring…</span>
                            ) : (
                              <><RotateCcw size={10}/> Restore</>
                            )}
                          </button>
                          <button
                            onClick={() => onDuplicate(idx)}
                            disabled={duplicating === idx || isRestoring}
                            className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border transition-all
                              bg-white border-stone-200 text-stone-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                            {duplicating === idx ? (
                              <span className="flex items-center gap-1"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="inline-block"><RotateCcw size={10}/></motion.span> Saving…</span>
                            ) : (
                              <><Copy size={10}/> Branch</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── DashboardPage ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const [projects,  setProjects]  = useState<Project[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [designs,   setDesigns]   = useState<SavedDesign[]>([]);
  const [clients,   setClients]   = useState<{ id: string }[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [showNewProject,  setShowNewProject]  = useState(false);
  const [editingProject,  setEditingProject]  = useState<Project|null>(null);
  const [projectForm,     setProjectForm]     = useState({ name:"", clientName:"", status:"active" as string, notes:"" });
  const [saving,          setSaving]          = useState(false);
  const [deleteId,        setDeleteId]        = useState<string|null>(null);

  // Design search
  const [designSearch, setDesignSearch] = useState("");

  // Tags filter
  const [activeTag, setActiveTag] = useState<string>("All");

  // Comparison
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Share modal
  const [shareDesign, setShareDesign] = useState<SavedDesign|null>(null);

  // Version history modal
  const [historyDesign,  setHistoryDesign]  = useState<SavedDesign|null>(null);
  const [restoringIdx,   setRestoringIdx]   = useState<number|null>(null);
  const [duplicatingIdx, setDuplicatingIdx] = useState<number|null>(null);

  // "Show all" toggles
  const [showAllDesigns,   setShowAllDesigns]   = useState(false);
  const [showAllApprovals, setShowAllApprovals] = useState(false);

  // Reminder timestamps (approvalId → Date.now() when sent)
  const [remindedAt, setRemindedAt] = useState<Record<string, number>>({});
  // Copy-name feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAll();
    const welcomeEmail = sessionStorage.getItem("alveo-welcome");
    if (welcomeEmail) {
      sessionStorage.removeItem("alveo-welcome");
      setTimeout(() => showToast("Welcome back! Great to see you.", "success"), 300);
    }
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [projRes, appRes, desRes, cliRes] = await Promise.all([
        fetch(`${BASE}/api/projects`,  { headers: authHeaders() }),
        fetch(`${BASE}/api/approvals`, { headers: authHeaders() }),
        fetch(`${BASE}/api/designs`,   { headers: authHeaders() }),
        fetch(`${BASE}/api/clients`,   { headers: authHeaders() }),
      ]);
      if (projRes.ok) setProjects(((await projRes.json()) as { projects: Project[] }).projects ?? []);
      if (appRes.ok) setApprovals(((await appRes.json()) as { approvals: Approval[] }).approvals ?? []);
      if (desRes.ok) setDesigns(((await desRes.json()) as { designs: SavedDesign[] }).designs ?? []);
      if (cliRes.ok) setClients(((await cliRes.json()) as { clients: { id: string }[] }).clients ?? []);
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditingProject(null);
    setProjectForm({ name:"", clientName:"", status:"active", notes:"" });
    setShowNewProject(true);
  }
  function openEdit(p: Project) {
    setEditingProject(p);
    setProjectForm({ name:p.name, clientName:p.client_name??"", status:p.status, notes:p.notes??"" });
    setShowNewProject(true);
  }
  async function saveProject() {
    setSaving(true);
    try {
      const body = { name:projectForm.name, clientName:projectForm.clientName||null, status:projectForm.status, notes:projectForm.notes||null };
      const res = await fetch(
        editingProject ? `${BASE}/api/projects/${editingProject.id}` : `${BASE}/api/projects`,
        { method:editingProject?"PUT":"POST", headers:authHeaders(), body:JSON.stringify(body) },
      );
      if (res.ok) { setShowNewProject(false); loadAll(); }
    } finally { setSaving(false); }
  }
  async function deleteProject(id: string) {
    await fetch(`${BASE}/api/projects/${id}`, { method:"DELETE", headers:authHeaders() });
    setDeleteId(null); loadAll();
  }

  const sendReminder = async (approvalId: string) => {
    setRemindedAt(prev => ({ ...prev, [approvalId]: Date.now() }));
    try {
      await fetch(`${BASE}/api/approvals/${approvalId}/remind`, { method: "PATCH", headers: authHeaders() });
    } catch { /* best-effort */ }
  };

  const copyDesignName = (id: string, name: string) => {
    navigator.clipboard.writeText(name).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  async function duplicateVersion(design: SavedDesign, versionIdx: number) {
    const versions = (design.config?.versions as DesignVersion[] | undefined) ?? [];
    const snapshot = versions[versionIdx];
    if (!snapshot) return;
    setDuplicatingIdx(versionIdx);
    try {
      const newId = `studio_${Date.now().toString(36)}`;
      const newName = `${design.name} — v${versions.length - versionIdx}`;
      const newConfig: Record<string, unknown> = {
        source:         snapshot.source ?? "studio",
        closetKind:     snapshot.closetKind,
        finish:         snapshot.finish,
        wallDimensions: snapshot.wallDimensions,
        builderModules: snapshot.builderModules,
        tags:           snapshot.tags,
        versions:       [],
      };
      await fetch(`${BASE}/api/designs`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ design: { id: newId, name: newName, ...newConfig } }),
      });
      await loadAll();
      setHistoryDesign(null);
      showToast(`Branched as "${newName}"`, "success");
    } finally {
      setDuplicatingIdx(null);
    }
  }

  const [resolvingId, setResolvingId] = useState<string|null>(null);
  async function resolveRevision(approvalId: string) {
    setResolvingId(approvalId);
    try {
      const res = await fetch(`${BASE}/api/approvals/${approvalId}/resolve`, { method: "PATCH", headers: authHeaders() });
      if (res.ok) { await loadAll(); showToast("Revision marked as resolved", "success"); }
      else showToast("Could not resolve revision", "error");
    } finally { setResolvingId(null); }
  }

  async function restoreVersion(design: SavedDesign, versionIdx: number) {
    const versions = (design.config?.versions as DesignVersion[] | undefined) ?? [];
    const snapshot = versions[versionIdx];
    if (!snapshot) return;
    setRestoringIdx(versionIdx);
    // toast after completion handled below
    try {
      // Build the restored config from the snapshot, keep the full versions array
      const restoredConfig: Record<string, unknown> = {
        source:         snapshot.source,
        closetKind:     snapshot.closetKind,
        finish:         snapshot.finish,
        wallDimensions: snapshot.wallDimensions,
        builderModules: snapshot.builderModules,
        tags:           snapshot.tags,
        versions:       design.config?.versions,
      };
      await fetch(`${BASE}/api/designs`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ design: { id: design.id, name: design.name, ...restoredConfig } }),
      });
      await loadAll();
      setHistoryDesign(null);
      showToast("Version restored", "success");
    } finally {
      setRestoringIdx(null);
    }
  }

  // Tags from all designs
  const allTags = useMemo(() => {
    const set = new Set<string>();
    designs.forEach((d) => { const tags = d.config?.tags as string[] | undefined; tags?.forEach((t) => set.add(t)); });
    return ["All", ...Array.from(set).sort()];
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    let result = activeTag === "All" ? designs : designs.filter((d) => {
      const tags = d.config?.tags as string[] | undefined;
      return tags?.includes(activeTag);
    });
    if (designSearch.trim()) {
      const q = designSearch.trim().toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q));
    }
    return result;
  }, [designs, activeTag, designSearch]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);
  };

  const compareDesigns = compareIds.length === 2
    ? compareIds.map((id) => designs.find((d) => d.id === id)!).filter(Boolean)
    : [];

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const allCaughtUp = approvals.length > 0 && pendingApprovals.length === 0 && !approvals.some(a => a.status === "rejected");
  const displayName = user?.firstName ? `${user.firstName}${user.lastName?" "+user.lastName:""}` : user?.email?.split("@")[0] ?? "Designer";

  const { showToast } = useToast();

  const loadIntoStudio = (d: SavedDesign) => {
    const cfg = d.config ?? {};
    if (cfg.builderModules) localStorage.setItem("alveo_builder_modules", JSON.stringify(cfg.builderModules));
    const dims = cfg.wallDimensions as { width?: number; height?: number; depth?: number } | undefined;
    localStorage.setItem("alveo_studio_dims", JSON.stringify({
      wallW: dims?.width ?? 96, wallH: dims?.height ?? 84, wallD: dims?.depth ?? 24,
      finish: (cfg.finish as string) ?? "medium",
    }));
    navigate("/studio");
  };

  const copyPortalLink = (token: string) => {
    const url = `${window.location.origin}${BASE}/portal/${token}`;
    navigator.clipboard.writeText(url).then(() => showToast("Portal link copied!", "success"));
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-taupe-400 font-medium mb-1">Dashboard</p>
            <h1 className="font-serif text-4xl text-charcoal-600">Good to see you, {displayName}</h1>
            <p className="text-charcoal-400 mt-1 text-sm">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/studio"
              className="inline-flex items-center gap-2 bg-taupe-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-taupe-600 transition-colors">
              <Sparkles size={16}/> Design Studio
            </Link>
            <Link href="/configure"
              className="inline-flex items-center gap-2 bg-charcoal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoal-500 transition-colors">
              <Plus size={16}/> New Design
            </Link>
            <button onClick={() => { logout(); navigate("/"); }}
              className="px-4 py-2.5 text-sm text-charcoal-400 hover:text-charcoal-600 border border-cream-300 rounded-lg hover:bg-cream-100 transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[...Array(4)].map((_,i) => <div key={i} className="bg-white rounded-2xl border border-cream-200 p-6 animate-pulse h-24"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label:"Projects",         value:projects.length,         icon:FolderOpen,  color:"text-amber-600 bg-amber-50"   },
              { label:"Designs",          value:designs.length,          icon:LayoutGrid,  color:"text-blue-600 bg-blue-50"     },
              { label:"Clients",          value:clients.length,          icon:Users,       color:"text-emerald-600 bg-emerald-50"},
              { label:"Pending approvals",value:pendingApprovals.length, icon:Clock,       color:"text-purple-600 bg-purple-50"  },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                className="bg-white rounded-2xl border border-cream-200 p-5">
                <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}><stat.icon size={18}/></div>
                <p className="text-3xl font-serif text-charcoal-600">{stat.value}</p>
                <p className="text-xs text-charcoal-400 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">

            {/* Projects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl text-charcoal-600">Projects</h2>
                <button onClick={openCreate} className="flex items-center gap-1.5 text-sm text-taupe-600 hover:text-taupe-700 font-medium">
                  <Plus size={15}/> New project
                </button>
              </div>
              {projects.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-dashed border-cream-300 p-10 text-center">
                  <FolderOpen className="mx-auto mb-3 text-charcoal-300" size={36}/>
                  <p className="text-charcoal-400 text-sm">No projects yet. Create one to group your designs.</p>
                  <button onClick={openCreate} className="mt-4 px-5 py-2 bg-charcoal-600 text-white text-sm rounded-lg hover:bg-charcoal-500 transition-colors">Create project</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((p) => (
                    <motion.div key={p.id} layout className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-charcoal-600 truncate">{p.name}</span>
                          <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${STATUS_COLORS[p.status]??""}`}>{p.status}</span>
                        </div>
                        {p.client_name && <p className="text-xs text-charcoal-400 mt-0.5">Client: {p.client_name}</p>}
                        <p className="text-xs text-charcoal-400 mt-0.5">{p.design_count} design{p.design_count!==1?"s":""}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100"><Pencil size={14}/></button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded text-charcoal-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Designs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-2xl text-charcoal-600">Recent Designs</h2>
                <div className="flex items-center gap-2">
                  {compareIds.length === 2 && (
                    <button onClick={() => setShowCompare(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-taupe-50 border border-taupe-300 text-taupe-700 hover:bg-taupe-100 transition-colors">
                      <GitCompare size={12}/> Compare selected
                    </button>
                  )}
                  <Link href="/configure" className="text-sm text-taupe-600 hover:text-taupe-700 font-medium flex items-center gap-1">
                    New design <ArrowRight size={14}/>
                  </Link>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"/>
                <input
                  value={designSearch} onChange={e => setDesignSearch(e.target.value)}
                  placeholder="Search designs…"
                  className="w-full pl-8 pr-8 py-2 text-sm bg-white border border-cream-200 rounded-xl text-charcoal-600 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-taupe-300 focus:border-taupe-300"
                />
                {designSearch && (
                  <button onClick={() => setDesignSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-stone-300 hover:text-stone-500">
                    <X size={12}/>
                  </button>
                )}
              </div>

              {/* Tag filter */}
              {allTags.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {allTags.map((t) => (
                    <button key={t} onClick={() => setActiveTag(t)}
                      className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all
                        ${activeTag===t
                          ? (t==="All" ? "bg-charcoal-600 text-white border-charcoal-600" : `${tagColor(t)} font-semibold`)
                          : "bg-white text-charcoal-500 border-cream-300 hover:border-charcoal-400"}`}>
                      {t !== "All" && <Tag size={8}/>}{t}
                    </button>
                  ))}
                </div>
              )}

              {filteredDesigns.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-dashed border-cream-300 p-10 text-center">
                  <LayoutGrid className="mx-auto mb-3 text-charcoal-300" size={36}/>
                  <p className="text-charcoal-400 text-sm">
                    {designSearch ? `No designs match "${designSearch}".` : activeTag==="All" ? "No saved designs yet." : `No designs tagged "${activeTag}".`}
                  </p>
                  {!designSearch && <Link href="/configure" className="inline-block mt-4 px-5 py-2 bg-charcoal-600 text-white text-sm rounded-lg hover:bg-charcoal-500 transition-colors">Start designing</Link>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(showAllDesigns ? filteredDesigns : filteredDesigns.slice(0, 6)).map((d) => {
                    const tags = d.config?.tags as string[] | undefined;
                    const versionCount = (d.config?.versions as unknown[] | undefined)?.length ?? 0;
                    const mods = (d.config?.builderModules as unknown[] | undefined) ?? [];
                    const dims = d.config?.wallDimensions as { width?: number; height?: number } | undefined;
                    const isSelected = compareIds.includes(d.id);
                    return (
                      <div key={d.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all
                        ${isSelected ? "border-taupe-400 bg-taupe-50" : "border-cream-200"}`}>
                        {/* Compare checkbox */}
                        <button onClick={() => toggleCompare(d.id)} title="Select for comparison"
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 transition-all
                            ${isSelected ? "bg-taupe-500 border-taupe-500" : "border-cream-300 hover:border-taupe-400"}`}>
                          {isSelected && <Check size={12} className="text-white m-auto"/>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-charcoal-600 truncate">{d.name}</p>
                            {(() => {
                              const sw = FINISH_SWATCHES[(d.config?.finish as string) ?? ""];
                              return sw ? <span className="flex-shrink-0 w-3 h-3 rounded-full border border-stone-200 shadow-sm" style={{ background: sw.bg }} title={sw.label}/> : null;
                            })()}
                            {versionCount > 0 && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-400 flex-shrink-0">
                                {versionCount + 1} ver
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-charcoal-400 mt-0.5">{new Date(d.savedAt).toLocaleDateString()}</p>
                          {(mods.length > 0 || dims?.width) && (
                            <p className="text-[10px] text-stone-400 mt-0.5 font-mono">
                              {mods.length > 0 && `${mods.length} module${mods.length !== 1 ? "s" : ""}`}
                              {mods.length > 0 && dims?.width && " · "}
                              {dims?.width && `${dims.width}×${dims.height}″`}
                            </p>
                          )}
                          {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.map((t) => (
                                <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${tagColor(t)}`}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <div className="flex items-center gap-1">
                            <button onClick={() => copyDesignName(d.id, d.name)} title="Copy name"
                              className={`p-1.5 rounded-lg border transition-colors ${copiedId===d.id ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-cream-50 border-cream-200 text-charcoal-400 hover:text-taupe-600 hover:bg-taupe-50 hover:border-taupe-200"}`}>
                              {copiedId===d.id ? <Check size={13}/> : <Copy size={13}/>}
                            </button>
                            <button onClick={() => setHistoryDesign(d)} title="Version history"
                              className="p-1.5 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-taupe-600 hover:bg-taupe-50 hover:border-taupe-200 transition-colors">
                              <History size={13}/>
                            </button>
                            <button onClick={() => setShareDesign(d)} title="Share design"
                              className="p-1.5 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-taupe-600 hover:bg-taupe-50 hover:border-taupe-200 transition-colors">
                              <Share2 size={13}/>
                            </button>
                            <Link href="/configure"
                              className="p-1.5 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100 transition-colors">
                              <ChevronRight size={15}/>
                            </Link>
                          </div>
                          <button onClick={() => loadIntoStudio(d)} title="Load into Studio"
                            className="flex items-center justify-center gap-1 text-[10px] font-medium py-1 px-2 rounded-lg border border-taupe-200 bg-taupe-50 text-taupe-600 hover:bg-taupe-100 transition-colors w-full">
                            <Wand2 size={9}/> Studio
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {filteredDesigns.length > 6 && (
                <button onClick={() => setShowAllDesigns(v => !v)}
                  className="w-full mt-2 py-2 text-xs font-medium text-taupe-600 hover:text-taupe-700 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 rounded-xl transition-colors">
                  {showAllDesigns ? `Show less` : `Show all ${filteredDesigns.length} designs`}
                </button>
              )}
              {compareIds.length > 0 && compareIds.length < 2 && (
                <p className="text-xs text-stone-400 mt-2">Select one more design to compare</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Approvals */}
            <div>
              <h2 className="font-serif text-2xl text-charcoal-600 mb-4">Approvals</h2>
              {approvals.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-cream-200 p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-3 text-charcoal-300" size={28}/>
                  <p className="text-sm text-charcoal-400">No approval requests yet.</p>
                  <p className="text-xs text-charcoal-400 mt-1">Send a design for client approval from the configure page.</p>
                </div>
              ) : allCaughtUp ? (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24}/>
                  <p className="text-sm font-semibold text-emerald-700">All caught up!</p>
                  <p className="text-xs text-emerald-600 mt-1">All {approvals.length} approval{approvals.length!==1?"s":""} resolved.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(showAllApprovals ? approvals : approvals.slice(0, 5)).map((a) => {
                    const days = daysSince(a.created_at);
                    const isPending = a.status === "pending";
                    const reminderTs = remindedAt[a.id] ?? null;
                    return (
                      <div key={a.id} className="bg-white rounded-xl border border-cream-200 p-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-charcoal-600 text-sm truncate flex-1">{a.design_name ?? a.design_id}</span>
                          <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 ${STATUS_COLORS[a.status]??""}`}>{a.status}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.client_email && <p className="text-xs text-charcoal-400 flex-1 truncate">{a.client_email}</p>}
                          {a.token && (
                            <button onClick={() => copyPortalLink(a.token!)} title="Copy portal link"
                              className="p-1 rounded text-stone-400 hover:text-taupe-600 hover:bg-taupe-50 transition-colors flex-shrink-0">
                              <ExternalLink size={11}/>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <p className="text-xs text-charcoal-400">{new Date(a.created_at).toLocaleDateString()}</p>
                          {isPending && days > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              <Clock size={9}/> {days}d waiting
                            </span>
                          )}
                        </div>
                        {isPending && (
                          reminderTs ? (
                            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-600">
                              <Check size={11}/> Reminded {formatReminded(reminderTs)}
                            </div>
                          ) : (
                            <button onClick={() => sendReminder(a.id)}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border bg-stone-50 border-stone-200 text-stone-500 hover:border-taupe-300 hover:text-taupe-600 hover:bg-taupe-50 transition-all">
                              <Bell size={11}/> Send reminder
                            </button>
                          )
                        )}
                        {a.status === "rejected" && (
                          <div className="mt-2 space-y-1.5">
                            {a.client_note && (
                              <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-0.5">Client note</p>
                                <p className="text-xs text-amber-800 italic">"{a.client_note}"</p>
                              </div>
                            )}
                            <button onClick={() => resolveRevision(a.id)}
                              disabled={resolvingId === a.id}
                              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border transition-all
                                bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50">
                              {resolvingId === a.id
                                ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="inline-block"><RotateCcw size={11}/></motion.span> Resolving…</>
                                : <><Check size={11}/> Mark resolved</>}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {approvals.length > 5 && (
              <button onClick={() => setShowAllApprovals(v => !v)}
                className="w-full py-2 text-xs font-medium text-taupe-600 hover:text-taupe-700 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 rounded-xl transition-colors">
                {showAllApprovals ? "Show less" : `Show all ${approvals.length} approvals`}
              </button>
            )}

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-cream-200 p-5">
              <h3 className="font-serif text-lg text-charcoal-600 mb-4">Quick links</h3>
              <div className="space-y-2">
                {[
                  { label:"Design Studio",   href:"/studio",            icon:Sparkles   },
                  { label:"Manage clients",  href:"/clients",           icon:Users      },
                  { label:"Browse gallery",  href:"/gallery",           icon:LayoutGrid },
                  { label:"Free-draw builder",href:"/builder",          icon:LayoutGrid },
                  { label:"Analytics",       href:"/admin/analytics",   icon:BarChart2  },
                ].map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoal-500 hover:text-charcoal-700 hover:bg-cream-50 transition-colors">
                    <Icon size={16} className="text-charcoal-400"/>{label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewProject(false)}/>
            <motion.div initial={{scale:0.97,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.97,opacity:0}}
              className="relative bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-xl text-charcoal-600">{editingProject?"Edit project":"New project"}</h3>
                <button onClick={() => setShowNewProject(false)} className="text-charcoal-400 hover:text-charcoal-600"><X size={18}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Project name *</label>
                  <input value={projectForm.name} onChange={(e)=>setProjectForm(v=>({...v,name:e.target.value}))} placeholder="e.g. Smith Residence Master Closet"
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Client name</label>
                  <input value={projectForm.clientName} onChange={(e)=>setProjectForm(v=>({...v,clientName:e.target.value}))} placeholder="e.g. John & Jane Smith"
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Status</label>
                  <select value={projectForm.status} onChange={(e)=>setProjectForm(v=>({...v,status:e.target.value}))}
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white">
                    <option value="active">Active</option>
                    <option value="on-hold">On hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Notes</label>
                  <textarea value={projectForm.notes} onChange={(e)=>setProjectForm(v=>({...v,notes:e.target.value}))} placeholder="Project notes or brief…" rows={3}
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300 resize-none"/>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNewProject(false)} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-500 hover:bg-cream-50 text-sm">Cancel</button>
                <button onClick={saveProject} disabled={!projectForm.name.trim()||saving}
                  className="flex-1 px-4 py-2.5 bg-charcoal-600 text-white rounded-lg text-sm font-medium hover:bg-charcoal-500 disabled:opacity-50 transition-colors">
                  {saving?"Saving…":editingProject?"Save changes":"Create project"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)}/>
            <motion.div initial={{scale:0.97}} animate={{scale:1}}
              className="relative bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-sm p-6">
              <AlertCircle className="mx-auto mb-3 text-red-500" size={32}/>
              <h3 className="font-serif text-xl text-charcoal-600 text-center mb-2">Delete project?</h3>
              <p className="text-sm text-charcoal-400 text-center mb-5">This will unlink all designs but won't delete them.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-lg text-sm text-charcoal-500">Cancel</button>
                <button onClick={() => deleteProject(deleteId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && compareDesigns.length === 2 && (
          <CompareModal a={compareDesigns[0]} b={compareDesigns[1]} onClose={() => setShowCompare(false)}/>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareDesign && (
          <ShareModal design={shareDesign} approvals={approvals} onClose={() => setShareDesign(null)}/>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyDesign && (
          <VersionHistoryModal
            design={historyDesign}
            onClose={() => { setHistoryDesign(null); setRestoringIdx(null); setDuplicatingIdx(null); }}
            onRestore={(idx) => restoreVersion(historyDesign, idx)}
            restoring={restoringIdx}
            onDuplicate={(idx) => duplicateVersion(historyDesign, idx)}
            duplicating={duplicatingIdx}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
