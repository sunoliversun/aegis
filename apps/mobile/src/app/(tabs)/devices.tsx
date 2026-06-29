import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../../lib/trpc";

const DEVICE_ICONS: Record<string, string> = {
  ROUTER: "📡",
  COMPUTER: "💻",
  PHONE: "📱",
  TABLET: "📟",
  SMART_TV: "📺",
  SMART_SPEAKER: "🔊",
  CAMERA: "📷",
  THERMOSTAT: "🌡️",
  GAMING_CONSOLE: "🎮",
  OTHER: "🔌",
};

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? "#ef4444" : score >= 60 ? "#f97316" : score >= 40 ? "#eab308" : "#22c55e";
  return (
    <View style={styles.riskBarBg}>
      <View style={[styles.riskBarFill, { width: `${score}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export default function DevicesScreen() {
  const { data: household, isLoading, refetch, isRefetching } = trpc.household.get.useQuery();
  const devices = (household as any)?.devices ?? [];
  const lastScan = (household as any)?.networkScans?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Devices & Network</Text>

      {lastScan && (
        <View style={styles.scanCard}>
          <Text style={styles.scanTitle}>Last Network Scan</Text>
          <Text style={styles.scanMeta}>{new Date(lastScan.scannedAt).toLocaleString()}</Text>
          <View style={styles.scanStats}>
            <View style={styles.scanStat}>
              <Text style={styles.scanStatValue}>{lastScan.deviceCount}</Text>
              <Text style={styles.scanStatLabel}>Devices Found</Text>
            </View>
            <View style={styles.scanStat}>
              <Text style={styles.scanStatValue}>{lastScan.openPorts?.length ?? 0}</Text>
              <Text style={styles.scanStatLabel}>Open Ports</Text>
            </View>
            <View style={styles.scanStat}>
              <Text style={[styles.scanStatValue, { color: (lastScan.riskFlags?.length ?? 0) > 0 ? "#ef4444" : "#22c55e" }]}>
                {lastScan.riskFlags?.length ?? 0}
              </Text>
              <Text style={styles.scanStatLabel}>Risk Flags</Text>
            </View>
          </View>
          {lastScan.riskFlags?.length > 0 && (
            <View style={styles.flagsRow}>
              {lastScan.riskFlags.map((f: string) => (
                <View key={f} style={styles.flagBadge}>
                  <Text style={styles.flagText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <FlatList
        data={devices}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b6bfa" />}
        ListEmptyComponent={<Text style={styles.empty}>{isLoading ? "Loading..." : "No devices registered. Devices are discovered automatically during network scans."}</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceIcon}>{DEVICE_ICONS[item.deviceType] ?? "🔌"}</Text>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Text style={styles.deviceMeta}>{item.manufacturer ?? item.deviceType} · {item.ipAddress ?? "no IP"}</Text>
              </View>
              <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? "#22c55e" : "#6b7280" }]} />
            </View>
            <View style={styles.riskRow}>
              <RiskBar score={item.riskScore ?? 0} />
              <Text style={styles.riskScore}>{item.riskScore ?? 0}</Text>
            </View>
            {item.vulnerabilities?.length > 0 && (
              <Text style={styles.vulnCount}>⚠️ {item.vulnerabilities.length} vulnerabilit{item.vulnerabilities.length !== 1 ? "ies" : "y"}</Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  scanCard: { marginHorizontal: 20, backgroundColor: "#0d1117", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1f2937", marginBottom: 16 },
  scanTitle: { fontSize: 14, fontWeight: "700", color: "#f9fafb" },
  scanMeta: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  scanStats: { flexDirection: "row", justifyContent: "space-around" },
  scanStat: { alignItems: "center" },
  scanStatValue: { fontSize: 24, fontWeight: "800", color: "#f9fafb" },
  scanStatLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  flagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  flagBadge: { backgroundColor: "#7f1d1d22", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#7f1d1d" },
  flagText: { color: "#ef4444", fontSize: 11, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  deviceCard: { backgroundColor: "#0d1117", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1f2937" },
  deviceHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  deviceIcon: { fontSize: 24, marginRight: 12 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: "700", color: "#f9fafb" },
  deviceMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  riskRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  riskBarBg: { flex: 1, height: 6, backgroundColor: "#1f2937", borderRadius: 3, overflow: "hidden" },
  riskBarFill: { height: "100%", borderRadius: 3 },
  riskScore: { fontSize: 13, fontWeight: "700", color: "#9ca3af", width: 28, textAlign: "right" },
  vulnCount: { fontSize: 12, color: "#eab308", marginTop: 8 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40, lineHeight: 22, paddingHorizontal: 20 },
});
