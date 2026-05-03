import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderOpen, Users, LayoutGrid, Clock, CheckCircle2,
  AlertCircle, Pencil, Trash2, X, ChevronRight, BarChart2,
  Sparkles, Send, ArrowRight, Tag, GitCompare, Share2, Bell, Copy, Check,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getStoredToken } from "@/lib/AuthContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Project {
  id: string; name: string; client_name: string | null; status: string;
  notes: string | null; design_count: number; created_at: string; updated_at: string;
}
interface Approval {
  id: string; design_id: string; design_name: string | null; client_email: string | null;
  status: string; created_at: string; responded_at: string | null; client_note: string | null;
}
interface SavedDesign {
  id: string; name: string; savedAt: string; config?: Record<string, unknown>;
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

  // Tags filter
  const [activeTag, setActiveTag] = useState<string>("All");

  // Comparison
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Share modal
  const [shareDesign, setShareDesign] = useState<SavedDesign|null>(null);

  // Reminder feedback
  const [sentReminder, setSentReminder] = useState<string|null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAll();
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
    setSentReminder(approvalId);
    setTimeout(() => setSentReminder(null), 3000);
  };

  // Tags from all designs
  const allTags = useMemo(() => {
    const set = new Set<string>();
    designs.forEach((d) => { const tags = d.config?.tags as string[] | undefined; tags?.forEach((t) => set.add(t)); });
    return ["All", ...Array.from(set).sort()];
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    if (activeTag === "All") return designs;
    return designs.filter((d) => {
      const tags = d.config?.tags as string[] | undefined;
      return tags?.includes(activeTag);
    });
  }, [designs, activeTag]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);
  };

  const compareDesigns = compareIds.length === 2
    ? compareIds.map((id) => designs.find((d) => d.id === id)!).filter(Boolean)
    : [];

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const displayName = user?.firstName ? `${user.firstName}${user.lastName?" "+user.lastName:""}` : user?.email?.split("@")[0] ?? "Designer";

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
              <div className="flex items-center justify-between mb-4">
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

              {/* Tag filter */}
              {allTags.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {allTags.map((t) => (
                    <button key={t} onClick={() => setActiveTag(t)}
                      className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all
                        ${activeTag===t ? "bg-charcoal-600 text-white border-charcoal-600" : "bg-white text-charcoal-500 border-cream-300 hover:border-charcoal-400"}`}>
                      {t !== "All" && <Tag size={8}/>}{t}
                    </button>
                  ))}
                </div>
              )}

              {filteredDesigns.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-dashed border-cream-300 p-10 text-center">
                  <LayoutGrid className="mx-auto mb-3 text-charcoal-300" size={36}/>
                  <p className="text-charcoal-400 text-sm">{activeTag==="All" ? "No saved designs yet." : `No designs tagged "${activeTag}".`}</p>
                  <Link href="/configure" className="inline-block mt-4 px-5 py-2 bg-charcoal-600 text-white text-sm rounded-lg hover:bg-charcoal-500 transition-colors">Start designing</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDesigns.slice(0, 6).map((d) => {
                    const tags = d.config?.tags as string[] | undefined;
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
                          <p className="font-medium text-charcoal-600 truncate">{d.name}</p>
                          <p className="text-xs text-charcoal-400 mt-0.5">{new Date(d.savedAt).toLocaleDateString()}</p>
                          {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.map((t) => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-taupe-50 border border-taupe-100 text-taupe-600">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setShareDesign(d)} title="Share design"
                            className="p-1.5 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-taupe-600 hover:bg-taupe-50 hover:border-taupe-200 transition-colors">
                            <Share2 size={13}/>
                          </button>
                          <Link href="/configure"
                            className="p-1.5 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100 transition-colors">
                            <ChevronRight size={15}/>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              ) : (
                <div className="space-y-2.5">
                  {approvals.slice(0, 8).map((a) => {
                    const days = daysSince(a.created_at);
                    const isPending = a.status === "pending";
                    const reminderSent = sentReminder === a.id;
                    return (
                      <div key={a.id} className="bg-white rounded-xl border border-cream-200 p-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-charcoal-600 text-sm truncate flex-1">{a.design_name ?? a.design_id}</span>
                          <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 ${STATUS_COLORS[a.status]??""}`}>{a.status}</span>
                        </div>
                        {a.client_email && <p className="text-xs text-charcoal-400 mt-1">{a.client_email}</p>}
                        {a.client_note && <p className="text-xs text-charcoal-500 mt-1 italic">"{a.client_note}"</p>}
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <p className="text-xs text-charcoal-400">{new Date(a.created_at).toLocaleDateString()}</p>
                          {isPending && days > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              <Clock size={9}/> {days}d waiting
                            </span>
                          )}
                        </div>
                        {isPending && (
                          <button onClick={() => sendReminder(a.id)}
                            className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border transition-all
                              ${reminderSent ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-stone-50 border-stone-200 text-stone-500 hover:border-taupe-300 hover:text-taupe-600 hover:bg-taupe-50"}`}>
                            {reminderSent ? <><Check size={11}/> Reminder noted</> : <><Bell size={11}/> Send reminder</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
    </div>
  );
}
