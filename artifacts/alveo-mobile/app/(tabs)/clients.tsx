import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "@alveo_clients";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  project: string;
  status: "prospect" | "active" | "completed";
  createdAt: number;
}

const STATUS_LABELS: Record<Client["status"], string> = {
  prospect: "Prospect",
  active: "Active",
  completed: "Completed",
};

const STATUS_COLORS: Record<Client["status"], string> = {
  prospect: "#c9a87c",
  active: "#a8845c",
  completed: "#8d6e63",
};

const SAMPLE_CLIENTS: Client[] = [
  { id: "1", name: "Marie Laurent", email: "marie@example.com", phone: "+33 6 12 34 56 78", project: "Walk-in, 4m×3m, Walnut", status: "active", createdAt: Date.now() - 7 * 86400000 },
  { id: "2", name: "James Whitmore", email: "james@example.com", phone: "+44 7700 900123", project: "Reach-in, 180cm, White Oak", status: "prospect", createdAt: Date.now() - 2 * 86400000 },
  { id: "3", name: "Élise Morin", email: "elise@example.com", phone: "+33 6 98 76 54 32", project: "Wardrobe system, Charcoal", status: "completed", createdAt: Date.now() - 30 * 86400000 },
];

function ClientCard({
  client,
  colors,
  onDelete,
}: {
  client: Client;
  colors: ReturnType<typeof useColors>;
  onDelete: (id: string) => void;
}) {
  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Remove Client", `Remove ${client.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onDelete(client.id) },
    ]);
  };

  const statusColor = STATUS_COLORS[client.status];

  return (
    <View style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.clientRow}>
        <View style={[styles.avatar, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: colors.foreground }]}>{client.name}</Text>
          <Text style={[styles.clientProject, { color: colors.mutedForeground }]} numberOfLines={1}>{client.project}</Text>
        </View>
        <View style={styles.clientActions}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderRadius: 12 }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[client.status]}</Text>
          </View>
          <Pressable testID={`delete-client-${client.id}`} onPress={handleDelete} hitSlop={8}>
            <Feather name="trash-2" size={15} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.clientDetails, { borderTopColor: colors.border }]}>
        <View style={styles.clientDetail}>
          <Feather name="mail" size={12} color={colors.mutedForeground} />
          <Text style={[styles.clientDetailText, { color: colors.mutedForeground }]}>{client.email}</Text>
        </View>
        <View style={styles.clientDetail}>
          <Feather name="phone" size={12} color={colors.mutedForeground} />
          <Text style={[styles.clientDetailText, { color: colors.mutedForeground }]}>{client.phone}</Text>
        </View>
      </View>
    </View>
  );
}

interface AddClientForm {
  name: string;
  email: string;
  phone: string;
  project: string;
  status: Client["status"];
}

const EMPTY_FORM: AddClientForm = { name: "", email: "", phone: "", project: "", status: "prospect" };

export default function ClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddClientForm>(EMPTY_FORM);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          setClients(JSON.parse(val));
        } catch {
          setClients(SAMPLE_CLIENTS);
        }
      } else {
        setClients(SAMPLE_CLIENTS);
      }
    });
  }, []);

  const saveClients = useCallback(async (updated: Client[]) => {
    setClients(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      saveClients(clients.filter((c) => c.id !== id));
    },
    [clients, saveClients]
  );

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newClient: Client = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      project: form.project.trim(),
      status: form.status,
      createdAt: Date.now(),
    };
    await saveClients([newClient, ...clients]);
    setForm(EMPTY_FORM);
    setShowModal(false);
  };

  const activeCount = clients.filter((c) => c.status === "active").length;
  const prospectCount = clients.filter((c) => c.status === "prospect").length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Clients</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {activeCount} active · {prospectCount} prospects
            </Text>
          </View>
          <Pressable
            testID="add-client-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowModal(true);
            }}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!clients.length}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ClientCard client={item} colors={colors} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No clients yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap the + button to add your first client
            </Text>
          </View>
        }
      />

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)} testID="close-modal-button">
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Client</Text>
            <Pressable
              testID="save-client-button"
              onPress={handleAdd}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={[styles.modalSave, { color: form.name.trim() ? colors.primary : colors.mutedForeground }]}>
                Save
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {[
              { key: "name", label: "Full Name", placeholder: "e.g. Marie Laurent" },
              { key: "email", label: "Email", placeholder: "e.g. marie@example.com" },
              { key: "phone", label: "Phone", placeholder: "e.g. +33 6 12 34 56 78" },
              { key: "project", label: "Project", placeholder: "e.g. Walk-in, 4m×3m, Walnut" },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>{label}</Text>
                <TextInput
                  testID={`client-input-${key}`}
                  style={[
                    styles.formInput,
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
                  value={(form as unknown as Record<string, string>)[key]}
                  onChangeText={(val) => setForm((f) => ({ ...f, [key]: val }))}
                />
              </View>
            ))}

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Status</Text>
              <View style={styles.statusRow}>
                {(["prospect", "active", "completed"] as Client["status"][]).map((s) => (
                  <Pressable
                    key={s}
                    testID={`status-${s}`}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    style={({ pressed }) => [
                      styles.statusOption,
                      {
                        backgroundColor: form.status === s ? colors.primary : colors.card,
                        borderColor: form.status === s ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.statusOptionText, { color: form.status === s ? colors.primaryForeground : colors.foreground }]}>
                      {STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerText: { gap: 2 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 12 },
  clientCard: { borderWidth: 1, overflow: "hidden" },
  clientRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  clientInfo: { flex: 1, gap: 2 },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clientProject: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clientActions: { alignItems: "flex-end", gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  clientDetails: { flexDirection: "row", gap: 16, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1 },
  clientDetail: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  clientDetailText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  modalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 18 },
  formGroup: { gap: 8 },
  formLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  formInput: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusOption: { flex: 1, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  statusOptionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
