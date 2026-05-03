import { useState, useRef, useEffect, useCallback, type ReactElement } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/lib/toast";
import {
  ArrowLeft, ArrowRight, Check, Plus, GripVertical, Trash2, Bookmark, BookmarkCheck,
  ExternalLink, AlertCircle, FolderOpen, Clock, X, Loader2, Pencil, Copy,
  RotateCcw, RotateCw, Palette, HelpCircle,
} from "lucide-react";
import { BUILTIN_CATALOGUE, getCat, type CatalogueEntry } from "@/types/catalogue";
import { getStoredToken } from "@/lib/AuthContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClosetKind = "reach-in" | "walkin-single" | "walkin-l" | "walkin-u";

interface StudioModule { id: string; type: string; label: string; width: number }

let _id = 0;
const sid = () => `s${++_id}_${Date.now().toString(36)}`;

const CLOSET_TYPES: Array<{ kind: ClosetKind; label: string; desc: string; svg: ReactElement }> = [
  {
    kind: "reach-in", label: "Reach-In", desc: "Single open wall, typically 60–96\" wide",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="2" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="8" y1="42" x2="72" y2="42" stroke="#c4b5a5" strokeWidth="1"/>
        <line x1="40" y1="8" x2="40" y2="42" stroke="#d6ccc2" strokeWidth="1" strokeDasharray="2,2"/>
        <rect x="10" y="44" width="28" height="6" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1"/>
        <rect x="42" y="44" width="28" height="6" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1"/>
        <circle cx="39" cy="47" r="1.5" fill="#a89080"/><circle cx="41" cy="47" r="1.5" fill="#a89080"/>
        <line x1="14" y1="14" x2="36" y2="14" stroke="#b8a898" strokeWidth="1"/>
        <line x1="14" y1="20" x2="36" y2="20" stroke="#b8a898" strokeWidth="1"/>
        <rect x="14" y="24" width="22" height="14" rx="1" fill="#e0d8ce" stroke="#c4b5a5" strokeWidth="1"/>
        <line x1="44" y1="14" x2="66" y2="14" stroke="#b8a898" strokeWidth="1"/>
        <line x1="44" y1="20" x2="66" y2="20" stroke="#b8a898" strokeWidth="1"/>
        <line x1="44" y1="26" x2="66" y2="26" stroke="#b8a898" strokeWidth="1"/>
        <line x1="44" y1="32" x2="66" y2="32" stroke="#b8a898" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    kind: "walkin-single", label: "Walk-In · Single Wall", desc: "One wall of storage, open floor plan",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <rect x="4" y="4" width="72" height="52" rx="2" fill="none" stroke="#c4b5a5" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="4" y="4" width="72" height="18" rx="2" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="22" y1="4" x2="22" y2="22" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="40" y1="4" x2="40" y2="22" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="58" y1="4" x2="58" y2="22" stroke="#d6ccc2" strokeWidth="1"/>
        <rect x="6" y="6" width="14" height="8" rx="1" fill="#e0d8ce" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="24" y="6" width="14" height="4" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="24" y="12" width="14" height="4" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="42" y="6" width="14" height="14" rx="1" fill="#ede9e4" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="60" y="6" width="12" height="5" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="60" y="13" width="12" height="5" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <path d="M4 56 L4 52 L76 52" stroke="#c4b5a5" strokeWidth="1.5" fill="none"/>
        <rect x="30" y="50" width="12" height="8" fill="white" stroke="#c4b5a5" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    kind: "walkin-l", label: "Walk-In · L-Shape", desc: "Two walls of storage, L-shaped layout",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <path d="M4 4 L76 4 L76 56 L4 56 L4 4" fill="none" stroke="#c4b5a5" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="4" y="4" width="72" height="16" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="16" height="52" fill="#f0ece6" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="16" height="16" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="22" y1="4" x2="22" y2="20" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="40" y1="4" x2="40" y2="20" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="58" y1="4" x2="58" y2="20" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="24" x2="20" y2="24" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="38" x2="20" y2="38" stroke="#d6ccc2" strokeWidth="1"/>
        <path d="M76 56 L76 52 L20 52" stroke="#c4b5a5" strokeWidth="1.5" fill="none"/>
        <rect x="38" y="48" width="12" height="8" fill="white" stroke="#c4b5a5" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    kind: "walkin-u", label: "Walk-In · U-Shape", desc: "Three walls of storage, maximum capacity",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <path d="M4 4 L76 4 L76 56 L4 56 L4 4" fill="none" stroke="#c4b5a5" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="4" y="4" width="72" height="14" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="14" height="52" fill="#f0ece6" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="62" y="4" width="14" height="52" fill="#f0ece6" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="14" height="14" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="62" y="4" width="14" height="14" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="22" y1="4" x2="22" y2="18" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="40" y1="4" x2="40" y2="18" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="58" y1="4" x2="58" y2="18" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="26" x2="18" y2="26" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="40" x2="18" y2="40" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="62" y1="26" x2="76" y2="26" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="62" y1="40" x2="76" y2="40" stroke="#d6ccc2" strokeWidth="1"/>
        <path d="M22 56 L22 52 L58 52 L58 56" stroke="#c4b5a5" strokeWidth="1.5" fill="none"/>
        <rect x="34" y="48" width="12" height="8" fill="white" stroke="#c4b5a5" strokeWidth="1"/>
      </svg>
    ),
  },
];

const STUDIO_PRESETS = [
  { name: "Blank Canvas", icon: "⬜", desc: "Start from scratch", modules: [] },
  { name: "His & Hers",   icon: "👫", desc: "Symmetric hang + centre storage", modules: [
    { type:"long-hang",   label:"Her Side", width:30 },
    { type:"drawers",     label:"Drawers",  width:18 },
    { type:"shoe-shelves",label:"Shoes",    width:18 },
    { type:"long-hang",   label:"His Side", width:30 },
  ]},
  { name: "Master Suite", icon: "🏠", desc: "Full-featured walk-in", modules: [
    { type:"double-hang", label:"Double Hang", width:24 },
    { type:"long-hang",   label:"Long Hang",   width:30 },
    { type:"drawers",     label:"Drawers",     width:18 },
    { type:"shoe-shelves",label:"Shoes",       width:18 },
    { type:"double-hang", label:"Double Hang", width:24 },
  ]},
  { name: "Studio Apt",   icon: "🏢", desc: "Compact essentials", modules: [
    { type:"long-hang",   label:"Long Hang", width:30 },
    { type:"drawers",     label:"Drawers",   width:18 },
    { type:"shoe-shelves",label:"Shoes",     width:18 },
  ]},
];

// ─── Finish picker ────────────────────────────────────────────────────────────

