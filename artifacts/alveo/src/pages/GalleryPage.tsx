import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Maximize2, X, Layers } from "lucide-react";

type StyleTag = "All" | "Minimal" | "Glam" | "Small Space" | "Luxury" | "Modern" | "Rustic";
type SizeTag  = "Any Size" | "Compact (≤ 60 sq ft)" | "Standard (60–120 sq ft)" | "Large (120+ sq ft)";
type ItemSize = "compact" | "standard" | "large";

interface GalleryItem {
  id: number;
  title: string;
  style: StyleTag;
  sqft: string;
  description: string;
  accent: string;
  bg: string;
  svgPattern: "minimal" | "glam" | "compact" | "luxury" | "modern" | "rustic" | "small-glam" | "open-luxury" | "city";
  size: ItemSize;
  highlight: string;
}

interface CommentHistoryItem {
  id: string; designId: string; text: string; author: string;
  createdAt: string; parentId?: string; mentions?: string[];
}
interface CommentHistoryResponse {
  comments?: CommentHistoryItem[]; total?: number; page?: number;
  pageSize?: number; hasNextPage?: boolean;
}
type CommentSort = "newest" | "oldest" | "most-mentioned";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const WIZARD_DRAFT_KEY = "alveo-wizard-draft";

const SIZE_MAP: Record<Exclude<SizeTag, "Any Size">, ItemSize> = {
  "Compact (≤ 60 sq ft)": "compact",
  "Standard (60–120 sq ft)": "standard",
  "Large (120+ sq ft)": "large",
};

// ─── Gallery data ─────────────────────────────────────────────────────────────

