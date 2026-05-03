import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Maximize2 } from "lucide-react";

type StyleTag =
  | "All"
  | "Minimal"
  | "Glam"
  | "Small Space"
  | "Luxury"
  | "Modern"
  | "Rustic";

type SizeTag =
  | "Any Size"
  | "Compact (≤ 60 sq ft)"
  | "Standard (60–120 sq ft)"
  | "Large (120+ sq ft)";

type ItemSize = "compact" | "standard" | "large";

interface GalleryItem {
  id: number;
  title: string;
  style: StyleTag;
  sqft: string;
  description: string;
  accent: string;
  bg: string;
  svgPattern: "minimal" | "glam" | "compact" | "luxury" | "modern" | "rustic";
  size: ItemSize;
}

interface CommentHistoryItem {
  id: string;
  designId: string;
  text: string;
  author: string;
  createdAt: string;
  parentId?: string;
  mentions?: string[];
}

interface CommentHistoryResponse {
  comments?: CommentHistoryItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasNextPage?: boolean;
}

type CommentSort = "newest" | "oldest" | "most-mentioned";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const SIZE_MAP: Record<Exclude<SizeTag, "Any Size">, ItemSize> = {
  "Compact (≤ 60 sq ft)": "compact",
  "Standard (60–120 sq ft)": "standard",
  "Large (120+ sq ft)": "large",
};