const FINISH_SWATCHES = [
  { id:"light",  label:"Light Oak",     color:"#f0ebe3", border:"#c4b096" },
  { id:"medium", label:"Warm Walnut",   color:"#d4c2a8", border:"#a08070" },
  { id:"dark",   label:"Dark Espresso", color:"#8d7060", border:"#5d4030" },
  { id:"white",  label:"Painted White", color:"#f8f8f6", border:"#d0d0ce" },
];

function FinishPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Palette size={11} className="text-stone-400 flex-shrink-0"/>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex-shrink-0">Finish</p>
      <div className="flex gap-1.5 items-center">
        {FINISH_SWATCHES.map((s) => (
          <button key={s.id} onClick={() => onChange(s.id)} title={s.label}
            className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0
              ${value === s.id ? "ring-2 ring-offset-1 ring-taupe-500 scale-110" : "hover:scale-105"}`}
            style={{ backgroundColor: s.color, borderColor: s.border }}/>
        ))}
      </div>
      <span className="text-[10px] text-stone-400">
        {FINISH_SWATCHES.find(s => s.id === value)?.label ?? ""}
      </span>
    </div>
  );
}

// ─── Mini isometric preview ───────────────────────────────────────────────────

function StudioMiniPreview({ modules, wallW, wallH, wallD, finish }: {
  modules: StudioModule[]; wallW: number; wallH: number; wallD: number; finish: string;
}) {
  const CW = 260, CH = 160;
  const totalW = Math.max(wallW, 1);
  const S = Math.min((CW * 0.42) / totalW, 3.2, (CH * 0.52) / wallH);
  const cos30 = 0.866, sin30 = 0.5;
  const ox = CW * 0.27, oy = CH * 0.86;

  const proj = (wx: number, wy: number, wz: number) => ({
    x: (wx * cos30 - wz * cos30) * S + ox,
    y: (wx * sin30 + wz * sin30 - wy) * S + oy,
  });

  const WOOD:  Record<string,string> = { light:"#f0ebe3", medium:"#d4c2a8", dark:"#8d7060", white:"#f8f8f6" };
  const SIDES: Record<string,string> = { light:"#d4c9b8", medium:"#b5a089", dark:"#6d5040", white:"#e0e0de" };
  const TOPS:  Record<string,string> = { light:"#e8e0d5", medium:"#c8b899", dark:"#7d6050", white:"#f4f4f2" };
  const face = WOOD[finish]  ?? WOOD.medium;
  const side = SIDES[finish] ?? SIDES.medium;
  const top  = TOPS[finish]  ?? TOPS.medium;

  const pts = (a: { x:number; y:number }[]) => a.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const D = Math.min(wallD, 22);

  let cx = 0;
  const boxes = modules.map((m) => {
    const x0 = cx, x1 = cx + m.width;
    cx += m.width;
    return (
      <g key={m.id}>
        <polygon points={pts([proj(x0,0,0), proj(x1,0,0), proj(x1,wallH,0), proj(x0,wallH,0)])} fill={face} stroke={side} strokeWidth="0.7"/>
        <polygon points={pts([proj(x1,0,0), proj(x1,0,D),  proj(x1,wallH,D), proj(x1,wallH,0)])}  fill={side} stroke={side} strokeWidth="0.7"/>
        <polygon points={pts([proj(x0,wallH,0), proj(x1,wallH,0), proj(x1,wallH,D), proj(x0,wallH,D)])} fill={top} stroke={side} strokeWidth="0.7"/>
      </g>
    );
  });

  const p00 = proj(0,0,0), pW0 = proj(wallW,0,0);
  const p0D = proj(0,0,D),  pWD = proj(wallW,0,D);

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-full">
      <rect width={CW} height={CH} fill="#f5f3f0" rx="6"/>
      {modules.length > 0 && (
        <polygon points={pts([p00, pW0, pWD, p0D])} fill="#ede9e4" stroke="#c4b5a5" strokeWidth="0.5" opacity="0.7"/>
      )}
      {boxes}
      {modules.length > 0 && (
        <line x1={p00.x} y1={p00.y} x2={pW0.x} y2={pW0.y} stroke="#c4b5a5" strokeWidth="1.5"/>
      )}
      {modules.length === 0 && (
        <text x={CW/2} y={CH/2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#c8bfb0">
          Add modules to see preview
        </text>
      )}
    </svg>
  );
}

// ─── Step 1: Type / Room Shape Selection ──────────────────────────────────────

function TypeStep({ value, onChange }: { value: ClosetKind; onChange: (k: ClosetKind) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <p className="text-xs uppercase tracking-widest text-taupe-400 font-medium mb-1">Step 1 — Room Footprint</p>
      <h2 className="font-serif text-2xl font-bold text-charcoal-600 mb-1 text-center">What's your room shape?</h2>
      <p className="text-sm text-stone-400 mb-8 text-center">Choose the footprint that matches your space</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
        {CLOSET_TYPES.map((ct) => (
          <button key={ct.kind} onClick={() => onChange(ct.kind)}
            className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left hover:shadow-md
              ${value === ct.kind ? "border-taupe-500 bg-taupe-50 shadow-md" : "border-stone-200 bg-white hover:border-taupe-300"}`}>
            {value === ct.kind && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-taupe-500 flex items-center justify-center">
                <Check size={11} className="text-white" strokeWidth={3}/>
              </span>
            )}
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-cream-50">{ct.svg}</div>
            <div className="w-full">
              <p className="text-sm font-semibold text-charcoal-600">{ct.label}</p>
              <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{ct.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Visual Dimension Canvas ─────────────────────────────────────────

const CANVAS_PX_W = 560;
const CANVAS_PX_H = 300;
const MARGIN = 64;
const HANDLE_R = 7;

function DimCanvas({ wallW, wallH, wallD, setWallW, setWallH, setWallD }: {
  wallW: number; wallH: number; wallD: number;
  setWallW: (v: number) => void; setWallH: (v: number) => void; setWallD: (v: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ handle:"left"|"right"|"top"; startClientX:number; startClientY:number; startW:number; startH:number; pxPerIn:number } | null>(null);

  const maxDispW = CANVAS_PX_W - 2 * MARGIN;
  const maxDispH = CANVAS_PX_H - MARGIN - 24;
  const scaleW = maxDispW / wallW;
  const scaleH = maxDispH / wallH;
  const pxPerIn = Math.min(scaleW, scaleH, 5.5);

  const dispW = wallW * pxPerIn;
  const dispH = wallH * pxPerIn;
  const rx = (CANVAS_PX_W - dispW) / 2;
  const ry = CANVAS_PX_H - 24 - dispH;

  const startDrag = useCallback((handle: "left"|"right"|"top", e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { handle, startClientX: e.clientX, startClientY: e.clientY, startW: wallW, startH: wallH, pxPerIn };
  }, [wallW, wallH, pxPerIn]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { handle, startClientX, startClientY, startW, startH, pxPerIn: ppi } = drag.current;
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (handle === "right") setWallW(Math.min(360, Math.max(36, Math.round(startW + dx / ppi))));
      if (handle === "left")  setWallW(Math.min(360, Math.max(36, Math.round(startW - dx / ppi))));
      if (handle === "top")   setWallH(Math.min(120, Math.max(72, Math.round(startH - dy / ppi))));
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [setWallW, setWallH]);

  const shelfY1 = ry + dispH * 0.28;
  const shelfY2 = ry + dispH * 0.55;
  const nDividers = Math.max(0, Math.floor(wallW / 20) - 1);
  const divStep = dispW / Math.floor(wallW / 20);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl">
      <div className="w-full bg-stone-50 rounded-2xl border border-stone-200 p-4 select-none overflow-hidden">
        <svg ref={svgRef} viewBox={`0 0 ${CANVAS_PX_W} ${CANVAS_PX_H}`} className="w-full"
          style={{ touchAction:"none", cursor: drag.current ? "grabbing" : "default" }}>
          <line x1={rx-20} y1={ry+dispH} x2={rx+dispW+20} y2={ry+dispH} stroke="#c4b5a5" strokeWidth="1.5"/>
          <rect x={rx} y={ry} width={dispW} height={dispH} fill="#f7f4f0" stroke="#c4b5a5" strokeWidth="1.5" rx="2"/>
          <rect x={rx} y={ry+dispH-12} width={dispW} height={12} fill="#ede8e2" stroke="#c4b5a5" strokeWidth="1"/>
          {Array.from({length:nDividers}).map((_,i) => (
            <line key={i} x1={rx+divStep*(i+1)} y1={ry+4} x2={rx+divStep*(i+1)} y2={ry+dispH-12} stroke="#d6ccc2" strokeWidth="1"/>
          ))}
          <rect x={rx+4} y={shelfY1} width={dispW-8} height={3} fill="#d6ccc2" rx="1"/>
          <rect x={rx+4} y={shelfY2} width={dispW-8} height={3} fill="#d6ccc2" rx="1"/>
          <rect x={rx} y={ry} width={dispW} height={6} fill="#ede8e2" rx="1"/>
          <line x1={rx} y1={ry+dispH+14} x2={rx+dispW} y2={ry+dispH+14} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx} y1={ry+dispH+10} x2={rx} y2={ry+dispH+18} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx+dispW} y1={ry+dispH+10} x2={rx+dispW} y2={ry+dispH+18} stroke="#a89080" strokeWidth="1"/>
          <text x={rx+dispW/2} y={ry+dispH+22} textAnchor="middle" fontSize="10" fill="#8c7a6e" fontFamily="monospace">{wallW}″</text>
          <line x1={rx-14} y1={ry} x2={rx-14} y2={ry+dispH} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx-18} y1={ry} x2={rx-10} y2={ry} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx-18} y1={ry+dispH} x2={rx-10} y2={ry+dispH} stroke="#a89080" strokeWidth="1"/>
          <text x={rx-22} y={ry+dispH/2} textAnchor="middle" fontSize="10" fill="#8c7a6e" fontFamily="monospace"
            transform={`rotate(-90,${rx-22},${ry+dispH/2})`}>{wallH}″</text>
          <g style={{cursor:"ew-resize"}} onMouseDown={(e) => startDrag("right",e)}>
            <rect x={rx+dispW-HANDLE_R} y={ry+dispH/2-HANDLE_R} width={HANDLE_R*2} height={HANDLE_R*2} rx={HANDLE_R} fill="#c4a882" stroke="white" strokeWidth="2"/>
            <text x={rx+dispW} y={ry+dispH/2+1} textAnchor="middle" fontSize="8" fill="white" dominantBaseline="middle">↔</text>
          </g>
          <g style={{cursor:"ew-resize"}} onMouseDown={(e) => startDrag("left",e)}>
            <rect x={rx-HANDLE_R} y={ry+dispH/2-HANDLE_R} width={HANDLE_R*2} height={HANDLE_R*2} rx={HANDLE_R} fill="#c4a882" stroke="white" strokeWidth="2"/>
            <text x={rx} y={ry+dispH/2+1} textAnchor="middle" fontSize="8" fill="white" dominantBaseline="middle">↔</text>
          </g>
          <g style={{cursor:"ns-resize"}} onMouseDown={(e) => startDrag("top",e)}>
            <rect x={rx+dispW/2-HANDLE_R} y={ry-HANDLE_R} width={HANDLE_R*2} height={HANDLE_R*2} rx={HANDLE_R} fill="#c4a882" stroke="white" strokeWidth="2"/>
            <text x={rx+dispW/2} y={ry+1} textAnchor="middle" fontSize="8" fill="white" dominantBaseline="middle">↕</text>
          </g>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full">
        {[
          { label:"Width",  unit:"in", value:wallW, min:36,  max:360, step:6, set:setWallW },
          { label:"Height", unit:"in", value:wallH, min:72,  max:120, step:6, set:setWallH },
          { label:"Depth",  unit:"in", value:wallD, min:14,  max:30,  step:2, set:setWallD },
        ].map(({ label, unit, value, min, max, step, set }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => set(Math.max(min, value-step))}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm flex-shrink-0 transition-colors">−</button>
              <input type="number" min={min} max={max} value={value}
                onChange={(e) => { const v=parseInt(e.target.value); if(!isNaN(v)) set(Math.min(max,Math.max(min,v))); }}
                className="flex-1 text-center text-sm font-mono border border-stone-200 rounded-lg px-1 py-1.5 text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white"/>
              <button onClick={() => set(Math.min(max, value+step))}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm flex-shrink-0 transition-colors">+</button>
              <span className="text-xs text-stone-400 w-4 flex-shrink-0">{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => set(parseInt(e.target.value))} className="w-full accent-taupe-500 h-1.5"/>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-400 text-center">Drag the handles on the wall to resize, or use the inputs. Depth is the closet's interior depth.</p>
    </div>
  );
}

