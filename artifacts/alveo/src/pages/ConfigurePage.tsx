import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ClosetConfiguration, SavedDesign } from "@/types/closet";
import {
  ConfigStep,
  EnhancedConfigurator,
} from "@/components/configurator/EnhancedConfigurator";
import { LivePreview } from "@/components/configurator/LivePreview";
import { ArrowLeft, Undo2, Redo2 } from "lucide-react";
import { getSharedConfigFromURL } from "@/lib/shareLink";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { trackEvent } from "@/lib/analytics";
import { makeAuthHeaders, getAuthToken } from "@/lib/auth";

const WIZARD_DRAFT_KEY = "alveo-wizard-draft";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function readDraftFromStorage(): {
  config: Partial<ClosetConfiguration>;
  step: ConfigStep;
  restored: boolean;
} {
  if (typeof window === "undefined") {
    return { config: {}, step: "shape", restored: false };
  }
  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return { config: {}, step: "shape", restored: false };
    const parsed = JSON.parse(raw) as {
      config?: Partial<ClosetConfiguration>;
      currentStep?: ConfigStep;
    };
    if (!parsed?.config || !parsed.config.dimensions) {
      return { config: {}, step: "shape", restored: false };
    }
    return {
      config: parsed.config,
      step: parsed.currentStep ?? "shape",
      restored: true,
    };
  } catch {
    return { config: {}, step: "shape", restored: false };
  }
}