const items: GalleryItem[] = [
  { id: 1,  title: "The Clean Slate",   style: "Minimal",     sqft: "8 × 6 ft",   description: "White oak finish, double-hang zones, concealed drawer pulls. Everything in its place.",          accent: "text-charcoal-500", bg: "bg-cream-50",   svgPattern: "minimal",    size: "compact",  highlight: "Light oak · Double hang · Push-to-open" },
  { id: 7,  title: "The Edit",          style: "Minimal",     sqft: "10 × 7 ft",  description: "White lacquer, integrated push-to-open drawers, zero visible hardware.",                         accent: "text-charcoal-500", bg: "bg-cream-50",   svgPattern: "city",       size: "compact",  highlight: "White lacquer · Zero hardware · Drawer tower" },
  { id: 8,  title: "Studio White",      style: "Minimal",     sqft: "14 × 10 ft", description: "Floor-to-ceiling white panels, hidden LED strip, linen-back open shelves.",                      accent: "text-charcoal-500", bg: "bg-cream-50",   svgPattern: "modern",     size: "standard", highlight: "White panels · LED strip · Open shelves" },
  { id: 9,  title: "The Pared Back",    style: "Minimal",     sqft: "6 × 5 ft",   description: "A single long-hang zone and one deep shelf column — nothing more.",                             accent: "text-charcoal-500", bg: "bg-cream-50",   svgPattern: "compact",    size: "compact",  highlight: "Long hang · Single shelf · Oak slab" },
  { id: 2,  title: "The Glam Suite",    style: "Glam",        sqft: "12 × 10 ft", description: "Island with velvet-lined jewelry drawers, full-length mirrors, dedicated shoe display wall.",   accent: "text-taupe-500",   bg: "bg-taupe-50",   svgPattern: "glam",       size: "standard", highlight: "Velvet drawers · Mirror · Shoe wall" },
  { id: 10, title: "Velvet Dreams",     style: "Glam",        sqft: "14 × 11 ft", description: "Blush velvet drawer liners, gold rod brackets, perfume shelf under spot lighting.",             accent: "text-taupe-500",   bg: "bg-taupe-50",   svgPattern: "small-glam", size: "standard", highlight: "Blush velvet · Gold brackets · Perfume shelf" },
  { id: 11, title: "The Showroom",      style: "Glam",        sqft: "18 × 14 ft", description: "Backlit shoe wall, full-height mirrors, island with marble inlay top.",                         accent: "text-taupe-500",   bg: "bg-taupe-50",   svgPattern: "open-luxury",size: "large",    highlight: "Backlit shoe wall · Island · Marble top" },
  { id: 12, title: "Champagne Closet",  style: "Glam",        sqft: "11 × 9 ft",  description: "Champagne lacquer, antique brass pulls, glass-front upper cabinets.",                           accent: "text-taupe-500",   bg: "bg-taupe-50",   svgPattern: "glam",       size: "standard", highlight: "Champagne lacquer · Brass pulls · Glass fronts" },
  { id: 3,  title: "Urban Edit",        style: "Small Space", sqft: "5 × 4 ft",   description: "Floor-to-ceiling with double-hang, pull-out shoe shelves, and hidden storage in every gap.",   accent: "text-charcoal-400", bg: "bg-cream-100",  svgPattern: "city",       size: "compact",  highlight: "Double hang · Pull-out shoes · Floor-to-ceiling" },
  { id: 13, title: "Micro Suite",       style: "Small Space", sqft: "4 × 4 ft",   description: "Tension-rod double-hang, over-door hooks, magnetic jewelry strips.",                           accent: "text-charcoal-400", bg: "bg-cream-100",  svgPattern: "compact",    size: "compact",  highlight: "Double hang · Over-door · Magnetic strips" },
  { id: 14, title: "The Transformer",   style: "Small Space", sqft: "5 × 5 ft",   description: "Fold-down ironing board, pull-out valet rod, stackable shoe drawer.",                          accent: "text-charcoal-400", bg: "bg-cream-100",  svgPattern: "compact",    size: "compact",  highlight: "Valet rod · Ironing board · Shoe stack" },
  { id: 15, title: "City Reach-In",     style: "Small Space", sqft: "7 × 3 ft",   description: "Every inch planned — 3 zones across one wall, zero wasted vertical space.",                   accent: "text-charcoal-400", bg: "bg-cream-100",  svgPattern: "city",       size: "compact",  highlight: "3 zones · Full height · Reach-in" },
  { id: 4,  title: "The Grand Reserve", style: "Luxury",      sqft: "16 × 12 ft", description: "Dark walnut, brass hardware, a full vanity alcove, and a centre island with Carrara marble.",  accent: "text-amber-700",   bg: "bg-amber-50",   svgPattern: "luxury",     size: "large",    highlight: "Dark walnut · Brass · Marble island" },
  { id: 16, title: "The Penthouse",     style: "Luxury",      sqft: "20 × 16 ft", description: "Herringbone marble floor, chandelier, full vanity wing, motorised trouser racks.",             accent: "text-amber-700",   bg: "bg-amber-50",   svgPattern: "open-luxury",size: "large",    highlight: "Marble floor · Chandelier · Motorised racks" },
  { id: 17, title: "Beau Monde",        style: "Luxury",      sqft: "16 × 13 ft", description: "Smoked glass doors, backlit toe kicks, integrated safe behind mirror.",                        accent: "text-amber-700",   bg: "bg-amber-50",   svgPattern: "luxury",     size: "large",    highlight: "Smoked glass · Backlit · Hidden safe" },
  { id: 18, title: "Heritage Suite",    style: "Luxury",      sqft: "15 × 12 ft", description: "Hand-carved cornicing, cedar-lined drawers, gun-metal rail system.",                          accent: "text-amber-700",   bg: "bg-amber-50",   svgPattern: "open-luxury",size: "large",    highlight: "Cedar drawers · Gun-metal rail · Carved detail" },
  { id: 5,  title: "Studio Line",       style: "Modern",      sqft: "10 × 8 ft",  description: "Light grey lacquer, integrated LED strip lighting, open-back shelving and flat-front drawers.", accent: "text-slate-500",   bg: "bg-slate-50",   svgPattern: "modern",     size: "standard", highlight: "Grey lacquer · LED strip · Flat-front drawers" },
  { id: 19, title: "Grid System",       style: "Modern",      sqft: "12 × 9 ft",  description: "Modular grid panels, interchangeable hooks and shelves, matte black finish.",                  accent: "text-slate-500",   bg: "bg-slate-50",   svgPattern: "city",       size: "standard", highlight: "Grid panels · Interchangeable · Matte black" },
  { id: 20, title: "The Linear",        style: "Modern",      sqft: "9 × 7 ft",   description: "Handle-free slab doors, integrated USB charging drawer, wire-glass panels.",                  accent: "text-slate-500",   bg: "bg-slate-50",   svgPattern: "modern",     size: "standard", highlight: "Slab doors · USB charging · Wire-glass" },
  { id: 21, title: "Capsule",           style: "Modern",      sqft: "8 × 6 ft",   description: "Concrete-effect finish, open hanging, minimal drawer tower — wardrobe as art.",               accent: "text-slate-500",   bg: "bg-slate-50",   svgPattern: "minimal",    size: "compact",  highlight: "Concrete finish · Open hang · Drawer tower" },
  { id: 6,  title: "The Farmhouse",     style: "Rustic",      sqft: "9 × 7 ft",   description: "Reclaimed pine, wrought-iron rod brackets, open shelving with woven basket drawers.",         accent: "text-orange-800",  bg: "bg-orange-50",  svgPattern: "rustic",     size: "standard", highlight: "Reclaimed pine · Iron brackets · Basket drawers" },
  { id: 22, title: "Barn Door Closet",  style: "Rustic",      sqft: "10 × 8 ft",  description: "Sliding barn door, exposed beam rail, mason-jar accessory hooks.",                            accent: "text-orange-800",  bg: "bg-orange-50",  svgPattern: "rustic",     size: "standard", highlight: "Barn door · Beam rail · Mason-jar hooks" },
  { id: 23, title: "The Cottage",       style: "Rustic",      sqft: "7 × 6 ft",   description: "Painted shiplap back, hand-forged iron brackets, wicker drawer inserts.",                    accent: "text-orange-800",  bg: "bg-orange-50",  svgPattern: "compact",    size: "compact",  highlight: "Shiplap back · Iron brackets · Wicker inserts" },
  { id: 24, title: "Wildwood",          style: "Rustic",      sqft: "12 × 10 ft", description: "Live-edge shelves, leather hanging straps, beeswax-finished oak throughout.",                 accent: "text-orange-800",  bg: "bg-orange-50",  svgPattern: "rustic",     size: "standard", highlight: "Live-edge · Leather straps · Beeswax oak" },
];