const items: GalleryItem[] = [
  { id: 1, title: "The Clean Slate", style: "Minimal", sqft: "8 × 6 ft", description: "White oak finish, double-hang zones, concealed drawer pulls. Everything in its place.", accent: "text-charcoal-500", bg: "bg-cream-50", svgPattern: "minimal", size: "compact" },
  { id: 7, title: "The Edit", style: "Minimal", sqft: "10 × 7 ft", description: "White lacquer, integrated push-to-open drawers, zero visible hardware.", accent: "text-charcoal-500", bg: "bg-cream-50", svgPattern: "minimal", size: "compact" },
  { id: 8, title: "Studio White", style: "Minimal", sqft: "14 × 10 ft", description: "Floor-to-ceiling white panels, hidden LED strip, linen-back open shelves.", accent: "text-charcoal-500", bg: "bg-cream-50", svgPattern: "modern", size: "standard" },
  { id: 9, title: "The Pared Back", style: "Minimal", sqft: "6 × 5 ft", description: "A single long-hang zone and one deep shelf column — nothing more.", accent: "text-charcoal-500", bg: "bg-cream-50", svgPattern: "compact", size: "compact" },
  { id: 2, title: "The Glam Suite", style: "Glam", sqft: "12 × 10 ft", description: "Island with velvet-lined jewelry drawers, full-length mirrors, dedicated shoe display wall.", accent: "text-taupe-500", bg: "bg-taupe-50", svgPattern: "glam", size: "standard" },
  { id: 10, title: "Velvet Dreams", style: "Glam", sqft: "14 × 11 ft", description: "Blush velvet drawer liners, gold rod brackets, perfume shelf under spot lighting.", accent: "text-taupe-500", bg: "bg-taupe-50", svgPattern: "glam", size: "standard" },
  { id: 11, title: "The Showroom", style: "Glam", sqft: "18 × 14 ft", description: "Backlit shoe wall, full-height mirrors, island with marble inlay top.", accent: "text-taupe-500", bg: "bg-taupe-50", svgPattern: "luxury", size: "large" },
  { id: 12, title: "Champagne Closet", style: "Glam", sqft: "11 × 9 ft", description: "Champagne lacquer, antique brass pulls, glass-front upper cabinets.", accent: "text-taupe-500", bg: "bg-taupe-50", svgPattern: "glam", size: "standard" },
  { id: 3, title: "Urban Edit", style: "Small Space", sqft: "5 × 4 ft", description: "Floor-to-ceiling with double-hang, pull-out shoe shelves, and hidden storage in every gap.", accent: "text-charcoal-400", bg: "bg-cream-100", svgPattern: "compact", size: "compact" },
  { id: 13, title: "Micro Suite", style: "Small Space", sqft: "4 × 4 ft", description: "Tension-rod double-hang, over-door hooks, magnetic jewelry strips.", accent: "text-charcoal-400", bg: "bg-cream-100", svgPattern: "compact", size: "compact" },
  { id: 14, title: "The Transformer", style: "Small Space", sqft: "5 × 5 ft", description: "Fold-down ironing board, pull-out valet rod, stackable shoe drawer.", accent: "text-charcoal-400", bg: "bg-cream-100", svgPattern: "compact", size: "compact" },
  { id: 15, title: "City Reach-In", style: "Small Space", sqft: "7 × 3 ft", description: "Every inch planned — 3 zones across one wall, zero wasted vertical space.", accent: "text-charcoal-400", bg: "bg-cream-100", svgPattern: "minimal", size: "compact" },
  { id: 4, title: "The Grand Reserve", style: "Luxury", sqft: "16 × 12 ft", description: "Dark walnut, brass hardware, a full vanity alcove, and a centre island with Carrara marble top.", accent: "text-amber-700", bg: "bg-amber-50", svgPattern: "luxury", size: "large" },
  { id: 16, title: "The Penthouse", style: "Luxury", sqft: "20 × 16 ft", description: "Herringbone marble floor, chandelier, full vanity wing, motorised trouser racks.", accent: "text-amber-700", bg: "bg-amber-50", svgPattern: "luxury", size: "large" },
  { id: 17, title: "Beau Monde", style: "Luxury", sqft: "16 × 13 ft", description: "Smoked glass doors, backlit toe kicks, integrated safe behind mirror.", accent: "text-amber-700", bg: "bg-amber-50", svgPattern: "glam", size: "large" },
  { id: 18, title: "Heritage Suite", style: "Luxury", sqft: "15 × 12 ft", description: "Hand-carved cornicing, cedar-lined drawers, gun-metal rail system.", accent: "text-amber-700", bg: "bg-amber-50", svgPattern: "luxury", size: "large" },
  { id: 5, title: "Studio Line", style: "Modern", sqft: "10 × 8 ft", description: "Light grey lacquer, integrated LED strip lighting, open-back shelving and flat-front drawers.", accent: "text-slate-500", bg: "bg-slate-50", svgPattern: "modern", size: "standard" },
  { id: 19, title: "Grid System", style: "Modern", sqft: "12 × 9 ft", description: "Modular grid panels, interchangeable hooks and shelves, matte black finish.", accent: "text-slate-500", bg: "bg-slate-50", svgPattern: "modern", size: "standard" },
  { id: 20, title: "The Linear", style: "Modern", sqft: "9 × 7 ft", description: "Handle-free slab doors, integrated USB charging drawer, wire-glass panels.", accent: "text-slate-500", bg: "bg-slate-50", svgPattern: "modern", size: "standard" },
  { id: 21, title: "Capsule", style: "Modern", sqft: "8 × 6 ft", description: "Concrete-effect finish, open hanging, minimal drawer tower — wardrobe as art.", accent: "text-slate-500", bg: "bg-slate-50", svgPattern: "minimal", size: "compact" },
  { id: 6, title: "The Farmhouse", style: "Rustic", sqft: "9 × 7 ft", description: "Reclaimed pine, wrought-iron rod brackets, open shelving with woven basket drawers.", accent: "text-orange-800", bg: "bg-orange-50", svgPattern: "rustic", size: "standard" },
  { id: 22, title: "Barn Door Closet", style: "Rustic", sqft: "10 × 8 ft", description: "Sliding barn door, exposed beam rail, mason-jar accessory hooks.", accent: "text-orange-800", bg: "bg-orange-50", svgPattern: "rustic", size: "standard" },
  { id: 23, title: "The Cottage", style: "Rustic", sqft: "7 × 6 ft", description: "Painted shiplap back, hand-forged iron brackets, wicker drawer inserts.", accent: "text-orange-800", bg: "bg-orange-50", svgPattern: "rustic", size: "compact" },
  { id: 24, title: "Wildwood", style: "Rustic", sqft: "12 × 10 ft", description: "Live-edge shelves, leather hanging straps, beeswax-finished oak throughout.", accent: "text-orange-800", bg: "bg-orange-50", svgPattern: "rustic", size: "standard" },
];

