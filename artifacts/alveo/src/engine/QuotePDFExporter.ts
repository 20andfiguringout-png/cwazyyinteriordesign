import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import {
  ClosetConfiguration,
  ClosetLayout,
  ClosetWall,
  UserPreferences,
  AccessoryItem,
  LightingOptions,
} from "@/types/closet";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";

// ─── Cost constants (mirrors CostEstimatorTab) ────────────────────────────────

const PANEL_COST_PER_SQFT: Record<string, number> = { white: 8.5, light: 12.0, medium: 15.5, dark: 18.0 };
const STYLE_MULTIPLIER: Record<string, number> = { minimal: 1.00, modern: 1.05, rustic: 1.10, glam: 1.28, luxury: 1.50 };
const HARDWARE_FINISH_PREMIUM: Record<string, number> = { chrome: 80, brass: 160, "matte-black": 120, nickel: 200, gold: 180 };
const ROD_COST_PER_FT = 9.5;
const SHELF_COST_EACH = 55;
const DRAWER_COST_SMALL = 135;
const DRAWER_COST_MEDIUM = 195;
const DRAWER_COST_LARGE = 265;
const LABOUR_RATE = 0.42;
const DELIVERY_FLAT = 185;
const LIGHTING_COSTS: Record<string, { label: string; unit: number }> = {
  underShelfLED: { label: "Under-shelf LED strip", unit: 85 },
  overheadRail:  { label: "Overhead track rail + heads", unit: 320 },
  puckLights:    { label: "Recessed puck lights (set)", unit: 210 },
  islandPendant: { label: "Island pendant fitting", unit: 320 },
};

type LineItem = { category: string; description: string; qty: number; unitCost: number; total: number };

const CATEGORY_ORDER = ["Materials", "Hardware", "Lighting", "Accessories", "Logistics", "Labour"];

