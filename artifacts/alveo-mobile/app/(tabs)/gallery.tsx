import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 12) / 2;

type Category = "all" | "walk-in" | "reach-in" | "wardrobe";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "walk-in", label: "Walk-In" },
  { id: "reach-in", label: "Reach-In" },
  { id: "wardrobe", label: "Wardrobe" },
];

interface GalleryItem {
  id: string;
  title: string;
  style: string;
  material: string;
  type: Category;
  palette: string[];
}

const GALLERY_ITEMS: GalleryItem[] = [
  { id: "1", title: "Nordic Loft", style: "Minimalist", material: "White Oak", type: "walk-in", palette: ["#d4b483", "#f5f5f0", "#e8ddd0"] },
  { id: "2", title: "Maison Boisé", style: "Classic", material: "Walnut", type: "reach-in", palette: ["#7b4d2e", "#c9a87c", "#f2ede6"] },
  { id: "3", title: "Atelier Noir", style: "Modern", material: "Charcoal", type: "wardrobe", palette: ["#2e2e2e", "#666666", "#f8f8f8"] },
  { id: "4", title: "Côte Crème", style: "Classic", material: "Matte White", type: "walk-in", palette: ["#fef7ed", "#c9a87c", "#8d6e63"] },
  { id: "5", title: "Studio Clair", style: "Minimalist", material: "White Oak", type: "reach-in", palette: ["#d4b483", "#fefdf9", "#e8ddd0"] },
  { id: "6", title: "Résidence Brun", style: "Modern", material: "Walnut", type: "wardrobe", palette: ["#7b4d2e", "#a8845c", "#f9f7f4"] },
  { id: "7", title: "Lumière Blanche", style: "Minimalist", material: "Matte White", type: "walk-in", palette: ["#f5f5f0", "#dddddd", "#a8845c"] },
  { id: "8", title: "Hôtel Particulier", style: "Classic", material: "White Oak", type: "reach-in", palette: ["#d4b483", "#8d6e63", "#f2ede6"] },
];

function GalleryCard({ item, colors }: { item: GalleryItem; colors: ReturnType<typeof useColors> }) {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.cardVisual, { backgroundColor: item.palette[2], borderRadius: colors.radius - 2 }]}>
        <View style={styles.swatches}>
          {item.palette.map((hex, i) => (
            <View key={i} style={[styles.swatch, { backgroundColor: hex, borderRadius: 4 }]} />
          ))}
        </View>
        <View style={[styles.cardMockCloset, { backgroundColor: item.palette[0], borderRadius: 4 }]}>
          <View style={[styles.closetRail, { backgroundColor: item.palette[1] }]} />
          <View style={[styles.closetShelf, { backgroundColor: item.palette[1] }]} />
          <View style={[styles.closetShelf, { backgroundColor: item.palette[1] }]} />
        </View>
        <Pressable
          testID={`like-button-${item.id}`}
          onPress={handleLike}
          style={[styles.likeBtn, { backgroundColor: liked ? colors.primary : "rgba(255,255,255,0.9)", borderRadius: 16 }]}
        >
          <Feather name="heart" size={12} color={liked ? "#fff" : colors.mutedForeground} />
        </Pressable>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{item.style} · {item.material}</Text>
      </View>
    </View>
  );
}

export default function GalleryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filtered = activeCategory === "all"
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.type === activeCategory);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gallery</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {filtered.length} designs
        </Text>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {CATEGORIES.map((cat) => {
          const active = cat.id === activeCategory;
          return (
            <Pressable
              key={cat.id}
              testID={`filter-${cat.id}`}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(cat.id);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : "transparent",
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        renderItem={({ item }) => <GalleryCard item={item} colors={colors} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="grid" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No designs found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 2 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  row: { gap: 12, marginBottom: 12 },
  card: { width: CARD_WIDTH, borderWidth: 1 },
  cardVisual: {
    height: 160,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  swatches: { position: "absolute", bottom: 8, left: 8, flexDirection: "row", gap: 4 },
  swatch: { width: 14, height: 14 },
  cardMockCloset: {
    width: "55%",
    height: "70%",
    alignItems: "center",
    justifyContent: "space-evenly",
    padding: 8,
    gap: 6,
  },
  closetRail: { height: 3, width: "80%", borderRadius: 2 },
  closetShelf: { height: 3, width: "80%", borderRadius: 2 },
  likeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4, gap: 2 },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