// ─── Style → Configurator preset mapping ─────────────────────────────────────

type StylePreset = {
  stylePreference: "minimal" | "glam" | "rustic" | "modern" | "luxury";
  woodFinish: "light" | "medium" | "dark" | "white";
  dimensions: { width: number; height: number; depth: number };
  wardrobe: {
    longDresses: number; shortJackets: number; suits: number; shirts: number;
    pants: number; tShirts: number; sweaters: number; jeans: number;
    underwear: number; bags: number; belts: number; jewelry: boolean; ties: number;
  };
  shoes: { sneakers: number; heels: number; boots: number; flats: number };
};

const STYLE_PRESETS: Record<Exclude<StyleTag, "All">, StylePreset> = {
  Minimal:       { stylePreference: "minimal", woodFinish: "light",  dimensions: { width: 72,  height: 96,  depth: 22 }, wardrobe: { longDresses: 4, shortJackets: 3, suits: 1, shirts: 8, pants: 4,  tShirts: 10, sweaters: 4, jeans: 3, underwear: 8,  bags: 2,  belts: 1, jewelry: false, ties: 0 }, shoes: { sneakers: 4, heels: 2, boots: 2, flats: 3 } },
  Glam:          { stylePreference: "glam",    woodFinish: "medium", dimensions: { width: 120, height: 96,  depth: 24 }, wardrobe: { longDresses: 12,shortJackets: 6, suits: 2, shirts: 10,pants: 6,  tShirts: 8,  sweaters: 4, jeans: 3, underwear: 10, bags: 8,  belts: 3, jewelry: true,  ties: 0 }, shoes: { sneakers: 3, heels: 10,boots: 3, flats: 6 } },
  "Small Space": { stylePreference: "minimal", woodFinish: "white",  dimensions: { width: 48,  height: 96,  depth: 20 }, wardrobe: { longDresses: 2, shortJackets: 2, suits: 1, shirts: 5, pants: 3,  tShirts: 8,  sweaters: 3, jeans: 2, underwear: 6,  bags: 1,  belts: 1, jewelry: false, ties: 0 }, shoes: { sneakers: 3, heels: 2, boots: 1, flats: 2 } },
  Luxury:        { stylePreference: "luxury",  woodFinish: "dark",   dimensions: { width: 168, height: 108, depth: 26 }, wardrobe: { longDresses: 15,shortJackets: 10,suits: 6, shirts: 20,pants: 10, tShirts: 15, sweaters: 8, jeans: 5, underwear: 15, bags: 10, belts: 5, jewelry: true,  ties: 6 }, shoes: { sneakers: 4, heels: 12,boots: 5, flats: 8 } },
  Modern:        { stylePreference: "modern",  woodFinish: "medium", dimensions: { width: 96,  height: 96,  depth: 24 }, wardrobe: { longDresses: 4, shortJackets: 4, suits: 2, shirts: 10,pants: 5,  tShirts: 12, sweaters: 5, jeans: 4, underwear: 10, bags: 3,  belts: 2, jewelry: false, ties: 1 }, shoes: { sneakers: 6, heels: 3, boots: 2, flats: 4 } },
  Rustic:        { stylePreference: "rustic",  woodFinish: "dark",   dimensions: { width: 96,  height: 96,  depth: 22 }, wardrobe: { longDresses: 3, shortJackets: 4, suits: 1, shirts: 8, pants: 4,  tShirts: 10, sweaters: 6, jeans: 5, underwear: 8,  bags: 2,  belts: 2, jewelry: false, ties: 0 }, shoes: { sneakers: 5, heels: 1, boots: 4, flats: 2 } },
};

