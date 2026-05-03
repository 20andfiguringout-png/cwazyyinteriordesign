import React from "react";
import { ClosetType } from "@/types/closet";

const WALL = "#e8ddd0";
const FLOOR = "#f9f7f4";
const STROKE = "#b59d7a";
const SW = 1.5;

export function ClosetTypeDiagram({ type }: { type: ClosetType }) {
  const svgProps = {
    viewBox: "0 0 60 50",
    className: "w-full h-full",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  switch (type) {
    /* ── Reach-In ──────────────────────────────────────────────────────────
       Top-down: back wall (top), two short side walls, open front           */
    case "reach-in":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Floor area */}
            <rect x="4" y="4" width="52" height="38" fill={FLOOR} />

            {/* Back wall */}
            <rect
              x="4" y="4" width="52" height="9"
              fill={WALL} stroke={STROKE} strokeWidth={SW} rx="0.5"
            />

            {/* Left side wall */}
            <rect
              x="4" y="13" width="7" height="29"
              fill={WALL} stroke={STROKE} strokeWidth={SW}
            />

            {/* Right side wall */}
            <rect
              x="49" y="13" width="7" height="29"
              fill={WALL} stroke={STROKE} strokeWidth={SW}
            />

            {/* Open-front dashed indicator */}
            <line
              x1="11" y1="42" x2="49" y2="42"
              stroke={STROKE} strokeWidth="1" strokeDasharray="3,2" opacity="0.55"
            />

            {/* Tiny open-entry arrows */}
            <polyline
              points="26,46 30,43 34,46"
              fill="none" stroke={STROKE} strokeWidth="0.8" opacity="0.45"
            />
          </svg>
        </div>
      );

    /* ── Wardrobe Wall ──────────────────────────────────────────────────────
       Top-down: full-width unit in the middle of a room (dashed outline)    */
    case "wardrobe-wall":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Room suggestion — dashed outline */}
            <rect
              x="2" y="2" width="56" height="46" fill={FLOOR}
              stroke={STROKE} strokeWidth="0.8" strokeDasharray="3,2" rx="1"
            />

            {/* Wall unit block */}
            <rect
              x="2" y="15" width="56" height="16"
              fill={WALL} stroke={STROKE} strokeWidth={SW}
            />

            {/* Vertical panel divisions */}
            <line x1="21" y1="15" x2="21" y2="31" stroke={STROKE} strokeWidth="0.8" />
            <line x1="40" y1="15" x2="40" y2="31" stroke={STROKE} strokeWidth="0.8" />

            {/* Mid-shelf hint */}
            <line
              x1="2" y1="23" x2="58" y2="23"
              stroke={STROKE} strokeWidth="0.5" strokeDasharray="2,1" opacity="0.5"
            />
          </svg>
        </div>
      );

    /* ── Walk-In Single ─────────────────────────────────────────────────────
       Top-down: room outline, one fitted back wall, door gap at bottom       */
    case "walkin-single":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Room floor */}
            <rect
              x="4" y="4" width="52" height="42" fill={FLOOR}
              stroke={STROKE} strokeWidth={SW} rx="1"
            />

            {/* Fitted back wall */}
            <rect
              x="4" y="4" width="52" height="11"
              fill={WALL} stroke={STROKE} strokeWidth={SW}
            />

            {/* Door gap — small notch at bottom-center */}
            <rect x="22" y="43.5" width="16" height="3" fill="white" />
            <line
              x1="4" y1="46" x2="22" y2="46"
              stroke={STROKE} strokeWidth={SW}
            />
            <line
              x1="38" y1="46" x2="56" y2="46"
              stroke={STROKE} strokeWidth={SW}
            />
          </svg>
        </div>
      );

    /* ── Walk-In L-Shape ────────────────────────────────────────────────────
       Top-down: room + back wall (top) + left wall — aisle fills bottom-right */
    case "walkin-l":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Room floor (full area, light) */}
            <rect x="4" y="4" width="52" height="42" fill={FLOOR} />

            {/* L-shape wall fill: full room first, then cut out aisle */}
            <rect x="4" y="4" width="52" height="42" fill={WALL} />
            {/* Aisle cutout — bottom-right quadrant */}
            <rect x="14" y="14" width="42" height="32" fill={FLOOR} />

            {/* Room outer outline */}
            <rect
              x="4" y="4" width="52" height="42" fill="none"
              stroke={STROKE} strokeWidth={SW} rx="1"
            />

            {/* Inner L edge (inside corner of the unit) */}
            <path
              d="M 56 14 L 14 14 L 14 46"
              fill="none" stroke={STROKE} strokeWidth={SW}
            />
          </svg>
        </div>
      );

    /* ── Walk-In U-Shape ────────────────────────────────────────────────────
       Top-down: room + back + left + right walls, central aisle space        */
    case "walkin-u":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Wall fill */}
            <rect x="4" y="4" width="52" height="42" fill={WALL} />
            {/* Aisle cutout — central open space */}
            <rect x="14" y="14" width="32" height="32" fill={FLOOR} />

            {/* Room outer outline */}
            <rect
              x="4" y="4" width="52" height="42" fill="none"
              stroke={STROKE} strokeWidth={SW} rx="1"
            />

            {/* Inner U edge */}
            <path
              d="M 14 46 L 14 14 L 46 14 L 46 46"
              fill="none" stroke={STROKE} strokeWidth={SW}
            />
          </svg>
        </div>
      );

    /* ── Island Walk-In ─────────────────────────────────────────────────────
       U-shape walls + freestanding island unit centred in the aisle          */
    case "island":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Wall fill */}
            <rect x="3" y="3" width="54" height="44" fill={WALL} />
            {/* Aisle cutout */}
            <rect x="13" y="12" width="34" height="35" fill={FLOOR} />

            {/* Room outer outline */}
            <rect
              x="3" y="3" width="54" height="44" fill="none"
              stroke={STROKE} strokeWidth={SW} rx="1"
            />

            {/* Inner U edge */}
            <path
              d="M 13 47 L 13 12 L 47 12 L 47 47"
              fill="none" stroke={STROKE} strokeWidth={SW}
            />

            {/* Island unit — centred in the aisle */}
            <rect
              x="19" y="21" width="22" height="14"
              fill={WALL} stroke={STROKE} strokeWidth={SW} rx="1"
            />
          </svg>
        </div>
      );

    /* ── Corridor Walk-In ───────────────────────────────────────────────────
       Two facing walls (top + bottom), narrow aisle between them             */
    case "corridor":
      return (
        <div className="w-full aspect-[6/5]">
          <svg {...svgProps}>
            {/* Room floor */}
            <rect
              x="4" y="4" width="52" height="42" fill={FLOOR}
              stroke={STROKE} strokeWidth={SW} rx="1"
            />

            {/* Top (back) wall */}
            <rect
              x="4" y="4" width="52" height="12"
              fill={WALL} stroke={STROKE} strokeWidth={SW}
            />

            {/* Bottom (facing) wall */}
            <rect
              x="4" y="34" width="52" height="12"
              fill={WALL} stroke={STROKE} strokeWidth={SW}
            />

            {/* Aisle centre-line hint */}
            <line
              x1="8" y1="25" x2="52" y2="25"
              stroke={STROKE} strokeWidth="0.5" strokeDasharray="3,2" opacity="0.45"
            />
          </svg>
        </div>
      );

    default:
      return null;
  }
}
