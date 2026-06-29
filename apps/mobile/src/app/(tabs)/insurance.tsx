import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../../lib/trpc";

const CLAIM_TYPE_LABELS: Record<string, string> = {
  IDENTITY_THEFT: "Identity Theft",
  RANSOMWARE: "Ransomware",
  FINANCIAL_FRAUD: "Financial Fraud",
  DATA_BREACH: "Data Breach",
  DEVICE_DAMAGE: "Device Damage",
  CYBER_EXTORTION: "Cyber Extortion",
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#eab308",
  APPROVED: "#22c55e",
  PAID: "#22c55e",
  DENIED: "#ef4444",
  CLOSED: "#6b7280",
};

export default function InsuranceScreen() {
  const { data: household, isLoading, refetch, isRefetching } = trpc.household.get.useQuery();
  const claims = (household as any)?.insuranceClaims ?? [];

  const [modalVisible, setModalVisible] = useState(false);
  const [claimType, setClaimType] = useState("IDENTITY_THEFT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const createClaimMutation = trpc.insurance.fileClaim.useMutation({
    onSuccess: () => {
      setModalVisible(false);
      setDescription("");
      setAmount("");
      refetch();
      Alert.alert("Claim Filed", "Your claim has been submitted. Our team will review it within 24 hours.");
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const coverageLimits: Record<string, number> = {
    LITE: 10000,
    STANDARD: 50000,
    HOUSEHOLD: 100000,
    PREMIUM: 250000,
  };

  const plan = household?.plan ?? "LITE";
  const limit = coverageLimits[plan] ?? 10000;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b6bfa" />}
      >
        <Text style={styles.header}>Insurance</Text>

        <View style={styles.coverageCard}>
          <Text style={styles.coverageTitle}>Your Coverage</Text>
          <Text style={styles.coverageAmount}>${limit.toLocaleString()}</Text>
          <Text style={styles.coverageLabel}>Maximum coverage limit</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{plan} Plan</Text>
          </View>
          <View style={styles.coverageList}>
            {Object.keys(CLAIM_TYPE_LABELS).map((t) => (
              <View key={t} style={styles.coverageRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.coverageItem}>{CLAIM_TYPE_LABELS[t]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Claims History</Text>
          <TouchableOpacity style={styles.fileBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.fileBtnText}>File Claim</Text>
          </TouchableOpacity>
        </View>

        {claims.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>No claims filed</Text>
            <Text style={styles.emptyText}>You're protected up to ${limit.toLocaleString()}. If you experience a cyber incident, file a claim immediately.</Text>
          </View>
        ) : (
          claims.map((claim: any) => (
            <View key={claim.id} style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimType}>{CLAIM_TYPE_LABELS[claim.claimType] ?? claim.claimType}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[claim.status] ?? "#6b7280") + "22", borderColor: STATUS_COLORS[claim.status] ?? "#6b7280" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[claim.status] ?? "#6b7280" }]}>{claim.status}</Text>
                </View>
              </View>
              <Text style={styles.claimAmount}>${claim.claimedAmount?.toLocaleString() ?? "—"}</Text>
              <Text style={styles.claimDesc}>{claim.description}</Text>
              <Text style={styles.claimDate}>{new Date(claim.createdAt).toLocaleDateString()}</Text>
              {claim.approvedAmount && (
                <Text style={styles.approvedAmount}>Approved: ${claim.approvedAmount.toLocaleString()}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>File a Claim</Text>

            <Text style={styles.modalLabel}>Incident Type</Text>
            <View style={styles.typeGrid}>
              {Object.entries(CLAIM_TYPE_LABELS).map(([t, label]) => (
                <TouchableOpacity key={t} style={[styles.typeBtn, claimType === t && styles.typeBtnActive]} onPress={() => setClaimType(t)}>
                  <Text style={[styles.typeBtnText, claimType === t && styles.typeBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Describe what happened..."
              placeholderTextColor="#6b7280"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.modalLabel}>Estimated Loss (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5000"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => createClaimMutation.mutate({ type: claimType as any, description, amountClaimed: parseFloat(amount) || 0 })}
              >
                <Text style={styles.confirmBtnText}>Submit Claim</Text>
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
  content: { padding: 20 },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb", marginBottom: 16 },
  coverageCard: { backgroundColor: "#0d1117", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#1f2937", marginBottom: 20 },
  coverageTitle: { fontSize: 13, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  coverageAmount: { fontSize: 40, fontWeight: "800", color: "#22c55e", marginTop: 4 },
  coverageLabel: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  planBadge: { alignSelf: "flex-start", backgroundColor: "#1e3a8a22", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#3b6bfa", marginBottom: 16 },
  planBadgeText: { color: "#3b6bfa", fontSize: 12, fontWeight: "700" },
  coverageList: { gap: 8 },
  coverageRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkmark: { color: "#22c55e", fontSize: 14 },
  coverageItem: { fontSize: 14, color: "#d1d5db" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#f9fafb" },
  fileBtn: { backgroundColor: "#3b6bfa", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  fileBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyCard: { backgroundColor: "#0d1117", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#1f2937", alignItems: "center" },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#f9fafb", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  claimCard: { backgroundColor: "#0d1117", borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#1f2937" },
  claimHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  claimType: { fontSize: 15, fontWeight: "700", color: "#f9fafb" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "700" },
  claimAmount: { fontSize: 22, fontWeight: "800", color: "#f9fafb", marginBottom: 6 },
  claimDesc: { fontSize: 13, color: "#9ca3af", lineHeight: 18, marginBottom: 6 },
  claimDate: { fontSize: 12, color: "#6b7280" },
  approvedAmount: { fontSize: 13, color: "#22c55e", fontWeight: "700", marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
  modal: { backgroundColor: "#0d1117", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f9fafb", marginBottom: 16 },
  modalLabel: { fontSize: 13, color: "#9ca3af", marginBottom: 8, marginTop: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" },
  typeBtnActive: { backgroundColor: "#1e3a8a22", borderColor: "#3b6bfa" },
  typeBtnText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  typeBtnTextActive: { color: "#3b6bfa" },
  input: { backgroundColor: "#111827", color: "#f9fafb", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, borderWidth: 1, borderColor: "#1f2937", marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: "#111827", alignItems: "center" },
  cancelBtnText: { color: "#9ca3af", fontWeight: "600" },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: "#3b6bfa", alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});