// ─── SVG Sketches ─────────────────────────────────────────────────────────────

function ClosetSketch({ pattern }: { pattern: GalleryItem["svgPattern"] }) {
  const W = 200, H = 130;

  const configs: Record<GalleryItem["svgPattern"], { zones: { x: number; w: number; type: "double" | "single" | "shelves" | "drawers" | "open" }[] }> = {
    minimal:    { zones: [{ x: 0,   w: 88,  type: "double"  }, { x: 92,  w: 108, type: "shelves" }] },
    glam:       { zones: [{ x: 0,   w: 56,  type: "single"  }, { x: 60,  w: 68,  type: "shelves" }, { x: 132, w: 68, type: "drawers" }] },
    "small-glam":{ zones: [{ x: 0,  w: 64,  type: "single"  }, { x: 68,  w: 132, type: "drawers" }] },
    compact:    { zones: [{ x: 0,   w: 110, type: "double"  }, { x: 114, w: 86,  type: "drawers" }] },
    luxury:     { zones: [{ x: 0,   w: 56,  type: "single"  }, { x: 60,  w: 52,  type: "shelves" }, { x: 116, w: 52, type: "drawers" }, { x: 172, w: 28, type: "open" }] },
    "open-luxury":{ zones:[{ x: 0,  w: 60,  type: "single"  }, { x: 64,  w: 60,  type: "shelves" }, { x: 128, w: 72, type: "drawers" }] },
    modern:     { zones: [{ x: 0,   w: 76,  type: "double"  }, { x: 80,  w: 76,  type: "double"  }, { x: 160, w: 40, type: "shelves" }] },
    rustic:     { zones: [{ x: 0,   w: 96,  type: "single"  }, { x: 100, w: 100, type: "shelves" }] },
    city:       { zones: [{ x: 0,   w: 72,  type: "double"  }, { x: 76,  w: 56,  type: "drawers" }, { x: 136, w: 64, type: "shelves" }] },
  };

  const { zones } = configs[pattern];

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
              {Array.from({ length: Math.max(1, Math.floor(pw / 10)) }).map((_, j) => (
                <rect key={j} x={px + 4 + j * 10} y={py + 23} width="7" height="16" fill="#d4cbc0" rx="0.5" opacity="0.7" />
              ))}
              <line x1={px + 4} y1={py + 55} x2={px + pw - 4} y2={py + 55} stroke="#b0a495" strokeWidth="1.5" />
              {Array.from({ length: Math.max(1, Math.floor(pw / 10)) }).map((_, j) => (
                <rect key={j} x={px + 4 + j * 10} y={py + 56} width="7" height="12" fill="#d4cbc0" rx="0.5" opacity="0.7" />
              ))}
            </>)}

            {z.type === "single" && (<>
              <line x1={px + 4} y1={py + 18} x2={px + pw - 4} y2={py + 18} stroke="#b0a495" strokeWidth="1.5" />
              {Array.from({ length: Math.max(1, Math.floor(pw / 10)) }).map((_, j) => (
                <rect key={j} x={px + 4 + j * 10} y={py + 19} width="7" height="28" fill="#d4cbc0" rx="0.5" opacity="0.7" />
              ))}
              <rect x={px + 2} y={py + ph - 22} width={pw - 4} height="2" fill="#b0a495" />
              {Array.from({ length: Math.max(1, Math.floor((pw - 4) / 12)) }).map((_, j) => (
                <ellipse key={j} cx={px + 8 + j * 12} cy={py + ph - 13} rx="4" ry="6" fill="#c8bfb0" opacity="0.8" />
              ))}
            </>)}

            {z.type === "shelves" && (<>
              {[0.2, 0.38, 0.56, 0.74].map((frac, j) => (
                <g key={j}>
                  <rect x={px + 2} y={py + ph * frac} width={pw - 4} height="2" fill="#b0a495" />
                  {Array.from({ length: Math.max(1, Math.floor((pw - 8) / 12)) }).map((_, k) => (
                    <rect key={k} x={px + 4 + k * 12} y={py + ph * frac - 10} width="9" height="9" fill="#d4cbc0" rx="1" opacity="0.7" />
                  ))}
                </g>
              ))}
            </>)}

            {z.type === "open" && (<>
              {[0.15, 0.42, 0.69].map((frac, j) => (
                <g key={j}>
                  <rect x={px + 1} y={py + ph * frac} width={pw - 2} height="1.5" fill="#b0a495" />
                </g>
              ))}
            </>)}

            {z.type === "drawers" && (<>
              {[0.12, 0.28, 0.44, 0.60, 0.76].map((frac) => (
                <g key={frac}>
                  <rect x={px + 2} y={py + ph * frac} width={pw - 4} height={ph * 0.13} fill="#d4cbc0" rx="1" stroke="#b0a495" strokeWidth="0.5" />
                  <line x1={px + pw / 2 - 5} y1={py + ph * frac + ph * 0.065} x2={px + pw / 2 + 5} y2={py + ph * frac + ph * 0.065} stroke="#8f8070" strokeWidth="1" />
                </g>
              ))}
            </>)}

            {i < zones.length - 1 && (
              <line x1={px + pw + 2} y1={py} x2={px + pw + 2} y2={py + ph} stroke="#c8bfb0" strokeWidth="0.8" strokeDasharray="3,2" />
            )}
          </g>
        );
      })}
      <rect x="0" y="0" width={W} height="6" fill="#c8bfb0" rx="1" />
    </svg>
  );
}

