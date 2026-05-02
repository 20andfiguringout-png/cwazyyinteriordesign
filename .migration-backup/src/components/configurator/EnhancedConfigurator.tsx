"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClosetConfiguration,
  VillaAmenities,
  WardrobeItems,
  ShoeCollection,
  ClosetDimensions,
  RoomDimensions,
  UserPreferences,
  ClosetType,
} from "@/types/closet";
import {
  Calculator,
  Shirt,
  Package,
  Palette,
  ChevronRight,
  ChevronLeft,
  Check,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { ClosetTypeDiagram } from "./ClosetTypeDiagram";

interface EnhancedConfiguratorProps {
  config: Partial<ClosetConfiguration>;
  onConfigChange: (config: Partial<ClosetConfiguration>) => void;
  userType: string;
  currentStep?: ConfigStep;
  onCurrentStepChange?: (step: ConfigStep) => void;
}

export type ConfigStep =
  | "shape"
  | "dimensions"
  | "wardrobe"
  | "shoes"
  | "preferences"
  | "amenities";

// ─── Villa Mode helpers ──────────────────────────────────────────────────────

function getFloorAreaSqFt(w: number, d: number) {
  return Math.round((w * d) / 144);
}

function getVillaFlag(w: number, d: number) {
  return getFloorAreaSqFt(w, d) >= 150;
}

function getSpaceType(sqft: number): string {
  if (sqft < 20) return "Reach-in";
  if (sqft < 40) return "Walk-in Single Wall";
  if (sqft < 80) return "L-Shape Walk-in";
  if (sqft < 150) return "U-Shape Walk-in";
  if (sqft < 250) return "U-Shape + Island";
  if (sqft < 500) return "Full Dressing Suite";
  return "Bespoke Villa Suite";
}

function toFtInStr(inches: number) {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return rem === 0 ? `${ft}'-0"` : `${ft}'-${rem}"`;
}

// ─── Smart dimension input with ft+in mode ────────────────────────────────────

interface DimInputProps {
  label: string;
  hint: string;
  valueInches: number;
  onChange: (inches: number) => void;
  mode: "ft-in" | "inches";
  fieldType: "width" | "height" | "depth";
  unit: "imperial" | "metric";
}

interface SuspectState {
  visible: boolean;
  field: string;
  raw: number;
}

// Tighter thresholds: width > 20ft, height > 13ft, depth > 4ft
const SUSPECT_THRESHOLDS = { width: 240, height: 156, depth: 48 };

function DimInput({
  label,
  hint,
  valueInches,
  onChange,
  mode,
  fieldType,
  unit,
}: DimInputProps) {
  const [metricScale, setMetricScale] = useState<"cm" | "mm">("cm");
  const ft = Math.floor(valueInches / 12);
  const rem = Math.round(valueInches % 12);

  if (unit === "metric") {
    const valueMetric =
      metricScale === "cm"
        ? Math.round(valueInches * 2.54 * 10) / 10
        : Math.round(valueInches * 25.4);

    return (
      <div>
        <label className="block text-charcoal-600 font-medium mb-2">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={valueMetric}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              const inches = metricScale === "cm" ? v / 2.54 : v / 25.4;
              onChange(Math.round(inches * 100) / 100);
            }}
            className="w-full p-4 text-lg border border-cream-300 rounded-lg focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
          />
          <select
            value={metricScale}
            onChange={(e) => setMetricScale(e.target.value as "cm" | "mm")}
            className="p-4 text-sm border border-cream-300 rounded-lg bg-white text-charcoal-600"
          >
            <option value="cm">cm</option>
            <option value="mm">mm</option>
          </select>
        </div>
        <p className="text-xs text-charcoal-400 mt-1">
          {hint} · {toFtInStr(valueInches)}
        </p>
      </div>
    );
  }

  if (mode === "ft-in") {
    return (
      <div>
        <label className="block text-charcoal-600 font-medium mb-2">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={ft}
            onChange={(e) => onChange((Number(e.target.value) || 0) * 12 + rem)}
            className="w-20 p-3 text-lg border border-cream-300 rounded-lg focus:ring-2 focus:ring-taupe-300 text-center"
          />
          <span className="text-charcoal-500 font-medium">ft</span>
          <input
            type="number"
            min={0}
            max={11}
            value={rem}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              onChange(ft * 12 + Math.min(v, 11));
            }}
            className="w-16 p-3 text-lg border border-cream-300 rounded-lg focus:ring-2 focus:ring-taupe-300 text-center"
          />
          <span className="text-charcoal-500 font-medium">in</span>
        </div>
        <p className="text-xs text-charcoal-400 mt-1">
          {hint} · {valueInches}" total
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-charcoal-600 font-medium mb-2">
        {label}
      </label>
      <input
        type="number"
        min={0}
        value={valueInches}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full p-4 text-lg border border-cream-300 rounded-lg focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
      />
      <p className="text-xs text-charcoal-400 mt-1">
        {hint} · = {toFtInStr(valueInches)}
      </p>
    </div>
  );
}

// ─── Villa Badge ──────────────────────────────────────────────────────────────

function VillaBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FDF8ED] border border-[#B8966E] text-[#B8966E] text-xs font-bold tracking-widest"
      style={{ fontFamily: "Georgia, serif" }}
    >
      ✦ VILLA MODE ✦
    </span>
  );
}