export default function ConfigurePage() {
  const draft = readDraftFromStorage();

  const [userType] = useState<string>(
    () =>
      (typeof window !== "undefined"
        ? sessionStorage.getItem("userType")
        : null) ?? "homeowner",
  );

  const {
    state: config,
    set: setConfigWithHistory,
    undo: undoConfig,
    redo: redoConfig,
    canUndo,
    canRedo,
  } = useUndoRedo<Partial<ClosetConfiguration>>(draft.config);

  const [currentStep, setCurrentStep] = useState<ConfigStep>(draft.step);

  const setConfig = (
    updater:
      | Partial<ClosetConfiguration>
      | ((prev: Partial<ClosetConfiguration>) => Partial<ClosetConfiguration>),
  ) => {
    if (typeof updater === "function") {
      setConfigWithHistory(updater(config));
    } else {
      setConfigWithHistory(updater);
    }
  };

  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [isReadonly, setIsReadonly] = useState(false);
  const [draftRestored, setDraftRestored] = useState(draft.restored);
  const [mobileTab, setMobileTab] = useState<"configure" | "preview">("configure");

  const [clientName, setClientName] = useState("");
  const [projectRef, setProjectRef] = useState(
    () => `ALV-${Date.now().toString(36).toUpperCase()}`,
  );
  const [projectRooms, setProjectRooms] = useState<string[]>([]);
  const [logoDataUrl, setLogoDataUrl] = useState("");

  const loadedRef = useRef(false);
  const configDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    const sharedConfig = getSharedConfigFromURL();
    const readonly =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("readonly") === "1";
    setIsReadonly(!!readonly);
    if (readonly) setMobileTab("preview");

    if (sharedConfig && sharedConfig.dimensions) {
      setConfig(sharedConfig);
      window.history.replaceState(null, "", window.location.pathname);
      restoredRef.current = true;
      setCurrentStep("shape");
      setDraftRestored(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (draft.restored) restoredRef.current = true;
  }, [draft.restored]);

  useEffect(() => {
    trackEvent("configure_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const storedEmail = localStorage.getItem("alveo-user-email") ?? "";
    setUserEmail(storedEmail);

    const storedRooms = localStorage.getItem("alveo-project-rooms");
    if (storedRooms) {
      try {
        setProjectRooms(JSON.parse(storedRooms));
      } catch {
        setProjectRooms([]);
      }
    }

    if (storedEmail) {
      try {
        const token = getAuthToken(storedEmail);
        fetch(`${BASE}/api/designs`, {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.designs)) {
              setSavedDesigns(data.designs as SavedDesign[]);
            } else {
              const fallback = localStorage.getItem("alveo-saved-designs");
              if (fallback) setSavedDesigns(JSON.parse(fallback) as SavedDesign[]);
            }
          })
          .catch(() => {
            const fallback = localStorage.getItem("alveo-saved-designs");
            if (fallback) {
              try { setSavedDesigns(JSON.parse(fallback) as SavedDesign[]); } catch { /* ignore */ }
            }
          })
          .finally(() => { loadedRef.current = true; });
        return;
      } catch {
        const fallback = localStorage.getItem("alveo-saved-designs");
        if (fallback) {
          try { setSavedDesigns(JSON.parse(fallback) as SavedDesign[]); } catch { /* ignore */ }
        }
        loadedRef.current = true;
        return;
      }
    }

    try {
      const stored = localStorage.getItem("alveo-saved-designs");
      if (stored) setSavedDesigns(JSON.parse(stored) as SavedDesign[]);
    } catch {
      /* ignore corrupt storage */
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    localStorage.setItem("alveo-saved-designs", JSON.stringify(savedDesigns));
  }, [savedDesigns]);

  useEffect(() => {
    if (configDebounceRef.current) clearTimeout(configDebounceRef.current);
    configDebounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          WIZARD_DRAFT_KEY,
          JSON.stringify({ config, currentStep }),
        );
      } catch {
        /* ignore storage errors */
      }
    }, 500);
    return () => {
      if (configDebounceRef.current) clearTimeout(configDebounceRef.current);
    };
  }, [config, currentStep]);

  useEffect(() => {
    if (!draftRestored) return;
    const timer = setTimeout(() => setDraftRestored(false), 4_000);
    return () => clearTimeout(timer);
  }, [draftRestored]);

  useEffect(() => {
    if (restoredRef.current) return;

    const storedType =
      (typeof window !== "undefined"
        ? sessionStorage.getItem("userType")
        : null) ?? "homeowner";

    setConfig({
      userInfo: {
        userType: storedType as "homeowner" | "renter" | "designer" | "browsing",
        stylePreference: "modern",
        woodFinish: "medium",
        drawerPreference: "mixed",
        priorityItems: ["hanging"],
      },
      dimensions: { width: 96, height: 96, depth: 24 },
      wardrobe: {
        longDresses: 3, shortJackets: 4, suits: 2, shirts: 10, pants: 5,
        tShirts: 15, sweaters: 6, jeans: 4, underwear: 10, bags: 3,
        belts: 2, jewelry: true, ties: 0,
      },
      shoes: { sneakers: 5, heels: 4, boots: 2, flats: 3 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts({
    "z+meta": () => canUndo && undoConfig(),
    "z+ctrl": () => canUndo && undoConfig(),
  });

  const handleSaveDesign = () => {
    const name = `Design ${savedDesigns.length + 1}`;
    const design: SavedDesign = {
      id: Date.now().toString(),
      name,
      config: { ...config },
      savedAt: new Date().toISOString(),
    };
    setSavedDesigns((prev) => [...prev, design]);
    trackEvent("design_saved", {
      userType,
      mode: isReadonly ? "readonly" : "editor",
    });

    if (userEmail) {
      try {
        const headers = makeAuthHeaders(userEmail);
        fetch(`${BASE}/api/designs`, { method: "POST", headers, body: JSON.stringify({ design }) })
          .catch(() => { /* ignore cloud sync failures */ });
      } catch { /* no token — skip sync */ }
    }
  };

  const handleRemoveDesign = (id: string) => {
    setSavedDesigns((prev) => prev.filter((d) => d.id !== id));
    trackEvent("design_removed", { id });

    if (userEmail) {
      try {
        const headers = makeAuthHeaders(userEmail);
        fetch(`${BASE}/api/designs`, { method: "DELETE", headers, body: JSON.stringify({ id }) })
          .catch(() => { /* ignore cloud sync failures */ });
      } catch { /* no token — skip sync */ }
    }
  };

  const handleRenameDesign = (id: string, newName: string) => {
    setSavedDesigns((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName } : d)),
    );
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      <div className="bg-white border-b border-cream-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-charcoal-400 hover:text-charcoal-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="font-serif text-xl text-charcoal-600">Alvéo Configurator</span>
              <span className="ml-3 text-sm text-charcoal-400 capitalize">· {userType} mode</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(canUndo || canRedo) && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={undoConfig}
                  disabled={!canUndo}
                  title="Undo (⌘Z)"
                  className="p-1.5 rounded text-charcoal-400 hover:text-charcoal-600 disabled:opacity-30 transition-colors"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={redoConfig}
                  disabled={!canRedo}
                  title="Redo"
                  className="p-1.5 rounded text-charcoal-400 hover:text-charcoal-600 disabled:opacity-30 transition-colors"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <span className="hidden sm:inline text-sm text-charcoal-400">
              {isReadonly
                ? "Client view (read-only)"
                : "Fill in all steps to generate your full layout"}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {draftRestored && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-6 mt-2 bg-charcoal-700 text-white text-xs rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-2 z-50"
            >
              <span>Draft restored ·</span>
              <button
                onClick={() => {
                  setConfig({});
                  setCurrentStep("shape");
                  localStorage.removeItem(WIZARD_DRAFT_KEY);
                  setDraftRestored(false);
                }}
                className="underline hover:no-underline text-cream-100"
              >
                Start fresh
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
        {userType === "designer" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest">
              Designer Mode
            </span>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-charcoal-500 w-24 shrink-0">Client name</span>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Smith Residence"
                className="border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-charcoal-600 focus:ring-2 focus:ring-taupe-300 outline-none w-48"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-charcoal-500 w-24 shrink-0">Project ref</span>
              <input
                value={projectRef}
                onChange={(e) => setProjectRef(e.target.value)}
                className="border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-charcoal-600 font-mono focus:ring-2 focus:ring-taupe-300 outline-none w-36"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-charcoal-500 w-24 shrink-0">Account</span>
              <input
                value={userEmail}
                onChange={(e) => {
                  const email = e.target.value;
                  setUserEmail(email);
                  localStorage.setItem("alveo-user-email", email);
                }}
                placeholder="designer@email.com"
                className="border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-charcoal-600 focus:ring-2 focus:ring-taupe-300 outline-none w-52"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const roomName = `Room ${projectRooms.length + 1}`;
                const next = [...projectRooms, roomName];
                setProjectRooms(next);
                localStorage.setItem("alveo-project-rooms", JSON.stringify(next));
              }}
              className="text-xs px-3 py-2 rounded-lg bg-white border border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Add room to project
            </button>
            {projectRooms.length > 0 && (
              <p className="text-xs text-amber-700 w-full">
                Project rooms: {projectRooms.join(" · ")}
              </p>
            )}
            <label className="text-xs text-amber-700 w-full flex items-center gap-2">
              <span className="w-24 shrink-0">Brand logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setLogoDataUrl(String(reader.result ?? ""));
                  reader.readAsDataURL(file);
                }}
                className="text-xs"
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {!isReadonly && (
            <div
              className={`lg:col-span-3 bg-white rounded-2xl shadow-sm border border-cream-200 p-6 ${
                mobileTab === "preview" ? "hidden lg:block" : ""
              }`}
            >
              <EnhancedConfigurator
                config={config}
                onConfigChange={(updates) =>
                  setConfig((prev) => ({ ...prev, ...updates }))
                }
                userType={userType}
                currentStep={currentStep}
                onCurrentStepChange={setCurrentStep}
              />
            </div>
          )}

          <div
            className={`${isReadonly ? "lg:col-span-5" : "lg:col-span-2"} bg-white rounded-2xl shadow-sm border border-cream-200 p-6 lg:sticky lg:top-32 ${
              mobileTab === "configure" ? "hidden lg:block" : ""
            }`}
          >
            <LivePreview
              config={config}
              savedDesigns={savedDesigns}
              onSaveDesign={handleSaveDesign}
              onRemoveSavedDesign={handleRemoveDesign}
              onRenameSavedDesign={handleRenameDesign}
              onConfigChange={(updates) =>
                setConfig((prev) => ({ ...prev, ...updates }))
              }
              clientName={clientName}
              projectRef={projectRef}
              logoDataUrl={logoDataUrl}
              userEmail={userEmail}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-cream-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMobileTab("configure")}
            className={`py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mobileTab === "configure"
                ? "bg-charcoal-600 text-white"
                : "bg-cream-50 text-charcoal-400"
            }`}
          >
            Configure
          </button>
          <button
            onClick={() => setMobileTab("preview")}
            className={`py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mobileTab === "preview"
                ? "bg-charcoal-600 text-white"
                : "bg-cream-50 text-charcoal-400"
            }`}
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
