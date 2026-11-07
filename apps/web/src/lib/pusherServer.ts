import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const CHANNELS = {
  household: (id: string) => `private-household-${id}`,
};

export const EVENTS = {
  NEW_ALERT: "new-alert",
  SCAN_RESULT: "scan-result",
};