export function EnhancedConfigurator({
  config,
  onConfigChange,
  userType,
  currentStep: controlledStep,
  onCurrentStepChange,
}: EnhancedConfiguratorProps) {
  const [currentStep, setCurrentStep] = useState<ConfigStep>(
    controlledStep ?? "shape",
  );
  const [localConfig, setLocalConfig] =
    useState<Partial<ClosetConfiguration>>(config);
  const [unit, setUnit] = useState<"imperial" | "metric">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("alveo-unit") as "imperial" | "metric") ??
        "imperial"
      );
    }
    return "imperial";
  });

  // Derive villa flag from current dimensions
  const isWalkIn = [
    "walkin-l",
    "walkin-u",
    "island",
    "corridor",
    "walkin-single",
  ].includes(localConfig.closetType ?? "");
  const W = isWalkIn
    ? (localConfig.roomDimensions?.roomWidth ?? 0)
    : (localConfig.dimensions?.width ?? 0);
  const D = isWalkIn
    ? (localConfig.roomDimensions?.roomDepth ?? 0)
    : (localConfig.dimensions?.depth ?? 0);
  const isVilla = getVillaFlag(W, D);

  const baseSteps: {
    key: ConfigStep;
    title: string;
    icon: React.ComponentType<any>;
    color: string;
  }[] = [
    { key: "shape", title: "Shape", icon: LayoutGrid, color: "bg-amber-500" },
    {
      key: "dimensions",
      title: "Space",
      icon: Calculator,
      color: "bg-blue-500",
    },
    { key: "wardrobe", title: "Wardrobe", icon: Shirt, color: "bg-green-500" },
    { key: "shoes", title: "Shoes", icon: Package, color: "bg-purple-500" },
    { key: "preferences", title: "Style", icon: Palette, color: "bg-pink-500" },
  ];

  const villaStep = {
    key: "amenities" as ConfigStep,
    title: "Amenities",
    icon: Sparkles,
    color: "bg-[#B8966E]",
  };

  const steps = isVilla ? [...baseSteps, villaStep] : baseSteps;

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep);

  useEffect(() => {
    if (!controlledStep) return;
    setCurrentStep(controlledStep);
  }, [controlledStep]);

  useEffect(() => {
    onCurrentStepChange?.(currentStep);
  }, [currentStep, onCurrentStepChange]);

  const updateLocalConfig = (updates: Partial<ClosetConfiguration>) => {
    const next = { ...localConfig, ...updates };
    setLocalConfig(next);
    onConfigChange(next);
  };

  // ── Step validation: disable Next until current step is complete ──────────
  const isStepValid = (step: ConfigStep): boolean => {
    switch (step) {
      case "shape":
        return !!localConfig.closetType;
      case "dimensions": {
        const w = isWalkIn
          ? (localConfig.roomDimensions?.roomWidth ?? 0)
          : (localConfig.dimensions?.width ?? 0);
        const h = localConfig.dimensions?.height ?? 0;
        return w >= 24 && h >= 60;
      }
      case "wardrobe":
        return !!localConfig.wardrobe;
      case "shoes":
        return !!localConfig.shoes;
      case "preferences":
        return !!localConfig.userInfo;
      case "amenities":
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].key);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        document.dispatchEvent(new Event("alveo:escape"));
        return;
      }

      if (isTyping) return;

      if (event.key === "Enter" || event.key === "ArrowRight") {
        if (
          currentStepIndex < steps.length - 1 &&
          isStepValid(currentStep)
        ) {
          event.preventDefault();
          nextStep();
        }
      }

      if (event.key === "ArrowLeft" || event.key === "Backspace") {
        if (currentStepIndex > 0) {
          event.preventDefault();
          prevStep();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, currentStepIndex, steps.length]);

  // If villa mode was just turned OFF (space shrunk), skip amenities if we're on it
  useEffect(() => {
    if (!isVilla && currentStep === "amenities") {
      setCurrentStep("preferences");
    }
  }, [isVilla, currentStep]);

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = index < currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center space-x-2 cursor-pointer transition-all ${
                  isActive
                    ? "text-charcoal-600"
                    : isCompleted
                      ? "text-taupe-500"
                      : "text-gray-400"
                }`}
                onClick={() => setCurrentStep(step.key)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive
                      ? step.color
                      : isCompleted
                        ? "bg-taupe-400"
                        : "bg-gray-300"
                  } text-white`}
                >
                  {isCompleted ? "✓" : <Icon className="w-5 h-5" />}
                </div>
                <span className="font-medium text-sm">{step.title}</span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 min-w-4 ${
                    index < currentStepIndex ? "bg-taupe-400" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            const nextUnit = unit === "imperial" ? "metric" : "imperial";
            setUnit(nextUnit);
            localStorage.setItem("alveo-unit", nextUnit);
          }}
          className="px-4 py-2 rounded-full border border-taupe-300 text-taupe-600 text-xs font-medium hover:bg-taupe-50 transition-colors"
        >
          Units: {unit === "imperial" ? "Imperial" : "Metric"}
        </button>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-cream-200 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === "shape" && (
              <ShapeStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === "dimensions" && (
              <DimensionsStep
                config={localConfig}
                onUpdate={updateLocalConfig}
                userType={userType}
                unit={unit}
              />
            )}
            {currentStep === "wardrobe" && (
              <WardrobeStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === "shoes" && (
              <ShoesStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === "preferences" && (
              <PreferencesStep
                config={localConfig}
                onUpdate={updateLocalConfig}
              />
            )}
            {currentStep === "amenities" && (
              <AmenitiesStep
                config={localConfig}
                onUpdate={updateLocalConfig}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="flex items-center space-x-2 px-6 py-3 bg-cream-200 text-charcoal-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={nextStep}
          disabled={
            currentStepIndex === steps.length - 1 || !isStepValid(currentStep)
          }
          className="flex items-center space-x-2 px-6 py-3 bg-charcoal-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-charcoal-600 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <p className="hidden md:block text-xs text-charcoal-400 text-right -mt-5">
        Enter or → to continue · ← or Backspace to go back
      </p>

      {/* Completion banner — visible only when the final step is fully valid */}
      <AnimatePresence>
        {currentStepIndex === steps.length - 1 && isStepValid(currentStep) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm text-charcoal-600">
              <span className="font-semibold">All set!</span> Your layout is
              live in the preview panel →
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step Components ────────────────────────────────────────────────────────

function DimensionsStep({
  config,
  onUpdate,
  userType,
  unit,
}: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
  userType: string;
  unit: "imperial" | "metric";
}) {
  const isWalkIn = [
    "walkin-l",
    "walkin-u",
    "island",
    "corridor",
    "walkin-single",
  ].includes(config.closetType ?? "");

  const [dimensions, setDimensions] = useState<ClosetDimensions>(
    config.dimensions || { width: isWalkIn ? 120 : 96, height: 96, depth: 24 },
  );
  const [roomDims, setRoomDims] = useState<RoomDimensions>(
    config.roomDimensions || { roomWidth: 120, roomDepth: 96 },
  );

  // ft+in mode persisted in localStorage
  const [mode, setMode] = useState<"ft-in" | "inches">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("dim_input_mode") as "ft-in" | "inches") ??
        "ft-in"
      );
    }
    return "ft-in";
  });

  // Suspect detection: { visible, field, raw }
  const [suspect, setSuspect] = useState<SuspectState>({
    visible: false,
    field: "",
    raw: 0,
  });

  const toggleMode = () => {
    const next = mode === "ft-in" ? "inches" : "ft-in";
    setMode(next);
    if (typeof window !== "undefined")
      localStorage.setItem("dim_input_mode", next);
  };

  const W = isWalkIn ? roomDims.roomWidth : dimensions.width;
  const D = isWalkIn ? roomDims.roomDepth : dimensions.depth;
  const H = dimensions.height;

  const applyWidth = (v: number) => {
    const next = { ...dimensions, width: v };
    setDimensions(next);
    if (isWalkIn) {
      const nextRoom = { ...roomDims, roomWidth: v };
      setRoomDims(nextRoom);
      onUpdate({ dimensions: next, roomDimensions: nextRoom });
    } else {
      onUpdate({ dimensions: next });
    }
  };
  const applyDepth = (v: number) => {
    if (isWalkIn) {
      const nextRoom = { ...roomDims, roomDepth: v };
      setRoomDims(nextRoom);
      onUpdate({ roomDimensions: nextRoom });
    } else {
      const next = { ...dimensions, depth: v };
      setDimensions(next);
      onUpdate({ dimensions: next });
    }
  };
  const applyHeight = (v: number) => {
    const next = { ...dimensions, height: v };
    setDimensions(next);
    onUpdate({ dimensions: next });
  };

  // Check for suspect (user likely typed feet into the inches field)
  const checkSuspect = (field: "width" | "height" | "depth", value: number) => {
    const threshold = SUSPECT_THRESHOLDS[field];
    // Flag if above threshold OR if value looks like a round-foot entry
    // (e.g. typing "28" meaning 28 ft when the field expects inches)
    const isRoundFoot = value > 120 && value % 12 === 0;
    if (value > threshold || isRoundFoot) {
      setSuspect({ visible: true, field, raw: value });
    } else {
      setSuspect((s) => (s.field === field ? { ...s, visible: false } : s));
    }
  };

  const handleChange = (field: "width" | "height" | "depth", v: number) => {
    if (field === "width") applyWidth(v);
    if (field === "depth") applyDepth(v);
    if (field === "height") applyHeight(v);
  };

  // When user blurs, run suspect check only in inches mode
  const handleBlur = (field: "width" | "height" | "depth", v: number) => {
    if (mode === "inches") checkSuspect(field, v);
  };

  // Accept "Did you mean?" — convert raw inches value as feet
  const acceptSuggest = () => {
    const ft = suspect.raw; // if they typed 40, they meant 40 feet
    const inches = ft * 12;
    if (suspect.field === "width") applyWidth(inches);
    if (suspect.field === "depth") applyDepth(inches);
    if (suspect.field === "height") applyHeight(inches);
    setSuspect({ visible: false, field: "", raw: 0 });
  };
  const keepRaw = () => setSuspect({ visible: false, field: "", raw: 0 });

  // Villa
  const floorSqFt = getFloorAreaSqFt(W, D);
  const villa = getVillaFlag(W, D);
  const spaceType = getSpaceType(floorSqFt);

  const getUserTypeGuidance = () => {
    switch (userType) {
      case "renter":
        return "Measure carefully — we'll design around your existing space constraints";
      case "homeowner":
        return "Planning new construction? We can suggest optimal dimensions too";
      case "designer":
        return "Professional tip: We'll handle all the clearance calculations";
      default:
        return "Measure wall-to-wall — we'll account for baseboards and trim";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-charcoal-600 mb-1">
            {isWalkIn ? "Room dimensions" : "Wall dimensions"}
          </h2>
          <p className="text-charcoal-400 text-sm">{getUserTypeGuidance()}</p>
        </div>

        {unit === "imperial" && (
          <button
            type="button"
            onClick={toggleMode}
            className="shrink-0 px-4 py-2 rounded-full border border-taupe-300 text-taupe-600 text-xs font-medium hover:bg-taupe-50 transition-colors"
          >
            {mode === "ft-in" ? "Switch to inches-only" : "Switch to ft + in"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div onBlur={() => handleBlur("width", W)}>
          <DimInput
            label={isWalkIn ? "Room Width" : "Wall Width"}
            hint={
              isWalkIn ? "Wall-to-wall across room" : "Wall to wall measurement"
            }
            valueInches={W}
            onChange={(v) => handleChange("width", v)}
            mode={mode}
            fieldType="width"
            unit={unit}
          />
        </div>

        <div onBlur={() => handleBlur("depth", D)}>
          <DimInput
            label={isWalkIn ? "Room Depth" : "Unit Depth"}
            hint={
              isWalkIn ? "Door-to-back-wall depth" : "Front to back of unit"
            }
            valueInches={D}
            onChange={(v) => handleChange("depth", v)}
            mode={mode}
            fieldType="depth"
            unit={unit}
          />
        </div>

        <div onBlur={() => handleBlur("height", H)}>
          <DimInput
            label="Ceiling Height"
            hint="Floor to ceiling"
            valueInches={H}
            onChange={(v) => handleChange("height", v)}
            mode={mode}
            fieldType="height"
            unit={unit}
          />
        </div>
      </div>

      {/* Suspect "Did you mean?" banner */}
      {suspect.visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1">
            <p className="text-amber-800 font-medium text-sm">
              That's a big space!
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Did you mean <strong>{suspect.raw} feet</strong> (
              {toFtInStr(suspect.raw * 12)}) rather than {suspect.raw} inches?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={acceptSuggest}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
            >
              Use {suspect.raw} ft ({toFtInStr(suspect.raw * 12)})
            </button>
            <button
              type="button"
              onClick={keepRaw}
              className="px-4 py-2 border border-amber-400 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              Keep {suspect.raw}"
            </button>
          </div>
        </motion.div>
      )}

      {/* Space Summary */}
      <div
        className={`rounded-xl p-6 ${villa ? "bg-[#FDF8ED] border border-[#B8966E]" : "bg-cream-100"}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-medium text-charcoal-600">Space Summary</h3>
          {villa && <VillaBadge />}
        </div>

        {villa && (
          <p className="text-[#B8966E] text-sm mb-4 font-medium">
            ✦ An Amenities step has been added — configure your island, vanity,
            seating and more.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {isWalkIn ? (
            <>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Floor area
                </span>
                <span className="font-semibold text-charcoal-700">
                  {floorSqFt} sq ft
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Space type
                </span>
                <span className="font-semibold text-charcoal-700">
                  {spaceType}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Width
                </span>
                <span className="font-semibold text-charcoal-700">
                  {toFtInStr(W)}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Depth
                </span>
                <span className="font-semibold text-charcoal-700">
                  {toFtInStr(D)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Width
                </span>
                <span className="font-semibold text-charcoal-700">
                  {toFtInStr(W)}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Height
                </span>
                <span className="font-semibold text-charcoal-700">
                  {toFtInStr(H)}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Depth
                </span>
                <span className="font-semibold text-charcoal-700">
                  {toFtInStr(D)}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">
                  Space type
                </span>
                <span className="font-semibold text-charcoal-700">
                  {spaceType}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Amenities Step (Villa Mode only) ────────────────────────────────────────

function AmenitiesStep({
  config,
  onUpdate,
}: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const [amenities, setAmenities] = useState<VillaAmenities>(
    config.amenities ?? {},
  );

  const toggle = (key: keyof VillaAmenities) => {
    const next = { ...amenities, [key]: !amenities[key] };
    setAmenities(next);
    onUpdate({ amenities: next });
  };

  const items: {
    key: keyof VillaAmenities;
    label: string;
    desc: string;
    icon: string;
  }[] = [
    {
      key: "island",
      label: "Island Unit",
      desc: "Central island with drawers & styling surface",
      icon: "🗿",
    },
    {
      key: "seating",
      label: "Seating / Ottoman",
      desc: "Built-in bench or upholstered seat",
      icon: "🛋️",
    },
    {
      key: "vanity",
      label: "Vanity + Mirror",
      desc: "Dedicated dressing table with lit mirror",
      icon: "🪞",
    },
    {
      key: "mirrorWall",
      label: "Mirror Wall",
      desc: "Full floor-to-ceiling mirror panel",
      icon: "✨",
    },
    {
      key: "displayShelves",
      label: "Display Shelves",
      desc: "Open-front feature shelves for curated pieces",
      icon: "🏆",
    },
    {
      key: "safe",
      label: "Hidden Safe",
      desc: "Concealed in-unit security safe",
      icon: "🔒",
    },
    {
      key: "shoeWall",
      label: "Shoe Display Wall",
      desc: "Angled, backlit shoe showcase",
      icon: "👠",
    },
    {
      key: "lighting",
      label: "Feature Lighting",
      desc: "LED accent strips, puck lights, chandelier",
      icon: "💡",
    },
  ];

  const count = Object.values(amenities).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-charcoal-600 mb-1">
            Villa amenities
          </h2>
          <p className="text-charcoal-400 text-sm">
            Configure the luxury features of your dressing suite
          </p>
        </div>
        <VillaBadge />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ key, label, desc, icon }) => {
          const active = !!amenities[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                active
                  ? "border-[#B8966E] bg-[#FDF8ED]"
                  : "border-cream-200 bg-cream-50 hover:border-taupe-300"
              }`}
            >
              <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium text-sm ${active ? "text-[#7A5C32]" : "text-charcoal-600"}`}
                >
                  {label}
                </p>
                <p className="text-xs text-charcoal-400 mt-0.5 leading-snug">
                  {desc}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  active ? "border-[#B8966E] bg-[#B8966E]" : "border-cream-300"
                }`}
              >
                {active && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 border border-[#B8966E] bg-[#FDF8ED]"
        >
          <p className="text-[#7A5C32] font-serif text-base">
            {count} feature{count > 1 ? "s" : ""} selected
          </p>
          <p className="text-[#B8966E] text-xs mt-1">
            {items
              .filter((i) => amenities[i.key])
              .map((i) => i.label)
              .join(" · ")}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── NumberInput (stable module-level component — NOT defined inside render) ──
function NumberInput({
  label,
  hint,
  value,
  onDecrement,
  onIncrement,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onChange?: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  // Keep raw in sync when value changes from outside (e.g. decrement/increment)
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = (str: string) => {
    const n = parseInt(str, 10);
    const safe = isNaN(n) || n < 0 ? 0 : n;
    setRaw(String(safe));
    onChange?.(safe);
  };

  return (
    <div className="bg-cream-50 rounded-xl p-5 border border-cream-200">
      <label className="block text-charcoal-600 font-medium mb-1 text-sm">
        {label}
      </label>
      <p className="text-xs text-charcoal-400 mb-4">{hint}</p>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onDecrement}
          className="w-9 h-9 rounded-full bg-charcoal-200 text-charcoal-600 font-bold hover:bg-charcoal-300 transition-colors flex items-center justify-center text-lg leading-none flex-shrink-0"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(raw)}
          className="w-14 text-center text-xl font-semibold text-charcoal-700 bg-white border border-cream-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-taupe-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={onIncrement}
          className="w-9 h-9 rounded-full bg-charcoal-500 text-white font-bold hover:bg-charcoal-600 transition-colors flex items-center justify-center text-lg leading-none flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Wardrobe Step ─────────────────────────────────────────────────────────
function WardrobeStep({
  config,
  onUpdate,
}: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const defaultWardrobe: WardrobeItems = {
    longDresses: 8,
    shortJackets: 5,
    suits: 4,
    shirts: 22,
    pants: 12,
    tShirts: 18,
    sweaters: 7,
    jeans: 9,
    underwear: 24,
    bags: 6,
    belts: 5,
    jewelry: true,
    ties: 8,
  };

  const [wardrobe, setWardrobe] = useState<WardrobeItems>(
    config.wardrobe || defaultWardrobe,
  );

  const updateField = (field: keyof WardrobeItems, value: number | boolean) => {
    const updated = { ...wardrobe, [field]: value };
    setWardrobe(updated);
    onUpdate({ wardrobe: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">
          Tell us about your wardrobe
        </h2>
        <p className="text-charcoal-400">
          Be as accurate as possible — every item gets its perfect place
        </p>
      </div>

      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">
          Hanging Items
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Long Dresses"
            hint="Floor length, ~50-60 inch hang"
            value={wardrobe.longDresses}
            onDecrement={() =>
              updateField("longDresses", Math.max(0, wardrobe.longDresses - 1))
            }
            onIncrement={() =>
              updateField("longDresses", wardrobe.longDresses + 1)
            }
            onChange={(v) => updateField("longDresses", v)}
          />
          <NumberInput
            label="Suits"
            hint="Full suit sets"
            value={wardrobe.suits}
            onDecrement={() =>
              updateField("suits", Math.max(0, wardrobe.suits - 1))
            }
            onIncrement={() => updateField("suits", wardrobe.suits + 1)}
            onChange={(v) => updateField("suits", v)}
          />
          <NumberInput
            label="Shirts & Blouses"
            hint="Button-ups, blouses"
            value={wardrobe.shirts}
            onDecrement={() =>
              updateField("shirts", Math.max(0, wardrobe.shirts - 1))
            }
            onIncrement={() => updateField("shirts", wardrobe.shirts + 1)}
            onChange={(v) => updateField("shirts", v)}
          />
          <NumberInput
            label="Short Jackets"
            hint="Blazers, cardigans"
            value={wardrobe.shortJackets}
            onDecrement={() =>
              updateField(
                "shortJackets",
                Math.max(0, wardrobe.shortJackets - 1),
              )
            }
            onIncrement={() =>
              updateField("shortJackets", wardrobe.shortJackets + 1)
            }
            onChange={(v) => updateField("shortJackets", v)}
          />
          <NumberInput
            label="Pants"
            hint="Trousers, slacks"
            value={wardrobe.pants}
            onDecrement={() =>
              updateField("pants", Math.max(0, wardrobe.pants - 1))
            }
            onIncrement={() => updateField("pants", wardrobe.pants + 1)}
            onChange={(v) => updateField("pants", v)}
          />
          <NumberInput
            label="Ties"
            hint="Neckties, bow ties"
            value={wardrobe.ties}
            onDecrement={() =>
              updateField("ties", Math.max(0, wardrobe.ties - 1))
            }
            onIncrement={() => updateField("ties", wardrobe.ties + 1)}
            onChange={(v) => updateField("ties", v)}
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">
          Folded Items (Drawers)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="T-Shirts"
            hint="~15 per drawer"
            value={wardrobe.tShirts}
            onDecrement={() =>
              updateField("tShirts", Math.max(0, wardrobe.tShirts - 1))
            }
            onIncrement={() => updateField("tShirts", wardrobe.tShirts + 1)}
            onChange={(v) => updateField("tShirts", v)}
          />
          <NumberInput
            label="Sweaters"
            hint="~6 per drawer"
            value={wardrobe.sweaters}
            onDecrement={() =>
              updateField("sweaters", Math.max(0, wardrobe.sweaters - 1))
            }
            onIncrement={() => updateField("sweaters", wardrobe.sweaters + 1)}
            onChange={(v) => updateField("sweaters", v)}
          />
          <NumberInput
            label="Jeans"
            hint="Folded denim"
            value={wardrobe.jeans}
            onDecrement={() =>
              updateField("jeans", Math.max(0, wardrobe.jeans - 1))
            }
            onIncrement={() => updateField("jeans", wardrobe.jeans + 1)}
            onChange={(v) => updateField("jeans", v)}
          />
          <NumberInput
            label="Underwear"
            hint="Lingerie, underwear"
            value={wardrobe.underwear}
            onDecrement={() =>
              updateField("underwear", Math.max(0, wardrobe.underwear - 1))
            }
            onIncrement={() => updateField("underwear", wardrobe.underwear + 1)}
            onChange={(v) => updateField("underwear", v)}
          />
          <NumberInput
            label="Bags"
            hint="Handbags, purses"
            value={wardrobe.bags}
            onDecrement={() =>
              updateField("bags", Math.max(0, wardrobe.bags - 1))
            }
            onIncrement={() => updateField("bags", wardrobe.bags + 1)}
            onChange={(v) => updateField("bags", v)}
          />
          <NumberInput
            label="Belts"
            hint="Belts and sashes"
            value={wardrobe.belts}
            onDecrement={() =>
              updateField("belts", Math.max(0, wardrobe.belts - 1))
            }
            onIncrement={() => updateField("belts", wardrobe.belts + 1)}
            onChange={(v) => updateField("belts", v)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4 p-5 bg-cream-50 rounded-xl border border-cream-200">
        <button
          type="button"
          onClick={() => updateField("jewelry", !wardrobe.jewelry)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            wardrobe.jewelry
              ? "bg-charcoal-500 text-white"
              : "bg-cream-200 text-charcoal-400"
          }`}
        >
          {wardrobe.jewelry ? <Check className="w-5 h-5" /> : "💍"}
        </button>
        <div>
          <p className="font-medium text-charcoal-600">Jewelry & Accessories</p>
          <p className="text-xs text-charcoal-400">
            Add a dedicated jewelry drawer with velvet lining
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shoes Step ─────────────────────────────────────────────────────────────
function ShoesStep({
  config,
  onUpdate,
}: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const [shoes, setShoes] = useState<ShoeCollection>(
    config.shoes || { sneakers: 12, heels: 18, boots: 7, flats: 9 },
  );

  const updateShoes = (field: keyof ShoeCollection, value: number) => {
    const updated = { ...shoes, [field]: value };
    setShoes(updated);
    onUpdate({ shoes: updated });
  };

  const totalPairs = shoes.sneakers + shoes.heels + shoes.boots + shoes.flats;

  const shoeTypes: {
    field: keyof ShoeCollection;
    label: string;
    height: string;
    icon: string;
    pairsPerShelf: number;
  }[] = [
    {
      field: "sneakers",
      label: "Sneakers",
      height: '5" shelf height',
      icon: "👟",
      pairsPerShelf: 4,
    },
    {
      field: "heels",
      label: "Heels",
      height: '6" shelf height',
      icon: "👠",
      pairsPerShelf: 3,
    },
    {
      field: "boots",
      label: "Boots",
      height: '12" shelf height',
      icon: "🥾",
      pairsPerShelf: 2,
    },
    {
      field: "flats",
      label: "Flats",
      height: '4" shelf height',
      icon: "🩴",
      pairsPerShelf: 5,
    },
  ];

  const shelvesNeeded = shoeTypes.reduce(
    (sum, t) => sum + Math.ceil(shoes[t.field] / t.pairsPerShelf),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">
          Your shoe collection
        </h2>
        <p className="text-charcoal-400">
          Each shoe type gets exactly the right shelf height — no more cramming
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shoeTypes.map(({ field, label, height, icon, pairsPerShelf }) => (
          <div
            key={field}
            className="bg-cream-50 rounded-xl p-5 border border-cream-200"
          >
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-charcoal-600">{label}</p>
                <p className="text-xs text-charcoal-400">
                  {height} · {pairsPerShelf} pairs/shelf
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() =>
                  updateShoes(field, Math.max(0, shoes[field] - 1))
                }
                className="w-8 h-8 rounded-full bg-charcoal-200 text-charcoal-600 font-bold hover:bg-charcoal-300 transition-colors flex items-center justify-center flex-shrink-0"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={shoes[field]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  updateShoes(field, isNaN(n) || n < 0 ? 0 : n);
                }}
                className="w-14 text-center text-xl font-medium text-charcoal-600 bg-white border border-cream-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-taupe-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => updateShoes(field, shoes[field] + 1)}
                className="w-8 h-8 rounded-full bg-charcoal-500 text-white font-bold hover:bg-charcoal-600 transition-colors flex items-center justify-center flex-shrink-0"
              >
                +
              </button>
              <span className="text-sm text-charcoal-400">pairs</span>
            </div>
            {shoes[field] > 0 && (
              <p className="mt-2 text-xs text-taupe-500 font-medium">
                → {Math.ceil(shoes[field] / pairsPerShelf)} shelf
                {Math.ceil(shoes[field] / pairsPerShelf) > 1 ? "s" : ""} needed
              </p>
            )}
          </div>
        ))}
      </div>

      {totalPairs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-charcoal-500 text-white rounded-xl p-5"
        >
          <p className="font-serif text-lg mb-1">Your shoe summary</p>
          <p className="text-cream-200 text-sm">
            {totalPairs} pairs total · {shelvesNeeded} shelves calculated ·
            custom heights for each type
          </p>
          {(() => {
            const estWidth = Math.max(24, Math.round(totalPairs * 1.5));
            return (
              <p className="text-cream-300 text-xs mt-2">
                📐 Estimated shoe column width: {estWidth}"
                {estWidth > 36
                  ? " — consider a dedicated shoe wall for this collection"
                  : ""}
              </p>
            );
          })()}
          {shoes.boots > 0 && (
            <p className="text-cream-300 text-xs mt-2">
              💡 Boot shelves at 12" each will be placed at the bottom for easy
              access
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Preferences Step ───────────────────────────────────────────────────────
function PreferencesStep({
  config,
  onUpdate,
}: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const defaultPrefs: UserPreferences = {
    userType: "homeowner",
    stylePreference: "modern",
    woodFinish: "medium",
    drawerPreference: "mixed",
    priorityItems: ["hanging"],
  };
  const [prefs, setPrefs] = useState<UserPreferences>({
    ...defaultPrefs,
    ...config.userInfo,
  });

  const update = (
    field: keyof UserPreferences,
    value: string | boolean | string[],
  ) => {
    const updated = { ...prefs, [field]: value };
    setPrefs(updated);
    onUpdate({ userInfo: updated });
  };

  const togglePriority = (item: string) => {
    const current = prefs.priorityItems as string[];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    update("priorityItems", updated);
  };

  const styles = [
    {
      id: "minimal",
      name: "Minimal",
      desc: "Clean, hidden, serene",
      swatch: "bg-gray-100 border-gray-300",
    },
    {
      id: "modern",
      name: "Modern",
      desc: "Sleek and sharp",
      swatch: "bg-charcoal-100 border-charcoal-300",
    },
    {
      id: "glam",
      name: "Glam",
      desc: "Luxe metallic accents",
      swatch: "bg-yellow-50 border-yellow-300",
    },
    {
      id: "rustic",
      name: "Rustic",
      desc: "Natural, organic",
      swatch: "bg-amber-100 border-amber-300",
    },
    {
      id: "luxury",
      name: "Luxury",
      desc: "Hotel-suite quality",
      swatch: "bg-taupe-100 border-taupe-300",
    },
  ];

  const finishes = [
    { id: "white", name: "White Painted", color: "#ffffff" },
    { id: "light", name: "Light Oak", color: "#f5f1eb" },
    { id: "medium", name: "Walnut", color: "#d4c2a8" },
    { id: "dark", name: "Dark Espresso", color: "#8d6e63" },
  ];

  const priorities = [
    { id: "hanging", label: "Hanging clothes", icon: "👗" },
    { id: "shoes", label: "Shoes", icon: "👠" },
    { id: "folded", label: "Folded items", icon: "📦" },
    { id: "accessories", label: "Accessories", icon: "👜" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">
          Style & preferences
        </h2>
        <p className="text-charcoal-400">
          This determines the visual finish and layout priorities of your design
        </p>
      </div>

      {/* Style Selection */}
      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">
          Design Style
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => update("stylePreference", s.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                prefs.stylePreference === s.id
                  ? "border-charcoal-500 ring-2 ring-charcoal-200"
                  : `${s.swatch} hover:border-taupe-400`
              }`}
            >
              <p className="font-medium text-charcoal-600 text-sm">{s.name}</p>
              <p className="text-xs text-charcoal-400 mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Wood Finish */}
      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">
          Wood Finish
        </h3>
        <div className="flex space-x-3">
          {finishes.map((f) => (
            <button
              key={f.id}
              onClick={() => update("woodFinish", f.id)}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                prefs.woodFinish === f.id
                  ? "border-charcoal-500 ring-2 ring-charcoal-200"
                  : "border-cream-300"
              }`}
            >
              <div
                className="w-full h-8 rounded-lg mb-2 border border-cream-300"
                style={{ backgroundColor: f.color }}
              />
              <p className="text-xs font-medium text-charcoal-600 text-center">
                {f.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Priority Items */}
      <div>
        <h3 className="font-medium text-charcoal-600 mb-1 uppercase text-xs tracking-widest">
          Space Priorities
        </h3>
        <p className="text-xs text-charcoal-400 mb-3">
          What matters most? We'll allocate space accordingly
        </p>
        <div className="grid grid-cols-2 gap-3">
          {priorities.map((p) => {
            const isActive = (prefs.priorityItems as string[]).includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePriority(p.id)}
                className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-charcoal-500 bg-charcoal-50"
                    : "border-cream-200 bg-cream-50 hover:border-taupe-300"
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                <span
                  className={`font-medium text-sm ${isActive ? "text-charcoal-600" : "text-charcoal-400"}`}
                >
                  {p.label}
                </span>
                {isActive && (
                  <Check className="w-4 h-4 text-charcoal-500 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shape Step ─────────────────────────────────────────────────────────────
// First question in the wizard — determines the entire drawing structure

function ShapeStep({
  config,
  onUpdate,
}: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const shapes: {
    type: ClosetType;
    name: string;
    emoji: string;
    tagline: string;
    desc: string;
    minDims: string;
    walls: number;
    badge?: string;
  }[] = [
    {
      type: "reach-in",
      name: "Reach-In",
      emoji: "🚪",
      walls: 1,
      tagline: "Single wall · no entry space",
      desc: "Classic closet accessed from the room threshold. One fitted wall.",
      minDims: "Min 3' wide × 2' deep",
    },
    {
      type: "wardrobe-wall",
      name: "Wardrobe Wall",
      emoji: "🏠",
      walls: 1,
      tagline: "Full bedroom wall · no separate room",
      desc: "An entire bedroom wall fitted floor-to-ceiling. The wardrobe IS the room feature.",
      minDims: "Min 6' wide",
    },
    {
      type: "walkin-single",
      name: "Single-Wall Walk-In",
      emoji: "🚶",
      walls: 1,
      tagline: "Dedicated room · one fitted wall",
      desc: "A separate room with one fitted wall and open space to stand and dress.",
      minDims: "Min 20 sq ft room",
    },
    {
      type: "walkin-l",
      name: "L-Shape Walk-In",
      emoji: "📐",
      walls: 2,
      tagline: "Two walls at 90° · back + one side",
      desc: "Two adjacent fitted walls meeting at a corner. Highly efficient — the most common true walk-in.",
      minDims: "Min 25 sq ft room",
    },
    {
      type: "walkin-u",
      name: "U-Shape Walk-In",
      emoji: "⬜",
      walls: 3,
      tagline: "Three walls · the luxury primary suite standard",
      desc: "Back wall and both side walls fully fitted. Generates 3 elevation drawings (EL-A, EL-B, EL-C).",
      minDims: "Min 35 sq ft room",
      badge: "Most Popular",
    },
    {
      type: "island",
      name: "Island Walk-In",
      emoji: "💎",
      walls: 3,
      tagline: "U-shape + central island unit",
      desc: "A U-shaped walk-in with a freestanding island for drawers and a styling surface.",
      minDims: "Min 60 sq ft room",
      badge: "Luxury",
    },
    {
      type: "corridor",
      name: "Corridor Walk-In",
      emoji: "↔",
      walls: 2,
      tagline: "Two facing walls · narrow central aisle",
      desc: "Long narrow room with fitted units on both sides. Maximum storage in a dressing passage.",
      minDims: "Min 7' wide room",
    },
  ];

  const selected = config.closetType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">
          What shape is your closet?
        </h2>
        <p className="text-charcoal-400 text-sm">
          This is the first architectural decision — it determines the number of
          elevation drawings, zone logic, and aisle calculations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {shapes.map((s) => (
          <button
            key={s.type}
            type="button"
            onClick={() => onUpdate({ closetType: s.type })}
            className={`text-left p-4 rounded-xl border-2 transition-all relative ${
              selected === s.type
                ? "border-charcoal-500 bg-charcoal-50 ring-2 ring-charcoal-200 shadow-md"
                : "border-cream-200 hover:border-taupe-300 bg-cream-50 hover:shadow-sm"
            }`}
          >
            {s.badge && (
              <span className="absolute top-3 right-3 text-xs px-2 py-0.5 bg-taupe-500 text-white rounded-full font-medium">
                {s.badge}
              </span>
            )}
            <div className="mb-3">
              <ClosetTypeDiagram type={s.type} />
            </div>
            <div className="flex items-center justify-between mb-2">
              {s.walls > 1 && (
                <span className="text-xs px-1.5 py-0.5 bg-cream-200 text-charcoal-500 rounded font-medium">
                  {s.walls} walls
                </span>
              )}
            </div>
            <p className="font-semibold text-charcoal-700 text-sm mb-0.5">
              {s.name}
            </p>
            <p className="text-xs text-taupe-600 font-medium mb-2 leading-tight">
              {s.tagline}
            </p>
            <p className="text-xs text-charcoal-400 leading-relaxed">
              {s.desc}
            </p>
            <p className="text-xs text-charcoal-300 mt-2 font-medium border-t border-cream-200 pt-2">
              {s.minDims}
            </p>
            {selected === s.type && (
              <div className="absolute bottom-3 right-3">
                <div className="w-5 h-5 rounded-full bg-charcoal-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-charcoal-50 border border-charcoal-200 rounded-xl p-4"
        >
          <Check className="w-4 h-4 text-charcoal-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-charcoal-600">
            <span className="font-semibold">
              {shapes.find((s) => s.type === selected)?.name}
            </span>{" "}
            selected — Alvéo will generate{" "}
            {(shapes.find((s) => s.type === selected)?.walls ?? 1) > 1
              ? `${shapes.find((s) => s.type === selected)?.walls} elevation drawings`
              : "1 elevation drawing"}{" "}
            for this configuration.
          </p>
        </motion.div>
      )}
    </div>
  );
}
