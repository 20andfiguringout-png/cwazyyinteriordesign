import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "@alveo_config";

type ClosetType = "walk-in" | "reach-in" | "wardrobe" | null;
type Style = "modern" | "classic" | "minimalist" | null;
type Material = "white-oak" | "walnut" | "matte-white" | "charcoal" | null;

interface Config {
  closetType: ClosetType;
  width: string;
  height: string;
  depth: string;
  style: Style;
  material: Material;
}

const STEPS = ["Type", "Dimensions", "Style", "Materials", "Summary"];

const CLOSET_TYPES: { id: ClosetType; label: string; icon: keyof typeof Feather.glyphMap; desc: string }[] = [
  { id: "walk-in", label: "Walk-In Closet", icon: "maximize", desc: "Full room, L or U-shaped" },
  { id: "reach-in", label: "Reach-In Closet", icon: "align-center", desc: "Standard door opening" },
  { id: "wardrobe", label: "Wardrobe System", icon: "briefcase", desc: "Freestanding unit" },
];

const STYLES: { id: Style; label: string; desc: string }[] = [
  { id: "modern", label: "Modern", desc: "Clean lines, open shelving" },
  { id: "classic", label: "Classic", desc: "Moulding, warm tones" },
  { id: "minimalist", label: "Minimalist", desc: "Hidden handles, flush doors" },
];

const MATERIALS: { id: Material; label: string; hex: string }[] = [
  { id: "white-oak", label: "White Oak", hex: "#d4b483" },
  { id: "walnut", label: "Walnut", hex: "#7b4d2e" },
  { id: "matte-white", label: "Matte White", hex: "#f5f5f0" },
  { id: "charcoal", label: "Charcoal", hex: "#2e2e2e" },
];

