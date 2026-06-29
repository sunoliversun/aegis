import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@aegis/api";
import * as SecureStore from "expo-secure-store";

export const trpc = createTRPCReact<AppRouter>();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await SecureStore.getItemAsync("session-token");
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