function computeLineItems(
  layout: ClosetLayout, userInfo: UserPreferences,
  accessories?: AccessoryItem[], lighting?: LightingOptions,
): { items: LineItem[]; materialsSubtotal: number; labourCost: number; grandTotal: number } {
  const items: LineItem[] = [];
  const finish    = userInfo.woodFinish ?? "medium";
  const style     = userInfo.stylePreference ?? "modern";
  const panelRate = PANEL_COST_PER_SQFT[finish] ?? 15.5;
  const styleMult = STYLE_MULTIPLIER[style] ?? 1.05;

  let totalSqFt = 0;
  for (const wall of layout.walls) totalSqFt += (wall.width / 12) * (wall.height / 12);
  items.push({ category: "Materials", description: "Cabinet panels & carcasses", qty: Math.round(totalSqFt), unitCost: panelRate * styleMult, total: Math.round(totalSqFt * panelRate * styleMult) });

  const rods = layout.totalStorage.hangingRods;
  if (rods > 0) items.push({ category: "Materials", description: "Hanging rods & brackets", qty: rods, unitCost: ROD_COST_PER_FT * styleMult, total: Math.round(rods * ROD_COST_PER_FT * styleMult) });

  let shelfCount = 0;
  for (const wall of layout.walls) for (const zone of wall.zones) shelfCount += zone.shelves?.reduce((a, s) => a + (s.count ?? 1), 0) ?? 0;
  if (shelfCount > 0) items.push({ category: "Materials", description: "Shelves (cut, edge-banded & drilled)", qty: shelfCount, unitCost: SHELF_COST_EACH * styleMult, total: Math.round(shelfCount * SHELF_COST_EACH * styleMult) });

  let drawerSmall = 0, drawerMed = 0, drawerLarge = 0;
  for (const wall of layout.walls) for (const zone of wall.zones) for (const d of zone.drawers ?? []) { if (d.height < 6) drawerSmall++; else if (d.height <= 9) drawerMed++; else drawerLarge++; }
  if (drawerSmall)  items.push({ category: "Materials", description: 'Drawers — shallow (≤ 5")', qty: drawerSmall, unitCost: DRAWER_COST_SMALL * styleMult, total: Math.round(drawerSmall * DRAWER_COST_SMALL * styleMult) });
  if (drawerMed)    items.push({ category: "Materials", description: 'Drawers — standard (6–9")', qty: drawerMed, unitCost: DRAWER_COST_MEDIUM * styleMult, total: Math.round(drawerMed * DRAWER_COST_MEDIUM * styleMult) });
  if (drawerLarge)  items.push({ category: "Materials", description: 'Drawers — deep (> 9")', qty: drawerLarge, unitCost: DRAWER_COST_LARGE * styleMult, total: Math.round(drawerLarge * DRAWER_COST_LARGE * styleMult) });

  const hwFinish  = (userInfo.hardwareFinish ?? "").toLowerCase();
  const hwPremium = HARDWARE_FINISH_PREMIUM[hwFinish] ?? 85;
  items.push({ category: "Hardware", description: `Hardware & pulls${hwFinish ? ` — ${userInfo.hardwareFinish}` : ""}`, qty: 1, unitCost: hwPremium, total: hwPremium });

  if (lighting) {
    const wallCount = layout.walls.length;
    for (const [key, fixture] of Object.entries(LIGHTING_COSTS)) {
      if (!(lighting as Record<string, boolean>)[key]) continue;
      const qty = key === "underShelfLED" ? wallCount : 1;
      items.push({ category: "Lighting", description: fixture.label + (qty > 1 ? ` (${qty} walls)` : ""), qty, unitCost: fixture.unit, total: fixture.unit * qty });
    }
  }

  if (accessories?.length) {
    for (const acc of accessories) {
      if (acc.qty <= 0) continue;
      items.push({ category: "Accessories", description: acc.name, qty: acc.qty, unitCost: acc.unitPrice, total: Math.round(acc.qty * acc.unitPrice) });
    }
  }

  items.push({ category: "Logistics", description: "Delivery, crating & site protection", qty: 1, unitCost: DELIVERY_FLAT, total: DELIVERY_FLAT });

  const materialsSubtotal = items.reduce((s, i) => s + i.total, 0);
  const labourCost = Math.round(materialsSubtotal * LABOUR_RATE);
  items.push({ category: "Labour", description: "Professional installation & fitting", qty: 1, unitCost: labourCost, total: labourCost });
  return { items, materialsSubtotal, labourCost, grandTotal: materialsSubtotal + labourCost };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function usd(n: number) { return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

function inchesToFtIn(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  return rem > 0 ? `${ft}' ${rem}"` : `${ft}'`;
}

async function drawSvgToPdf(doc: jsPDF, svgMarkup: string, x: number, y: number, maxW: number, maxH: number): Promise<number> {
  const parser = new DOMParser();
  const xml = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgEl = xml.documentElement as unknown as SVGSVGElement;
  const vb = svgEl.viewBox?.baseVal;
  const srcW = vb?.width || Number(svgEl.getAttribute("width") ?? 800);
  const srcH = vb?.height || Number(svgEl.getAttribute("height") ?? 600);
  const scale = Math.min(maxW / srcW, maxH / srcH);
  await svg2pdf(svgEl, doc, { x, y, width: srcW * scale, height: srcH * scale });
  return srcH * scale;
}

function hRule(doc: jsPDF, y: number, M: number, pageW: number, color: [number, number, number] = [210, 200, 190]) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5); doc.line(M, y, pageW - M, y);
}

function sectionHeader(doc: jsPDF, text: string, y: number, M: number, pageW: number): number {
  doc.setFillColor(245, 240, 235);
  doc.roundedRect(M, y, pageW - M * 2, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 90, 80);
  doc.text(text.toUpperCase(), M + 8, y + 12);
  return y + 18;
}