function StepIndicator({ current, total, colors }: { current: number; total: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            {
              backgroundColor: i <= current ? colors.primary : colors.border,
              flex: 1,
              height: i === current ? 3 : 2,
              borderRadius: 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function ConfigureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Config>({
    closetType: null,
    width: "",
    height: "240",
    depth: "60",
    style: null,
    material: null,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          setConfig(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  const canAdvance = () => {
    if (step === 0) return config.closetType !== null;
    if (step === 1) return config.width.length > 0;
    if (step === 2) return config.style !== null;
    if (step === 3) return config.material !== null;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    Alert.alert("Configuration Saved", "Your closet design has been saved locally.");
  };

  const handleReset = () => {
    Alert.alert("Start Over", "Reset your configuration?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setConfig({ closetType: null, width: "", height: "240", depth: "60", style: null, material: null });
          setStep(0);
          setSaved(false);
          AsyncStorage.removeItem(STORAGE_KEY);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Configure</Text>
          {step > 0 && (
            <Pressable onPress={handleReset} testID="reset-button">
              <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <Text style={[styles.headerStep, { color: colors.mutedForeground }]}>
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </Text>
        <StepIndicator current={step} total={STEPS.length} colors={colors} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: bottomInset + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              What type of closet?
            </Text>
            <View style={styles.optionList}>
              {CLOSET_TYPES.map((type) => {
                const selected = config.closetType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    testID={`closet-type-${type.id}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setConfig((c) => ({ ...c, closetType: type.id }));
                    }}
                    style={({ pressed }) => [
                      styles.optionCard,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: selected ? "rgba(255,255,255,0.2)" : colors.muted, borderRadius: colors.radius - 2 }]}>
                      <Feather name={type.icon} size={20} color={selected ? "#fff" : colors.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: selected ? "#fff" : colors.foreground }]}>{type.label}</Text>
                      <Text style={[styles.optionDesc, { color: selected ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>{type.desc}</Text>
                    </View>
                    {selected && <Feather name="check-circle" size={20} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dimensions</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              Enter measurements in centimetres
            </Text>
            {[
              { key: "width", label: "Width (cm)", placeholder: "e.g. 180" },
              { key: "height", label: "Height (cm)", placeholder: "e.g. 240" },
              { key: "depth", label: "Depth (cm)", placeholder: "e.g. 60" },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>{label}</Text>
                <TextInput
                  testID={`input-${key}`}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                      borderRadius: colors.radius,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  value={(config as unknown as Record<string, string>)[key]}
                  onChangeText={(val) => setConfig((c) => ({ ...c, [key]: val }))}
                />
              </View>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a style</Text>
            <View style={styles.optionList}>
              {STYLES.map((s) => {
                const selected = config.style === s.id;
                return (
                  <Pressable
                    key={s.id}
                    testID={`style-${s.id}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setConfig((c) => ({ ...c, style: s.id }));
                    }}
                    style={({ pressed }) => [
                      styles.optionCard,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: selected ? "#fff" : colors.foreground }]}>{s.label}</Text>
                      <Text style={[styles.optionDesc, { color: selected ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>{s.desc}</Text>
                    </View>
                    {selected && <Feather name="check-circle" size={20} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select material</Text>
            <View style={styles.materialsGrid}>
              {MATERIALS.map((m) => {
                const selected = config.material === m.id;
                return (
                  <Pressable
                    key={m.id}
                    testID={`material-${m.id}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setConfig((c) => ({ ...c, material: m.id }));
                    }}
                    style={({ pressed }) => [
                      styles.materialCard,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.85 : 1,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.materialSwatch, { backgroundColor: m.hex, borderRadius: colors.radius - 2 }]} />
                    <Text style={[styles.materialLabel, { color: colors.foreground }]}>{m.label}</Text>
                    {selected && (
                      <View style={[styles.materialCheck, { backgroundColor: colors.primary, borderRadius: 10 }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Configuration</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {[
                { label: "Type", value: CLOSET_TYPES.find((t) => t.id === config.closetType)?.label ?? "—" },
                { label: "Width", value: config.width ? `${config.width} cm` : "—" },
                { label: "Height", value: config.height ? `${config.height} cm` : "—" },
                { label: "Depth", value: config.depth ? `${config.depth} cm` : "—" },
                { label: "Style", value: STYLES.find((s) => s.id === config.style)?.label ?? "—" },
                { label: "Material", value: MATERIALS.find((m) => m.id === config.material)?.label ?? "—" },
              ].map(({ label, value }, i, arr) => (
                <View
                  key={label}
                  style={[
                    styles.summaryRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}
            </View>

            {saved && (
              <View style={[styles.savedBadge, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                <Feather name="check-circle" size={14} color={colors.primary} />
                <Text style={[styles.savedText, { color: colors.primary }]}>Configuration saved</Text>
              </View>
            )}

            <Pressable
              testID="save-config-button"
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="save" size={16} color={colors.primaryForeground} />
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Configuration</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomInset + 12 }]}>
        {step > 0 && (
          <Pressable
            testID="back-button"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
        )}
        {step < STEPS.length - 1 && (
          <Pressable
            testID="next-button"
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: canAdvance() ? colors.primary : colors.muted,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
                flex: step > 0 ? 1 : undefined,
              },
            ]}
          >
            <Text style={[styles.nextBtnText, { color: canAdvance() ? colors.primaryForeground : colors.mutedForeground }]}>
              Continue
            </Text>
            <Feather name="arrow-right" size={16} color={canAdvance() ? colors.primaryForeground : colors.mutedForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, gap: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerStep: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stepIndicator: { flexDirection: "row", gap: 4, marginTop: 4 },
  stepDot: {},
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  section: { gap: 18 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sectionSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -10 },
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },
  optionIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  materialsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  materialCard: {
    width: "47%",
    padding: 14,
    gap: 10,
    position: "relative",
    borderWidth: 1,
  },
  materialSwatch: { height: 60 },
  materialLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  materialCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: { borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  savedBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  savedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  backBtn: { borderWidth: 1, width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flex: 1,
  },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
