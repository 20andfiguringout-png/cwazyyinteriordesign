import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const FEATURES = [
  {
    icon: "box" as const,
    title: "Walk-in Closets",
    description: "Full-room configurations from L-shaped to U-shaped layouts",
  },
  {
    icon: "layers" as const,
    title: "Reach-In Closets",
    description: "Maximise every inch with precision-engineered shelving",
  },
  {
    icon: "briefcase" as const,
    title: "Wardrobe Systems",
    description: "Freestanding units designed for any bedroom or dressing room",
  },
];

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.featureCard,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      <View style={[styles.featureIcon, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{description}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleConfigure = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/configure");
  };

  const handleGallery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/gallery");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 24, paddingBottom: bottomInset + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={[styles.logoMark, { backgroundColor: colors.muted, borderRadius: colors.radius * 2 }]}>
          <Feather name="box" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.brand, { color: colors.foreground }]}>Alvéo</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Closet design, refined.
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          Design your perfect storage space with our precision configurator.
          Every detail crafted for your life.
        </Text>

        <View style={styles.ctaRow}>
          <Pressable
            testID="start-configure-button"
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleConfigure}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              Start Configuring
            </Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            testID="view-gallery-button"
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleGallery}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              View Gallery
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          WHAT WE BUILD
        </Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Every configuration, delivered precisely.
        </Text>

        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        {[
          { value: "2,400+", label: "Designs created" },
          { value: "98%", label: "Client satisfaction" },
          { value: "14 days", label: "Avg. delivery" },
        ].map((stat, i) => (
          <View
            key={stat.label}
            style={[
              styles.stat,
              i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 32 },
  hero: { gap: 16, alignItems: "flex-start" },
  logoMark: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 42, fontFamily: "Inter_700Bold", letterSpacing: -1.5 },
  tagline: { fontSize: 17, fontFamily: "Inter_400Regular", letterSpacing: 0.2 },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, maxWidth: 320 },
  ctaRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  divider: { height: 1 },
  section: { gap: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 30 },
  featuresGrid: { gap: 12 },
  featureCard: { padding: 18, borderWidth: 1, gap: 10 },
  featureIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  statsRow: { flexDirection: "row", borderWidth: 1 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 20, gap: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
