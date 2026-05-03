import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderOpen, Users, LayoutGrid, Clock, CheckCircle2,
  AlertCircle, Pencil, Trash2, X, ChevronRight, BarChart2,
  Sparkles, Send, ArrowRight,
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

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [clients, setClients] = useState<{ id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({ name: "", clientName: "", status: "active" as string, notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [projRes, appRes, desRes, cliRes] = await Promise.all([
        fetch(`${BASE}/api/projects`, { headers: authHeaders() }),
        fetch(`${BASE}/api/approvals`, { headers: authHeaders() }),
        fetch(`${BASE}/api/designs`, { headers: authHeaders() }),
        fetch(`${BASE}/api/clients`, { headers: authHeaders() }),
      ]);
      if (projRes.ok) setProjects(((await projRes.json()) as { projects: Project[] }).projects ?? []);
      if (appRes.ok) setApprovals(((await appRes.json()) as { approvals: Approval[] }).approvals ?? []);
      if (desRes.ok) setDesigns(((await desRes.json()) as { designs: SavedDesign[] }).designs ?? []);
      if (cliRes.ok) setClients(((await cliRes.json()) as { clients: { id: string }[] }).clients ?? []);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingProject(null);
    setProjectForm({ name: "", clientName: "", status: "active", notes: "" });
    setShowNewProject(true);
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setProjectForm({ name: p.name, clientName: p.client_name ?? "", status: p.status, notes: p.notes ?? "" });
    setShowNewProject(true);
  }

  async function saveProject() {
    setSaving(true);
    try {
      const body = { name: projectForm.name, clientName: projectForm.clientName || null, status: projectForm.status, notes: projectForm.notes || null };
      const res = await fetch(
        editingProject ? `${BASE}/api/projects/${editingProject.id}` : `${BASE}/api/projects`,
        { method: editingProject ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(body) },
      );
      if (res.ok) { setShowNewProject(false); loadAll(); }
    } finally { setSaving(false); }
  }

  async function deleteProject(id: string) {
    await fetch(`${BASE}/api/projects/${id}`, { method: "DELETE", headers: authHeaders() });
    setDeleteId(null);
    loadAll();
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const displayName = user?.firstName ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}` : user?.email?.split("@")[0] ?? "Designer";

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-taupe-400 font-medium mb-1">Dashboard</p>
            <h1 className="font-serif text-4xl text-charcoal-600">Good to see you, {displayName}</h1>
            <p className="text-charcoal-400 mt-1 text-sm">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/configure"
              className="inline-flex items-center gap-2 bg-charcoal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoal-500 transition-colors"
            >
              <Plus size={16} />
              New Design
            </Link>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="px-4 py-2.5 text-sm text-charcoal-400 hover:text-charcoal-600 border border-cream-300 rounded-lg hover:bg-cream-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-cream-200 p-6 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Projects", value: projects.length, icon: FolderOpen, color: "text-amber-600 bg-amber-50" },
              { label: "Designs", value: designs.length, icon: LayoutGrid, color: "text-blue-600 bg-blue-50" },
              { label: "Clients", value: clients.length, icon: Users, color: "text-emerald-600 bg-emerald-50" },
              { label: "Pending approvals", value: pendingApprovals.length, icon: Clock, color: "text-purple-600 bg-purple-50" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-cream-200 p-5"
              >
                <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}>
                  <stat.icon size={18} />
                </div>
                <p className="text-3xl font-serif text-charcoal-600">{stat.value}</p>
                <p className="text-xs text-charcoal-400 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl text-charcoal-600">Projects</h2>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1.5 text-sm text-taupe-600 hover:text-taupe-700 font-medium"
                >
                  <Plus size={15} /> New project
                </button>
              </div>

              {projects.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-dashed border-cream-300 p-10 text-center">
                  <FolderOpen className="mx-auto mb-3 text-charcoal-300" size={36} />
                  <p className="text-charcoal-400 text-sm">No projects yet. Create one to group your designs.</p>
                  <button
                    onClick={openCreate}
                    className="mt-4 px-5 py-2 bg-charcoal-600 text-white text-sm rounded-lg hover:bg-charcoal-500 transition-colors"
                  >
                    Create project
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-charcoal-600 truncate">{p.name}</span>
                          <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${STATUS_COLORS[p.status] ?? ""}`}>
                            {p.status}
                          </span>
                        </div>
                        {p.client_name && <p className="text-xs text-charcoal-400 mt-0.5">Client: {p.client_name}</p>}
                        <p className="text-xs text-charcoal-400 mt-0.5">{p.design_count} design{p.design_count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded text-charcoal-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl text-charcoal-600">Recent Designs</h2>
                <Link href="/configure" className="text-sm text-taupe-600 hover:text-taupe-700 font-medium flex items-center gap-1">
                  New design <ArrowRight size={14} />
                </Link>
              </div>
              {designs.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-dashed border-cream-300 p-10 text-center">
                  <LayoutGrid className="mx-auto mb-3 text-charcoal-300" size={36} />
                  <p className="text-charcoal-400 text-sm">No saved designs yet.</p>
                  <Link
                    href="/configure"
                    className="inline-block mt-4 px-5 py-2 bg-charcoal-600 text-white text-sm rounded-lg hover:bg-charcoal-500 transition-colors"
                  >
                    Start designing
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {designs.slice(0, 6).map((d) => (
                    <div key={d.id} className="bg-white rounded-xl border border-cream-200 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-600 truncate">{d.name}</p>
                        <p className="text-xs text-charcoal-400 mt-0.5">
                          {new Date(d.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href="/configure"
                        className="shrink-0 p-2 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100 transition-colors"
                      >
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-charcoal-600 mb-4">Approvals</h2>
              {approvals.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-cream-200 p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-3 text-charcoal-300" size={28} />
                  <p className="text-sm text-charcoal-400">No approval requests yet.</p>
                  <p className="text-xs text-charcoal-400 mt-1">Send a design for client approval from the configure page.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {approvals.slice(0, 8).map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-cream-200 p-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-charcoal-600 text-sm truncate flex-1">{a.design_name ?? a.design_id}</span>
                        <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 ${STATUS_COLORS[a.status] ?? ""}`}>
                          {a.status}
                        </span>
                      </div>
                      {a.client_email && <p className="text-xs text-charcoal-400 mt-1">{a.client_email}</p>}
                      {a.client_note && <p className="text-xs text-charcoal-500 mt-1 italic">"{a.client_note}"</p>}
                      <p className="text-xs text-charcoal-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-cream-200 p-5">
              <h3 className="font-serif text-lg text-charcoal-600 mb-4">Quick links</h3>
              <div className="space-y-2">
                {[
                  { label: "Manage clients", href: "/clients", icon: Users },
                  { label: "Browse gallery", href: "/gallery", icon: Sparkles },
                  { label: "Free-draw builder", href: "/builder", icon: LayoutGrid },
                  { label: "Analytics", href: "/admin/analytics", icon: BarChart2 },
                ].map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoal-500 hover:text-charcoal-700 hover:bg-cream-50 transition-colors"
                  >
                    <Icon size={16} className="text-charcoal-400" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewProject(false)} />
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="relative bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-xl text-charcoal-600">
                  {editingProject ? "Edit project" : "New project"}
                </h3>
                <button onClick={() => setShowNewProject(false)} className="text-charcoal-400 hover:text-charcoal-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Project name *</label>
                  <input
                    value={projectForm.name}
                    onChange={(e) => setProjectForm((v) => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. Smith Residence Master Closet"
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Client name</label>
                  <input
                    value={projectForm.clientName}
                    onChange={(e) => setProjectForm((v) => ({ ...v, clientName: e.target.value }))}
                    placeholder="e.g. John & Jane Smith"
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm((v) => ({ ...v, status: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="on-hold">On hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Notes</label>
                  <textarea
                    value={projectForm.notes}
                    onChange={(e) => setProjectForm((v) => ({ ...v, notes: e.target.value }))}
                    placeholder="Project notes or brief…"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 px-4 py-2.5 border border-cream-300 rounded-lg text-charcoal-500 hover:bg-cream-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProject}
                  disabled={!projectForm.name.trim() || saving}
                  className="flex-1 px-4 py-2.5 bg-charcoal-600 text-white rounded-lg text-sm font-medium hover:bg-charcoal-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : editingProject ? "Save changes" : "Create project"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
            <motion.div
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              className="relative bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-sm p-6"
            >
              <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
              <h3 className="font-serif text-xl text-charcoal-600 text-center mb-2">Delete project?</h3>
              <p className="text-sm text-charcoal-400 text-center mb-5">This will unlink all designs but won't delete them.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-lg text-sm text-charcoal-500">
                  Cancel
                </button>
                <button
                  onClick={() => deleteProject(deleteId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