// ─── Step 3: Drag & Drop Layout ───────────────────────────────────────────────

function LayoutStep({ modules, setModules, wallW, wallH, wallD, catalogue, finish, setFinish }: {
  modules: StudioModule[]; setModules: (m: StudioModule[]) => void;
  wallW: number; wallH: number; wallD: number;
  catalogue: CatalogueEntry[];
  finish: string; setFinish: (f: string) => void;
}) {
  const [dragOverIdx, setDragOverIdx] = useState<number|null>(null);

  // Inline label editing
  const [editingLabelId, setEditingLabelId] = useState<string|null>(null);
  const [editingLabelVal, setEditingLabelVal] = useState("");

  const commitLabel = (moduleId: string) => {
    const trimmed = editingLabelVal.trim();
    if (trimmed) setModules(modules.map(m => m.id === moduleId ? { ...m, label: trimmed } : m));
    setEditingLabelId(null);
  };

  // Module resize state
  const resizeDrag = useRef<{ moduleId:string; startX:number; startWidth:number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ moduleId:string; width:number }|null>(null);

  const totalUsed = (resizePreview
    ? modules.map(m => m.id === resizePreview.moduleId ? { ...m, width: resizePreview.width } : m)
    : modules
  ).reduce((s,m) => s+m.width, 0);

  const overWidth = totalUsed > wallW;
  const SCALE = Math.min(5.5, 660 / Math.max(wallW, 60));
  const CANVAS_H = 200;

  const displayModules = resizePreview
    ? modules.map(m => m.id === resizePreview.moduleId ? { ...m, width: resizePreview.width } : m)
    : modules;

  const startResize = useCallback((moduleId: string, startX: number, startWidth: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeDrag.current = { moduleId, startX, startWidth };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeDrag.current) return;
      const { moduleId, startX, startWidth } = resizeDrag.current;
      const dx = e.clientX - startX;
      const newW = Math.max(12, Math.round(startWidth + dx / SCALE));
      setResizePreview({ moduleId, width: newW });
    };
    const onUp = () => {
      if (resizeDrag.current && resizePreview) {
        setModules(modules.map(m => m.id === resizePreview.moduleId ? { ...m, width: resizePreview.width } : m));
        setResizePreview(null);
      }
      resizeDrag.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [SCALE, modules, resizePreview, setModules]);

  const readDrop = (e: React.DragEvent, atIdx: number) => {
    e.preventDefault(); setDragOverIdx(null);
    const src = e.dataTransfer.getData("studio-src");
    const typ = e.dataTransfer.getData("studio-type");
    if (src === "palette" && typ) {
      const cat = getCat(catalogue, typ);
      setModules([...modules.slice(0,atIdx), { id:sid(), type:typ, label:cat.label, width:cat.defaultWidth }, ...modules.slice(atIdx)]);
    } else if (src === "wall") {
      const fromId = e.dataTransfer.getData("studio-id");
      const fromIdx = modules.findIndex(m => m.id === fromId);
      if (fromIdx === -1) return;
      const arr = [...modules];
      const [mod] = arr.splice(fromIdx,1);
      arr.splice(Math.max(0, fromIdx < atIdx ? atIdx-1 : atIdx), 0, mod);
      setModules(arr);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full max-w-6xl mx-auto px-4">
      {/* Palette */}
      <aside className="flex-shrink-0 lg:w-44 bg-white rounded-2xl border border-stone-200 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Modules</p>
          <p className="text-[9px] text-stone-400 mt-0.5">Drag onto the wall</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {catalogue.map((mod) => (
            <div key={mod.type} draggable
              onDragStart={(e) => { e.dataTransfer.setData("studio-src","palette"); e.dataTransfer.setData("studio-type",mod.type); }}
              className="flex items-center gap-2 p-2 rounded-lg border cursor-grab select-none hover:shadow-sm transition-all"
              style={{ backgroundColor:mod.bg, borderColor:mod.border+"44" }}>
              <span className="text-sm w-5 text-center flex-shrink-0" style={{ color:mod.border }}>{mod.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-stone-700 truncate">{mod.label}</p>
                <p className="text-[9px] text-stone-400 truncate">{mod.defaultWidth}″</p>
              </div>
              <button onClick={() => setModules([...modules, { id:sid(), type:mod.type, label:mod.label, width:mod.defaultWidth }])}
                className="flex-shrink-0 w-5 h-5 rounded-md bg-white/60 hover:bg-white text-stone-600 flex items-center justify-center transition-all">
                <Plus size={10}/>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Preset quick-pick */}
        <div className="flex gap-2 flex-wrap">
          {STUDIO_PRESETS.map((p) => (
            <button key={p.name} onClick={() => setModules(p.modules.map(m => ({ ...m, id:sid() })))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-taupe-50 hover:border-taupe-300 text-xs font-medium text-stone-600 hover:text-taupe-700 transition-all">
              <span>{p.icon}</span>{p.name}
            </button>
          ))}
        </div>

        {/* Finish picker */}
        <div className="bg-white rounded-xl border border-stone-200 px-3 py-2">
          <FinishPicker value={finish} onChange={setFinish}/>
        </div>

        {/* Width progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${overWidth ? "bg-red-400" : "bg-taupe-400"}`}
              style={{ width:`${Math.min(100,(totalUsed/wallW)*100)}%` }}/>
          </div>
          <span className={`text-xs font-medium whitespace-nowrap ${overWidth ? "text-red-500" : "text-stone-500"}`}>
            {totalUsed}″ / {wallW}″{overWidth ? " · exceeds wall!" : ""}
          </span>
        </div>

        {/* Drop canvas */}
        <div
          className={`relative rounded-xl border-2 overflow-hidden select-none ${overWidth ? "border-red-300 bg-red-50" : "border-stone-300 bg-stone-100"}`}
          style={{ height: CANVAS_H + 8 }}
          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(modules.length); }}
          onDrop={(e) => readDrop(e, modules.length)}
          onDragLeave={() => setDragOverIdx(null)}
        >
          {displayModules.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-300 gap-2">
              <p className="text-sm font-medium">Drop modules here</p>
              <p className="text-xs opacity-70">or pick a preset above</p>
            </div>
          )}
          <div className="flex items-end px-2 pb-1 h-full">
            {/* Leading drop zone */}
            <div className={`flex-shrink-0 transition-all rounded flex items-center justify-center ${dragOverIdx===0?"w-8 bg-taupe-300/50":"w-1.5"}`}
              style={{ height: CANVAS_H }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(0); }}
              onDrop={(e) => readDrop(e,0)}>
              {dragOverIdx===0 && <div className="w-0.5 h-full bg-taupe-500 rounded-full"/>}
            </div>

            {displayModules.map((mod, i) => {
              const cat = getCat(catalogue, mod.type);
              const colW = Math.max(24, mod.width * SCALE);
              const isResizing = resizePreview?.moduleId === mod.id;
              return (
                <div key={mod.id} className="flex items-end flex-shrink-0">
                  <div draggable={!resizeDrag.current}
                    onDragStart={(e) => { if(resizeDrag.current){e.preventDefault();return;} e.dataTransfer.setData("studio-src","wall"); e.dataTransfer.setData("studio-id",mod.id); }}
                    className={`relative flex flex-col items-center cursor-grab active:cursor-grabbing rounded-t-lg group transition-all
                      ${isResizing ? "ring-2 ring-taupe-400" : ""}`}
                    style={{ width:colW, height:CANVAS_H, backgroundColor:cat.bg, borderTop:`3px solid ${cat.border}`, borderLeft:`1px solid ${cat.border}44`, borderRight:`1px solid ${cat.border}44` }}
                  >
                    <div className="mt-1.5 opacity-30"><GripVertical size={11}/></div>
                    {colW >= 30 && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 text-center overflow-hidden">
                        <span className="text-lg leading-none" style={{ color:cat.border }}>{cat.icon}</span>
                        {colW >= 42 && <>
                          {editingLabelId === mod.id ? (
                            <input
                              autoFocus
                              value={editingLabelVal}
                              onChange={e => setEditingLabelVal(e.target.value)}
                              onBlur={() => commitLabel(mod.id)}
                              onKeyDown={e => { if(e.key==="Enter"){e.preventDefault();commitLabel(mod.id);} if(e.key==="Escape")setEditingLabelId(null); }}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-[10px] font-semibold text-stone-700 bg-white/80 border border-taupe-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-taupe-400"
                              style={{ maxWidth: colW - 8 }}
                            />
                          ) : (
                            <span
                              className="text-[10px] font-semibold text-stone-700 mt-1 line-clamp-2 cursor-text select-none"
                              title="Double-click to rename"
                              onDoubleClick={e => { e.stopPropagation(); setEditingLabelId(mod.id); setEditingLabelVal(mod.label); }}
                            >{mod.label}</span>
                          )}
                          <span className="text-[9px] font-mono text-stone-400">{mod.width}″</span>
                        </>}
                        {/* Finish colour dot */}
                        {colW >= 30 && (() => {
                          const FDOT: Record<string,string> = { light:"#f0ebe3", medium:"#d4c2a8", dark:"#8d7060", white:"#f8f8f6" };
                          const FDOT_BORDER: Record<string,string> = { light:"#c4b096", medium:"#a08070", dark:"#5d4030", white:"#d0d0ce" };
                          return (
                            <span className="w-2.5 h-2.5 rounded-full border flex-shrink-0 mt-0.5"
                              style={{ background: FDOT[finish] ?? FDOT.medium, borderColor: FDOT_BORDER[finish] ?? FDOT_BORDER.medium }}
                              title={`Finish: ${finish}`}/>
                          );
                        })()}
                      </div>
                    )}
                    <button onClick={() => setModules(modules.filter((_,j) => j !== i))}
                      className="mb-2 p-1 rounded-md bg-red-100 hover:bg-red-200 text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10}/>
                    </button>

                    {/* Resize handle — right edge */}
                    <div
                      className="absolute right-0 top-1/4 bottom-1/4 w-3 flex items-center justify-center cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => startResize(mod.id, e.clientX, mod.width, e)}
                      title="Drag to resize width"
                    >
                      <div className="w-0.5 h-10 bg-taupe-500/60 rounded-full hover:bg-taupe-600"/>
                    </div>
                  </div>

                  <div className={`flex-shrink-0 transition-all rounded flex items-center justify-center ${dragOverIdx===i+1?"w-8 bg-taupe-300/50":"w-1.5"}`}
                    style={{ height: CANVAS_H }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i+1); }}
                    onDrop={(e) => readDrop(e,i+1)}>
                    {dragOverIdx===i+1 && <div className="w-0.5 h-full bg-taupe-500 rounded-full"/>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-stone-400">
          Drag modules from the palette · hover a column to remove · drag right edge to resize · reorder by dragging
        </p>
      </div>

      {/* 3D preview panel */}
      <div className="flex-shrink-0 lg:w-52 xl:w-64 flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">3D Preview</p>
            <span className="text-[9px] text-stone-400 font-mono">{wallW}″ × {wallH}″ × {wallD}″</span>
          </div>
          <div className="p-2 aspect-[4/3]">
            <StudioMiniPreview modules={displayModules} wallW={wallW} wallH={wallH} wallD={wallD} finish={finish}/>
          </div>
        </div>

        {/* Module count summary */}
        <div className="bg-white rounded-xl border border-stone-200 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Summary</p>
          <p className="text-xs text-stone-600">{displayModules.length} module{displayModules.length!==1?"s":""}</p>
          <p className={`text-xs font-mono ${overWidth?"text-red-500":"text-stone-500"}`}>{totalUsed}″ / {wallW}″ used</p>
          {displayModules.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {Array.from(new Set(displayModules.map(m=>m.type))).map(t => {
                const cat = getCat(catalogue, t);
                const count = displayModules.filter(m=>m.type===t).length;
                return (
                  <div key={t} className="flex items-center gap-1.5">
                    <span className="text-[10px]">{cat.icon}</span>
                    <span className="text-[9px] text-stone-500 truncate">{cat.label}</span>
                    <span className="text-[9px] font-bold text-stone-400 ml-auto">{count}×</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ["Room Shape", "Dimensions", "Place Modules"];
  return (
    <div className="flex items-center justify-center gap-0 px-6 py-4 border-b border-stone-100 bg-white flex-shrink-0">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold
            ${step===i+1?"bg-charcoal-600 text-white":step>i+1?"text-taupe-600":"text-stone-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0
              ${step===i+1?"bg-white text-charcoal-600":step>i+1?"bg-taupe-500 text-white":"bg-stone-200 text-stone-500"}`}>
              {step>i+1 ? <Check size={10} strokeWidth={3}/> : i+1}
            </span>
            {label}
          </div>
          {i<steps.length-1 && <div className={`w-8 h-px mx-1 ${step>i+1?"bg-taupe-400":"bg-stone-200"}`}/>}
        </div>
      ))}
    </div>
  );
}

// ─── Load modal ──────────────────────────────────────────────────────────────

interface AnyDesign {
  id: string; name: string; savedAt?: string;
  config?: {
    source?: string; closetKind?: string;
    wallDimensions?: { width?:number; height?:number; depth?:number };
    builderModules?: Array<{ id?:string; type:string; label:string; width:number }>;
  };
}

function _localRename(id: string, name: string) {
  for (const key of ["alveo_saved_designs","alveo_designs"]) {
    try {
      const arr = JSON.parse(localStorage.getItem(key)||"[]") as AnyDesign[];
      localStorage.setItem(key, JSON.stringify(arr.map(d => d.id===id ? {...d,name} : d)));
    } catch { /* ignore */ }
  }
}

function _localDelete(id: string) {
  for (const key of ["alveo_saved_designs","alveo_designs"]) {
    try {
      const arr = JSON.parse(localStorage.getItem(key)||"[]") as AnyDesign[];
      localStorage.setItem(key, JSON.stringify(arr.filter(d => d.id!==id)));
    } catch { /* ignore */ }
  }
}

function _localLoad(): AnyDesign[] {
  try {
    const a = JSON.parse(localStorage.getItem("alveo_saved_designs")||"[]") as AnyDesign[];
    const b = JSON.parse(localStorage.getItem("alveo_designs")||"[]") as AnyDesign[];
    const seen = new Set<string>();
    return [...a,...b].filter(d => { if(seen.has(d.id)) return false; seen.add(d.id); return true; });
  } catch { return []; }
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" }); }
  catch { return ""; }
}

const KIND_LABELS: Record<string,string> = {
  "reach-in":"Reach-In", "walkin-single":"Walk-In · Single", "walkin-l":"Walk-In · L", "walkin-u":"Walk-In · U",
};

interface LoadModalProps {
  onLoad: (kind: ClosetKind, wallW: number, wallH: number, wallD: number, modules: StudioModule[]) => void;
  onClose: () => void;
}

function LoadModal({ onLoad, onClose }: LoadModalProps) {
  const [designs, setDesigns] = useState<AnyDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [renamingId, setRenamingId] = useState<string|null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const local = _localLoad();
      const token = getStoredToken();
      let remote: AnyDesign[] = [];
      if (token) {
        try {
          const res = await fetch(`${BASE}/api/designs`, { headers:{ Authorization:`Bearer ${token}` } });
          if (res.ok) { const data = (await res.json()) as { designs: AnyDesign[] }; remote = data.designs ?? []; }
        } catch { /* ignore */ }
      }
      if (cancelled) return;
      const seen = new Set<string>();
      const merged: AnyDesign[] = [];
      for (const d of [...remote,...local]) { if(!seen.has(d.id)) { seen.add(d.id); merged.push(d); } }
      merged.sort((a,b) => (b.savedAt??"").localeCompare(a.savedAt??""));
      setDesigns(merged); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = search.trim()
    ? designs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : designs;

  const handleLoad = (d: AnyDesign) => {
    const cfg = d.config ?? {};
    const kind = (cfg.closetKind as ClosetKind) ?? "reach-in";
    const dims = cfg.wallDimensions ?? {};
    onLoad(
      kind,
      Math.max(36,Math.min(360,dims.width??120)),
      Math.max(72,Math.min(120,dims.height??96)),
      Math.max(14,Math.min(30,dims.depth??24)),
      (cfg.builderModules??[]).map(m => ({ id:sid(), type:m.type, label:m.label, width:m.width })),
    );
  };

  const startRename = (d: AnyDesign) => { setDeletingId(null); setRenamingId(d.id); setRenameValue(d.name); };
  const executeRename = async (id: string) => {
    const newName = renameValue.trim();
    if (!newName) { setRenamingId(null); return; }
    setDesigns(prev => prev.map(d => d.id===id ? {...d,name:newName} : d));
    setRenamingId(null);
    _localRename(id, newName);
    const token = getStoredToken();
    if (token) {
      try {
        const design = designs.find(d => d.id===id);
        if (design) await fetch(`${BASE}/api/designs`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({design:{...design,name:newName}}) });
      } catch { /* ignore */ }
    }
  };
  const executeDuplicate = async (d: AnyDesign) => {
    const newId = `studio_${Date.now().toString(36)}`;
    const copy: AnyDesign = { ...d, id:newId, name:`Copy of ${d.name}`, savedAt:new Date().toISOString() };
    setDesigns(prev => [copy,...prev]);
    _localSave(copy);
    const token = getStoredToken();
    if (token) {
      try { await fetch(`${BASE}/api/designs`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({design:copy}) }); }
      catch { /* already added locally */ }
    }
  };
  const executeDelete = async (id: string) => {
    setDesigns(prev => prev.filter(d => d.id!==id));
    setDeletingId(null);
    _localDelete(id);
    const token = getStoredToken();
    if (token) {
      try { await fetch(`${BASE}/api/designs`, { method:"DELETE", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({id}) }); }
      catch { /* already removed */ }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          <FolderOpen size={18} className="text-taupe-500 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-charcoal-600 text-sm">Load a Saved Design</p>
            <p className="text-xs text-stone-400 mt-0.5">Pick any design to continue editing it</p>
          </div>
          {!loading && designs.length > 0 && (
            <span className="flex-shrink-0 text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-taupe-50 border border-taupe-200 text-taupe-600">
              {designs.length}
            </span>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"><X size={14}/></button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search designs…"
            className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-stone-50 text-charcoal-700"/>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading && <div className="flex items-center justify-center py-10 gap-2 text-stone-400"><Loader2 size={16} className="animate-spin"/> Loading designs…</div>}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-stone-400 gap-2">
              <FolderOpen size={28} className="opacity-40"/>
              <p className="text-sm">{search?"No designs match that search.":"No saved designs yet."}</p>
            </div>
          )}
          {!loading && filtered.map(d => {
            const cfg = d.config ?? {};
            const dims = cfg.wallDimensions;
            const modCount = cfg.builderModules?.length ?? 0;
            const isStudio = cfg.source === "studio";
            const kindLabel = KIND_LABELS[cfg.closetKind ?? ""] ?? "";
            const isPendingDelete = deletingId === d.id;
            const isRenaming = renamingId === d.id;
            return (
              <div key={d.id}
                className={`w-full flex items-stretch gap-0 rounded-xl border transition-all group overflow-hidden
                  ${isPendingDelete?"border-red-300 bg-red-50":isRenaming?"border-taupe-400 bg-taupe-50":"border-stone-200 hover:border-taupe-300 hover:bg-taupe-50"}`}>
                <button onClick={() => { if(!isRenaming) handleLoad(d); }}
                  className={`flex items-start gap-3 flex-1 min-w-0 p-3.5 text-left ${isRenaming?"cursor-default":""}`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-colors
                    ${isPendingDelete?"bg-red-100":isRenaming?"bg-taupe-100":"bg-stone-100 group-hover:bg-taupe-100"}`}>
                    {isStudio?"🛋️":"🔨"}
                  </span>
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)}
                        onKeyDown={e => { if(e.key==="Enter"){e.preventDefault();executeRename(d.id);} if(e.key==="Escape")setRenamingId(null); }}
                        onClick={e=>e.stopPropagation()}
                        className="w-full text-sm font-semibold text-charcoal-700 border border-taupe-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white"/>
                    ) : (
                      <p className="text-sm font-semibold text-charcoal-600 truncate">{d.name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {kindLabel && <span className="text-[10px] font-medium text-taupe-600 bg-taupe-50 border border-taupe-100 rounded-full px-1.5 py-0.5">{kindLabel}</span>}
                      {dims && <span className="text-[10px] text-stone-400 font-mono">{dims.width}″ × {dims.height}″ × {dims.depth}″</span>}
                      {modCount>0 && <span className="text-[10px] text-stone-400">{modCount} module{modCount!==1?"s":""}</span>}
                    </div>
                    {d.savedAt && <span className="flex items-center gap-1 text-[10px] text-stone-300 mt-1"><Clock size={9}/>{fmtDate(d.savedAt)}</span>}
                  </div>
                  {!isRenaming && !isPendingDelete && (
                    <span className="text-[10px] font-semibold text-taupe-500 self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pr-1">Load →</span>
                  )}
                </button>
                <div className="flex-shrink-0 flex flex-col items-center justify-center border-l border-stone-100 px-2 gap-1.5 min-w-[56px]">
                  {isPendingDelete ? (
                    <>
                      <button onClick={() => executeDelete(d.id)} className="w-full text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 py-1 transition-colors">Delete</button>
                      <button onClick={() => setDeletingId(null)} className="w-full text-[10px] text-stone-400 hover:text-stone-600 rounded-lg px-2 py-1 hover:bg-stone-100 transition-colors">Cancel</button>
                    </>
                  ) : isRenaming ? (
                    <>
                      <button onClick={() => executeRename(d.id)} className="w-full text-[10px] font-bold text-white bg-taupe-500 hover:bg-taupe-600 rounded-lg px-2 py-1 transition-colors">Save</button>
                      <button onClick={() => setRenamingId(null)} className="w-full text-[10px] text-stone-400 hover:text-stone-600 rounded-lg px-2 py-1 hover:bg-stone-100 transition-colors">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={e => { e.stopPropagation(); startRename(d); }} title="Rename"
                        className="p-1.5 rounded-lg text-stone-300 hover:text-taupe-600 hover:bg-taupe-50 opacity-0 group-hover:opacity-100 transition-all"><Pencil size={12}/></button>
                      <button onClick={e => { e.stopPropagation(); executeDuplicate(d); }} title="Duplicate"
                        className="p-1.5 rounded-lg text-stone-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"><Copy size={12}/></button>
                      <button onClick={e => { e.stopPropagation(); setDeletingId(d.id); setRenamingId(null); }} title="Delete"
                        className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!loading && !getStoredToken() && designs.length > 0 && (
          <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-amber-600">
            <AlertCircle size={10}/> Showing local designs only.{" "}
            <Link href="/login" onClick={onClose} className="underline hover:text-amber-700">Log in</Link>{" "}to load your account designs.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Save panel ───────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SavePanelProps {
  modules: StudioModule[]; wallW: number; wallH: number; wallD: number;
  kind: ClosetKind; finish: string;
  triggerRef?: React.MutableRefObject<(() => void) | null>;
}

function SavePanel({ modules, wallW, wallH, wallD, kind, finish, triggerRef }: SavePanelProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (triggerRef) { triggerRef.current = () => setOpen(true); }
    return () => { if (triggerRef) triggerRef.current = null; };
  }, [triggerRef]);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errMsg, setErrMsg] = useState("");
  const isLoggedIn = !!getStoredToken();

  const save = async () => {
    const trimmed = name.trim() || "My Studio Design";
    setStatus("saving"); setErrMsg("");
    const id = `studio_${Date.now().toString(36)}`;
    const tagList = tags.split(",").map(t=>t.trim()).filter(Boolean);

    // Build versioned config: read existing design to carry forward version history
    const config = {
      source: "studio",
      closetKind: kind,
      finish,
      wallDimensions: { width:wallW, height:wallH, depth:wallD },
      builderModules: modules,
      tags: tagList,
      versions: [] as object[],
    };

    const design = { id, name:trimmed, config, savedAt: new Date().toISOString() };
    const token = getStoredToken();
    if (token) {
      try {
        const res = await fetch(`${BASE}/api/designs`, {
          method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
          body: JSON.stringify({ design }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStatus("saved"); showToast(`"${trimmed}" saved!`, "success");
      } catch {
        setErrMsg("Could not reach the server — saved locally instead.");
        _localSave(design); setStatus("saved"); showToast("Saved locally", "info");
      }
    } else {
      _localSave(design); setStatus("saved"); showToast("Saved locally", "info");
    }
  };

  const reset = () => { setOpen(false); setStatus("idle"); setName(""); setTags(""); setErrMsg(""); };

  return (
    <div className="flex-shrink-0">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-all">
          <Bookmark size={14}/> Save Design
        </button>
      ) : (
        <div className="w-full bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden">
          {status === "saved" ? (
            <div className="px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <BookmarkCheck size={16} className="text-green-600"/>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal-600">Design saved!</p>
                {errMsg && <p className="text-xs text-amber-600 mt-0.5">{errMsg}</p>}
                {!isLoggedIn && !errMsg && (
                  <p className="text-xs text-stone-400 mt-0.5">Saved locally.{" "}
                    <Link href="/login" className="text-taupe-600 hover:underline">Log in</Link>{" "}to sync.</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoggedIn && (
                  <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-colors">
                    Dashboard <ExternalLink size={11}/>
                  </Link>
                )}
                <button onClick={reset} className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">Done</button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Bookmark size={14} className="text-taupe-500 flex-shrink-0"/>
                <p className="text-sm font-semibold text-charcoal-600">Save to My Designs</p>
                {!isLoggedIn && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <AlertCircle size={9}/> Not logged in — saves locally
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <input autoFocus value={name} onChange={e=>setName(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") save(); if(e.key==="Escape") reset(); }}
                  placeholder="e.g. Master Bedroom Walk-In"
                  className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 text-charcoal-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-stone-50"/>
                <button onClick={save} disabled={status==="saving"}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-taupe-500 hover:bg-taupe-600 disabled:opacity-50 transition-colors flex-shrink-0">
                  {status==="saving" ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/> : <Bookmark size={13}/>}
                  {status==="saving" ? "Saving…" : "Save"}
                </button>
                <button onClick={reset} className="px-3 py-2 rounded-xl text-sm text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">✕</button>
              </div>
              <input value={tags} onChange={e=>setTags(e.target.value)}
                placeholder="Tags: Master Bedroom, Guest Room… (comma separated)"
                className="w-full text-xs border border-stone-200 rounded-xl px-3 py-1.5 text-charcoal-600 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-taupe-300 bg-stone-50"/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function _localSave(design: object) {
  try {
    const key = "alveo_saved_designs";
    const prev = JSON.parse(localStorage.getItem(key)||"[]") as object[];
    localStorage.setItem(key, JSON.stringify([...prev, design]));
  } catch { /* ignore */ }
}

// ─── StudioPage ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<ClosetKind>("reach-in");
  const [wallW, setWallW] = useState(120);
  const [wallH, setWallH] = useState(96);
  const [wallD, setWallD] = useState(24);
  const [modules, setModules] = useState<StudioModule[]>([]);
  const [finish, setFinish] = useState("medium");
  const [showLoad, setShowLoad] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const catalogue = BUILTIN_CATALOGUE;

  // Undo / Redo
  const [undoStack, setUndoStack] = useState<StudioModule[][]>([]);
  const [redoStack, setRedoStack] = useState<StudioModule[][]>([]);
  const modulesRef = useRef<StudioModule[]>(modules);
  useEffect(() => { modulesRef.current = modules; }, [modules]);

  const setModulesWithHistory = useCallback((newModules: StudioModule[]) => {
    setUndoStack(prev => [...prev.slice(-50), [...modulesRef.current]]);
    setRedoStack([]);
    setModules(newModules);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, [...modulesRef.current]]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0,-1));
    setModules(prev);
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, [...modulesRef.current]]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0,-1));
    setModules(next);
  }, [redoStack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const totalUsed = modules.reduce((s,m) => s+m.width, 0);

  // Ctrl+S → open save panel
  const saveTriggerRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && step === 3) {
        e.preventDefault();
        saveTriggerRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  const launch = () => {
    localStorage.setItem("alveo_builder_modules", JSON.stringify(modules));
    localStorage.setItem("alveo_studio_dims", JSON.stringify({ wallW, wallH, wallD, finish }));
    navigate("/builder");
  };

  const handleLoadDesign = (
    loadedKind: ClosetKind, loadedW: number, loadedH: number, loadedD: number, loadedModules: StudioModule[],
  ) => {
    setKind(loadedKind); setWallW(loadedW); setWallH(loadedH); setWallD(loadedD);
    setModulesWithHistory(loadedModules);
    setShowLoad(false); setStep(3);
  };

  const canAdvance = step===1 ? true : step===2 ? (wallW>=36&&wallH>=72&&wallD>=14) : true;

  return (
    <div className="min-h-screen bg-stone-50 pt-16 flex flex-col" style={{ height:"100dvh" }}>
      <StepBar step={step}/>

      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto py-6 min-h-0">
        {step === 1 && (
          <>
            <TypeStep value={kind} onChange={setKind}/>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-px w-16 bg-stone-200"/><span className="text-xs text-stone-400">or</span><div className="h-px w-16 bg-stone-200"/>
            </div>
            <button onClick={() => setShowLoad(true)}
              className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-all shadow-sm">
              <FolderOpen size={15}/> Load a Saved Design
            </button>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-4 w-full px-4">
            <div className="text-center mb-2">
              <h2 className="font-serif text-2xl font-bold text-charcoal-600">Set your wall dimensions</h2>
              <p className="text-sm text-stone-400 mt-1">Drag the handles on the wall or use the inputs below</p>
            </div>
            <DimCanvas wallW={wallW} wallH={wallH} wallD={wallD} setWallW={setWallW} setWallH={setWallH} setWallD={setWallD}/>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-center gap-4 px-4 w-full">
              <div className="text-center">
                <h2 className="font-serif text-2xl font-bold text-charcoal-600">Design your layout</h2>
                <p className="text-sm text-stone-400 mt-1">Drag modules onto the wall · pick a preset · drag right edge to resize</p>
              </div>
              <button onClick={() => setShowLoad(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-500 bg-white hover:bg-stone-50 border border-stone-200 hover:border-taupe-300 transition-all"
                title="Load a different saved design">
                <FolderOpen size={13}/> Load
              </button>
            </div>
            <LayoutStep
              modules={modules} setModules={setModulesWithHistory}
              wallW={wallW} wallH={wallH} wallD={wallD}
              catalogue={catalogue}
              finish={finish} setFinish={setFinish}
            />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="flex-shrink-0 bg-white border-t border-stone-200 px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center">
          {step > 1 ? (
            <button onClick={() => setStep(s => s-1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
              <ArrowLeft size={14}/> Back
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
              <ArrowLeft size={14}/> Home
            </Link>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center min-w-0 gap-3">
          {step === 3 ? (
            <>
              {/* Undo / Redo */}
              <div className="flex items-center gap-1">
                <button onClick={undo} disabled={undoStack.length===0} title="Undo (Ctrl+Z)"
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 transition-all">
                  <RotateCcw size={14}/>
                </button>
                <button onClick={redo} disabled={redoStack.length===0} title="Redo (Ctrl+Y)"
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 transition-all">
                  <RotateCw size={14}/>
                </button>
                {(undoStack.length > 0 || redoStack.length > 0) && (
                  <span className="text-[9px] text-stone-300 font-mono ml-0.5">{undoStack.length} / {redoStack.length}</span>
                )}
              </div>
              <SavePanel modules={modules} wallW={wallW} wallH={wallH} wallD={wallD} kind={kind} finish={finish} triggerRef={saveTriggerRef}/>
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-stone-300 select-none">
                <kbd className="px-1 py-0.5 rounded border border-stone-200 bg-stone-50 text-stone-400 text-[9px] font-mono leading-tight">⌘S</kbd>
                save
              </span>
            </>
          ) : (
            <span className="text-xs text-stone-400 font-mono">
              {step===2 ? `${wallW}″ × ${wallH}″ × ${wallD}″ deep` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step===3 && (
            <button onClick={() => setShowShortcuts(v => !v)} title="Keyboard shortcuts"
              className={`p-1.5 rounded-lg border transition-colors ${showShortcuts ? "bg-taupe-100 border-taupe-300 text-taupe-700" : "bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-100"}`}>
              <HelpCircle size={14}/>
            </button>
          )}
          {step===3 && modules.length>0 && (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono tabular-nums ${totalUsed>wallW?"text-red-500":"text-stone-400"}`}>
                  {totalUsed}″ / {wallW}″
                </span>
                <span className={`text-[10px] font-bold tabular-nums ${totalUsed>wallW?"text-red-500":wallW>0&&totalUsed/wallW>0.9?"text-amber-500":"text-taupe-500"}`}>
                  {wallW > 0 ? Math.round((totalUsed/wallW)*100) : 0}%
                </span>
              </div>
              <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, (totalUsed / wallW) * 100)}%`,
                    background: totalUsed > wallW ? "#ef4444" : totalUsed / wallW > 0.9 ? "#f59e0b" : "#8b7355",
                  }}
                />
              </div>
            </div>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(s => s+1)} disabled={!canAdvance}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-charcoal-600 hover:bg-charcoal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ArrowRight size={14}/>
            </button>
          ) : (
            <button onClick={launch}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-taupe-500 hover:bg-taupe-600 transition-colors shadow-sm">
              Open in Builder <ArrowRight size={14}/>
            </button>
          )}
        </div>
      </div>

      {showLoad && <LoadModal onLoad={handleLoadDesign} onClose={() => setShowLoad(false)}/>}

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 w-full max-w-xs overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-taupe-500"/>
                <span className="font-semibold text-charcoal-600 text-sm">Keyboard shortcuts</span>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="p-1 rounded text-stone-400 hover:text-stone-600">
                <X size={13}/>
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              {[
                ["Undo",        "⌘ Z"],
                ["Redo",        "⌘ Y  /  ⌘⇧Z"],
                ["Save",        "⌘ S"],
                ["Delete module","⌫  (select first)"],
                ["Close modal", "Esc"],
              ].map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-charcoal-500">{label}</span>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-stone-200 bg-stone-50 text-stone-500 whitespace-nowrap">{keys}</kbd>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3">
              <p className="text-[10px] text-stone-300 text-center">Click anywhere outside to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
