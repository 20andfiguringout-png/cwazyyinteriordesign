import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Maximize2, X, Heart, BookMarked, ChevronRight, Trash2, ArrowUpDown, Search } from "lucide-react";

type StyleTag  = "All" | "Minimal" | "Glam" | "Small Space" | "Luxury" | "Modern" | "Rustic";
type SizeTag   = "Any Size" | "Compact (≤ 60 sq ft)" | "Standard (60–120 sq ft)" | "Large (120+ sq ft)";
type FinishTag = "Any Finish" | "Light Oak" | "Warm Walnut" | "Dark Espresso" | "Painted White";
type ItemSize   = "compact" | "standard" | "large";
type ItemFinish = "light" | "medium" | "dark" | "white";

interface GalleryItem {
  id: number; title: string; style: StyleTag; sqft: string;
  description: string; accent: string; bg: string;
  svgPattern: "minimal"|"glam"|"compact"|"luxury"|"modern"|"rustic"|"small-glam"|"open-luxury"|"city";
  size: ItemSize; highlight: string; finish: ItemFinish;
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
const MOODBOARD_KEY = "alveo_moodboard";

const SIZE_MAP: Record<Exclude<SizeTag, "Any Size">, ItemSize> = {
  "Compact (≤ 60 sq ft)": "compact",
  "Standard (60–120 sq ft)": "standard",
  "Large (120+ sq ft)": "large",
};

const FINISH_MAP: Record<FinishTag, ItemFinish | null> = {
  "Any Finish": null,
  "Light Oak": "light",
  "Warm Walnut": "medium",
  "Dark Espresso": "dark",
  "Painted White": "white",
};

// ─── Gallery data ──────────────────────────────────────────────────────────────

const items: GalleryItem[] = [
  { id: 1,  title:"The Clean Slate",   style:"Minimal",     sqft:"8 × 6 ft",   description:"White oak finish, double-hang zones, concealed drawer pulls. Everything in its place.",          accent:"text-charcoal-500", bg:"bg-cream-50",   svgPattern:"minimal",     size:"compact",  highlight:"Light oak · Double hang · Push-to-open",       finish:"light"  },
  { id: 7,  title:"The Edit",          style:"Minimal",     sqft:"10 × 7 ft",  description:"White lacquer, integrated push-to-open drawers, zero visible hardware.",                         accent:"text-charcoal-500", bg:"bg-cream-50",   svgPattern:"city",        size:"compact",  highlight:"White lacquer · Zero hardware · Drawer tower",  finish:"white"  },
  { id: 8,  title:"Studio White",      style:"Minimal",     sqft:"14 × 10 ft", description:"Floor-to-ceiling white panels, hidden LED strip, linen-back open shelves.",                      accent:"text-charcoal-500", bg:"bg-cream-50",   svgPattern:"modern",      size:"standard", highlight:"White panels · LED strip · Open shelves",        finish:"white"  },
  { id: 9,  title:"The Pared Back",    style:"Minimal",     sqft:"6 × 5 ft",   description:"A single long-hang zone and one deep shelf column — nothing more.",                             accent:"text-charcoal-500", bg:"bg-cream-50",   svgPattern:"compact",     size:"compact",  highlight:"Long hang · Single shelf · Oak slab",            finish:"light"  },
  { id: 2,  title:"The Glam Suite",    style:"Glam",        sqft:"12 × 10 ft", description:"Island with velvet-lined jewelry drawers, full-length mirrors, dedicated shoe display wall.",   accent:"text-taupe-500",   bg:"bg-taupe-50",   svgPattern:"glam",        size:"standard", highlight:"Velvet drawers · Mirror · Shoe wall",            finish:"medium" },
  { id: 10, title:"Velvet Dreams",     style:"Glam",        sqft:"14 × 11 ft", description:"Blush velvet drawer liners, gold rod brackets, perfume shelf under spot lighting.",             accent:"text-taupe-500",   bg:"bg-taupe-50",   svgPattern:"small-glam",  size:"standard", highlight:"Blush velvet · Gold brackets · Perfume shelf",   finish:"medium" },
  { id: 11, title:"The Showroom",      style:"Glam",        sqft:"18 × 14 ft", description:"Backlit shoe wall, full-height mirrors, island with marble inlay top.",                         accent:"text-taupe-500",   bg:"bg-taupe-50",   svgPattern:"open-luxury", size:"large",    highlight:"Backlit shoe wall · Island · Marble top",        finish:"medium" },
  { id: 12, title:"Champagne Closet",  style:"Glam",        sqft:"11 × 9 ft",  description:"Champagne lacquer, antique brass pulls, glass-front upper cabinets.",                           accent:"text-taupe-500",   bg:"bg-taupe-50",   svgPattern:"glam",        size:"standard", highlight:"Champagne lacquer · Brass pulls · Glass fronts",  finish:"white"  },
  { id: 3,  title:"Urban Edit",        style:"Small Space", sqft:"5 × 4 ft",   description:"Floor-to-ceiling with double-hang, pull-out shoe shelves, and hidden storage in every gap.",   accent:"text-charcoal-400", bg:"bg-cream-100",  svgPattern:"city",        size:"compact",  highlight:"Double hang · Pull-out shoes · Floor-to-ceiling", finish:"white"  },
  { id: 13, title:"Micro Suite",       style:"Small Space", sqft:"4 × 4 ft",   description:"Tension-rod double-hang, over-door hooks, magnetic jewelry strips.",                           accent:"text-charcoal-400", bg:"bg-cream-100",  svgPattern:"compact",     size:"compact",  highlight:"Double hang · Over-door · Magnetic strips",      finish:"white"  },
  { id: 14, title:"The Transformer",   style:"Small Space", sqft:"5 × 5 ft",   description:"Fold-down ironing board, pull-out valet rod, stackable shoe drawer.",                          accent:"text-charcoal-400", bg:"bg-cream-100",  svgPattern:"compact",     size:"compact",  highlight:"Valet rod · Ironing board · Shoe stack",         finish:"light"  },
  { id: 15, title:"City Reach-In",     style:"Small Space", sqft:"7 × 3 ft",   description:"Every inch planned — 3 zones across one wall, zero wasted vertical space.",                   accent:"text-charcoal-400", bg:"bg-cream-100",  svgPattern:"city",        size:"compact",  highlight:"3 zones · Full height · Reach-in",               finish:"light"  },
  { id: 4,  title:"The Grand Reserve", style:"Luxury",      sqft:"16 × 12 ft", description:"Dark walnut, brass hardware, a full vanity alcove, and a centre island with Carrara marble.",  accent:"text-amber-700",   bg:"bg-amber-50",   svgPattern:"luxury",      size:"large",    highlight:"Dark walnut · Brass · Marble island",            finish:"dark"   },
  { id: 16, title:"The Penthouse",     style:"Luxury",      sqft:"20 × 16 ft", description:"Herringbone marble floor, chandelier, full vanity wing, motorised trouser racks.",             accent:"text-amber-700",   bg:"bg-amber-50",   svgPattern:"open-luxury", size:"large",    highlight:"Marble floor · Chandelier · Motorised racks",    finish:"dark"   },
  { id: 17, title:"Beau Monde",        style:"Luxury",      sqft:"16 × 13 ft", description:"Smoked glass doors, backlit toe kicks, integrated safe behind mirror.",                        accent:"text-amber-700",   bg:"bg-amber-50",   svgPattern:"luxury",      size:"large",    highlight:"Smoked glass · Backlit · Hidden safe",           finish:"dark"   },
  { id: 18, title:"Heritage Suite",    style:"Luxury",      sqft:"15 × 12 ft", description:"Hand-carved cornicing, cedar-lined drawers, gun-metal rail system.",                          accent:"text-amber-700",   bg:"bg-amber-50",   svgPattern:"open-luxury", size:"large",    highlight:"Cedar drawers · Gun-metal rail · Carved detail",  finish:"medium" },
  { id: 5,  title:"Studio Line",       style:"Modern",      sqft:"10 × 8 ft",  description:"Light grey lacquer, integrated LED strip lighting, open-back shelving and flat-front drawers.", accent:"text-slate-500",   bg:"bg-slate-50",   svgPattern:"modern",      size:"standard", highlight:"Grey lacquer · LED strip · Flat-front drawers",   finish:"medium" },
  { id: 19, title:"Grid System",       style:"Modern",      sqft:"12 × 9 ft",  description:"Modular grid panels, interchangeable hooks and shelves, matte black finish.",                  accent:"text-slate-500",   bg:"bg-slate-50",   svgPattern:"city",        size:"standard", highlight:"Grid panels · Interchangeable · Matte black",     finish:"dark"   },
  { id: 20, title:"The Linear",        style:"Modern",      sqft:"9 × 7 ft",   description:"Handle-free slab doors, integrated USB charging drawer, wire-glass panels.",                  accent:"text-slate-500",   bg:"bg-slate-50",   svgPattern:"modern",      size:"standard", highlight:"Slab doors · USB charging · Wire-glass",          finish:"medium" },
  { id: 21, title:"Capsule",           style:"Modern",      sqft:"8 × 6 ft",   description:"Concrete-effect finish, open hanging, minimal drawer tower — wardrobe as art.",               accent:"text-slate-500",   bg:"bg-slate-50",   svgPattern:"minimal",     size:"compact",  highlight:"Concrete finish · Open hang · Drawer tower",     finish:"dark"   },
  { id: 6,  title:"The Farmhouse",     style:"Rustic",      sqft:"9 × 7 ft",   description:"Reclaimed pine, wrought-iron rod brackets, open shelving with woven basket drawers.",         accent:"text-orange-800",  bg:"bg-orange-50",  svgPattern:"rustic",      size:"standard", highlight:"Reclaimed pine · Iron brackets · Basket drawers", finish:"dark"   },
  { id: 22, title:"Barn Door Closet",  style:"Rustic",      sqft:"10 × 8 ft",  description:"Sliding barn door, exposed beam rail, mason-jar accessory hooks.",                            accent:"text-orange-800",  bg:"bg-orange-50",  svgPattern:"rustic",      size:"standard", highlight:"Barn door · Beam rail · Mason-jar hooks",         finish:"dark"   },
  { id: 23, title:"The Cottage",       style:"Rustic",      sqft:"7 × 6 ft",   description:"Painted shiplap back, hand-forged iron brackets, wicker drawer inserts.",                    accent:"text-orange-800",  bg:"bg-orange-50",  svgPattern:"compact",     size:"compact",  highlight:"Shiplap back · Iron brackets · Wicker inserts",   finish:"light"  },
  { id: 24, title:"Wildwood",          style:"Rustic",      sqft:"12 × 10 ft", description:"Live-edge shelves, leather hanging straps, beeswax-finished oak throughout.",                 accent:"text-orange-800",  bg:"bg-orange-50",  svgPattern:"rustic",      size:"standard", highlight:"Live-edge · Leather straps · Beeswax oak",        finish:"medium" },
];

// ─── Style → Configurator preset mapping ──────────────────────────────────────

type StylePreset = {
  stylePreference: "minimal"|"glam"|"rustic"|"modern"|"luxury";
  woodFinish: "light"|"medium"|"dark"|"white";
  dimensions: { width: number; height: number; depth: number };
  wardrobe: {
    longDresses: number; shortJackets: number; suits: number; shirts: number;
    pants: number; tShirts: number; sweaters: number; jeans: number;
    underwear: number; bags: number; belts: number; jewelry: boolean; ties: number;
  };
  shoes: { sneakers: number; heels: number; boots: number; flats: number };
};

const STYLE_PRESETS: Record<Exclude<StyleTag,"All">, StylePreset> = {
  Minimal:       { stylePreference:"minimal", woodFinish:"light",  dimensions:{ width:72,  height:96,  depth:22 }, wardrobe:{ longDresses:4,  shortJackets:3,  suits:1, shirts:8,  pants:4,  tShirts:10, sweaters:4, jeans:3, underwear:8,  bags:2,  belts:1, jewelry:false, ties:0 }, shoes:{ sneakers:4, heels:2,  boots:2, flats:3 } },
  Glam:          { stylePreference:"glam",    woodFinish:"medium", dimensions:{ width:120, height:96,  depth:24 }, wardrobe:{ longDresses:12, shortJackets:6,  suits:2, shirts:10, pants:6,  tShirts:8,  sweaters:4, jeans:3, underwear:10, bags:8,  belts:3, jewelry:true,  ties:0 }, shoes:{ sneakers:3, heels:10, boots:3, flats:6 } },
  "Small Space": { stylePreference:"minimal", woodFinish:"white",  dimensions:{ width:48,  height:96,  depth:20 }, wardrobe:{ longDresses:2,  shortJackets:2,  suits:1, shirts:5,  pants:3,  tShirts:8,  sweaters:3, jeans:2, underwear:6,  bags:1,  belts:1, jewelry:false, ties:0 }, shoes:{ sneakers:3, heels:2,  boots:1, flats:2 } },
  Luxury:        { stylePreference:"luxury",  woodFinish:"dark",   dimensions:{ width:168, height:108, depth:26 }, wardrobe:{ longDresses:15, shortJackets:10, suits:6, shirts:20, pants:10, tShirts:15, sweaters:8, jeans:5, underwear:15, bags:10, belts:5, jewelry:true,  ties:6 }, shoes:{ sneakers:4, heels:12, boots:5, flats:8 } },
  Modern:        { stylePreference:"modern",  woodFinish:"medium", dimensions:{ width:96,  height:96,  depth:24 }, wardrobe:{ longDresses:4,  shortJackets:4,  suits:2, shirts:10, pants:5,  tShirts:12, sweaters:5, jeans:4, underwear:10, bags:3,  belts:2, jewelry:false, ties:1 }, shoes:{ sneakers:6, heels:3,  boots:2, flats:4 } },
  Rustic:        { stylePreference:"rustic",  woodFinish:"dark",   dimensions:{ width:96,  height:96,  depth:22 }, wardrobe:{ longDresses:3,  shortJackets:4,  suits:1, shirts:8,  pants:4,  tShirts:10, sweaters:6, jeans:5, underwear:8,  bags:2,  belts:2, jewelry:false, ties:0 }, shoes:{ sneakers:5, heels:1,  boots:4, flats:2 } },
};

// ─── SVG Sketches ──────────────────────────────────────────────────────────────

function ClosetSketch({ pattern }: { pattern: GalleryItem["svgPattern"] }) {
  const W = 200, H = 130;
  const configs: Record<GalleryItem["svgPattern"], { zones: { x:number; w:number; type:"double"|"single"|"shelves"|"drawers"|"open" }[] }> = {
    minimal:     { zones:[{ x:0,   w:88,  type:"double"  },{ x:92,  w:108, type:"shelves" }] },
    glam:        { zones:[{ x:0,   w:56,  type:"single"  },{ x:60,  w:68,  type:"shelves" },{ x:132, w:68, type:"drawers" }] },
    "small-glam":{ zones:[{ x:0,   w:64,  type:"single"  },{ x:68,  w:132, type:"drawers" }] },
    compact:     { zones:[{ x:0,   w:110, type:"double"  },{ x:114, w:86,  type:"drawers" }] },
    luxury:      { zones:[{ x:0,   w:56,  type:"single"  },{ x:60,  w:52,  type:"shelves" },{ x:116, w:52, type:"drawers" },{ x:172, w:28, type:"open" }] },
    "open-luxury":{ zones:[{ x:0,  w:60,  type:"single"  },{ x:64,  w:60,  type:"shelves" },{ x:128, w:72, type:"drawers" }] },
    modern:      { zones:[{ x:0,   w:76,  type:"double"  },{ x:80,  w:76,  type:"double"  },{ x:160, w:40, type:"shelves" }] },
    rustic:      { zones:[{ x:0,   w:96,  type:"single"  },{ x:100, w:100, type:"shelves" }] },
    city:        { zones:[{ x:0,   w:72,  type:"double"  },{ x:76,  w:56,  type:"drawers" },{ x:136, w:64, type:"shelves" }] },
  };
  const { zones } = configs[pattern];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={W} height={H} fill="#f5f0eb" rx="2"/>
      <line x1="0" y1={H-4} x2={W} y2={H-4} stroke="#c8bfb0" strokeWidth="0.8"/>
      {zones.map((z,i) => {
        const px=z.x+2,py=8,pw=z.w-4,ph=H-20;
        return (
          <g key={i}>
            <rect x={px} y={py} width={pw} height={ph} fill="#ede8e1" rx="1"/>
            {z.type==="double" && (<>
              <line x1={px+4} y1={py+22} x2={px+pw-4} y2={py+22} stroke="#b0a495" strokeWidth="1.5"/>
              {Array.from({length:Math.max(1,Math.floor(pw/10))}).map((_,j)=><rect key={j} x={px+4+j*10} y={py+23} width="7" height="16" fill="#d4cbc0" rx="0.5" opacity="0.7"/>)}
              <line x1={px+4} y1={py+55} x2={px+pw-4} y2={py+55} stroke="#b0a495" strokeWidth="1.5"/>
              {Array.from({length:Math.max(1,Math.floor(pw/10))}).map((_,j)=><rect key={j} x={px+4+j*10} y={py+56} width="7" height="12" fill="#d4cbc0" rx="0.5" opacity="0.7"/>)}
            </>)}
            {z.type==="single" && (<>
              <line x1={px+4} y1={py+18} x2={px+pw-4} y2={py+18} stroke="#b0a495" strokeWidth="1.5"/>
              {Array.from({length:Math.max(1,Math.floor(pw/10))}).map((_,j)=><rect key={j} x={px+4+j*10} y={py+19} width="7" height="28" fill="#d4cbc0" rx="0.5" opacity="0.7"/>)}
              <rect x={px+2} y={py+ph-22} width={pw-4} height="2" fill="#b0a495"/>
              {Array.from({length:Math.max(1,Math.floor((pw-4)/12))}).map((_,j)=><ellipse key={j} cx={px+8+j*12} cy={py+ph-13} rx="4" ry="6" fill="#c8bfb0" opacity="0.8"/>)}
            </>)}
            {z.type==="shelves" && (<>
              {[0.2,0.38,0.56,0.74].map((frac,j)=>(
                <g key={j}>
                  <rect x={px+2} y={py+ph*frac} width={pw-4} height="2" fill="#b0a495"/>
                  {Array.from({length:Math.max(1,Math.floor((pw-8)/12))}).map((_,k)=><rect key={k} x={px+4+k*12} y={py+ph*frac-10} width="9" height="9" fill="#d4cbc0" rx="1" opacity="0.7"/>)}
                </g>
              ))}
            </>)}
            {z.type==="open" && (<>
              {[0.15,0.42,0.69].map((frac,j)=>(<g key={j}><rect x={px+1} y={py+ph*frac} width={pw-2} height="1.5" fill="#b0a495"/></g>))}
            </>)}
            {z.type==="drawers" && (<>
              {[0.12,0.28,0.44,0.60,0.76].map((frac)=>(
                <g key={frac}>
                  <rect x={px+2} y={py+ph*frac} width={pw-4} height={ph*0.13} fill="#d4cbc0" rx="1" stroke="#b0a495" strokeWidth="0.5"/>
                  <line x1={px+pw/2-5} y1={py+ph*frac+ph*0.065} x2={px+pw/2+5} y2={py+ph*frac+ph*0.065} stroke="#8f8070" strokeWidth="1"/>
                </g>
              ))}
            </>)}
            {i<zones.length-1 && <line x1={px+pw+2} y1={py} x2={px+pw+2} y2={py+ph} stroke="#c8bfb0" strokeWidth="0.8" strokeDasharray="3,2"/>}
          </g>
        );
      })}
      <rect x="0" y="0" width={W} height="6" fill="#c8bfb0" rx="1"/>
    </svg>
  );
}