function ClosetSketch({ pattern }: { pattern: GalleryItem["svgPattern"] }) {
  const configs: Record<GalleryItem["svgPattern"], { zones: { x: number; w: number; type: "double" | "single" | "shelves" | "drawers" }[] }> = {
    minimal: { zones: [{ x: 0, w: 80, type: "double" }, { x: 84, w: 116, type: "shelves" }] },
    glam: { zones: [{ x: 0, w: 60, type: "single" }, { x: 64, w: 72, type: "shelves" }, { x: 140, w: 60, type: "drawers" }] },
    compact: { zones: [{ x: 0, w: 100, type: "double" }, { x: 104, w: 76, type: "drawers" }] },
    luxury: { zones: [{ x: 0, w: 60, type: "single" }, { x: 64, w: 56, type: "shelves" }, { x: 124, w: 56, type: "drawers" }, { x: 184, w: 16, type: "shelves" }] },
    modern: { zones: [{ x: 0, w: 70, type: "double" }, { x: 74, w: 70, type: "double" }, { x: 148, w: 52, type: "shelves" }] },
    rustic: { zones: [{ x: 0, w: 90, type: "single" }, { x: 94, w: 106, type: "shelves" }] },
  };

  const { zones } = configs[pattern];
  const W = 200, H = 130;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={W} height={H} fill="#f5f0eb" rx="2" />
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke="#c8bfb0" strokeWidth="0.8" />
      {zones.map((z, i) => {
        const px = z.x + 2, py = 8, pw = z.w - 4, ph = H - 20;
        return (
          <g key={i}>
            <rect x={px} y={py} width={pw} height={ph} fill="#ede8e1" rx="1" />
            {z.type === "double" && (<>
              <line x1={px + 4} y1={py + 22} x2={px + pw - 4} y2={py + 22} stroke="#b0a495" strokeWidth="1.5" />
              {Array.from({ length: Math.floor(pw / 10) }).map((_, j) => (<rect key={j} x={px + 4 + j * 10} y={py + 23} width="7" height="16" fill="#d4cbc0" rx="0.5" opacity="0.7" />))}
              <line x1={px + 4} y1={py + 55} x2={px + pw - 4} y2={py + 55} stroke="#b0a495" strokeWidth="1.5" />
              {Array.from({ length: Math.floor(pw / 10) }).map((_, j) => (<rect key={j} x={px + 4 + j * 10} y={py + 56} width="7" height="12" fill="#d4cbc0" rx="0.5" opacity="0.7" />))}
            </>)}
            {z.type === "single" && (<>
              <line x1={px + 4} y1={py + 18} x2={px + pw - 4} y2={py + 18} stroke="#b0a495" strokeWidth="1.5" />
              {Array.from({ length: Math.floor(pw / 10) }).map((_, j) => (<rect key={j} x={px + 4 + j * 10} y={py + 19} width="7" height="28" fill="#d4cbc0" rx="0.5" opacity="0.7" />))}
              <rect x={px + 2} y={py + ph - 22} width={pw - 4} height="2" fill="#b0a495" />
              {Array.from({ length: Math.floor((pw - 4) / 12) }).map((_, j) => (<ellipse key={j} cx={px + 8 + j * 12} cy={py + ph - 13} rx="4" ry="6" fill="#c8bfb0" opacity="0.8" />))}
            </>)}
            {z.type === "shelves" && (<>
              {[0.2, 0.38, 0.56, 0.74].map((frac, j) => (
                <g key={j}>
                  <rect x={px + 2} y={py + ph * frac} width={pw - 4} height="2" fill="#b0a495" />
                  {Array.from({ length: Math.floor((pw - 8) / 14) }).map((_, k) => (<rect key={k} x={px + 4 + k * 14} y={py + ph * frac - 10} width="10" height="10" fill="#d4cbc0" rx="1" opacity="0.7" />))}
                </g>
              ))}
            </>)}
            {z.type === "drawers" && (<>
              {[0.15, 0.32, 0.49, 0.66, 0.83].map((frac, j) => (
                <g key={j}>
                  <rect x={px + 2} y={py + ph * frac - 1} width={pw - 4} height={ph * 0.14} fill="#d4cbc0" rx="1" stroke="#b0a495" strokeWidth="0.5" />
                  <line x1={px + pw / 2 - 5} y1={py + ph * frac + ph * 0.06} x2={px + pw / 2 + 5} y2={py + ph * frac + ph * 0.06} stroke="#8f8070" strokeWidth="1" />
                </g>
              ))}
            </>)}
            {i < zones.length - 1 && (<line x1={px + pw + 2} y1={py} x2={px + pw + 2} y2={py + ph} stroke="#c8bfb0" strokeWidth="0.8" strokeDasharray="3,2" />)}
          </g>
        );
      })}
      <rect x="0" y="0" width={W} height="6" fill="#c8bfb0" rx="1" />
    </svg>
  );
}