function tableRow(doc: jsPDF, y: number, M: number, pageW: number, description: string, qty: string, unit: string, total: string, isOdd: boolean): number {
  const ROW_H = 16;
  if (isOdd) { doc.setFillColor(251, 249, 247); doc.rect(M, y, pageW - M * 2, ROW_H, "F"); }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(50, 45, 40);
  const col1 = M + 8, col2 = M + (pageW - M * 2) * 0.58, col3 = M + (pageW - M * 2) * 0.73, col4 = pageW - M - 8;
  doc.text(description, col1, y + 11);
  doc.text(qty, col2, y + 11);
  doc.text(unit, col3, y + 11);
  doc.setFont("helvetica", "bold"); doc.text(total, col4, y + 11, { align: "right" });
  return y + ROW_H;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuotePDFOptions {
  layout: ClosetLayout;
  config: Partial<ClosetConfiguration>;
  designName?: string;
  clientName?: string;
  projectRef?: string;
  designerName?: string;
  designerEmail?: string;
  logoDataUrl?: string;
  accessories?: AccessoryItem[];
  lighting?: LightingOptions;
}

export interface QuotePDFResult {
  doc: jsPDF;
  quoteNum: string;
  grandTotal: number;
  designName: string;
}

// ─── Core builder (shared by save + base64) ──────────────────────────────────

async function buildQuotePDF({
  layout, config,
  designName: rawDesignName = "Closet Design",
  clientName, projectRef, designerName, designerEmail, logoDataUrl,
  accessories, lighting,
}: QuotePDFOptions): Promise<QuotePDFResult> {
  const designName = rawDesignName;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 36;

  const quoteNum = `QT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const today = new Date();
  const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── Page 1 ──────────────────────────────────────────────────────────────────
  doc.setFillColor(45, 40, 35); doc.rect(0, 0, pageW, 70, "F");
  doc.setFont("times", "bold"); doc.setFontSize(26); doc.setTextColor(245, 238, 225); doc.text("ALVÉO", M, 44);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(180, 165, 148); doc.text("DESIGN QUOTATION", M, 58);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(245, 238, 225); doc.text(quoteNum, pageW - M, 38, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(180, 165, 148);
  doc.text(`Issued: ${fmt(today)}`, pageW - M, 52, { align: "right" });
  doc.text(`Valid until: ${fmt(validUntil)}`, pageW - M, 63, { align: "right" });

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", pageW - M - 70, 6, 60, 22); } catch { /* ignore */ }
  }

  let y = 90;
  const colW = (pageW - M * 2 - 20) / 2;
  const col2X = M + colW + 20;

  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(130, 115, 100); doc.text("FROM / DESIGNER", M, y);
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40, 35, 30); doc.text(designerName ?? "Your Studio", M, y + 10);
  if (designerEmail) { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100, 90, 80); doc.text(designerEmail, M, y + 22); }

  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(130, 115, 100); doc.text("PREPARED FOR", col2X, y - 6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40, 35, 30); doc.text(clientName ?? "Client", col2X, y + 10);
  if (projectRef) { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100, 90, 80); doc.text(`Project ref: ${projectRef}`, col2X, y + 22); }

  y += 40; hRule(doc, y, M, pageW); y += 16;
  doc.setFont("times", "bold"); doc.setFontSize(17); doc.setTextColor(40, 35, 30); doc.text(designName, M, y); y += 18;

  const dim = config.dimensions;
  const ui  = config.userInfo;
  const specItems: [string, string][] = [
    ["Closet type",  (config.closetType ?? "reach-in").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())],
    ["Width",        dim ? inchesToFtIn(dim.width) : "—"],
    ["Height",       dim ? inchesToFtIn(dim.height) : "—"],
    ["Depth",        dim ? inchesToFtIn(dim.depth ?? 24) : "—"],
    ["Style",        (ui?.stylePreference ?? "modern").replace(/\b\w/g, c => c.toUpperCase())],
    ["Wood finish",  (ui?.woodFinish ?? "medium").replace(/\b\w/g, c => c.toUpperCase())],
    ["Hardware",     ui?.hardwareFinish ?? "Chrome"],
    ["Utilisation",  `${layout.utilizationScore}%`],
    ["Hanging rods", `${layout.totalStorage.hangingRods} lin ft`],
    ["Drawers",      String(layout.totalStorage.drawerCount)],
    ["Shoe capacity",`${layout.totalStorage.shoeCapacity} pairs`],
  ];

  doc.setFillColor(250, 247, 242); doc.setDrawColor(220, 210, 195); doc.setLineWidth(0.5);
  doc.roundedRect(M, y, pageW - M * 2, 60, 4, 4, "FD");
  const specColW = (pageW - M * 2 - 16) / 4;
  let sy = y + 12;
  specItems.forEach(([label, value], idx) => {
    if (idx > 0 && idx % 4 === 0) sy += 22;
    const cx = M + 8 + (idx % 4) * specColW;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(130, 115, 100); doc.text(label, cx, sy);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(40, 35, 30); doc.text(value, cx, sy + 10);
  });
  y += 68;

  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(130, 115, 100); doc.text("ELEVATION VIEW", M, y + 8); y += 14;
  const walls = layout.walls?.length
    ? layout.walls
    : [{ wallId: "back", label: "BACK WALL", elevationRef: "EL-A", width: layout.dimensions.width, height: layout.dimensions.height, unitDepth: layout.dimensions.depth, zones: layout.zones } as ClosetWall];
  const firstWall = walls[0];
  const wallLayout = { ...layout, dimensions: { width: firstWall.width, height: firstWall.height, depth: firstWall.unitDepth }, zones: firstWall.zones, walls: [firstWall] };
  const renderer = new ClosetSVGRenderer(wallLayout, {
    showDimensions: true, showLabels: true,
    style: (ui?.stylePreference ?? "modern") as UserPreferences["stylePreference"],
    woodFinish: (ui?.woodFinish ?? "medium") as UserPreferences["woodFinish"],
  });
  const svgH = Math.min(pageH - y - 50, 240);
  await drawSvgToPdf(doc, renderer.renderElevation(), M, y, pageW - M * 2, svgH);
  y += svgH + 8;

  // ── Page 2: Cost breakdown ────────────────────────────────────────────────────
  doc.addPage("a4", "portrait"); y = M;
  doc.setFillColor(45, 40, 35); doc.rect(0, 0, pageW, 28, "F");
  doc.setFont("times", "bold"); doc.setFontSize(12); doc.setTextColor(245, 238, 225); doc.text("ALVÉO", M, 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(180, 165, 148);
  doc.text(`${quoteNum}  ·  ${designName}`, M + 44, 19);
  doc.text("COST BREAKDOWN", pageW - M, 19, { align: "right" });
  y = 44;

  const { items, materialsSubtotal, labourCost, grandTotal } = computeLineItems(layout, ui ?? {} as UserPreferences, accessories, lighting);
  const grouped: Record<string, LineItem[]> = {};
  for (const item of items) (grouped[item.category] ??= []).push(item);

  y = sectionHeader(doc, "Line Items", y, M, pageW);
  const hY = y;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 90, 80);
  const col1H = M + 8, col2H = M + (pageW - M * 2) * 0.58, col3H = M + (pageW - M * 2) * 0.73, col4H = pageW - M - 8;
  doc.text("Description", col1H, hY + 12); doc.text("Qty", col2H, hY + 12); doc.text("Unit", col3H, hY + 12); doc.text("Total", col4H, hY + 12, { align: "right" });
  y = hY + 18; hRule(doc, y, M, pageW, [200, 190, 178]); y += 2;

  let rowIdx = 0;
  for (const cat of CATEGORY_ORDER) {
    const catItems = grouped[cat];
    if (!catItems?.length) continue;
    doc.setFillColor(240, 235, 228); doc.rect(M, y, pageW - M * 2, 13, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(120, 105, 88); doc.text(cat, M + 8, y + 9.5); y += 13;
    for (const item of catItems) {
      y = tableRow(doc, y, M, pageW, item.description, item.qty > 1 ? String(item.qty) : "", item.qty > 1 ? `$${item.unitCost.toFixed(0)} ea` : "", usd(item.total), rowIdx % 2 === 0);
      rowIdx++;
      if (y > pageH - 130) {
        doc.addPage("a4", "portrait");
        doc.setFillColor(45, 40, 35); doc.rect(0, 0, pageW, 28, "F");
        doc.setFont("times", "bold"); doc.setFontSize(12); doc.setTextColor(245, 238, 225); doc.text("ALVÉO", M, 19);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(180, 165, 148); doc.text(`${quoteNum}  ·  ${designName}  ·  continued`, M + 44, 19);
        y = 44;
      }
    }
  }

  hRule(doc, y + 4, M, pageW); y += 12;
  for (const [label, amount] of [["Materials, hardware & logistics subtotal", materialsSubtotal], ["Labour & installation (42%)", labourCost]] as [string, number][]) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 70, 60); doc.text(label, M + 8, y + 10);
    doc.setFont("helvetica", "bold"); doc.text(usd(amount), pageW - M - 8, y + 10, { align: "right" }); y += 16;
  }

  y += 4;
  doc.setFillColor(45, 40, 35); doc.roundedRect(M, y, pageW - M * 2, 34, 4, 4, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(200, 190, 175); doc.text("GRAND TOTAL (estimated)", M + 12, y + 22);
  doc.setFont("times", "bold"); doc.setFontSize(18); doc.setTextColor(255, 245, 230); doc.text(usd(grandTotal), pageW - M - 12, y + 24, { align: "right" });
  y += 46;

  const monthly = usd(Math.round(grandTotal / 36));
  doc.setFillColor(250, 247, 242); doc.setDrawColor(220, 210, 195); doc.setLineWidth(0.4);
  doc.roundedRect(M, y, pageW - M * 2, 28, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(60, 50, 40);
  doc.text(`Finance from ${monthly}/mo  ·  Based on 36-month 0% APR — subject to lender approval`, M + 10, y + 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(120, 110, 95);
  doc.text("Contact your Alvéo designer for financing options.", M + 10, y + 21);
  y += 38;

  y = Math.max(y, pageH - 100); hRule(doc, y, M, pageW); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150, 140, 125);
  [
    "All estimates are indicative only and exclude applicable taxes, permit fees, and site-specific variations.",
    "This quotation is valid for 30 days from the issue date. Final pricing confirmed on signed order.",
    "Measurements and product specifications subject to final site survey and sign-off.",
    "© Alvéo Design Platform — Designed with care for your space.",
  ].forEach((line, i) => doc.text(line, M, y + i * 11));

  const pageCount = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(160, 150, 135);
    doc.text(`Page ${p} of ${pageCount}`, pageW - M, pageH - 16, { align: "right" });
    doc.text("ALVÉO · DESIGN QUOTATION", M, pageH - 16);
  }

  return { doc, quoteNum, grandTotal, designName };
}

// ─── Public exports ───────────────────────────────────────────────────────────

export async function exportQuoteToPDF(options: QuotePDFOptions): Promise<void> {
  const { doc, designName } = await buildQuotePDF(options);
  const clientName = options.clientName ?? "";
  const slug = (designName + (clientName ? `-${clientName}` : ""))
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  doc.save(`alveo-quote-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportQuoteToBase64(options: QuotePDFOptions): Promise<{
  base64: string;
  quoteNum: string;
  grandTotal: number;
  designName: string;
}> {
  const { doc, quoteNum, grandTotal, designName } = await buildQuotePDF(options);
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1] ?? dataUri;
  return { base64, quoteNum, grandTotal, designName };
}
