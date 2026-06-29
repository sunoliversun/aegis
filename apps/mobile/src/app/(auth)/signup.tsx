import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !email || !password || !householdName) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, householdName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");

      // Auto-login after register
      const loginRes = await fetch(`${API_URL}/api/auth/mobile-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        router.replace("/(auth)/login");
        return;
      }
      await SecureStore.setItemAsync("session-token", loginData.token);
      await SecureStore.setItemAsync("user-id", loginData.user.id);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Sign up failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🛡️ Aegis</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start protecting your household today</Text>

        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#6b7280" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#6b7280" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#6b7280" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Household name (e.g. The Smiths)" placeholderTextColor="#6b7280" value={householdName} onChangeText={setHouseholdName} />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#f9fafb", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#111827",
    color: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  button: { backgroundColor: "#3b6bfa", borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkRow: { marginTop: 20, alignItems: "center" },
  linkText: { color: "#6b7280", fontSize: 14 },
  link: { color: "#3b6bfa", fontWeight: "600" },
});