// ─── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose, onStart }: { item: GalleryItem; onClose: () => void; onStart: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const preset = item.style !== "All" ? STYLE_PRESETS[item.style as Exclude<StyleTag,"All">] : null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{opacity:0,scale:0.96,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96}} transition={{duration:0.2}} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className={`${item.bg} p-8 relative`} style={{height:240}}>
          <ClosetSketch pattern={item.svgPattern}/>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/70 hover:bg-white text-charcoal-500 transition-colors"><X size={16}/></button>
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-white/80 text-charcoal-500">{item.style}</span>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className={`font-serif text-2xl ${item.accent} leading-tight`}>{item.title}</h2>
              <p className="text-sm text-charcoal-400 mt-0.5">{item.sqft}</p>
            </div>
          </div>
          <p className="text-sm text-charcoal-500 leading-relaxed mb-4">{item.description}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {item.highlight.split(" · ").map((spec) => (
              <span key={spec} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream-100 text-charcoal-500 border border-cream-200">{spec}</span>
            ))}
            {preset && (<>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream-100 text-charcoal-500 border border-cream-200">
                {preset.woodFinish==="light"?"Light oak":preset.woodFinish==="medium"?"Warm walnut":preset.woodFinish==="dark"?"Dark espresso":"Painted white"} finish
              </span>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream-100 text-charcoal-500 border border-cream-200">
                {preset.dimensions.width}″ × {preset.dimensions.height}″ × {preset.dimensions.depth}″
              </span>
            </>)}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onStart} className="flex-1 inline-flex items-center justify-center gap-2 bg-charcoal-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-charcoal-500 transition-colors">
              Start from this style <ArrowRight size={14}/>
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-charcoal-500 bg-cream-50 hover:bg-cream-100 border border-cream-200 transition-colors">Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Moodboard drawer ──────────────────────────────────────────────────────────

