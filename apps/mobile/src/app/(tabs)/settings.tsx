import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Platform, Linking, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";

const CARRIERS = [
  { name: "AT&T", code: "*21*{number}#", uncode: "##21#" },
  { name: "Verizon", code: "*72{number}", uncode: "*73" },
  { name: "T-Mobile", code: "**21*{number}#", uncode: "##21#" },
  { name: "Sprint/T-Mo", code: "*72{number}", uncode: "*720" },
];

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon, label, value, onPress, right,
}: {
  icon: string; label: string; value?: string; onPress?: () => void; right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={18} color="#3b6bfa" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color="#4b5563" />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [smsEnabled, setSmsEnabled] = useState(Platform.OS === "android");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [screeningNumber, setScreeningNumber] = useState<string | null>(null);
  const household = trpc.household.get.useQuery();

  useEffect(() => {
    // Load saved preferences
    SecureStore.getItemAsync("sms-scan-enabled").then((v) => v !== null && setSmsEnabled(v === "1"));
    SecureStore.getItemAsync("selected-carrier").then((v) => setSelectedCarrier(v));
  }, []);

  // Get the member's screening number from household data
  useEffect(() => {
    const members = (household.data as any)?.members;
    if (members?.length) setScreeningNumber(members[0]?.twilioNumber ?? null);
  }, [household.data]);

  async function toggleSms(val: boolean) {
    setSmsEnabled(val);
    await SecureStore.setItemAsync("sms-scan-enabled", val ? "1" : "0");
  }

  async function handleLogout() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync("session-token");
          await SecureStore.deleteItemAsync("user-id");
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  function showForwardingInstructions(carrier: typeof CARRIERS[0]) {
    const number = screeningNumber ?? "+1XXXXXXXXXX";
    const code = carrier.code.replace("{number}", number);
    Alert.alert(
      `${carrier.name} Call Forwarding`,
      `To forward all calls through Aegis screening:\n\nDial: ${code}\n\nTo cancel forwarding:\nDial: ${carrier.uncode}\n\nYour Aegis screening number:\n${number}`,
      [
        { text: "Open Dialer", onPress: () => Linking.openURL(`tel:${code}`) },
        { text: "Done" },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Settings</Text>

        {/* ── Scanning ─────────────────────────────── */}
        <SectionHeader title="Scanning" />
        <View style={styles.card}>
          {Platform.OS === "android" ? (
            <SettingRow
              icon="chatbubble-ellipses"
              label="Auto-scan incoming SMS"
              value="Runs in background on Android"
              right={<Switch value={smsEnabled} onValueChange={toggleSms} trackColor={{ true: "#3b6bfa" }} />}
            />
          ) : (
            <SettingRow
              icon="chatbubble-ellipses"
              label="SMS Auto-scan"
              value="iOS: use Manual Scan for suspicious messages"
              right={<Ionicons name="lock-closed" size={16} color="#4b5563" />}
            />
          )}
          <SettingRow
            icon="notifications"
            label="Push notifications"
            value="Threat alerts sent to this device"
            right={<Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: "#3b6bfa" }} />}
          />
        </View>

        {/* ── Call Screening ───────────────────────── */}
        <SectionHeader title="Call Screening" />
        <View style={styles.card}>
          <View style={styles.screeningBanner}>
            <Ionicons name="call" size={20} color="#c084fc" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Keep Your Real Number</Text>
              <Text style={styles.bannerDesc}>
                Forward calls to your Aegis screening number. Calls ring through instantly — Aegis flags suspicious callers in the background.
              </Text>
            </View>
          </View>

          {screeningNumber ? (
            <View style={styles.numberBox}>
              <Text style={styles.numberLabel}>Your Aegis screening number</Text>
              <Text style={styles.numberValue}>{screeningNumber}</Text>
            </View>
          ) : (
            <View style={styles.numberBox}>
              <Text style={styles.numberLabel}>Screening number</Text>
              <Text style={[styles.numberValue, { color: "#6b7280", fontSize: 13 }]}>Not yet assigned — contact support</Text>
            </View>
          )}

          <Text style={styles.subsection}>Set up call forwarding</Text>
          {CARRIERS.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[styles.carrierRow, selectedCarrier === c.name && styles.carrierRowActive]}
              onPress={() => { setSelectedCarrier(c.name); SecureStore.setItemAsync("selected-carrier", c.name); showForwardingInstructions(c); }}
            >
              <Ionicons name="phone-portrait" size={16} color={selectedCarrier === c.name ? "#c084fc" : "#6b7280"} />
              <Text style={[styles.carrierName, selectedCarrier === c.name && { color: "#c084fc" }]}>{c.name}</Text>
              <Text style={styles.carrierCode}>{c.code.replace("{number}", screeningNumber ?? "…")}</Text>
              <Ionicons name="chevron-forward" size={14} color="#4b5563" />
            </TouchableOpacity>
          ))}
          <Text style={styles.note}>
            Tap your carrier to see the exact dial code. You can remove forwarding at any time by dialing the cancel code.
          </Text>
        </View>

        {/* ── Account ──────────────────────────────── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow icon="person" label="Profile" onPress={() => {}} />
          <SettingRow icon="shield" label="Household" value={(household.data as any)?.name ?? "—"} />
          <SettingRow icon="log-out" label="Sign out" onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb", marginBottom: 20 },
  sectionHeader: {
    fontSize: 11, fontWeight: "700", color: "#6b7280",
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, marginTop: 20,
  },
  card: {
    backgroundColor: "#0d1117", borderRadius: 14,
    borderWidth: 1, borderColor: "#1f2937", overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1f2937",
  },
  settingIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: "#1e3a5f",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#f9fafb" },
  settingValue: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  screeningBanner: {
    flexDirection: "row", gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: "#1f2937", alignItems: "flex-start",
  },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: "#c084fc", marginBottom: 4 },
  bannerDesc: { fontSize: 12, color: "#9ca3af", lineHeight: 17 },
  numberBox: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#1f2937",
  },
  numberLabel: { fontSize: 11, color: "#6b7280", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  numberValue: { fontSize: 20, fontWeight: "700", color: "#c084fc", letterSpacing: 1 },
  subsection: { fontSize: 12, fontWeight: "600", color: "#6b7280", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  carrierRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#1f2937",
  },
  carrierRowActive: { backgroundColor: "#1a0a2e" },
  carrierName: { fontSize: 14, fontWeight: "600", color: "#d1d5db", width: 90 },
  carrierCode: { flex: 1, fontSize: 12, color: "#6b7280", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  note: { fontSize: 11, color: "#4b5563", padding: 14, lineHeight: 16 },
});
