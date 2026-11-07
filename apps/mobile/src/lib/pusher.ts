import Pusher from "pusher-js/react-native";

const pusherKey = process.env.EXPO_PUBLIC_PUSHER_KEY!;
const pusherCluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER!;

let _client: Pusher | null = null;

export function getPusherClient(token: string): Pusher {
  if (_client) return _client;
  _client = new Pusher(pusherKey, {
    cluster: pusherCluster,
    authEndpoint: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/pusher/auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } },
  });
  return _client;
}

export function disconnectPusher() {
  _client?.disconnect();
  _client = null;
}

export const EVENTS = {
  NEW_ALERT: "new-alert",
  SCAN_RESULT: "scan-result",
};
