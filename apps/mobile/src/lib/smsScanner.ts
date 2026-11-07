/**
 * Android-only SMS scanning.
 * Uses expo-sms-retriever (or a background task) to read incoming SMS
 * and POST them to the Aegis scan API.
 *
 * iOS does not allow third-party SMS reading — on iOS the user must
 * forward suspicious messages via the Share Sheet instead.
 */
import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as SecureStore from "expo-secure-store";

const TASK_NAME = "aegis-sms-scan";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function scanSmsText(opts: {
  sender: string;
  body: string;
  token: string;
}): Promise<{ verdict: string; riskScore: number; summary: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/scan/sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.token}`,
      },
      body: JSON.stringify({ sender: opts.sender, body: opts.body }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Register background fetch task (Android). No-op on iOS. */
export async function registerSmsScanTask() {
  if (Platform.OS !== "android") return;
  try {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // already registered or not supported
  }
}

TaskManager.defineTask(TASK_NAME, async () => {
  // Background tasks on Android — the actual SMS hook is in the
  // native module (expo-sms-retriever or react-native-sms-listener).
  // This task flushes any queued scans stored in SecureStore.
  try {
    const queued = await SecureStore.getItemAsync("sms-scan-queue");
    if (!queued) return BackgroundFetch.BackgroundFetchResult.NoData;
    const items: Array<{ sender: string; body: string }> = JSON.parse(queued);
    if (!items.length) return BackgroundFetch.BackgroundFetchResult.NoData;
    const token = await SecureStore.getItemAsync("session-token");
    if (!token) return BackgroundFetch.BackgroundFetchResult.Failed;
    await Promise.all(items.map((item) => scanSmsText({ ...item, token })));
    await SecureStore.deleteItemAsync("sms-scan-queue");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
