import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ExternalLink, Pencil, Trash2, User, Phone, Mail, MapPin, Briefcase, StickyNote, DollarSign } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  project_type?: string | null;
  status: "active" | "completed" | "on-hold";
  notes?: string | null;
  budget?: string | null;
  created_at: string;
  updated_at: string;
}

type ClientStatus = "active" | "completed" | "on-hold";

const STATUS_COLORS: Record<ClientStatus, string> = {
  "active":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "completed": "bg-blue-50 text-blue-700 border-blue-200",
  "on-hold":   "bg-amber-50 text-amber-700 border-amber-200",
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function makeHeaders(email: string): HeadersInit {
  return { "Content-Type": "application/json", "x-user-email": email };
}

const BLANK: Omit<Client, "id" | "created_at" | "updated_at"> = {
  name: "", email: "", phone: "", address: "", project_type: "",
  status: "active", notes: "", budget: "",
};

export default function ClientsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("alveo-user-email") ?? "";
    setUserEmail(saved);
    if (saved) fetchClients(saved);
  }, []);

  async function fetchClients(email: string) {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/clients`, { headers: makeHeaders(email) });
      if (res.ok) {
        const data = await res.json() as { clients: Client[] };
        setClients(data.clients ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingClient(null);
    setForm(BLANK);
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditingClient(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "",
               project_type: c.project_type ?? "", status: c.status, notes: c.notes ?? "", budget: c.budget ?? "" });
    setShowModal(true);
  }

  async function saveClient() {
    if (!form.name.trim() || !userEmail) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/clients`, {
        method: "POST",
        headers: makeHeaders(userEmail),
        body: JSON.stringify({
          client: {
            ...(editingClient ? { id: editingClient.id } : {}),
            name: form.name, email: form.email || null, phone: form.phone || null,
            address: form.address || null, projectType: form.project_type || null,
            status: form.status, notes: form.notes || null, budget: form.budget || null,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json() as { clients: Client[] };
        setClients(data.clients ?? []);
        setShowModal(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(id: string) {
    if (!userEmail) return;
    const res = await fetch(`${BASE}/api/clients`, {
      method: "DELETE",
      headers: makeHeaders(userEmail),
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const data = await res.json() as { clients: Client[] };
      setClients(data.clients ?? []);
    }
    setDeleteId(null);
  }

  const filtered = clients.filter((c) => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.project_type ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-cream-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-charcoal-600">Clients</h1>
            <p className="text-stone-400 text-sm mt-1">Manage your client projects and design history</p>
          </div>
          {userEmail ? (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={openCreate}
              className="flex items-center gap-2 bg-charcoal-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal-500 transition-colors"
            >
              <Plus size={16} /> New Client
            </motion.button>
          ) : null}
        </div>

        {/* Email gate */}
        {!userEmail && (
          <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center">
            <User size={40} className="mx-auto text-stone-300 mb-4" />
            <p className="font-medium text-charcoal-600 mb-2">Sign in to manage clients</p>
            <p className="text-stone-400 text-sm mb-6">Enter your designer email to access your client list.</p>
            <div className="flex gap-3 max-w-sm mx-auto">
              <input
                type="email" placeholder="your@studio.com"
                className="flex-1 border border-cream-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-taupe-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) { localStorage.setItem("alveo-user-email", v); setUserEmail(v); fetchClients(v); }
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                  const v = input.value.trim();
                  if (v) { localStorage.setItem("alveo-user-email", v); setUserEmail(v); fetchClients(v); }
                }}
                className="bg-charcoal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-charcoal-500 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {userEmail && (
          <>
            {/* Stats bar */}
            {!loading && clients.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                {([
                  { label: "Total", value: clients.length,                                         color: "text-charcoal-600" },
                  { label: "Active",    value: clients.filter(c => c.status === "active").length,    color: "text-emerald-600" },
                  { label: "Completed", value: clients.filter(c => c.status === "completed").length, color: "text-taupe-500"   },
                  { label: "On-Hold",   value: clients.filter(c => c.status === "on-hold").length,   color: "text-amber-600"  },
                ] as const).map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-cream-200 px-4 py-3 text-center">
                    <p className={`text-2xl font-serif font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <input
                type="text" placeholder="Search clients…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-cream-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white w-52"
              />
              {(["all", "active", "completed", "on-hold"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                    filterStatus === s ? "bg-charcoal-600 text-white border-charcoal-600" : "bg-white text-charcoal-400 border-cream-200 hover:border-taupe-300"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
              {userEmail && <span className="text-xs text-stone-400 ml-auto">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</span>}
            </div>

            {/* Loading */}
            {loading && (
              <div className="text-center py-16 text-stone-400 text-sm">Loading clients…</div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-cream-200 p-12 text-center">
                <Briefcase size={40} className="mx-auto text-stone-300 mb-4" />
                <p className="font-medium text-charcoal-600 mb-1">{clients.length === 0 ? "No clients yet" : "No matches"}</p>
                <p className="text-stone-400 text-sm mb-6">
                  {clients.length === 0 ? "Create your first client to start tracking projects." : "Try adjusting your search or filter."}
                </p>
                {clients.length === 0 && (
                  <button onClick={openCreate} className="bg-charcoal-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-charcoal-500 transition-colors">
                    Create first client
                  </button>
                )}
              </div>
            )}

            {/* Client cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filtered.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="bg-white rounded-2xl border border-cream-200 p-5 hover:border-taupe-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-charcoal-600 text-base truncate">{c.name}</h3>
                        {c.project_type && <p className="text-xs text-stone-400 mt-0.5 capitalize">{c.project_type}</p>}
                      </div>
                      <span className={`ml-3 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {c.email && <div className="flex items-center gap-2 text-xs text-stone-500"><Mail size={11} className="text-stone-300" />{c.email}</div>}
                      {c.phone && <div className="flex items-center gap-2 text-xs text-stone-500"><Phone size={11} className="text-stone-300" />{c.phone}</div>}
                      {c.address && <div className="flex items-center gap-2 text-xs text-stone-500 truncate"><MapPin size={11} className="text-stone-300 flex-shrink-0" />{c.address}</div>}
                      {c.budget && <div className="flex items-center gap-2 text-xs text-stone-500"><DollarSign size={11} className="text-stone-300" />Budget: {c.budget}</div>}
                      {c.notes && <div className="flex items-start gap-2 text-xs text-stone-500 line-clamp-2"><StickyNote size={11} className="text-stone-300 mt-0.5 flex-shrink-0" />{c.notes}</div>}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-cream-100">
                      <Link
                        href={c.email ? `/configure?client=${encodeURIComponent(c.email)}` : "/configure"}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 py-2 rounded-lg transition-colors"
                      >
                        <ExternalLink size={11} /> Open in Configurator
                      </Link>
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-stone-400 hover:text-charcoal-600 hover:bg-cream-100 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-300 mt-2">Added {new Date(c.created_at).toLocaleDateString()}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-cream-200">
                <h2 className="font-serif text-xl text-charcoal-600">{editingClient ? "Edit Client" : "New Client"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-stone-400 hover:bg-cream-100 transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                {([
                  { key: "name",         label: "Full name *",       type: "text",  icon: User },
                  { key: "email",        label: "Email",             type: "email", icon: Mail },
                  { key: "phone",        label: "Phone",             type: "tel",   icon: Phone },
                  { key: "address",      label: "Address",           type: "text",  icon: MapPin },
                  { key: "project_type", label: "Project type",      type: "text",  icon: Briefcase, placeholder: "e.g. Walk-in, Reach-in…" },
                  { key: "budget",       label: "Budget",            type: "text",  icon: DollarSign, placeholder: "e.g. $15,000–$25,000" },
                ] as { key: keyof typeof form; label: string; type: string; icon: React.ComponentType<{ size?: number; className?: string }>; placeholder?: string }[]).map(({ key, label, type, icon: Icon, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-charcoal-500 mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
                      <input
                        type={type}
                        value={(form as Record<string, string>)[key] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-cream-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-taupe-300"
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {(["active", "completed", "on-hold"] as const).map((s) => (
                      <button key={s} onClick={() => setForm((f) => ({ ...f, status: s }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                          form.status === s ? "bg-charcoal-600 text-white border-charcoal-600" : "bg-white text-charcoal-400 border-cream-200 hover:border-taupe-300"
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Notes</label>
                  <div className="relative">
                    <StickyNote size={14} className="absolute left-3 top-3 text-stone-300" />
                    <textarea
                      value={form.notes ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      placeholder="Project notes, preferences, special requests…"
                      className="w-full border border-cream-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-taupe-300 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-6 pt-0">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-cream-200 text-sm text-charcoal-400 hover:bg-cream-50 transition-colors">Cancel</button>
                <button
                  onClick={saveClient} disabled={saving || !form.name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-charcoal-600 text-white text-sm font-medium hover:bg-charcoal-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : editingClient ? "Save changes" : "Create client"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 size={32} className="mx-auto text-red-400 mb-3" />
              <p className="font-medium text-charcoal-600 mb-1">Delete this client?</p>
              <p className="text-sm text-stone-400 mb-6">This action cannot be undone. Their designs will remain saved.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-cream-200 text-sm text-charcoal-400 hover:bg-cream-50 transition-colors">Cancel</button>
                <button onClick={() => deleteClient(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
