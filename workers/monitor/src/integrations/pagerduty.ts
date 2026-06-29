import axios from "axios";

const PD_API = "https://events.pagerduty.com/v2/enqueue";
const PD_MGMT = "https://api.pagerduty.com";

export interface EscalationPayload {
  householdName: string;
  alertTitle: string;
  alertDescription: string;
  severity: string;
  escalationId: string;
  householdId: string;
}

export async function triggerEscalation(payload: EscalationPayload): Promise<string> {
  const res = await axios.post(PD_API, {
    routing_key: process.env.PAGERDUTY_INTEGRATION_KEY!,
    event_action: "trigger",
    dedup_key: payload.escalationId,
    payload: {
      summary: `[AEGIS] ${payload.severity} alert for ${payload.householdName}: ${payload.alertTitle}`,
      severity: payload.severity.toLowerCase() === "critical" ? "critical" : "error",
      source: "Aegis Security Platform",
      timestamp: new Date().toISOString(),
      custom_details: {
        household_id: payload.householdId,
        escalation_id: payload.escalationId,
        alert_description: payload.alertDescription,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/alerts`,
      },
    },
    client: "Aegis",
    client_url: process.env.NEXT_PUBLIC_APP_URL,
  });

  return res.data.dedup_key;
}

export async function resolveEscalation(dedupKey: string): Promise<void> {
  await axios.post(PD_API, {
    routing_key: process.env.PAGERDUTY_INTEGRATION_KEY!,
    event_action: "resolve",
    dedup_key: dedupKey,
  });
}

export async function addAnalystNote(incidentId: string, note: string): Promise<void> {
  await axios.post(
    `${PD_MGMT}/incidents/${incidentId}/notes`,
    { note: { content: note } },
    {
      headers: {
        Authorization: `Token token=${process.env.PAGERDUTY_API_KEY}`,
        "Content-Type": "application/json",
        From: "aegis-system@aegis.security",
      },
    }
  );
}