// ─── Full-preview modal ────────────────────────────────────────────────────────

function PreviewModal({ item, onClose, onStart }: { item: GalleryItem; onClose: () => void; onStart: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const preset = item.style !== "All" ? STYLE_PRESETS[item.style as Exclude<StyleTag, "All">] : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Sketch */}
        <div className={`${item.bg} p-8 relative`} style={{ height: 240 }}>
          <ClosetSketch pattern={item.svgPattern} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/70 hover:bg-white text-charcoal-500 transition-colors"
          >
            <X size={16} />
          </button>
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-white/80 text-charcoal-500">
            {item.style}
          </span>
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className={`font-serif text-2xl ${item.accent} leading-tight`}>{item.title}</h2>
              <p className="text-sm text-charcoal-400 mt-0.5">{item.sqft}</p>
            </div>
          </div>

          <p className="text-sm text-charcoal-500 leading-relaxed mb-4">{item.description}</p>

          {/* Key specs chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {item.highlight.split(" · ").map((spec) => (
              <span key={spec} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream-100 text-charcoal-500 border border-cream-200">
                {spec}
              </span>
            ))}
            {preset && (
              <>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream-100 text-charcoal-500 border border-cream-200">
                  {preset.woodFinish === "light" ? "Light oak" : preset.woodFinish === "medium" ? "Warm walnut" : preset.woodFinish === "dark" ? "Dark espresso" : "Painted white"} finish
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream-100 text-charcoal-500 border border-cream-200">
                  {preset.dimensions.width}″ × {preset.dimensions.height}″ × {preset.dimensions.depth}″
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onStart}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-charcoal-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-charcoal-500 transition-colors"
            >
              Start from this style <ArrowRight size={14} />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-charcoal-500 bg-cream-50 hover:bg-cream-100 border border-cream-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tags / constants ─────────────────────────────────────────────────────────

const tags: StyleTag[]  = ["All", "Minimal", "Glam", "Small Space", "Luxury", "Modern", "Rustic"];
const sizes: SizeTag[]  = ["Any Size", "Compact (≤ 60 sq ft)", "Standard (60–120 sq ft)", "Large (120+ sq ft)"];

// ─── GalleryPage ──────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const HISTORY_PAGE_SIZE = 20;
  const [, navigate] = useLocation();

  const [activeTag,  setActiveTag]  = useState<StyleTag>("All");
  const [activeSize, setActiveSize] = useState<SizeTag>("Any Size");
  const [hoveredId,  setHoveredId]  = useState<number | null>(null);
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

  // Admin-only comment history — gate on token presence
  const [isAdmin] = useState(() => Boolean(localStorage.getItem("alveo-events-admin-token")));
  const [commentHistory, setCommentHistory] = useState<CommentHistoryItem[]>([]);
  const [historyDesignFilter, setHistoryDesignFilter] = useState("");
  const [historyAuthorFilter, setHistoryAuthorFilter] = useState("");
  const [mentionsOnly,        setMentionsOnly]        = useState(false);
  const [historyFromDate,     setHistoryFromDate]      = useState("");
  const [historyToDate,       setHistoryToDate]        = useState("");
  const [historySort,         setHistorySort]          = useState<CommentSort>("newest");
  const [historyPage,         setHistoryPage]          = useState(1);
  const [historyHasNextPage,  setHistoryHasNextPage]   = useState(false);
  const [historyTotal,        setHistoryTotal]         = useState(0);

  useEffect(() => { document.title = "Inspiration Gallery | Alvéo"; }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("alveo-events-admin-token") ?? "";
    const controller = new AbortController();
    const params = new URLSearchParams({ all: "1", page: String(historyPage), pageSize: String(HISTORY_PAGE_SIZE) });
    if (historyDesignFilter.trim()) params.set("designId", historyDesignFilter.trim());
    if (historyAuthorFilter.trim()) params.set("author", historyAuthorFilter.trim());
    if (mentionsOnly)   params.set("mentionsOnly", "1");
    if (historyFromDate) params.set("from", historyFromDate);
    if (historyToDate)   params.set("to", historyToDate);
    params.set("sort", historySort);

    fetch(`${BASE}/api/design-comments?${params.toString()}`, {
      headers: { "x-admin-token": token }, cache: "no-store", signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data: CommentHistoryResponse) => {
        setCommentHistory(data.comments ?? []);
        setHistoryHasNextPage(!!data.hasNextPage);
        setHistoryTotal(data.total ?? 0);
      })
      .catch(() => { setCommentHistory([]); setHistoryHasNextPage(false); });
    return () => controller.abort();
  }, [isAdmin, historyPage, historyDesignFilter, historyAuthorFilter, mentionsOnly, historyFromDate, historyToDate, historySort]);

  // ── Start from style: write preset to wizard draft, then navigate ─────────
  const startFromStyle = (item: GalleryItem) => {
    if (item.style === "All") { navigate("/configure"); return; }
    const preset = STYLE_PRESETS[item.style as Exclude<StyleTag, "All">];
    const draft = {
      config: {
        userInfo: {
          userType: "homeowner",
          stylePreference: preset.stylePreference,
          woodFinish: preset.woodFinish,
          drawerPreference: "mixed",
          priorityItems: ["hanging"],
        },
        dimensions: preset.dimensions,
        wardrobe: preset.wardrobe,
        shoes: preset.shoes,
      },
      currentStep: "shape",
    };
    try { localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
    navigate("/configure");
  };

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
      {/* ── Hero ── */}
      <section className="py-16 bg-cream-50 border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm uppercase tracking-widest text-taupe-400 font-medium mb-4">
            Inspiration Gallery
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-serif text-5xl md:text-6xl text-charcoal-600 mb-5">
            Find your style
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg text-charcoal-400 max-w-xl mx-auto">
            Browse layouts designed by the Alvéo engine. Pick one to start from — or build entirely from scratch.
          </motion.p>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="py-6 border-b border-cream-100 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tags.map((tag) => (
              <button key={tag} onClick={() => { setActiveTag(tag); setHistoryPage(1); }}
                className={`${pillBase} ${activeTag === tag ? pillActive : pillIdle}`}>
                {tag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sizes.map((sz) => (
              <button key={sz} onClick={() => { setActiveSize(sz); setHistoryPage(1); }}
                className={`${pillBase} text-xs ${activeSize === sz ? sizePillActive : sizePillIdle}`}>
                {sz}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTag}-${activeSize}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-charcoal-600/88 flex flex-col items-center justify-center gap-3 p-5"
                      >
                        <p className="text-white text-xs text-center leading-relaxed opacity-90">
                          {item.description}
                        </p>
                        <p className="text-[10px] text-cream-200 text-center">{item.highlight}</p>
                        <button
                          onClick={() => startFromStyle(item)}
                          className="inline-flex items-center gap-2 bg-cream-100 text-charcoal-700 text-xs font-semibold px-5 py-2 rounded-full hover:bg-white transition-colors"
                        >
                          Start from this style <ArrowRight size={11} />
                        </button>
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="text-cream-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Maximize2 size={11} />
                          Full preview
                        </button>
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
              <Layers size={40} className="mx-auto text-charcoal-300 mb-4 opacity-50" />
              <p className="text-charcoal-400 text-lg">No layouts match these filters.</p>
              <button
                onClick={() => { setActiveTag("All"); setActiveSize("Any Size"); }}
                className="mt-4 text-sm text-taupe-500 hover:text-taupe-600 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Admin: Comment History (only when admin token is present) ── */}
      {isAdmin && (
        <section className="py-12 border-t border-cream-100 bg-cream-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-600">Comment History</h2>
                <p className="text-xs text-charcoal-400 mt-1">Browse all design comments from the community.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={historyDesignFilter} onChange={(e) => { setHistoryDesignFilter(e.target.value); setHistoryPage(1); }}
                  placeholder="Filter by design ID" className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white" />
                <input value={historyAuthorFilter} onChange={(e) => { setHistoryAuthorFilter(e.target.value); setHistoryPage(1); }}
                  placeholder="Filter by author" className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white" />
                <label className="flex items-center gap-1.5 text-xs text-charcoal-500 cursor-pointer">
                  <input type="checkbox" checked={mentionsOnly} onChange={(e) => { setMentionsOnly(e.target.checked); setHistoryPage(1); }} className="rounded" />
                  Mentions only
                </label>
                <input type="date" value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setHistoryPage(1); }} className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white" />
                <input type="date" value={historyToDate}   onChange={(e) => { setHistoryToDate(e.target.value); setHistoryPage(1); }}   className="text-xs border border-cream-200 rounded-lg px-3 py-1.5 bg-white" />
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
                          <span className="ml-2 text-taupe-500">mentions: {comment.mentions.map((m) => `@${m}`).join(", ")}</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between mt-6">
                  <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)}
                    className="text-sm text-charcoal-500 disabled:opacity-30 hover:text-charcoal-700">← Previous</button>
                  <span className="text-xs text-charcoal-400">Page {historyPage}</span>
                  <button disabled={!historyHasNextPage} onClick={() => setHistoryPage((p) => p + 1)}
                    className="text-sm text-charcoal-500 disabled:opacity-30 hover:text-charcoal-700">Next →</button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-20 bg-charcoal-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl text-white mb-5">None quite right?</h2>
          <p className="text-gray-300 mb-8">Build your own from scratch — tell us your space, your wardrobe, your style.</p>
          <Link href="/configure"
            className="inline-flex items-center gap-2 bg-cream-100 text-charcoal-700 px-8 py-3.5 rounded-xl font-medium hover:bg-white transition-colors">
            Start configuring <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Full preview modal ── */}
      <AnimatePresence>
        {previewItem && (
          <PreviewModal
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            onStart={() => { setPreviewItem(null); startFromStyle(previewItem); }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