const tags: StyleTag[] = ["All", "Minimal", "Glam", "Small Space", "Luxury", "Modern", "Rustic"];
const sizes: SizeTag[] = ["Any Size", "Compact (≤ 60 sq ft)", "Standard (60–120 sq ft)", "Large (120+ sq ft)"];

export default function GalleryPage() {
  const HISTORY_PAGE_SIZE = 20;
  const [activeTag, setActiveTag] = useState<StyleTag>("All");
  const [activeSize, setActiveSize] = useState<SizeTag>("Any Size");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [commentHistory, setCommentHistory] = useState<CommentHistoryItem[]>([]);
  const [historyDesignFilter, setHistoryDesignFilter] = useState("");
  const [historyAuthorFilter, setHistoryAuthorFilter] = useState("");
  const [mentionsOnly, setMentionsOnly] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [historySort, setHistorySort] = useState<CommentSort>("newest");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasNextPage, setHistoryHasNextPage] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  useEffect(() => {
    document.title = "Inspiration Gallery | Alvéo";
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("alveo-events-admin-token") ?? "";
    if (!token) {
      setCommentHistory([]);
      setHistoryHasNextPage(false);
      setHistoryTotal(0);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      all: "1",
      page: String(historyPage),
      pageSize: String(HISTORY_PAGE_SIZE),
    });
    if (historyDesignFilter.trim()) params.set("designId", historyDesignFilter.trim());
    if (historyAuthorFilter.trim()) params.set("author", historyAuthorFilter.trim());
    if (mentionsOnly) params.set("mentionsOnly", "1");
    if (historyFromDate) params.set("from", historyFromDate);
    if (historyToDate) params.set("to", historyToDate);
    params.set("sort", historySort);

    fetch(`${BASE}/api/design-comments?${params.toString()}`, {
      headers: { "x-admin-token": token },
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data: CommentHistoryResponse) => {
        setCommentHistory(data.comments ?? []);
        setHistoryHasNextPage(!!data.hasNextPage);
        setHistoryTotal(data.total ?? 0);
      })
      .catch(() => {
        setCommentHistory([]);
        setHistoryHasNextPage(false);
      });
    return () => controller.abort();
  }, [historyPage, historyDesignFilter, historyAuthorFilter, mentionsOnly, historyFromDate, historyToDate, historySort]);

  const filtered = items.filter((i) => {
    const styleMatch = activeTag === "All" || i.style === activeTag;
    const sizeMatch = activeSize === "Any Size" || i.size === SIZE_MAP[activeSize as Exclude<SizeTag, "Any Size">];
    return styleMatch && sizeMatch;
  });

  const pillBase = "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors";
  const pillActive = "bg-charcoal-600 text-white";
  const pillIdle = "text-charcoal-400 hover:bg-cream-100 hover:text-charcoal-600";
  const sizePillActive = "bg-taupe-500 text-white";
  const sizePillIdle = "text-charcoal-400 hover:bg-taupe-50 hover:text-taupe-600";

  return (
    <main className="min-h-screen bg-white pt-16">
      <section className="py-16 bg-cream-50 border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm uppercase tracking-widest text-taupe-400 font-medium mb-4"
          >
            Inspiration Gallery
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl md:text-6xl text-charcoal-600 mb-5"
          >
            Find your style
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-charcoal-400 max-w-xl mx-auto"
          >
            Browse layouts designed by the Alvéo engine. Pick one to start from — or build entirely from scratch.
          </motion.p>
        </div>
      </section>

      <section className="py-6 border-b border-cream-100 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => { setActiveTag(tag); setHistoryPage(1); }}
                className={`${pillBase} ${activeTag === tag ? pillActive : pillIdle}`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sizes.map((sz) => (
              <button
                key={sz}
                onClick={() => { setActiveSize(sz); setHistoryPage(1); }}
                className={`${pillBase} text-xs ${activeSize === sz ? sizePillActive : sizePillIdle}`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTag}-${activeSize}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.35 }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative rounded-2xl overflow-hidden border border-cream-200 hover:border-taupe-300 transition-all hover:shadow-lg ${item.bg}`}
                >
                  <div className="aspect-[4/3] p-4">
                    <ClosetSketch pattern={item.svgPattern} />
                  </div>

                  <AnimatePresence>
                    {hoveredId === item.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-charcoal-600/85 flex flex-col items-center justify-center gap-4 p-6"
                      >
                        <p className="text-white text-sm text-center leading-relaxed">
                          {item.description}
                        </p>
                        <Link
                          href="/configure"
                          className="inline-flex items-center gap-2 bg-cream-100 text-charcoal-700 text-xs font-medium px-5 py-2.5 rounded-full hover:bg-white transition-colors"
                        >
                          Start from this style
                          <ArrowRight size={12} />
                        </Link>
                        <Link
                          href="/configure"
                          className="text-cream-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                        >
                          <Maximize2 size={12} />
                          Full preview
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="px-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-serif text-lg ${item.accent} mb-0.5`}>{item.title}</h3>
                        <p className="text-xs text-charcoal-400">{item.sqft}</p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-widest text-charcoal-400 border border-cream-200 rounded-full px-2.5 py-1">
                        {item.style}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-charcoal-400 text-lg">No layouts match these filters.</p>
              <button
                onClick={() => { setActiveTag("All"); setActiveSize("Any Size"); }}
                className="mt-4 text-sm text-taupe-500 hover:text-taupe-700 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 border-t border-cream-100 bg-cream-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-2xl text-charcoal-600">Comment History</h2>
              <p className="text-xs text-charcoal-400 mt-1">Browse all design comments from the community.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={historyDesignFilter}
                onChange={(e) => { setHistoryDesignFilter(e.target.value); setHistoryPage(1); }}
                placeholder="Filter by design ID"
                className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white"
              />
              <input
                value={historyAuthorFilter}
                onChange={(e) => { setHistoryAuthorFilter(e.target.value); setHistoryPage(1); }}
                placeholder="Filter by author"
                className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white"
              />
              <label className="flex items-center gap-1.5 text-xs text-charcoal-500 cursor-pointer">
                <input type="checkbox" checked={mentionsOnly} onChange={(e) => { setMentionsOnly(e.target.checked); setHistoryPage(1); }} className="rounded" />
                Mentions only
              </label>
              <input type="date" value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setHistoryPage(1); }} className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white" />
              <input type="date" value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setHistoryPage(1); }} className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white" />
              <select value={historySort} onChange={(e) => { setHistorySort(e.target.value as CommentSort); setHistoryPage(1); }} className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="most-mentioned">Most mentioned</option>
              </select>
            </div>
          </div>

          {commentHistory.length === 0 ? (
            <p className="text-sm text-charcoal-400 py-6">No comments found.</p>
          ) : (
            <>
              <p className="text-xs text-charcoal-400 mb-3">{historyTotal} comment{historyTotal !== 1 ? "s" : ""} total</p>
              <ul className="space-y-3">
                {commentHistory.map((comment) => (
                  <li key={comment.id} className="rounded-xl border border-cream-200 bg-white p-4">
                    <p className="text-sm text-charcoal-600">{comment.text}</p>
                    <p className="text-xs text-charcoal-400 mt-1.5">
                      {comment.author} · design {comment.designId} · {new Date(comment.createdAt).toLocaleString()}
                      {comment.mentions && comment.mentions.length > 0 && (
                        <span className="ml-2 text-taupe-500">
                          mentions: {comment.mentions.map((m) => `@${m}`).join(", ")}
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mt-6">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                  className="text-sm text-charcoal-500 disabled:opacity-30 hover:text-charcoal-700"
                >
                  ← Previous
                </button>
                <span className="text-xs text-charcoal-400">Page {historyPage}</span>
                <button
                  disabled={!historyHasNextPage}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="text-sm text-charcoal-500 disabled:opacity-30 hover:text-charcoal-700"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-20 bg-charcoal-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl text-white mb-5">None quite right?</h2>
          <p className="text-gray-300 mb-8">
            Build your own from scratch — tell us your space, your wardrobe, your style.
          </p>
          <Link
            href="/configure"
            className="inline-flex items-center gap-2 bg-cream-100 text-charcoal-700 px-8 py-3.5 rounded-xl font-medium hover:bg-white transition-colors"
          >
            Start configuring <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
