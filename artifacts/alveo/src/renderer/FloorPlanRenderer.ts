import { ClosetLayout, ClosetType } from "@/types/closet";

interface FloorPlanOptions {
  roomWidth: number; // inches
  roomDepth: number; // inches
  unitDepth: number; // inches (storage unit depth)
}

/**
 * Generates a top-down floor plan SVG showing the closet room outline,
 * fitted storage units along walls, aisle zones, and door location.
 */
export function renderFloorPlan(
  layout: ClosetLayout,
  opts: FloorPlanOptions,
): string {
  const { roomWidth: rW, roomDepth: rD, unitDepth: uD } = opts;
  const type = layout.closetType;

  const MARGIN = 40;
  const SCALE = 3; // px per inch

  const w = rW * SCALE;
  const h = rD * SCALE;
  const svgW = w + MARGIN * 2;
  const svgH = h + MARGIN * 2;
  const ud = uD * SCALE;

  const parts: string[] = [];

  // SVG open
  parts.push(
    `<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg"`,
    `     style="width:100%;height:auto;display:block;background:#faf8f5;font-family:'Inter',Arial,sans-serif;">`,
  );

  // Room outline
  parts.push(
    `<rect x="${MARGIN}" y="${MARGIN}" width="${w}" height="${h}" fill="#f5f1eb" stroke="#8d7b6a" stroke-width="2" rx="2"/>`,
  );

  // Storage unit fills (per closet type)
  const unitFill = "rgba(180,160,130,0.35)";
  const unitStroke = "#a8916b";

  switch (type) {
    case "reach-in":
    case "wardrobe-wall":
      // Single wall (back)
      parts.push(rect(MARGIN, MARGIN, w, ud, unitFill, unitStroke));
      label(parts, MARGIN + w / 2, MARGIN + ud / 2, "Storage Wall");
      aisleLabel(parts, MARGIN + w / 2, MARGIN + ud + (h - ud) / 2, h - ud);
      break;

    case "walkin-single":
      parts.push(rect(MARGIN, MARGIN, w, ud, unitFill, unitStroke));
      label(parts, MARGIN + w / 2, MARGIN + ud / 2, "Back Wall");
      aisleLabel(parts, MARGIN + w / 2, MARGIN + ud + (h - ud) / 2, h - ud);
      break;

    case "walkin-l":
      // Back wall + left side wall
      parts.push(rect(MARGIN, MARGIN, w, ud, unitFill, unitStroke));
      parts.push(rect(MARGIN, MARGIN + ud, ud, h - ud, unitFill, unitStroke));
      label(parts, MARGIN + w / 2, MARGIN + ud / 2, "Back Wall");
      label(
        parts,
        MARGIN + ud / 2,
        MARGIN + ud + (h - ud) / 2,
        "Left Wall",
        true,
      );
      aisleLabel(
        parts,
        MARGIN + ud + (w - ud) / 2,
        MARGIN + ud + (h - ud) / 2,
        Math.min(w - ud, h - ud),
      );
      break;

    case "walkin-u":
      // Back + left + right
      parts.push(rect(MARGIN, MARGIN, w, ud, unitFill, unitStroke));
      parts.push(rect(MARGIN, MARGIN + ud, ud, h - ud, unitFill, unitStroke));
      parts.push(
        rect(MARGIN + w - ud, MARGIN + ud, ud, h - ud, unitFill, unitStroke),
      );
      label(parts, MARGIN + w / 2, MARGIN + ud / 2, "Back Wall");
      label(parts, MARGIN + ud / 2, MARGIN + ud + (h - ud) / 2, "Left", true);
      label(
        parts,
        MARGIN + w - ud / 2,
        MARGIN + ud + (h - ud) / 2,
        "Right",
        true,
      );
      aisleLabel(parts, MARGIN + w / 2, MARGIN + ud + (h - ud) / 2, w - ud * 2);
      break;

    case "island":
      // U-shape walls + island counter in centre
      parts.push(rect(MARGIN, MARGIN, w, ud, unitFill, unitStroke));
      parts.push(rect(MARGIN, MARGIN + ud, ud, h - ud, unitFill, unitStroke));
      parts.push(
        rect(MARGIN + w - ud, MARGIN + ud, ud, h - ud, unitFill, unitStroke),
      );
      // Island
      const isW = Math.round(w * 0.35);
      const isD = Math.round(ud * 1.2);
      const isX = MARGIN + (w - isW) / 2;
      const isY = MARGIN + (h - isD) / 2;
      parts.push(
        `<rect x="${isX}" y="${isY}" width="${isW}" height="${isD}" fill="rgba(160,140,110,0.5)" stroke="${unitStroke}" stroke-width="1.5" rx="4"/>`,
      );
      label(parts, isX + isW / 2, isY + isD / 2, "Island");
      label(parts, MARGIN + w / 2, MARGIN + ud / 2, "Back Wall");
      break;

    case "corridor":
      // Two facing walls
      parts.push(rect(MARGIN, MARGIN, w, ud, unitFill, unitStroke));
      parts.push(rect(MARGIN, MARGIN + h - ud, w, ud, unitFill, unitStroke));
      label(parts, MARGIN + w / 2, MARGIN + ud / 2, "Wall A");
      label(parts, MARGIN + w / 2, MARGIN + h - ud / 2, "Wall B");
      aisleLabel(parts, MARGIN + w / 2, MARGIN + h / 2, h - ud * 2);
      break;
  }

  // Door indicator (bottom centre)
  if (type !== "reach-in" && type !== "wardrobe-wall") {
    const doorW = 30 * SCALE;
    const doorX = MARGIN + (w - doorW) / 2;
    const doorY = MARGIN + h - 2;
    parts.push(
      `<line x1="${doorX}" y1="${doorY}" x2="${doorX + doorW}" y2="${doorY}" stroke="#6d4f40" stroke-width="4" stroke-linecap="round"/>`,
      `<text x="${doorX + doorW / 2}" y="${doorY + 16}" text-anchor="middle" font-size="10" fill="#6d4f40" font-weight="600">DOOR</text>`,
    );
  }

  // Title
  parts.push(
    `<text x="${svgW / 2}" y="${svgH - 8}" text-anchor="middle" font-size="10" fill="#8d7b6a" font-weight="600" letter-spacing="1">`,
    `FLOOR PLAN · ${Math.round(rW / 12)}'×${Math.round(rD / 12)}'`,
    `</text>`,
  );

  parts.push(`</svg>`);
  return parts.join("\n");
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

function label(
  parts: string[],
  cx: number,
  cy: number,
  text: string,
  vertical = false,
) {
  const transform = vertical ? ` transform="rotate(-90,${cx},${cy})"` : "";
  parts.push(
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#6d4f40" font-weight="600"${transform}>${text}</text>`,
  );
}

function aisleLabel(
  parts: string[],
  cx: number,
  cy: number,
  aisleInches: number,
) {
  parts.push(
    `<text x="${cx}" y="${cy - 6}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#b5977a" font-style="italic">Aisle</text>`,
    `<text x="${cx}" y="${cy + 8}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#b5977a">${Math.round(aisleInches / 3)}" clear</text>`,
  );
}
