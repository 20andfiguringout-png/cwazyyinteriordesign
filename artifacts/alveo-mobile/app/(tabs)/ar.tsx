import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Closet overlay SVG-as-view ───────────────────────────────────────────────

const FINISHES = [
  { id: "light",  label: "Light Oak",     bg: "#f0ebe3", border: "#c4b096", shadow: "#d4c9b8" },
  { id: "medium", label: "Warm Walnut",   bg: "#d4c2a8", border: "#a08070", shadow: "#b5a089" },
  { id: "dark",   label: "Dark Espresso", bg: "#8d7060", border: "#5d4030", shadow: "#6d5040" },
  { id: "white",  label: "Painted White", bg: "#f8f8f6", border: "#d0d0ce", shadow: "#e4e4e2" },
];

const MODULES = [
  { label: "Hang", widthRatio: 0.22 },
  { label: "Shelves", widthRatio: 0.18 },
  { label: "Drawers", widthRatio: 0.18 },
  { label: "Hang", widthRatio: 0.22 },
];

function ClosetOverlay({
  x, y, overlayW, overlayH, finishIdx, opacity,
}: {
  x: number; y: number; overlayW: number; overlayH: number;
  finishIdx: number; opacity: Animated.Value;
}) {
  const finish = FINISHES[finishIdx];
  const totalRatio = MODULES.reduce((s, m) => s + m.widthRatio, 0);
  const UNIT = overlayW / totalRatio;

  return (
    <Animated.View style={[styles.overlay, { left: x - overlayW / 2, top: y - overlayH, width: overlayW, height: overlayH, opacity }]}>
      {/* Back wall */}
      <View style={[styles.backWall, { backgroundColor: finish.bg + "cc", borderColor: finish.border }]}/>

      {/* Module columns */}
      <View style={styles.modulesRow}>
        {MODULES.map((mod, i) => {
          const mw = mod.widthRatio * UNIT;
          return (
            <View key={i} style={[styles.module, {
              width: mw, height: overlayH,
              backgroundColor: finish.bg + "dd",
              borderColor: finish.border,
            }]}>
              {/* Top panel */}
              <View style={[styles.topPanel, { backgroundColor: finish.shadow, borderBottomColor: finish.border }]}/>
              {/* Interior shelves */}
              <View style={{ flex: 1, paddingHorizontal: 3, justifyContent: "space-around", paddingVertical: 8 }}>
                {[0,1,2].map(s => (
                  <View key={s} style={[styles.shelf, { backgroundColor: finish.shadow }]}/>
                ))}
              </View>
              {/* Label */}
              {mw > 40 && (
                <Text style={[styles.modLabel, { color: finish.border }]} numberOfLines={1}>{mod.label}</Text>
              )}
              {/* Toe kick */}
              <View style={[styles.toeKick, { backgroundColor: finish.shadow }]}/>
            </View>
          );
        })}
      </View>

      {/* Isometric side face hint */}
      <View style={[styles.sideHint, { borderLeftColor: finish.border + "44", backgroundColor: finish.shadow + "55" }]}/>

      {/* Dimension line */}
      <View style={styles.dimRow}>
        <View style={[styles.dimLine, { backgroundColor: finish.border + "88" }]}/>
        <Text style={[styles.dimText, { color: finish.border }]}>{Math.round(overlayW * 0.18)}″ wide</Text>
        <View style={[styles.dimLine, { backgroundColor: finish.border + "88" }]}/>
      </View>
    </Animated.View>
  );
}

// ─── Permission gate ──────────────────────────────────────────────────────────

function PermissionScreen({ onRequest, colors }: { onRequest: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.permCenter, { backgroundColor: colors.background }]}>
      <View style={[styles.permIcon, { backgroundColor: colors.muted, borderRadius: colors.radius * 2 }]}>
        <Feather name="camera" size={32} color={colors.primary}/>
      </View>
      <Text style={[styles.permTitle, { color: colors.foreground }]}>AR Room Preview</Text>
      <Text style={[styles.permBody, { color: colors.mutedForeground }]}>
        Point your camera at a wall to preview how your closet design will look in your space.
        Camera access is required.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.permBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}
        onPress={onRequest}
      >
        <Text style={[styles.permBtnText, { color: colors.primaryForeground }]}>Enable Camera</Text>
      </Pressable>
    </View>
  );
}

// ─── Web fallback ─────────────────────────────────────────────────────────────

