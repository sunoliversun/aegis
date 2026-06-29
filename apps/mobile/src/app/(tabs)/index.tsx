import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { trpc } from "../../lib/trpc";

function ScoreGauge({ score }: { score: number }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const startAngle = -225;
  const endAngle = 45;
  const totalArc = endAngle - startAngle;
  const scoreAngle = startAngle + (score / 100) * totalArc;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (from: number, to: number) => {
    const x1 = cx + r * Math.cos(toRad(from));
    const y1 = cy + r * Math.sin(toRad(from));
    const x2 = cx + r * Math.cos(toRad(to));
    const y2 = cy + r * Math.sin(toRad(to));
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "At Risk";

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Path d={arcPath(startAngle, endAngle)} stroke="#1f2937" strokeWidth={12} fill="none" />
        <Path d={arcPath(startAngle, scoreAngle)} stroke={color} strokeWidth={12} fill="none" strokeLinecap="round" />
        <SvgText x={cx} y={cy - 6} textAnchor="middle" fill="#f9fafb" fontSize={36} fontWeight="700">{score}</SvgText>
        <SvgText x={cx} y={cy + 20} textAnchor="middle" fill={color} fontSize={13} fontWeight="600">{label}</SvgText>
        <SvgText x={cx} y={cy + 40} textAnchor="middle" fill="#6b7280" fontSize={11}>Security Score</SvgText>
      </Svg>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: color ?? "#f9fafb" }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { data: household, isLoading, refetch, isRefetching } = trpc.household.get.useQuery();
  const scoreQuery = trpc.household.score.useQuery(undefined, { enabled: !!household });

  const score = household?.householdScore ?? 0;
  const alertCounts = (household as any)?._count?.alerts ?? {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b6bfa" />}
      >
        <Text style={styles.header}>🛡️ Aegis</Text>
        <Text style={styles.householdName}>{household?.name ?? "—"}</Text>
        <Text style={styles.plan}>{household?.plan ?? ""} Plan</Text>

        <View style={styles.gaugeCard}>
          <ScoreGauge score={score} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Open Alerts" value={alertCounts?.NEW ?? 0} color="#f97316" />
          <StatCard label="Members" value={household?.members?.length ?? 0} />
          <StatCard label="Devices" value={household?.devices?.length ?? 0} />
          <StatCard label="Escalations" value={household?.escalations?.length ?? 0} color="#ef4444" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          {[
            { label: "Identity Monitoring", weight: 35 },
            { label: "Breach Records", weight: 20 },
            { label: "Data Brokers", weight: 15 },
            { label: "Device Security", weight: 15 },
            { label: "Escalations", weight: 15 },
          ].map((item) => (
            <View key={item.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={styles.breakdownWeight}>{item.weight}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20 },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb", textAlign: "center", marginBottom: 2 },
  householdName: { fontSize: 18, fontWeight: "700", color: "#f9fafb", textAlign: "center" },
  plan: { fontSize: 12, color: "#3b6bfa", textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1.5 },
  gaugeCard: { backgroundColor: "#0d1117", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#1f2937" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#0d1117", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1f2937", alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "800", color: "#f9fafb" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  section: { backgroundColor: "#0d1117", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1f2937" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#f9fafb", marginBottom: 12 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  breakdownLabel: { fontSize: 14, color: "#d1d5db" },
  breakdownWeight: { fontSize: 14, color: "#6b7280" },
});
