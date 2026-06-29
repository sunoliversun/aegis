import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../../lib/trpc";

const ASSET_ICONS: Record<string, string> = {
  EMAIL: "✉️",
  PHONE: "📱",
  SSN: "🔐",
  CREDIT_CARD: "💳",
  BANK_ACCOUNT: "🏦",
  PASSPORT: "🛂",
  ADDRESS: "🏠",
  USERNAME: "👤",
};

function BreachBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.breachBadge}>
      <Text style={styles.breachBadgeText}>{count} breach{count !== 1 ? "es" : ""}</Text>
    </View>
  );
}

export default function IdentityScreen() {
  const { data: assets, isLoading, refetch, isRefetching } = trpc.assets.list.useQuery();
  const addMutation = trpc.assets.add.useMutation({ onSuccess: () => { setModalVisible(false); refetch(); } });

  const [modalVisible, setModalVisible] = useState(false);
  const [assetType, setAssetType] = useState("EMAIL");
  const [value, setValue] = useState("");

  const ASSET_TYPES = ["EMAIL", "PHONE", "SSN", "CREDIT_CARD", "BANK_ACCOUNT", "USERNAME", "ADDRESS"];

  function handleAdd() {
    if (!value.trim()) { Alert.alert("Error", "Please enter a value."); return; }
    addMutation.mutate({ type: assetType as any, value: value.trim() });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.header}>Identity</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Monitored assets · breaches detected in real-time</Text>

      <FlatList
        data={assets ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b6bfa" />}
        ListEmptyComponent={<Text style={styles.empty}>{isLoading ? "Loading..." : "No assets added yet. Tap + Add to start monitoring."}</Text>}
        renderItem={({ item }) => (
          <View style={styles.assetCard}>
            <Text style={styles.assetIcon}>{ASSET_ICONS[item.type] ?? "🔍"}</Text>
            <View style={styles.assetInfo}>
              <Text style={styles.assetType}>{item.type.replace(/_/g, " ")}</Text>
              <Text style={styles.assetValue}>{item.maskedValue}</Text>
            </View>
            <BreachBadge count={(item as any)._count?.breachRecords ?? 0} />
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Asset to Monitor</Text>

            <View style={styles.typeGrid}>
              {ASSET_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.typeBtn, assetType === t && styles.typeBtnActive]} onPress={() => setAssetType(t)}>
                  <Text style={[styles.typeBtnText, assetType === t && styles.typeBtnTextActive]}>{ASSET_ICONS[t]} {t.replace(/_/g, " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={`Enter ${assetType.toLowerCase().replace(/_/g, " ")}`}
              placeholderTextColor="#6b7280"
              value={value}
              onChangeText={setValue}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setValue(""); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                <Text style={styles.confirmBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb" },
  addBtn: { backgroundColor: "#3b6bfa", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  subtitle: { fontSize: 12, color: "#6b7280", paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  assetCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0d1117", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1f2937" },
  assetIcon: { fontSize: 24, marginRight: 12 },
  assetInfo: { flex: 1 },
  assetType: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  assetValue: { fontSize: 15, color: "#f9fafb", fontWeight: "600", marginTop: 2 },
  breachBadge: { backgroundColor: "#7f1d1d", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  breachBadgeText: { color: "#ef4444", fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
  modal: { backgroundColor: "#0d1117", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f9fafb", marginBottom: 16 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" },
  typeBtnActive: { backgroundColor: "#1e3a8a22", borderColor: "#3b6bfa" },
  typeBtnText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  typeBtnTextActive: { color: "#3b6bfa" },
  input: { backgroundColor: "#111827", color: "#f9fafb", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, borderWidth: 1, borderColor: "#1f2937", marginBottom: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: "#111827", alignItems: "center" },
  cancelBtnText: { color: "#9ca3af", fontWeight: "600" },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: "#3b6bfa", alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});