function MoodboardDrawer({ ids, items, onRemove, onStart, onClose }: {
  ids: number[]; items: GalleryItem[]; onRemove: (id: number) => void;
  onStart: (item: GalleryItem) => void; onClose: () => void;
}) {
  const saved = items.filter((it) => ids.includes(it.id));
  return (
    <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",stiffness:320,damping:34}}
      className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xs bg-white shadow-2xl border-l border-stone-200 flex flex-col pt-16">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <BookMarked size={16} className="text-taupe-500"/>
          <span className="font-semibold text-charcoal-700 text-sm">Mood Board</span>
          <span className="text-xs text-white bg-taupe-500 rounded-full px-1.5 py-0.5 leading-none">{saved.length}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"><X size={14}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {saved.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-stone-300 gap-2">
            <Heart size={28} className="opacity-40"/>
            <p className="text-xs">No inspirations saved yet.<br/>Heart a design to save it here.</p>
          </div>
        )}
        {saved.map((it) => (
          <div key={it.id} className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
            <div className={`${it.bg} h-20 p-2`}>
              <ClosetSketch pattern={it.svgPattern}/>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-charcoal-700 truncate">{it.title}</p>
                <p className="text-[10px] text-stone-400">{it.style} · {it.sqft}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onStart(it)} title="Start from this style"
                  className="p-1.5 rounded-lg bg-charcoal-600 hover:bg-charcoal-500 text-white transition-colors">
                  <ArrowRight size={11}/>
                </button>
                <button onClick={() => onRemove(it.id)} title="Remove from mood board"
                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                  <Trash2 size={11}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {saved.length > 0 && (
        <div className="px-4 py-3 border-t border-stone-100">
          <button
            onClick={() => { localStorage.removeItem(MOODBOARD_KEY); saved.forEach((it) => onRemove(it.id)); }}
            className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg py-2 transition-colors">
            Clear all
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Tags / constants ──────────────────────────────────────────────────────────

const tags: StyleTag[]   = ["All","Minimal","Glam","Small Space","Luxury","Modern","Rustic"];
const sizes: SizeTag[]   = ["Any Size","Compact (≤ 60 sq ft)","Standard (60–120 sq ft)","Large (120+ sq ft)"];
const finishes: FinishTag[] = ["Any Finish","Light Oak","Warm Walnut","Dark Espresso","Painted White"];

// ─── GalleryPage ───────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const HISTORY_PAGE_SIZE = 20;
  const [, navigate] = useLocation();

  type SortOrder = "default" | "name-asc" | "name-desc" | "sqft-asc" | "sqft-desc";

  const [activeTag,    setActiveTag]    = useState<StyleTag>("All");
  const [activeSize,   setActiveSize]   = useState<SizeTag>("Any Size");
  const [activeFinish, setActiveFinish] = useState<FinishTag>("Any Finish");
  const [sortOrder,    setSortOrder]    = useState<SortOrder>("default");
  const [showSort,     setShowSort]     = useState(false);
  const [hoveredId,    setHoveredId]    = useState<number|null>(null);
  const [previewItem,  setPreviewItem]  = useState<GalleryItem|null>(null);

  // Moodboard
  const [moodboard, setMoodboard] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(MOODBOARD_KEY)||"[]") as number[]; } catch { return []; }
  });
  const [showMoodboard, setShowMoodboard] = useState(false);
  const [gallerySearch, setGallerySearch] = useState("");

  const toggleHeart = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMoodboard((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(MOODBOARD_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Admin comment history
  const [isAdmin] = useState(() => Boolean(localStorage.getItem("alveo-events-admin-token")));
  const [commentHistory,        setCommentHistory]        = useState<CommentHistoryItem[]>([]);
  const [historyDesignFilter,   setHistoryDesignFilter]   = useState("");
  const [historyAuthorFilter,   setHistoryAuthorFilter]   = useState("");
  const [mentionsOnly,          setMentionsOnly]          = useState(false);
  const [historyFromDate,       setHistoryFromDate]       = useState("");
  const [historyToDate,         setHistoryToDate]         = useState("");
  const [historySort,           setHistorySort]           = useState<CommentSort>("newest");
  const [historyPage,           setHistoryPage]           = useState(1);
  const [historyHasNextPage,    setHistoryHasNextPage]    = useState(false);
  const [historyTotal,          setHistoryTotal]          = useState(0);

  useEffect(() => { document.title = "Inspiration Gallery | Alvéo"; }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("alveo-events-admin-token") ?? "";
    const controller = new AbortController();
    const params = new URLSearchParams({ all:"1", page:String(historyPage), pageSize:String(HISTORY_PAGE_SIZE) });
    if (historyDesignFilter.trim()) params.set("designId", historyDesignFilter.trim());
    if (historyAuthorFilter.trim()) params.set("author",   historyAuthorFilter.trim());
    if (mentionsOnly)               params.set("mentionsOnly","1");
    if (historyFromDate)            params.set("from", historyFromDate);
    if (historyToDate)              params.set("to",   historyToDate);
    params.set("sort", historySort);
    fetch(`${BASE}/api/design-comments?${params.toString()}`, { headers:{"x-admin-token":token}, cache:"no-store", signal:controller.signal })
      .then((r) => r.ok ? r.json() : { comments:[] })
      .then((data: CommentHistoryResponse) => {
        setCommentHistory(data.comments ?? []);
        setHistoryHasNextPage(!!data.hasNextPage);
        setHistoryTotal(data.total ?? 0);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isAdmin, historyDesignFilter, historyAuthorFilter, mentionsOnly, historyFromDate, historyToDate, historySort, historyPage]);

  // Filtered + sorted items
  const finishMatch = FINISH_MAP[activeFinish];
  const filtered = items.filter((it) => {
    if (activeTag  !== "All"      && it.style  !== activeTag) return false;
    if (activeSize !== "Any Size" && it.size   !== SIZE_MAP[activeSize as Exclude<SizeTag,"Any Size">]) return false;
    if (finishMatch !== null      && it.finish !== finishMatch) return false;
    if (gallerySearch.trim()) {
      const q = gallerySearch.toLowerCase();
      if (!it.title.toLowerCase().includes(q) && !it.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sorted = (() => {
    const arr = [...filtered];
    if (sortOrder === "name-asc")  return arr.sort((a,b) => a.title.localeCompare(b.title));
    if (sortOrder === "name-desc") return arr.sort((a,b) => b.title.localeCompare(a.title));
    if (sortOrder === "sqft-asc")  return arr.sort((a,b) => a.sqft.localeCompare(b.sqft));
    if (sortOrder === "sqft-desc") return arr.sort((a,b) => b.sqft.localeCompare(a.sqft));
    return arr;
  })();
  const SORT_LABELS: Record<string, string> = { "default":"Default", "name-asc":"Name A→Z", "name-desc":"Name Z→A", "sqft-asc":"Size ↑", "sqft-desc":"Size ↓" };

  const startFromStyle = (item: GalleryItem) => {
    if (item.style === "All") return;
    const preset = STYLE_PRESETS[item.style as Exclude<StyleTag,"All">];
    const draft = {
      config: {
        dimensions: preset.dimensions,
        userInfo: {
          stylePreference: preset.stylePreference,
          woodFinish: preset.woodFinish,
        },
        wardrobe: preset.wardrobe,
        shoes: preset.shoes,
      },
      currentStep: "wardrobe",
    };
    localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
    navigate("/configure");
  };

  const filterPillBase = "px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer";
  const filterPillActive = "bg-charcoal-600 text-white border-charcoal-600";
  const filterPillInactive = "bg-white text-charcoal-500 border-cream-300 hover:border-charcoal-400";

  return (
    <div className="min-h-screen bg-cream-50 pt-16">

      {/* Moodboard button — floating */}
      {moodboard.length > 0 && !showMoodboard && (
        <button
          onClick={() => setShowMoodboard(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-taupe-500 hover:bg-taupe-600 text-white text-sm font-semibold shadow-lg transition-all"
        >
          <BookMarked size={15}/>
          Mood Board
          <span className="w-5 h-5 rounded-full bg-white text-taupe-600 text-[10px] font-bold flex items-center justify-center leading-none">
            {moodboard.length}
          </span>
        </button>
      )}

      {/* Moodboard drawer */}
      <AnimatePresence>
        {showMoodboard && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowMoodboard(false)}/>
            <MoodboardDrawer
              ids={moodboard} items={items}
              onRemove={(id) => setMoodboard((prev) => { const next=prev.filter(x=>x!==id); localStorage.setItem(MOODBOARD_KEY,JSON.stringify(next)); return next; })}
              onStart={(item) => { startFromStyle(item); setShowMoodboard(false); }}
              onClose={() => setShowMoodboard(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-taupe-400 font-medium mb-2">Inspiration</p>
            <h1 className="font-serif text-5xl text-charcoal-600">Find your style</h1>
            <p className="text-charcoal-400 mt-2 max-w-xl text-sm leading-relaxed">
              Browse curated closet designs — filter by style, size, and finish. Heart any design to save it to your mood board.
            </p>
          </div>
          {moodboard.length > 0 && (
            <button onClick={() => setShowMoodboard(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-taupe-200 bg-taupe-50 hover:bg-taupe-100 text-taupe-700 text-sm font-medium transition-colors">
              <BookMarked size={15}/>
              Mood Board ({moodboard.length})
            </button>
          )}
        </div>

        {/* Style filter */}
        <div className="sticky top-16 z-10 bg-cream-50/95 backdrop-blur-sm pb-3 pt-2 -mx-6 px-6 border-b border-cream-200">
          {/* Keyword search */}
          <div className="relative mb-2.5">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"/>
            <input
              value={gallerySearch} onChange={e => setGallerySearch(e.target.value)}
              placeholder="Search by name or description…"
              className="w-full pl-8 pr-8 py-2 text-sm bg-white border border-cream-200 rounded-xl text-charcoal-600 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-taupe-300 focus:border-taupe-300"
            />
            {gallerySearch && (
              <button onClick={() => setGallerySearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-stone-300 hover:text-stone-500">
                <X size={12}/>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            {tags.map((t) => (
              <button key={t} onClick={() => setActiveTag(t)}
                className={`${filterPillBase} ${activeTag===t ? filterPillActive : filterPillInactive}`}>{t}</button>
            ))}
            <motion.span
              key={sorted.length}
              initial={{ scale: 1.2, color: "#8b7355" }} animate={{ scale: 1, color: "#a8a29e" }}
              transition={{ duration: 0.3 }}
              className="ml-auto text-[10px] font-medium tabular-nums">
              {sorted.length !== items.length ? `${sorted.length} of ${items.length}` : `${items.length}`} designs
            </motion.span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {sizes.map((s) => (
              <button key={s} onClick={() => setActiveSize(s)}
                className={`${filterPillBase} ${activeSize===s ? "bg-taupe-500 text-white border-taupe-500" : filterPillInactive} text-[11px]`}>{s}</button>
            ))}
            <div className="w-px h-5 bg-cream-300 self-center mx-1"/>
            {finishes.map((f) => (
              <button key={f} onClick={() => setActiveFinish(f)}
                className={`${filterPillBase} ${activeFinish===f ? "bg-amber-600 text-white border-amber-600" : filterPillInactive} text-[11px]`}>{f}</button>
            ))}
            <div className="w-px h-5 bg-cream-300 self-center mx-1"/>
            {/* Sort dropdown */}
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)}
                className={`${filterPillBase} flex items-center gap-1.5 text-[11px] ${sortOrder !== "default" ? "bg-charcoal-600 text-white border-charcoal-600" : filterPillInactive}`}>
                <ArrowUpDown size={11}/> {SORT_LABELS[sortOrder]}
              </button>
              {showSort && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl border border-stone-200 shadow-lg py-1 min-w-[140px]"
                  onMouseLeave={() => setShowSort(false)}>
                  {(["default","name-asc","name-desc","sqft-asc","sqft-desc"] as const).map((o) => (
                    <button key={o} onClick={() => { setSortOrder(o); setShowSort(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] transition-colors
                        ${sortOrder===o ? "bg-charcoal-50 text-charcoal-700 font-semibold" : "text-stone-600 hover:bg-stone-50"}`}>
                      {SORT_LABELS[o]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-charcoal-400 gap-3">
            <p className="text-lg font-serif">No designs match your filters</p>
            <button onClick={() => { setActiveTag("All"); setActiveSize("Any Size"); setActiveFinish("Any Finish"); setSortOrder("default"); }}
              className="text-sm text-taupe-600 hover:underline">Clear all filters</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((item) => {
            const hearted = moodboard.includes(item.id);
            return (
              <motion.div key={item.id} layout initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.25}}
                className="group relative bg-white rounded-2xl border border-cream-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                onMouseEnter={() => setHoveredId(item.id)} onMouseLeave={() => setHoveredId(null)}>

                {/* Sketch */}
                <div className={`${item.bg} relative overflow-hidden`} style={{height:180}}>
                  <div className="absolute inset-0 p-4"><ClosetSketch pattern={item.svgPattern}/></div>

                  {/* Heart button */}
                  <button onClick={(e) => toggleHeart(item.id, e)}
                    className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10
                      ${hearted ? "bg-red-100 text-red-500" : "bg-white/70 text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-500"}`}
                    title={hearted ? "Remove from mood board" : "Save to mood board"}>
                    <Heart size={14} fill={hearted ? "currentColor" : "none"}/>
                  </button>

                  {/* Finish chip */}
                  <span className="absolute top-3 left-3 text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-white/80 text-charcoal-500">
                    {item.finish==="light"?"Light Oak":item.finish==="medium"?"Warm Walnut":item.finish==="dark"?"Dark Espresso":"Painted White"}
                  </span>

                  {/* Hover overlay */}
                  <AnimatePresence>
                    {hoveredId === item.id && (
                      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
                        className="absolute inset-0 bg-charcoal-600/85 p-4 flex flex-col justify-end">
                        <p className="text-white/80 text-xs leading-relaxed mb-3 line-clamp-3">{item.description}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.highlight.split(" · ").slice(0,2).map((h) => (
                            <span key={h} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/20 text-white/80">{h}</span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startFromStyle(item)}
                            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-white text-charcoal-600 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors">
                            Start from this <ArrowRight size={11}/>
                          </button>
                          <button onClick={() => setPreviewItem(item)}
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                            <Maximize2 size={13}/>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Card footer */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={`font-serif text-base font-medium ${item.accent} truncate`}>{item.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-charcoal-400">{item.style}</span>
                        <span className="text-charcoal-200">·</span>
                        <span className="text-[10px] text-charcoal-400">{item.sqft}</span>
                      </div>
                    </div>
                    <button onClick={() => setPreviewItem(item)}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-cream-50 border border-cream-200 text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100 transition-colors">
                      <ChevronRight size={13}/>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        {filtered.length > 0 && (
          <div className="mt-16 text-center bg-white rounded-2xl border border-cream-200 py-12 px-6">
            <p className="text-xs uppercase tracking-widest text-taupe-400 font-medium mb-3">Don't see what you like?</p>
            <h2 className="font-serif text-3xl text-charcoal-600 mb-3">Design it yourself</h2>
            <p className="text-charcoal-400 text-sm mb-6 max-w-sm mx-auto">Start with a blank canvas and build your perfect closet from scratch using our interactive design studio.</p>
            <Link href="/studio"
              className="inline-flex items-center gap-2 bg-charcoal-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-charcoal-500 transition-colors">
              Open Design Studio <ArrowRight size={15}/>
            </Link>
          </div>
        )}
      </div>

      {/* Admin comment history */}
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl border border-cream-200 p-6">
            <h2 className="font-serif text-2xl text-charcoal-600 mb-4">Comment History <span className="text-sm font-sans text-charcoal-400 ml-2">(admin)</span></h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <input value={historyDesignFilter} onChange={(e)=>setHistoryDesignFilter(e.target.value)} placeholder="Filter by design ID" className="px-3 py-1.5 border border-cream-300 rounded-lg text-sm text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"/>
              <input value={historyAuthorFilter} onChange={(e)=>setHistoryAuthorFilter(e.target.value)} placeholder="Filter by author" className="px-3 py-1.5 border border-cream-300 rounded-lg text-sm text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"/>
              <input type="date" value={historyFromDate} onChange={(e)=>setHistoryFromDate(e.target.value)} className="px-3 py-1.5 border border-cream-300 rounded-lg text-sm text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"/>
              <input type="date" value={historyToDate} onChange={(e)=>setHistoryToDate(e.target.value)} className="px-3 py-1.5 border border-cream-300 rounded-lg text-sm text-charcoal-600 focus:outline-none focus:ring-2 focus:ring-taupe-300"/>
              <label className="flex items-center gap-2 text-sm text-charcoal-500 cursor-pointer">
                <input type="checkbox" checked={mentionsOnly} onChange={(e)=>setMentionsOnly(e.target.checked)} className="accent-taupe-500"/>
                Mentions only
              </label>
              <select value={historySort} onChange={(e)=>setHistorySort(e.target.value as CommentSort)} className="px-3 py-1.5 border border-cream-300 rounded-lg text-sm text-charcoal-600 focus:outline-none bg-white">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most-mentioned">Most mentioned</option>
              </select>
            </div>
            <p className="text-xs text-charcoal-400 mb-3">{historyTotal} comment{historyTotal!==1?"s":""} total</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {commentHistory.map((c) => (
                <div key={c.id} className="bg-cream-50 rounded-xl px-4 py-3 border border-cream-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-charcoal-600">{c.author}</span>
                    <span className="text-[10px] text-charcoal-400">{new Date(c.createdAt).toLocaleString()}</span>
                    {c.designId && <span className="text-[10px] font-mono text-charcoal-300 ml-auto truncate max-w-[120px]">{c.designId}</span>}
                  </div>
                  <p className="text-sm text-charcoal-600">{c.text}</p>
                  {c.mentions && c.mentions.length > 0 && <p className="text-[10px] text-taupe-500 mt-1">{c.mentions.map(m=>`@${m}`).join(" ")}</p>}
                </div>
              ))}
            </div>
            {(historyPage > 1 || historyHasNextPage) && (
              <div className="flex items-center gap-3 mt-4">
                <button disabled={historyPage===1} onClick={()=>setHistoryPage(p=>p-1)} className="px-3 py-1.5 rounded-lg text-xs border border-cream-300 disabled:opacity-40 hover:bg-cream-100 transition-colors">← Prev</button>
                <span className="text-xs text-charcoal-400">Page {historyPage}</span>
                <button disabled={!historyHasNextPage} onClick={()=>setHistoryPage(p=>p+1)} className="px-3 py-1.5 rounded-lg text-xs border border-cream-300 disabled:opacity-40 hover:bg-cream-100 transition-colors">Next →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {previewItem && (
          <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onStart={() => { startFromStyle(previewItem); setPreviewItem(null); }}/>
        )}
      </AnimatePresence>
    </div>
  );
}
