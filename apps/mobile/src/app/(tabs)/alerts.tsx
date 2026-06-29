import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../../lib/trpc";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
  INFO: "#3b82f6",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#ef4444",
  ACKNOWLEDGED: "#eab308",
  ESCALATED: "#f97316",
  RESOLVED: "#22c55e",
};

function AlertItem({ item, onAck, onResolve, onEscalate }: any) {
  const [expanded, setExpanded] = useState(false);
  const sc = SEVERITY_COLORS[item.severity] ?? "#6b7280";
  const statusC = STATUS_COLORS[item.status] ?? "#6b7280";

  return (
    <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={[styles.alertCard, { borderLeftColor: sc }]}>
      <View style={styles.alertHeader}>
        <View>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertMeta}>{item.category} · {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={[styles.badge, { backgroundColor: sc + "22", borderColor: sc }]}>
            <Text style={[styles.badgeText, { color: sc }]}>{item.severity}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusC + "22", borderColor: statusC, marginTop: 4 }]}>
            <Text style={[styles.badgeText, { color: statusC }]}>{item.status}</Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.alertBody}>
          <Text style={styles.alertDesc}>{item.description}</Text>
          {item.status === "NEW" && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#1e3a5f" }]} onPress={() => onAck(item.id)}>
                <Text style={styles.actionBtnText}>Acknowledge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#14532d" }]} onPress={() => onResolve(item.id)}>
                <Text style={styles.actionBtnText}>Resolve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#7c2d12" }]} onPress={() => onEscalate(item.id)}>
                <Text style={styles.actionBtnText}>Escalate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const [filter, setFilter] = useState<"NEW" | "ACKNOWLEDGED" | "RESOLVED" | undefined>(undefined);
  const { data, isLoading, refetch, isRefetching } = trpc.alerts.list.useQuery({ status: filter, limit: 50 });
  const ackMutation = trpc.alerts.acknowledge.useMutation({ onSuccess: () => refetch() });
  const resolveMutation = trpc.alerts.resolve.useMutation({ onSuccess: () => refetch() });
  const escalateMutation = trpc.alerts.requestEscalation.useMutation({ onSuccess: () => { refetch(); Alert.alert("Escalated", "A human analyst has been notified."); } });

  const filters = [undefined, "NEW", "ACKNOWLEDGED", "RESOLVED"] as const;
  const filterLabels = ["All", "New", "Acked", "Resolved"];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Alerts</Text>

      <View style={styles.filterRow}>
        {filters.map((f, i) => (
          <TouchableOpacity key={i} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{filterLabels[i]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data?.alerts ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b6bfa" />}
        ListEmptyComponent={<Text style={styles.empty}>{isLoading ? "Loading..." : "No alerts"}</Text>}
        renderItem={({ item }) => (
          <AlertItem
            item={item}
            onAck={(id: string) => ackMutation.mutate({ alertId: id })}
            onResolve={(id: string) => resolveMutation.mutate({ alertId: id })}
            onEscalate={(id: string) => escalateMutation.mutate({ alertId: id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" },
  filterBtnActive: { backgroundColor: "#3b6bfa22", borderColor: "#3b6bfa" },
  filterBtnText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  filterBtnTextActive: { color: "#3b6bfa" },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  alertCard: { backgroundColor: "#0d1117", borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: "#1f2937" },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  alertTitle: { fontSize: 14, fontWeight: "700", color: "#f9fafb", flex: 1, marginRight: 8 },
  alertMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  alertBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#1f2937" },
  alertDesc: { fontSize: 13, color: "#9ca3af", lineHeight: 18, marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },
});
