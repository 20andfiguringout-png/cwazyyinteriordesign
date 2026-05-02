"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClosetConfiguration,
  ClosetLayout,
  ClosetWall,
  ZoneOverrides,
  DrawerPosition,
  LayoutWarning,
  SavedDesign,
} from "@/types/closet";
import { ClosetLayoutEngine } from "@/engine/ClosetLayoutEngine";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { ClosetIsometricRenderer } from "@/renderer/ClosetIsometricRenderer";
import {
  exportLayoutToPDF,
  exportMultipleDesignsToPDF,
} from "@/engine/PDFExporter";
import { renderFloorPlan } from "@/renderer/FloorPlanRenderer";
import {
  Download,
  Layers,
  Lightbulb,
  BarChart2,
  Bookmark,
  ChevronDown,
  X,
  Trash2,
  Palette,
  Link2,
  Check,
  TableProperties,
  Receipt,
  Mail,
  GitCompareArrows,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { StyleCustomizer } from "./StyleCustomizer";
import { CostEstimatorTab } from "./CostEstimatorTab";
import { CutListTab } from "./CutListTab";
import { buildShareLink, copyShareLinkToClipboard } from "@/lib/shareLink";
import { CompareModal } from "@/components/CompareModal";
import { LayoutOptimizerModal } from "@/components/LayoutOptimizerModal";
import { trackEvent } from "@/lib/analytics";

interface LivePreviewProps {
  config: Partial<ClosetConfiguration>;
  savedDesigns: SavedDesign[];
  onSaveDesign: () => void;
  onRemoveSavedDesign: (id: string) => void;
  onRenameSavedDesign?: (id: string, newName: string) => void;
  onConfigChange?: (updates: Partial<ClosetConfiguration>) => void;
  clientName?: string;
  projectRef?: string;
  logoDataUrl?: string;
}

type DesignComment = {
  id: string;
  designId: string;
  text: string;
  author: string;
  createdAt: string;
  parentId?: string;
  mentions?: string[];
  mentionRead?: boolean;
};

type DesignCommentPermissions = {
  ownerEmail?: string;
  defaultRole: "viewer" | "editor";
  editors: string[];
};

type DesignCommentAuditEntry = {
  id: string;
  action: string;
  actor: string;
  at: string;
  details?: string;
};

export function LivePreview({
  config,
  savedDesigns,
  onSaveDesign,
  onRemoveSavedDesign,
  onRenameSavedDesign,
  onConfigChange,
  clientName,
  projectRef,
  logoDataUrl,
}: LivePreviewProps) {
  const [activeTab, setActiveTab] = useState<
    "drawing" | "summary" | "tips" | "style" | "cost" | "cutList"
  >("drawing");
  const [activeWallIdx, setActiveWallIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverrides>({});
  const [prevZoneOverrides, setPrevZoneOverrides] =
    useState<ZoneOverrides | null>(null);
  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveToast, setSaveToast] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computePhase, setComputePhase] = useState(0);
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);
  const [drawingMode, setDrawingMode] = useState<"elevation" | "3d">(
    "elevation",
  );
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeCommentDesign, setActiveCommentDesign] =
    useState<SavedDesign | null>(null);
  const [commentsByDesign, setCommentsByDesign] = useState<
    Record<string, DesignComment[]>
  >({});
  const [commentPermissionsByDesign, setCommentPermissionsByDesign] = useState<
    Record<string, DesignCommentPermissions>
  >({});
  const [commentRoleByDesign, setCommentRoleByDesign] = useState<
    Record<string, "viewer" | "editor">
  >({});
  const [commentUnreadMentionCountByDesign, setCommentUnreadMentionCountByDesign] = useState<
    Record<string, number>
  >({});
  const [commentCanManageByDesign, setCommentCanManageByDesign] = useState<
    Record<string, boolean>
  >({});
  const [showUnreadMentionsOnly, setShowUnreadMentionsOnly] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [newEditorEmail, setNewEditorEmail] = useState("");
  const [transferOwnerEmail, setTransferOwnerEmail] = useState("");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferConfirmText, setTransferConfirmText] = useState("");
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentPosting, setIsCommentPosting] = useState(false);
  const [auditTrailByDesign, setAuditTrailByDesign] = useState<
    Record<string, DesignCommentAuditEntry[]>
  >({});
  const previewTrackedRef = useRef(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      )
        setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showExportMenu]);

  useEffect(() => {
    const closeAll = () => {
      setShowCustomModal(false);
      setShowCompareModal(false);
      setShowOptimizerModal(false);
      setShowCommentsModal(false);
      setShowExportMenu(false);
    };
    document.addEventListener("alveo:escape", closeAll);
    return () => document.removeEventListener("alveo:escape", closeAll);
  }, []);

  const handlePositionChange = (position: DrawerPosition) => {
    setPrevZoneOverrides(zoneOverrides);
    setZoneOverrides({ ...zoneOverrides, drawerPosition: position });
    setWarningsDismissed(false);
  };

  // Persist zoneOverrides into config so saved designs include them (BUG-5 fix)
  useEffect(() => {
    if (onConfigChange && Object.keys(zoneOverrides).length > 0) {
      onConfigChange({ zoneOverrides });
    }
  }, [zoneOverrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const undoPosition = () => {
    if (prevZoneOverrides !== null) {
      setZoneOverrides(prevZoneOverrides);
      setPrevZoneOverrides(null);
      setWarningsDismissed(false);
    }
  };

  const isReady = !!(
    config.dimensions?.width &&
    config.wardrobe &&
    config.shoes &&
    config.userInfo
  );

  useEffect(() => {
    if (!isReady || previewTrackedRef.current) return;
    previewTrackedRef.current = true;
    trackEvent("preview_opened", { mode: drawingMode });
  }, [isReady, drawingMode]);

  const layout = useMemo(() => {
    if (!isReady) return null;
    try {
      const engine = new ClosetLayoutEngine({
        closetType: config.closetType,
        dimensions: config.dimensions!,
        roomDimensions: config.roomDimensions,
        wardrobe: config.wardrobe!,
        shoes: config.shoes!,
        userInfo: config.userInfo!,
        zoneOverrides,
      });
      return engine.calculateLayout();
    } catch {
      return null;
    }
  }, [config, isReady, zoneOverrides]);

  // When layout changes (new closet type), reset to first wall
  const numWalls = layout?.walls?.length ?? 1;
  useEffect(() => {
    setActiveWallIdx(0);
  }, [numWalls]);
  const safeWallIdx = Math.min(activeWallIdx, numWalls - 1);

  // Build a single-wall layout for the selected wall (renderer works on one wall at a time)
  const wallLayout = useMemo((): ClosetLayout | null => {
    if (!layout) return null;
    const wall: ClosetWall | undefined = layout.walls?.[safeWallIdx];
    if (!wall) return layout;
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
  }, [layout, safeWallIdx]);

  useEffect(() => {
    if (!wallLayout || !config.userInfo) {
      setSvgContent(null);
      setIsComputing(false);
      return;
    }
    setIsComputing(true);
    setComputePhase(0);
    setSvgContent(null);
    const phaseTimer = setInterval(
      () => setComputePhase((p) => (p + 1) % 4),
      105,
    );
    const renderTimer = setTimeout(() => {
      clearInterval(phaseTimer);
      try {
        const renderer = new ClosetSVGRenderer(wallLayout, {
          showDimensions: true,
          showLabels: true,
          style: config.userInfo!.stylePreference ?? "modern",
          woodFinish: config.userInfo!.woodFinish ?? "medium",
        });
        setSvgContent(renderer.renderElevation());
      } catch {
        setSvgContent(null);
      }
      setIsComputing(false);
    }, 420);
    return () => {
      clearInterval(phaseTimer);
      clearTimeout(renderTimer);
    };
  }, [wallLayout, config.userInfo]);

  const hasDrawersInView =
    wallLayout?.zones.some((z) => z.type === "drawers") ?? false;

  const isoSvgContent = useMemo(() => {
    if (!wallLayout || !config.userInfo) return null;
    try {
      const renderer = new ClosetIsometricRenderer(wallLayout, {
        style: config.userInfo.stylePreference,
        woodFinish: config.userInfo.woodFinish,
      });
      return renderer.renderIsometric();
    } catch {
      return null;
    }
  }, [wallLayout, config.userInfo]);

  const handleExport = async () => {
    if (!layout) return;
    setIsExporting(true);
    try {
      await exportLayoutToPDF({
        layout,
        config,
        clientName,
        projectRef,
        logoDataUrl,
      });
      trackEvent("export_pdf", { type: "single" });
    } catch {
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = () => {
    onSaveDesign();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleSendEmail = () => {
    if (!layout) return;
    const link = buildShareLink(config);
    const subject = encodeURIComponent("My Alveo Closet Design");
    const body = encodeURIComponent(
      [
        "Hi,",
        "",
        "Here is my Alveo closet design:",
        `Utilization: ${layout.utilizationScore}%`,
        `Rods: ${layout.totalStorage.hangingRods} ft`,
        `Drawers: ${layout.totalStorage.drawerCount}`,
        `Shoe capacity: ${layout.totalStorage.shoeCapacity} pairs`,
        "",
        `Open design: ${link}`,
      ].join("\n"),
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackEvent("email_share_opened", { withLink: true });
  };

  const handleCopyClientLink = async () => {
    const editable = buildShareLink(config);
    const url = new URL(editable);
    url.searchParams.set("readonly", "1");
    await navigator.clipboard.writeText(url.toString());
    trackEvent("client_link_copied");
  };

  const handleExportAll = async () => {
    if (!savedDesigns.length) return;
    setIsExporting(true);
    try {
      const commentsByDesignId = await loadCommentsMapForDesigns(savedDesigns);
      await exportMultipleDesignsToPDF(savedDesigns, { commentsByDesignId });
      trackEvent("export_pdf", { type: "all", count: savedDesigns.length });
    } catch {
      alert("Please allow pop-ups for this site to open the PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
    const selected = savedDesigns.filter((d) => selectedIds.has(d.id));
    if (!selected.length) return;
    setIsExporting(true);
    try {
      const commentsByDesignId = await loadCommentsMapForDesigns(selected);
      await exportMultipleDesignsToPDF(selected, { commentsByDesignId });
      setShowCustomModal(false);
      trackEvent("export_pdf", { type: "selected", count: selected.length });
    } catch {
      alert("Please allow pop-ups for this site to open the PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const loadCommentsMapForDesigns = async (designs: SavedDesign[]) => {
    const entries = await Promise.all(
      designs.map(async (design) => {
        try {
          const res = await fetch(
            `/api/design-comments?designId=${encodeURIComponent(design.id)}`,
            { cache: "no-store" },
          );
          if (!res.ok) return [design.id, []] as const;
          const data = (await res.json()) as { comments?: DesignComment[] };
          return [design.id, data.comments ?? []] as const;
        } catch {
          return [design.id, []] as const;
        }
      }),
    );

    return Object.fromEntries(entries) as Record<string, DesignComment[]>;
  };

  const loadDesignComments = async (designId: string) => {
    setIsCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/design-comments?designId=${encodeURIComponent(designId)}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        comments?: DesignComment[];
        permissions?: DesignCommentPermissions;
        role?: "viewer" | "editor";
        canManage?: boolean;
        auditTrail?: DesignCommentAuditEntry[];
        unreadMentionCount?: number;
      };
      setCommentsByDesign((prev) => ({
        ...prev,
        [designId]: data.comments ?? [],
      }));
      setCommentPermissionsByDesign((prev) => ({
        ...prev,
        [designId]: data.permissions ?? { defaultRole: "editor", editors: [] },
      }));
      setCommentRoleByDesign((prev) => ({
        ...prev,
        [designId]: data.role ?? "editor",
      }));
      setCommentCanManageByDesign((prev) => ({
        ...prev,
        [designId]: data.canManage ?? false,
      }));
      setCommentUnreadMentionCountByDesign((prev) => ({
        ...prev,
        [designId]: data.unreadMentionCount ?? 0,
      }));
      setAuditTrailByDesign((prev) => ({
        ...prev,
        [designId]: data.auditTrail ?? [],
      }));
    } catch {
      // no-op; comments are optional collaboration sugar.
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const openCommentsForDesign = (design: SavedDesign) => {
    setActiveCommentDesign(design);
    setShowCommentsModal(true);
    setCommentDraft("");
    setReplyToCommentId(null);
    setShowUnreadMentionsOnly(false);
    setTransferOwnerEmail("");
    setShowTransferConfirm(false);
    setTransferConfirmText("");
    void loadDesignComments(design.id);
  };

  const submitComment = async () => {
    if (!activeCommentDesign || !commentDraft.trim()) return;

    setIsCommentPosting(true);
    try {
      const res = await fetch("/api/design-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: activeCommentDesign.id,
          text: commentDraft.trim(),
          parentId: replyToCommentId ?? undefined,
        }),
      });
      if (!res.ok) return;

      const data = (await res.json()) as { comments?: DesignComment[] };
      setCommentsByDesign((prev) => ({
        ...prev,
        [activeCommentDesign.id]: data.comments ?? [],
      }));
      setCommentDraft("");
      setReplyToCommentId(null);
      trackEvent("design_comment_added", { designId: activeCommentDesign.id });
    } catch {
      // Ignore transient network failures in collaboration add-on.
    } finally {
      setIsCommentPosting(false);
    }
  };

  const updateCommentPermissions = async (
    payload: {
      defaultRole?: "viewer" | "editor";
      addEditor?: string;
      removeEditor?: string;
      transferOwner?: string;
    },
  ) => {
    if (!activeCommentDesign) return;
    try {
      const res = await fetch("/api/design-comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: activeCommentDesign.id, ...payload }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { permissions?: DesignCommentPermissions };
      if (!data.permissions) return;

      setCommentPermissionsByDesign((prev) => ({
        ...prev,
        [activeCommentDesign.id]: data.permissions!,
      }));
      void loadDesignComments(activeCommentDesign.id);
    } catch {
      // Ignore errors for optional permission controls.
    }
  };

  const computeLabels = [
    "Analysing dimensions…",
    "Mapping storage zones…",
    "Placing drawers & shelves…",
    "Rendering blueprint…",
  ];

  const tabs = [
    { id: "drawing" as const, label: "Drawing", Icon: Layers },
    { id: "summary" as const, label: "Summary", Icon: BarChart2 },
    { id: "tips" as const, label: "Suggestions", Icon: Lightbulb },
    { id: "cost" as const, label: "Cost", Icon: Receipt },
    { id: "cutList" as const, label: "Cut List", Icon: TableProperties },
    ...(onConfigChange
      ? [{ id: "style" as const, label: "Style", Icon: Palette }]
      : []),
  ];

  const activeCommentDesignId = activeCommentDesign?.id;
  const activeDesignComments = activeCommentDesignId
    ? (commentsByDesign[activeCommentDesignId] ?? [])
    : [];
  const filteredActiveDesignComments = showUnreadMentionsOnly
    ? activeDesignComments.filter(
        (comment) => !comment.mentionRead && (comment.mentions?.length ?? 0) > 0,
      )
    : activeDesignComments;

  return (
    <div className="flex flex-col gap-4">
      {/* Save toast */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50 bg-charcoal-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Bookmark className="w-4 h-4" />
            <span>Design saved!</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <h2 className="font-serif text-2xl text-charcoal-600">
          Your Closet Preview
        </h2>
        {layout && (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {/* Save Design */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              title="Save this design"
              className="inline-flex items-center whitespace-nowrap space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                try {
                  await copyShareLinkToClipboard(config);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                } catch {
                  /* ignore clipboard failures */
                }
              }}
              title="Copy share link"
              className="inline-flex items-center whitespace-nowrap space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
            >
              {shareCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              <span>{shareCopied ? "Copied" : "Copy link"}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSendEmail}
              title="Send via email"
              className="inline-flex items-center whitespace-nowrap space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </motion.button>

            {savedDesigns.length >= 2 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCompareModal(true)}
                title="Compare saved designs"
                className="inline-flex items-center whitespace-nowrap space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
              >
                <GitCompareArrows className="w-4 h-4" />
                <span>Compare</span>
              </motion.button>
            )}

            {onConfigChange && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowOptimizerModal(true)}
                title="Generate optimized layout variants"
                className="inline-flex items-center whitespace-nowrap space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
              >
                <Sparkles className="w-4 h-4" />
                <span>Optimizer</span>
              </motion.button>
            )}

            {clientName && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  try {
                    await handleCopyClientLink();
                  } catch {
                    /* ignore clipboard failures */
                  }
                }}
                title="Copy read-only client link"
                className="inline-flex items-center whitespace-nowrap space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
              >
                <Link2 className="w-4 h-4" />
                <span>Client link</span>
              </motion.button>
            )}

            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExportMenu((v) => !v)}
                disabled={isExporting}
                className="inline-flex items-center whitespace-nowrap space-x-2 bg-charcoal-500 hover:bg-charcoal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? "Opening PDF…" : "Export"}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-cream-200 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExport();
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors"
                    >
                      <span className="font-medium text-charcoal-600">
                        Export Current
                      </span>
                      <div className="text-xs text-charcoal-400 mt-0.5">
                        This design only
                      </div>
                    </button>
                    <div className="border-t border-cream-100" />
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportAll();
                      }}
                      disabled={savedDesigns.length === 0}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium text-charcoal-600">
                        Export All Saved ({savedDesigns.length})
                      </span>
                      <div className="text-xs text-charcoal-400 mt-0.5">
                        All saved designs in one PDF
                      </div>
                    </button>
                    <div className="border-t border-cream-100" />
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        setSelectedIds(new Set(savedDesigns.map((d) => d.id)));
                        setShowCustomModal(true);
                      }}
                      disabled={savedDesigns.length === 0}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium text-charcoal-600">
                        Custom Export…
                      </span>
                      <div className="text-xs text-charcoal-400 mt-0.5">
                        Pick which designs to include
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className="flex gap-1 bg-cream-100 rounded-lg p-1 overflow-x-auto scrollbar-none">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`shrink-0 min-w-[112px] px-3 flex items-center justify-center space-x-1.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === id
                ? "bg-white text-charcoal-600 shadow-sm"
                : "text-charcoal-400 hover:text-charcoal-600"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── Drawing ── */}
          {activeTab === "drawing" && (
            <div className="bg-cream-50 rounded-xl border border-cream-200 overflow-hidden p-4">
              <div className="mb-3 inline-flex rounded-lg border border-cream-200 overflow-hidden">
                <button
                  onClick={() => setDrawingMode("elevation")}
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    drawingMode === "elevation"
                      ? "bg-charcoal-600 text-white"
                      : "bg-white text-charcoal-500"
                  }`}
                >
                  Elevation
                </button>
                <button
                  onClick={() => setDrawingMode("3d")}
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    drawingMode === "3d"
                      ? "bg-charcoal-600 text-white"
                      : "bg-white text-charcoal-500"
                  }`}
                >
                  3D View
                </button>
              </div>

              {/* Wall selector tabs — shown for multi-wall closet types */}
              {numWalls > 1 && layout?.walls && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {layout.walls.map((wall, i) => (
                    <button
                      key={wall.wallId}
                      type="button"
                      onClick={() => setActiveWallIdx(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                        safeWallIdx === i
                          ? "bg-charcoal-500 text-white shadow-sm"
                          : "bg-cream-200 text-charcoal-500 hover:bg-cream-300"
                      }`}
                    >
                      <span>
                        {wall.elevationRef} · {wall.label}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${
                          safeWallIdx === i
                            ? "bg-white/20 text-white"
                            : "bg-charcoal-200 text-charcoal-600"
                        }`}
                      >
                        {wall.zones.length}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {/* ── Input normalisation warnings (amber toasts) ── */}
              {(layout?.inputWarnings?.length ?? 0) > 0 && (
                <div className="mb-3 space-y-1.5">
                  {layout!.inputWarnings!.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 leading-snug"
                    >
                      <span className="flex-shrink-0 font-bold">&#9888;</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {drawingMode === "3d" && isoSvgContent ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: isoSvgContent }}
                />
              ) : svgContent ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : isComputing ? (
                /* ── Computing state ── */
                <div className="py-10 px-6 flex flex-col items-center gap-5">
                  {/* Animated blueprint sketch */}
                  <div className="relative w-40 h-24 rounded-xl border border-taupe-300 bg-white/70 overflow-hidden">
                    {[0.28, 0.55, 0.78].map((y, i) => (
                      <motion.div
                        key={y}
                        className="absolute left-3 right-3 h-px bg-taupe-400 origin-left"
                        style={{ top: `${y * 100}%` }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 1, 1, 0] }}
                        transition={{
                          duration: 1.4,
                          times: [0, 0.38, 0.75, 1],
                          repeat: Infinity,
                          delay: i * 0.18,
                        }}
                      />
                    ))}
                    {[0.32, 0.62].map((x, i) => (
                      <motion.div
                        key={x}
                        className="absolute top-2 bottom-2 w-px bg-taupe-300 origin-top"
                        style={{ left: `${x * 100}%` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: [0, 1, 1, 0] }}
                        transition={{
                          duration: 1.4,
                          times: [0, 0.38, 0.75, 1],
                          repeat: Infinity,
                          delay: 0.28 + i * 0.18,
                        }}
                      />
                    ))}
                    <motion.div
                      className="absolute bottom-2 right-3 text-[9px] font-mono text-taupe-400 select-none"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.0, repeat: Infinity }}
                    >
                      ELEV · A
                    </motion.div>
                  </div>

                  {/* Cycling phase label */}
                  <div className="text-center space-y-1">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={computePhase}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.14 }}
                        className="text-sm font-semibold text-charcoal-500 tracking-wide"
                      >
                        {computeLabels[computePhase]}
                      </motion.p>
                    </AnimatePresence>
                    <p className="text-xs text-charcoal-400">
                      Constructing your elevation drawing
                    </p>
                  </div>

                  {/* Scrolling progress bar */}
                  <div className="w-44 h-1 bg-cream-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full w-2/5 bg-taupe-400 rounded-full"
                      initial={{ x: "-100%" }}
                      animate={{ x: "180%" }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>
              ) : isReady ? (
                /* ── Ready but SVG failed ── */
                <div className="py-10 text-center space-y-2">
                  <div className="text-3xl">⚠️</div>
                  <p className="text-sm font-semibold text-charcoal-500">
                    Layout could not be rendered
                  </p>
                  <p className="text-xs text-charcoal-400">
                    Try adjusting your dimensions or wardrobe configuration
                  </p>
                </div>
              ) : (
                /* ── Incomplete form — step checklist ── */
                <div className="py-8 px-4 space-y-4">
                  <div className="text-center space-y-1 mb-2">
                    <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest">
                      Blueprint pending
                    </p>
                    <p className="text-xs text-charcoal-300">
                      Complete the steps below to generate your design
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(
                      [
                        {
                          label: "Closet shape & type",
                          done: !!config.closetType,
                        },
                        {
                          label: "Room dimensions",
                          done: !!config.dimensions?.width,
                        },
                        {
                          label: "Wardrobe configuration",
                          done: !!config.wardrobe,
                        },
                        { label: "Shoe storage", done: !!config.shoes },
                        { label: "Style & finish", done: !!config.userInfo },
                      ] as { label: string; done: boolean }[]
                    ).map(({ label, done }) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                          done
                            ? "bg-cream-50 border-cream-200 text-charcoal-500"
                            : "bg-white border-cream-100 text-charcoal-300"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            done
                              ? "bg-taupe-400 text-white"
                              : "bg-cream-200 text-charcoal-300"
                          }`}
                        >
                          {done ? "✓" : "·"}
                        </span>
                        <span>{label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Floor plan toggle ── */}
              {svgContent &&
                layout &&
                !["reach-in", "wardrobe-wall"].includes(layout.closetType) && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowFloorPlan((p) => !p)}
                      className="text-xs font-semibold text-taupe-500 hover:text-taupe-700 underline underline-offset-2 transition-colors"
                    >
                      {showFloorPlan ? "Hide floor plan" : "Show floor plan"}
                    </button>
                    {showFloorPlan && (
                      <div
                        className="mt-2 rounded-lg border border-cream-200 overflow-hidden"
                        dangerouslySetInnerHTML={{
                          __html: renderFloorPlan(layout, {
                            roomWidth:
                              config.roomDimensions?.roomWidth ??
                              config.dimensions?.width ??
                              120,
                            roomDepth:
                              config.roomDimensions?.roomDepth ??
                              Math.round(
                                (config.dimensions?.width ?? 120) * 0.75,
                              ),
                            unitDepth: config.dimensions?.depth ?? 24,
                          }),
                        }}
                      />
                    )}
                  </div>
                )}

              {/* ── Zone Controls — drawer position selector ── */}
              {svgContent && hasDrawersInView && (
                <div className="mt-4 pt-4 border-t border-cream-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest">
                      Fine-tune your layout
                    </p>
                    {prevZoneOverrides !== null && (
                      <button
                        type="button"
                        onClick={undoPosition}
                        className="text-xs text-taupe-500 hover:text-taupe-700 font-medium underline underline-offset-2 transition-colors"
                      >
                        ↩ Undo last change
                      </button>
                    )}
                  </div>
                  <DrawerPositionControl
                    position={zoneOverrides.drawerPosition ?? "bottom"}
                    onChange={handlePositionChange}
                  />
                </div>
              )}

              {/* ── Designer warnings ── */}
              <AnimatePresence>
                {!warningsDismissed &&
                  (layout?.layoutWarnings ?? []).map((w) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3"
                    >
                      <DesignerWarning
                        warning={w}
                        onKeep={() => setWarningsDismissed(true)}
                        onUndo={
                          prevZoneOverrides !== null ? undoPosition : undefined
                        }
                      />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── Summary ── */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {layout ? (
                <>
                  <div className="bg-cream-50 rounded-xl border border-cream-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-charcoal-600">
                        Space Utilization
                      </p>
                      <span className="text-2xl font-serif font-bold text-taupe-500">
                        {layout.utilizationScore}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-cream-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${layout.utilizationScore}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          layout.utilizationScore >= 80
                            ? "bg-green-500"
                            : layout.utilizationScore >= 50
                              ? "bg-taupe-400"
                              : "bg-amber-400"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-charcoal-400 mt-2">
                      {layout.utilizationScore >= 80
                        ? "Excellent — your closet space is well utilized."
                        : layout.utilizationScore >= 50
                          ? "Good utilization. Add more inventory or reduce wall width to improve."
                          : "Low utilization — add wardrobe items or consider a smaller closet type."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Hanging Rods",
                        value: `${layout.totalStorage.hangingRods} ft`,
                        icon: "👗",
                      },
                      {
                        label: "Shelf Space",
                        value: `${layout.totalStorage.shelfSpace} sq ft`,
                        icon: "📦",
                      },
                      {
                        label: "Drawers",
                        value: `${layout.totalStorage.drawerCount}`,
                        icon: "🗄️",
                      },
                      {
                        label: "Shoe Pairs",
                        value: `${layout.totalStorage.shoeCapacity} pairs`,
                        icon: "👠",
                      },
                    ].map(({ label, value, icon }) => (
                      <div
                        key={label}
                        className="bg-cream-50 rounded-xl border border-cream-200 p-4 flex items-center space-x-3"
                      >
                        <span className="text-xl">{icon}</span>
                        <div>
                          <p className="text-xs text-charcoal-400">{label}</p>
                          <p className="font-semibold text-charcoal-600">
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Per-wall breakdown */}
                  {layout.walls.length > 1 && (
                    <div className="bg-cream-50 rounded-xl border border-cream-200 p-4 space-y-2">
                      <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                        Per-wall breakdown
                      </p>
                      {layout.walls.map((w) => (
                        <div
                          key={w.wallId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-charcoal-500">
                            {w.elevationRef} · {w.label}
                          </span>
                          <span className="text-charcoal-600 font-medium">
                            {w.zones.length} zone
                            {w.zones.length !== 1 ? "s" : ""} ·{" "}
                            {Math.round(w.width)}" wide
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-cream-50 rounded-xl border border-cream-200 p-4 text-sm text-charcoal-500">
                    {config.dimensions?.width}" wide ×{" "}
                    {config.dimensions?.height}" tall ×{" "}
                    {config.dimensions?.depth}" deep
                    <span className="ml-2 text-taupe-500 font-medium">
                      ·{" "}
                      {[
                        "walkin-single",
                        "walkin-l",
                        "walkin-u",
                        "island",
                        "corridor",
                      ].includes(config.closetType ?? "")
                        ? "Walk-in"
                        : config.closetType === "wardrobe-wall"
                          ? "Wardrobe Wall"
                          : "Reach-in"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="bg-cream-50 rounded-xl border border-cream-200 p-8 text-center">
                  <p className="text-charcoal-400">
                    Complete the configurator steps to see your storage summary
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Tips ── */}
          {activeTab === "tips" && (
            <div className="space-y-3">
              {layout?.recommendations?.length ? (
                layout.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start space-x-3 bg-cream-50 rounded-xl border border-cream-200 p-4"
                  >
                    <span className="text-taupe-400 text-lg mt-0.5">💡</span>
                    <p className="text-sm text-charcoal-600">{rec}</p>
                  </motion.div>
                ))
              ) : layout ? (
                <div className="bg-cream-50 rounded-xl border border-cream-200 p-6 text-center">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="text-charcoal-600 font-medium">
                    Your layout is well optimized!
                  </p>
                  <p className="text-sm text-charcoal-400 mt-1">
                    No major suggestions — you're all set
                  </p>
                </div>
              ) : (
                <div className="bg-cream-50 rounded-xl border border-cream-200 p-8 text-center">
                  <p className="text-charcoal-400">
                    Smart suggestions will appear after your layout is generated
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "cost" && layout && config.userInfo && (
            <CostEstimatorTab layout={layout} userInfo={config.userInfo} />
          )}

          {activeTab === "cost" && (!layout || !config.userInfo) && (
            <div className="bg-cream-50 rounded-xl border border-cream-200 p-8 text-center">
              <p className="text-charcoal-400">
                Complete the configurator to generate a material cost estimate.
              </p>
            </div>
          )}

          {activeTab === "cutList" && layout && <CutListTab layout={layout} />}

          {activeTab === "cutList" && !layout && (
            <div className="bg-cream-50 rounded-xl border border-cream-200 p-8 text-center">
              <p className="text-charcoal-400">
                Complete the configurator to generate a furniture cut list.
              </p>
            </div>
          )}

          {/* ─── Style tab ─── */}
          {activeTab === "style" && onConfigChange && (
            <StyleCustomizer config={config} onConfigChange={onConfigChange} />
          )}
        </motion.div>
      </AnimatePresence>

      <CompareModal
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        designs={savedDesigns}
      />

      {onConfigChange && (
        <LayoutOptimizerModal
          open={showOptimizerModal}
          onClose={() => setShowOptimizerModal(false)}
          config={config}
          onApply={onConfigChange}
        />
      )}

      {/* ── Custom Export Modal ── */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setShowCustomModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-charcoal-600">
                  Custom Export
                </h3>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-charcoal-400">
                Select which saved designs to include:
              </p>

              {savedDesigns.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-6 bg-cream-50 rounded-xl">
                  No saved designs yet. Click &ldquo;Save&rdquo; to bookmark a
                  design.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {savedDesigns.map((design) => (
                    <label
                      key={design.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-cream-200 hover:bg-cream-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(design.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          e.target.checked
                            ? next.add(design.id)
                            : next.delete(design.id);
                          setSelectedIds(next);
                        }}
                        className="accent-taupe-500 w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {editingDesignId === design.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim() && onRenameSavedDesign)
                                onRenameSavedDesign(
                                  design.id,
                                  editingName.trim(),
                                );
                              setEditingDesignId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                              if (e.key === "Escape") {
                                setEditingDesignId(null);
                              }
                            }}
                            autoFocus
                            className="w-full text-sm font-medium text-charcoal-600 bg-white border border-taupe-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-taupe-400"
                            onClick={(e) => e.preventDefault()}
                          />
                        ) : (
                          <p
                            className="font-medium text-sm text-charcoal-600 truncate cursor-text"
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              if (onRenameSavedDesign) {
                                setEditingDesignId(design.id);
                                setEditingName(design.name);
                              }
                            }}
                            title={
                              onRenameSavedDesign
                                ? "Double-click to rename"
                                : undefined
                            }
                          >
                            {design.name}
                          </p>
                        )}
                        <p className="text-xs text-charcoal-400">
                          {new Date(design.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          openCommentsForDesign(design);
                        }}
                        className="text-charcoal-300 hover:text-charcoal-500 transition-colors flex-shrink-0"
                        title="Open comments"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onRemoveSavedDesign(design.id);
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(design.id);
                            return next;
                          });
                        }}
                        className="text-charcoal-300 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove saved design"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-charcoal-600 bg-cream-100 hover:bg-cream-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportSelected}
                  disabled={selectedIds.size === 0 || isExporting}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-charcoal-500 hover:bg-charcoal-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isExporting
                    ? "Exporting…"
                    : `Export ${selectedIds.size} Design${selectedIds.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>{" "}

      {/* ── Design Comments Modal ── */}
      <AnimatePresence>
        {showCommentsModal && activeCommentDesign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setShowCommentsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl text-charcoal-600">
                    Comments · {activeCommentDesign.name}
                  </h3>
                  {(commentUnreadMentionCountByDesign[activeCommentDesign.id] ?? 0) > 0 && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-taupe-100 text-taupe-700 border border-taupe-200">
                      {commentUnreadMentionCountByDesign[activeCommentDesign.id] ?? 0} unread mentions
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowCommentsModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-xl border border-cream-200 p-3 space-y-3 bg-cream-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-wider text-charcoal-400">
                    Permissions
                  </p>
                  <span className="text-xs text-charcoal-400">
                    Your role: {commentRoleByDesign[activeCommentDesign.id] ?? "editor"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={
                      commentPermissionsByDesign[activeCommentDesign.id]
                        ?.defaultRole ?? "editor"
                    }
                    disabled={!commentCanManageByDesign[activeCommentDesign.id]}
                    onChange={(e) =>
                      void updateCommentPermissions({
                        defaultRole: e.target.value as "viewer" | "editor",
                      })
                    }
                    className="rounded-md border border-cream-200 px-2 py-1 text-xs bg-white"
                  >
                    <option value="editor">Default: Editor</option>
                    <option value="viewer">Default: Viewer</option>
                  </select>

                  <input
                    value={newEditorEmail}
                    disabled={!commentCanManageByDesign[activeCommentDesign.id]}
                    onChange={(e) => setNewEditorEmail(e.target.value)}
                    placeholder="editor@email.com"
                    className="rounded-md border border-cream-200 px-2 py-1 text-xs bg-white"
                  />
                  <button
                    disabled={!commentCanManageByDesign[activeCommentDesign.id]}
                    onClick={() => {
                      if (!newEditorEmail.trim()) return;
                      void updateCommentPermissions({
                        addEditor: newEditorEmail.trim(),
                      });
                      setNewEditorEmail("");
                    }}
                    className="px-2 py-1 rounded-md bg-charcoal-600 text-white text-xs disabled:opacity-40"
                  >
                    Add editor
                  </button>
                </div>

                {(commentPermissionsByDesign[activeCommentDesign.id]?.editors ?? [])
                  .slice(0, 5)
                  .map((email) => (
                    <div
                      key={email}
                      className="inline-flex items-center gap-2 mr-2 mb-1 text-[11px] px-2 py-1 rounded-full bg-white border border-cream-200"
                    >
                      <span>{email}</span>
                      <button
                        disabled={!commentCanManageByDesign[activeCommentDesign.id]}
                        onClick={() =>
                          void updateCommentPermissions({ removeEditor: email })
                        }
                        className="text-charcoal-400 hover:text-red-500 disabled:opacity-40"
                        title="Remove editor"
                      >
                        x
                      </button>
                    </div>
                  ))}

                <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-cream-200">
                  <input
                    value={transferOwnerEmail}
                    disabled={!commentCanManageByDesign[activeCommentDesign.id]}
                    onChange={(e) => setTransferOwnerEmail(e.target.value)}
                    placeholder="new owner email"
                    className="rounded-md border border-cream-200 px-2 py-1 text-xs bg-white"
                  />
                  <button
                    disabled={!commentCanManageByDesign[activeCommentDesign.id]}
                    onClick={() => {
                      const email = transferOwnerEmail.trim();
                      if (!email) return;
                      setTransferConfirmText("");
                      setShowTransferConfirm(true);
                    }}
                    className="px-2 py-1 rounded-md bg-charcoal-600 text-white text-xs disabled:opacity-40"
                  >
                    Transfer owner
                  </button>
                  <span className="text-[11px] text-charcoal-400">
                    Current owner: {commentPermissionsByDesign[activeCommentDesign.id]?.ownerEmail ?? "not set"}
                  </span>
                </div>

                {showTransferConfirm && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mt-2 space-y-2">
                    <p className="text-[11px] text-amber-800">
                      Owner transfer is sensitive. Type TRANSFER to confirm handoff to {transferOwnerEmail.trim()}.
                    </p>
                    <input
                      value={transferConfirmText}
                      onChange={(e) => setTransferConfirmText(e.target.value)}
                      placeholder="Type TRANSFER"
                      className="rounded-md border border-amber-200 px-2 py-1 text-xs bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const email = transferOwnerEmail.trim();
                          if (!email || transferConfirmText.trim() !== "TRANSFER") return;
                          void updateCommentPermissions({ transferOwner: email });
                          setTransferOwnerEmail("");
                          setTransferConfirmText("");
                          setShowTransferConfirm(false);
                        }}
                        disabled={transferConfirmText.trim() !== "TRANSFER"}
                        className="px-2 py-1 rounded-md bg-amber-700 text-white text-xs disabled:opacity-40"
                      >
                        Confirm transfer
                      </button>
                      <button
                        onClick={() => {
                          setTransferConfirmText("");
                          setShowTransferConfirm(false);
                        }}
                        className="px-2 py-1 rounded-md border border-cream-200 bg-white text-xs text-charcoal-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-cream-200">
                  <p className="text-xs uppercase tracking-wider text-charcoal-400 mb-2">
                    Permission Audit
                  </p>
                  <div className="max-h-24 overflow-auto space-y-1">
                    {(auditTrailByDesign[activeCommentDesign.id] ?? [])
                      .slice(0, 8)
                      .map((entry) => (
                        <p key={entry.id} className="text-[11px] text-charcoal-500">
                          {new Date(entry.at).toLocaleString()} · {entry.actor} · {entry.action}
                          {entry.details ? ` (${entry.details})` : ""}
                        </p>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-charcoal-500 bg-cream-50 border border-cream-200 rounded-lg px-3 py-2">
                <span>Comment visibility</span>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnreadMentionsOnly}
                    onChange={(e) => setShowUnreadMentionsOnly(e.target.checked)}
                    className="accent-taupe-500"
                  />
                  Show unread mentions only
                </label>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {isCommentsLoading ? (
                  <p className="text-sm text-charcoal-400">Loading comments...</p>
                ) : filteredActiveDesignComments.length === 0 ? (
                  <p className="text-sm text-charcoal-400 bg-cream-50 rounded-xl p-4">
                    {showUnreadMentionsOnly
                      ? "No unread mentions for your account in this design."
                      : "No comments yet. Add the first collaboration note."}
                  </p>
                ) : (
                  filteredActiveDesignComments.map((comment) => {
                    const isReply = !!comment.parentId;
                    return (
                      <div
                        key={comment.id}
                        className={`rounded-xl border border-cream-200 p-3 bg-cream-50 ${isReply ? "ml-6" : ""}`}
                      >
                        <p className="text-sm text-charcoal-600">{comment.text}</p>
                        {!!comment.mentions?.length && (
                          <p className="text-[11px] text-taupe-500 mt-1">
                            Mentions: {comment.mentions.map((m) => `@${m}`).join(", ")}
                          </p>
                        )}
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-xs text-charcoal-400">
                            {comment.author} · {new Date(comment.createdAt).toLocaleString()}
                          </p>
                          <button
                            onClick={() => {
                              setReplyToCommentId(comment.id);
                              setCommentDraft(`@${comment.author} `);
                            }}
                            className="text-[11px] text-charcoal-500 hover:text-charcoal-700"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-2">
                {replyToCommentId && (
                  <div className="flex items-center justify-between text-xs text-charcoal-400 bg-cream-50 rounded-md px-2 py-1">
                    <span>Replying in thread</span>
                    <button
                      onClick={() => {
                        setReplyToCommentId(null);
                        setCommentDraft("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Leave a note for collaborators..."
                  rows={3}
                  className="w-full rounded-lg border border-cream-200 px-3 py-2.5 text-sm text-charcoal-600 outline-none focus:ring-1 focus:ring-taupe-400"
                />
                <div className="flex justify-end">
                  <button
                    onClick={submitComment}
                    disabled={
                      !commentDraft.trim() ||
                      isCommentPosting ||
                      (commentRoleByDesign[activeCommentDesign.id] ?? "editor") !==
                        "editor"
                    }
                    className="px-4 py-2 rounded-lg bg-charcoal-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {isCommentPosting ? "Posting..." : "Add Comment"}
                  </button>
                </div>
                {(commentRoleByDesign[activeCommentDesign.id] ?? "editor") !==
                  "editor" && (
                  <p className="text-xs text-charcoal-400 text-right">
                    You are in viewer mode for this design.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Drawer Position Control ───────────────────────────────────────────────────────────
function DrawerPositionControl({
  position,
  onChange,
}: {
  position: DrawerPosition;
  onChange: (p: DrawerPosition) => void;
}) {
  const options: {
    value: DrawerPosition;
    label: string;
    desc: string;
    emoji: string;
  }[] = [
    {
      value: "bottom",
      label: "Bottom",
      desc: "Easy everyday access",
      emoji: "⬇️",
    },
    {
      value: "middle",
      label: "Middle",
      desc: "Great for accessories & jewellery",
      emoji: "↕️",
    },
    {
      value: "top",
      label: "Top",
      desc: "Ideal for seasonal items",
      emoji: "⬆️",
    },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-charcoal-400">
        Drawer stack position in the hanging column
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-xl px-3 py-3 text-left transition-all border ${
              position === o.value
                ? "bg-charcoal-500 text-white border-charcoal-500 shadow-sm"
                : "bg-white text-charcoal-600 border-cream-200 hover:border-taupe-300"
            }`}
          >
            <div className="text-base mb-1">{o.emoji}</div>
            <div className="text-xs font-semibold">{o.label}</div>
            <div
              className={`text-[10px] mt-0.5 leading-tight ${
                position === o.value ? "text-cream-300" : "text-charcoal-400"
              }`}
            >
              {o.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Designer Warning Toast ─────────────────────────────────────────────────────────
function DesignerWarning({
  warning,
  onKeep,
  onUndo,
}: {
  warning: LayoutWarning;
  onKeep: () => void;
  onUndo?: () => void;
}) {
  const isCaution = warning.severity === "caution";
  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        isCaution
          ? "bg-amber-50 border-amber-200"
          : "bg-cream-50 border-taupe-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{isCaution ? "⚠️" : "💡"}</span>
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${
              isCaution ? "text-amber-600" : "text-taupe-500"
            }`}
          >
            {isCaution ? "Designer's caution" : "Designer's note"}
          </p>
          <p className="text-sm text-charcoal-600 leading-relaxed">
            {warning.designerNote}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onKeep}
          className="text-xs font-medium px-4 py-2 bg-charcoal-500 text-white rounded-lg hover:bg-charcoal-600 transition-colors"
        >
          Keep this layout
        </button>
        {onUndo && (
          <button
            onClick={onUndo}
            className="text-xs font-medium px-4 py-2 bg-white text-charcoal-600 border border-cream-200 rounded-lg hover:bg-cream-100 transition-colors"
          >
            Undo move
          </button>
        )}
      </div>
    </div>
  );
}