function WebARFallback({ colors, finishIdx, setFinishIdx }: {
  colors: ReturnType<typeof useColors>;
  finishIdx: number; setFinishIdx: (i: number) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.webFallback, { backgroundColor: "#1a1a2e", paddingTop: insets.top + 16 }]}>
      {/* Simulated room background */}
      <View style={styles.roomBg}>
        <View style={styles.roomFloor}/>
        <View style={styles.roomLeftWall}/>
        <View style={styles.roomRightWall}/>
        <Text style={styles.roomLabel}>Simulated Room View</Text>
      </View>

      {/* Closet overlay centred on screen */}
      <View style={styles.webOverlayContainer}>
        <View style={[styles.webCloset, { backgroundColor: FINISHES[finishIdx].bg + "ee", borderColor: FINISHES[finishIdx].border }]}>
          {MODULES.map((mod, i) => (
            <View key={i} style={[styles.webModule, {
              flex: mod.widthRatio,
              backgroundColor: FINISHES[finishIdx].bg,
              borderColor: FINISHES[finishIdx].border,
            }]}>
              <View style={[styles.webTopBar, { backgroundColor: FINISHES[finishIdx].shadow }]}/>
              <View style={{ flex: 1, paddingHorizontal: 4, justifyContent: "space-evenly" }}>
                {[0,1,2].map(s => <View key={s} style={[styles.webShelf, { backgroundColor: FINISHES[finishIdx].shadow }]}/>)}
              </View>
              <Text style={[styles.webModLabel, { color: FINISHES[finishIdx].border }]}>{mod.label}</Text>
              <View style={[styles.webToeKick, { backgroundColor: FINISHES[finishIdx].shadow }]}/>
            </View>
          ))}
        </View>

        {/* AR badge */}
        <View style={[styles.arBadge, { backgroundColor: colors.primary + "dd", borderRadius: colors.radius }]}>
          <Feather name="camera" size={10} color="white"/>
          <Text style={styles.arBadgeText}>AR Preview (Simulator)</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 100 }]}>
        <Text style={[styles.controlsLabel, { color: "rgba(255,255,255,0.6)" }]}>FINISH</Text>
        <View style={styles.swatchRow}>
          {FINISHES.map((f, i) => (
            <Pressable key={f.id} onPress={() => { Haptics.selectionAsync(); setFinishIdx(i); }}
              style={[styles.swatch, { backgroundColor: f.bg, borderColor: finishIdx===i ? "white" : f.border },
                finishIdx===i && styles.swatchActive]}>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.finishLabel, { color: "rgba(255,255,255,0.9)" }]}>{FINISHES[finishIdx].label}</Text>
      </View>
    </View>
  );
}

// ─── Main AR Screen ───────────────────────────────────────────────────────────

