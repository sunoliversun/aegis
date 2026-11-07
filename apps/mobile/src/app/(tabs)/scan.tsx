import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type ScanType = "SMS" | "EMAIL" | "CALL";
type Verdict = "SAFE" | "SUSPICIOUS" | "PHISHING";

const VERDICT_COLOR: Record<Verdict, string> = {
  SAFE: "#22c55e",
  SUSPICIOUS: "#eab308",
  PHISHING: "#ef4444",
};

const VERDICT_ICON: Record<Verdict, string> = {
  SAFE: "checkmark-circle",
  SUSPICIOUS: "warning",
  PHISHING: "alert-circle",
};

type ScanResult = { verdict: Verdict; riskScore: number; summary: string } | null;

export default function ScanScreen() {
  const [tab, setTab] = useState<ScanType>("SMS");
  const [input, setInput] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);

  async function runScan() {
    if (!input.trim()) {
      Alert.alert("Enter content", "Paste the message or enter caller info to scan.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const token = await SecureStore.getItemAsync("session-token");
      const res = await fetch(`${API_URL}/api/scan/${tab.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sender, body: input, subject }),
      });
      if (!res.ok) throw new Error("Scan failed");
      const data: ScanResult = await res.json();
      setResult(data);
    } catch (err: any) {
      Alert.alert("Scan error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    setInput(text);
  }

  const verdictColor = result ? (VERDICT_COLOR[result.verdict] ?? "#6b7280") : "#6b7280";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Manual Scan</Text>
        <Text style={styles.subtitle}>Paste any suspicious message to analyze it instantly</Text>

        {/* Type selector */}
        <View style={styles.typeRow}>
          {(["SMS", "EMAIL", "CALL"] as ScanType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, tab === t && styles.typeBtnActive]}
              onPress={() => { setTab(t); setResult(null); }}
            >
              <Ionicons
                name={t === "SMS" ? "chatbubble" : t === "EMAIL" ? "mail" : "call"}
                size={14}
                color={tab === t ? "#3b6bfa" : "#6b7280"}
              />
              <Text style={[styles.typeBtnText, tab === t && styles.typeBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sender field */}
        <Text style={styles.label}>
          {tab === "SMS" ? "Sender number" : tab === "EMAIL" ? "From address" : "Caller number"}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={tab === "CALL" ? "+1 555 000 0000" : tab === "EMAIL" ? "phisher@evil.com" : "+1 555 000 0000"}
          placeholderTextColor="#4b5563"
          value={sender}
          onChangeText={setSender}
          autoCapitalize="none"
          keyboardType={tab === "EMAIL" ? "email-address" : "default"}
        />

        {tab === "EMAIL" && (
          <>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Urgent: verify your account"
              placeholderTextColor="#4b5563"
              value={subject}
              onChangeText={setSubject}
            />
          </>
        )}

        {/* Content field */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {tab === "CALL" ? "Caller info / voicemail notes" : "Message content"}
          </Text>
          <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteBtn}>
            <Text style={styles.pasteBtnText}>Paste</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder={
            tab === "CALL"
              ? "e.g. IRS agent claiming you owe back taxes..."
              : "Paste the full message here..."
          }
          placeholderTextColor="#4b5563"
          multiline
          numberOfLines={6}
          value={input}
          onChangeText={setInput}
          textAlignVertical="top"
        />

        <TouchableOpacity style={[styles.scanBtn, loading && { opacity: 0.6 }]} onPress={runScan} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.scanBtnText}>Analyze with AI</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={[styles.resultCard, { borderColor: verdictColor }]}>
            <View style={styles.resultHeader}>
              <Ionicons name={VERDICT_ICON[result.verdict] as any} size={28} color={verdictColor} />
              <View style={styles.resultTitleCol}>
                <Text style={[styles.resultVerdict, { color: verdictColor }]}>{result.verdict}</Text>
                <Text style={styles.resultScore}>Risk score: {result.riskScore}/100</Text>
              </View>
              <View style={[styles.scorePill, { backgroundColor: verdictColor + "22", borderColor: verdictColor }]}>
                <Text style={[styles.scorePillText, { color: verdictColor }]}>{result.riskScore}</Text>
              </View>
            </View>
            <Text style={styles.resultSummary}>{result.summary}</Text>
          </View>
        )}

        {/* iOS note for SMS */}
        {Platform.OS === "ios" && tab === "SMS" && (
          <View style={styles.iosNote}>
            <Ionicons name="information-circle" size={16} color="#3b82f6" />
            <Text style={styles.iosNoteText}>
              On iOS, SMS is not auto-scanned. Use this screen to manually check suspicious messages.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: "800", color: "#f9fafb", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937",
  },
  typeBtnActive: { backgroundColor: "#1e3a5f", borderColor: "#3b6bfa" },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  typeBtnTextActive: { color: "#3b6bfa" },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#9ca3af", marginBottom: 6 },
  pasteBtn: { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: "#1f2937", borderRadius: 6 },
  pasteBtnText: { fontSize: 11, color: "#3b6bfa", fontWeight: "600" },
  input: {
    backgroundColor: "#0d1117", color: "#f9fafb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    marginBottom: 14, borderWidth: 1, borderColor: "#1f2937",
  },
  textarea: { minHeight: 120, paddingTop: 12 },
  scanBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#3b6bfa", borderRadius: 12,
    paddingVertical: 15, marginTop: 4,
  },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultCard: {
    marginTop: 20, backgroundColor: "#0d1117", borderRadius: 14,
    padding: 16, borderWidth: 1.5,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  resultTitleCol: { flex: 1 },
  resultVerdict: { fontSize: 18, fontWeight: "800" },
  resultScore: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  scorePill: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  scorePillText: { fontSize: 15, fontWeight: "800" },
  resultSummary: { fontSize: 14, color: "#9ca3af", lineHeight: 20 },
  iosNote: {
    flexDirection: "row", gap: 8, marginTop: 16,
    backgroundColor: "#1e3a5f33", borderRadius: 10,
    padding: 12, alignItems: "flex-start",
  },
  iosNoteText: { flex: 1, fontSize: 12, color: "#93c5fd", lineHeight: 17 },
});
