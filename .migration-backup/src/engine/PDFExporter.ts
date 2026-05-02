"use client";

import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import {
  ClosetConfiguration,
  ClosetLayout,
  ClosetWall,
  SavedDesign,
  UserPreferences,
} from "@/types/closet";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { ClosetLayoutEngine } from "@/engine/ClosetLayoutEngine";

interface PDFExportOptions {
  layout: ClosetLayout;
  config: Partial<ClosetConfiguration>;
  fileName?: string;
  clientName?: string;
  projectRef?: string;
  logoDataUrl?: string;
  comments?: Array<{ author: string; text: string; createdAt: string; parentId?: string }>;
}

function buildWallLayout(layout: ClosetLayout, wall: ClosetWall): ClosetLayout {
  return {
    ...layout,
    dimensions: {
      width: wall.width,
      height: wall.height,
      depth: wall.unitDepth,
    },
    zones: wall.zones,
    walls: [wall],
  };
}

function getRendererOptions(config: Partial<ClosetConfiguration>) {
  return {
    showDimensions: true,
    showLabels: true,
    style: (config.userInfo?.stylePreference ?? "modern") as UserPreferences["stylePreference"],
    woodFinish: (config.userInfo?.woodFinish ?? "medium") as UserPreferences["woodFinish"],
  };
}

function collectWallSvgs(
  layout: ClosetLayout,
  config: Partial<ClosetConfiguration>,
): Array<{ wallLabel: string; elevationRef: string; svg: string }> {
  const opts = getRendererOptions(config);
  const walls = layout.walls?.length
    ? layout.walls
    : [
        {
          wallId: "back",
          label: "BACK WALL",
          elevationRef: "EL-A",
          width: layout.dimensions.width,
          height: layout.dimensions.height,
          unitDepth: layout.dimensions.depth,
          zones: layout.zones,
        } as ClosetWall,
      ];

  return walls.map((wall) => {
    const wallLayout = buildWallLayout(layout, wall);
    const renderer = new ClosetSVGRenderer(wallLayout, opts);
    return {
      wallLabel: wall.label,
      elevationRef: wall.elevationRef,
      svg: renderer.renderElevation(),
    };
  });
}

async function drawSvgToPdf(
  doc: jsPDF,
  svgMarkup: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): Promise<void> {
  const parser = new DOMParser();
  const xml = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgEl = xml.documentElement as unknown as SVGSVGElement;

  const viewBox = svgEl.viewBox.baseVal;
  const sourceW = viewBox?.width || Number(svgEl.getAttribute("width") ?? 800);
  const sourceH = viewBox?.height || Number(svgEl.getAttribute("height") ?? 600);
  const scale = Math.min(maxWidth / sourceW, maxHeight / sourceH);

  await svg2pdf(svgEl, doc, {
    x,
    y,
    width: sourceW * scale,
    height: sourceH * scale,
  });
}

function sanitizeFileName(raw: string): string {
  const compact = raw.trim().toLowerCase().replace(/\s+/g, "-");
  return compact.replace(/[^a-z0-9\-_.]/g, "").slice(0, 80) || "alveo-closet-layout";
}

export async function exportLayoutToPDF({
  layout,
  config,
  fileName = "alveo-closet-layout",
  clientName,
  projectRef,
  logoDataUrl,
  comments,
}: PDFExportOptions): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const wallSvgs = collectWallSvgs(layout, config);

  for (let i = 0; i < wallSvgs.length; i++) {
    if (i > 0) doc.addPage("a4", "portrait");

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const top = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ALVEO CLOSET ELEVATION", 36, top);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `${wallSvgs[i].elevationRef} · ${wallSvgs[i].wallLabel}`,
      36,
      top + 16,
    );

    const details: string[] = [];
    if (clientName) details.push(`Client: ${clientName}`);
    if (projectRef) details.push(`Project: ${projectRef}`);
    details.push(new Date().toLocaleDateString());
    doc.text(details.join("  |  "), 36, top + 30);

    if (logoDataUrl) {
      try {
        const format = logoDataUrl.startsWith("data:image/jpeg")
          ? "JPEG"
          : "PNG";
        doc.addImage(logoDataUrl, format, pageW - 116, 24, 80, 28);
      } catch {
        // ignore malformed image data
      }
    }

    const commentArea = comments?.length ? 86 : 0;
    await drawSvgToPdf(
      doc,
      wallSvgs[i].svg,
      36,
      86,
      pageW - 72,
      pageH - 132 - commentArea,
    );

    if (comments?.length) {
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text('Comments', 36, pageH - 84);

      const visible = comments.slice(0, 3);
      visible.forEach((comment, idx) => {
        const prefix = comment.parentId ? '->' : '-';
        const line = `${prefix} ${comment.author}: ${comment.text}`;
        doc.text(line.slice(0, 140), 36, pageH - 68 + idx * 13);
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(`${sanitizeFileName(fileName)}.pdf`);
}

export async function exportMultipleDesignsToPDF(
  designs: SavedDesign[],
  options?: {
    commentsByDesignId?: Record<
      string,
      Array<{ author: string; text: string; createdAt: string; parentId?: string }>
    >;
  },
): Promise<void> {
  if (!designs.length) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let pageIndex = 0;

  for (const design of designs) {
    const c = design.config;
    if (!c.dimensions || !c.wardrobe || !c.shoes || !c.userInfo) continue;

    let layout: ClosetLayout;
    try {
      const engine = new ClosetLayoutEngine({
        closetType: c.closetType,
        dimensions: c.dimensions,
        roomDimensions: c.roomDimensions,
        wardrobe: c.wardrobe,
        shoes: c.shoes,
        userInfo: c.userInfo,
        amenities: c.amenities,
        zoneOverrides: c.zoneOverrides,
      });
      layout = engine.calculateLayout();
    } catch {
      continue;
    }

    const walls = collectWallSvgs(layout, c);
    for (const wall of walls) {
      if (pageIndex > 0) doc.addPage("a4", "portrait");
      pageIndex += 1;

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(design.name, 36, 40);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${wall.elevationRef} · ${wall.wallLabel}`, 36, 56);
      doc.text(new Date(design.savedAt).toLocaleDateString(), 36, 70);

      const comments = options?.commentsByDesignId?.[design.id] ?? [];
      const commentArea = comments.length ? 86 : 0;
      await drawSvgToPdf(doc, wall.svg, 36, 88, pageW - 72, pageH - 132 - commentArea);

      if (comments.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text("Comments", 36, pageH - 84);

        comments.slice(0, 3).forEach((comment, idx) => {
          const prefix = comment.parentId ? "->" : "-";
          const line = `${prefix} ${comment.author}: ${comment.text}`;
          doc.text(line.slice(0, 140), 36, pageH - 68 + idx * 13);
        });

        doc.setTextColor(0, 0, 0);
      }
    }
  }

  if (pageIndex === 0) return;
  doc.save(`alveo-saved-designs-${new Date().toISOString().slice(0, 10)}.pdf`);
}