export default function ARScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [finishIdx, setFinishIdx] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [placedPos, setPlacedPos] = useState({ x: SW / 2, y: SH * 0.55 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing reticle
  useEffect(() => {
    if (placed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [placed, pulseAnim]);

  const handlePlace = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlacedPos({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    setPlaced(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setPlaced(false));
  };

  const overlayW = SW * 0.62;
  const overlayH = SH * 0.38;

  // Web: camera not available — show simulator
  if (Platform.OS === "web") {
    return <WebARFallback colors={colors} finishIdx={finishIdx} setFinishIdx={setFinishIdx}/>;
  }

  if (!permission) {
    return (
      <View style={[styles.permCenter, { backgroundColor: colors.background }]}>
        <Text style={[styles.permBody, { color: colors.mutedForeground }]}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return <PermissionScreen onRequest={requestPermission} colors={colors}/>;
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" onTouchEnd={!placed ? handlePlace : undefined}>

        {/* Closet overlay — shown after placement */}
        {placed && (
          <ClosetOverlay
            x={placedPos.x} y={placedPos.y}
            overlayW={overlayW} overlayH={overlayH}
            finishIdx={finishIdx} opacity={fadeAnim}
          />
        )}

        {/* Reticle — shown before placement */}
        {!placed && (
          <Animated.View style={[styles.reticle, {
            left: SW/2 - 36, top: SH/2 - 36,
            transform: [{ scale: pulseAnim }],
          }]}>
            <View style={styles.reticleCorner1}/>
            <View style={styles.reticleCorner2}/>
            <View style={styles.reticleCorner3}/>
            <View style={styles.reticleCorner4}/>
          </Animated.View>
        )}

        {/* Top HUD */}
        <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
          <View style={styles.hudBadge}>
            <Feather name="camera" size={12} color="white"/>
            <Text style={styles.hudBadgeText}>AR Room Preview</Text>
          </View>
          <View style={styles.hudBadge}>
            <View style={[styles.hudDot, { backgroundColor: "#4ade80" }]}/>
            <Text style={styles.hudBadgeText}>Live</Text>
          </View>
        </View>

        {/* Instruction */}
        {!placed && (
          <View style={styles.instructionBubble}>
            <Text style={styles.instructionText}>Tap the wall where you'd like your closet</Text>
          </View>
        )}

        {/* Bottom controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 90 }]}>
          {/* Finish swatches */}
          <View style={styles.swatchRow}>
            {FINISHES.map((f, i) => (
              <Pressable key={f.id} onPress={() => { Haptics.selectionAsync(); setFinishIdx(i); }}
                style={[styles.swatch, {
                  backgroundColor: f.bg,
                  borderColor: finishIdx===i ? "white" : f.border + "80",
                }, finishIdx===i && styles.swatchActive]}>
              </Pressable>
            ))}
          </View>
          <Text style={styles.finishLabel}>{FINISHES[finishIdx].label}</Text>

          {/* Reset button */}
          {placed && (
            <Pressable onPress={handleReset}
              style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="refresh-cw" size={14} color="white"/>
              <Text style={styles.resetBtnText}>Reposition</Text>
            </Pressable>
          )}
        </View>
      </CameraView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Permission
  permCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 },
  permIcon: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  permBody: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center", maxWidth: 300 },
  permBtn: { paddingHorizontal: 28, paddingVertical: 14, marginTop: 4 },
  permBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: "black" },

  // Overlay closet
  overlay: { position: "absolute" },
  backWall: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderRadius: 4 },
  modulesRow: { flex: 1, flexDirection: "row" },
  module: { borderRightWidth: 1, overflow: "hidden" },
  topPanel: { height: 14, borderBottomWidth: 1 },
  shelf: { height: 3, borderRadius: 2, marginHorizontal: 3 },
  modLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", textAlign: "center", marginBottom: 2, opacity: 0.7 },
  toeKick: { height: 10 },
  sideHint: { position: "absolute", right: -8, top: 0, bottom: 0, width: 8, borderLeftWidth: 1 },
  dimRow: { position: "absolute", bottom: -20, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 4 },
  dimLine: { flex: 1, height: 1 },
  dimText: { fontSize: 8, fontFamily: "Inter_500Medium" },

  // Reticle
  reticle: { position: "absolute", width: 72, height: 72 },
  reticleCorner1: { position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "white" },
  reticleCorner2: { position: "absolute", top: 0, right: 0, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2, borderColor: "white" },
  reticleCorner3: { position: "absolute", bottom: 0, left: 0, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: "white" },
  reticleCorner4: { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "white" },

  // HUD
  topHud: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  hudBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  hudBadgeText: { color: "white", fontSize: 11, fontFamily: "Inter_500Medium" },
  hudDot: { width: 6, height: 6, borderRadius: 3 },
  instructionBubble: { position: "absolute", bottom: "22%", left: "10%", right: "10%", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  instructionText: { color: "white", fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },

  // Bottom controls
  bottomControls: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 10 },
  swatchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  swatchActive: { transform: [{ scale: 1.2 }], borderWidth: 2.5 },
  finishLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_500Medium" },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  resetBtnText: { color: "white", fontSize: 13, fontFamily: "Inter_500Medium" },

  // Web fallback
  webFallback: { flex: 1 },
  roomBg: { position: "absolute", inset: 0, overflow: "hidden" },
  roomFloor: { position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", backgroundColor: "#2a2a1e", opacity: 0.7 },
  roomLeftWall: { position: "absolute", top: 0, left: 0, bottom: "35%", width: "30%", backgroundColor: "#1e1e2a", opacity: 0.5 },
  roomRightWall: { position: "absolute", top: 0, right: 0, bottom: "35%", width: "30%", backgroundColor: "#1e2a2a", opacity: 0.5 },
  roomLabel: { position: "absolute", bottom: "37%", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11, fontFamily: "Inter_500Medium" },
  webOverlayContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  webCloset: { flexDirection: "row", height: SH * 0.36, width: SW * 0.72, borderWidth: 1.5, borderRadius: 4, overflow: "hidden" },
  webModule: { borderRightWidth: 1, overflow: "hidden" },
  webTopBar: { height: 14 },
  webShelf: { height: 3, borderRadius: 2, marginHorizontal: 4 },
  webModLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center", marginBottom: 2, opacity: 0.7 },
  webToeKick: { height: 10 },
  arBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  arBadgeText: { color: "white", fontSize: 11, fontFamily: "Inter_500Medium" },
  controls: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 12 },
  controlsLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
});
