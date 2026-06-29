import Pusher from "pusher-js";

export const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

export const CHANNELS = {
  household: (id: string) => `private-household-${id}`,
};

export const EVENTS = {
  NEW_ALERT: "new-alert",
  ALERT_UPDATED: "alert-updated",
  SCORE_UPDATED: "score-updated",
  ESCALATION_MESSAGE: "escalation-message",
  BROKER_UPDATE: "broker-update",
};
