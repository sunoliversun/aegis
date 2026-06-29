import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import Pusher from "pusher";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function sendSMS(to: string, message: string): Promise<void> {
  await twilioClient.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
    body: `[Aegis Alert] ${message}`,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await sgMail.send({
    to: opts.to,
    from: { email: process.env.SENDGRID_FROM_EMAIL!, name: "Aegis Security" },
    subject: opts.subject,
    html: opts.html,
  });
}

export async function pushToHousehold(householdId: string, event: string, data: object): Promise<void> {
  await pusher.trigger(`private-household-${householdId}`, event, data);
}

export function alertEmailHtml(opts: {
  title: string;
  description: string;
  severity: string;
  dashboardUrl: string;
}): string {
  const colors = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#3b82f6", INFO: "#6b7280" };
  const color = colors[opts.severity as keyof typeof colors] ?? "#6b7280";

  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <div style="width:36px;height:36px;background:#3b6bfa;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-weight:bold;font-size:18px;">A</span>
      </div>
      <span style="font-size:20px;font-weight:700;color:white;">Aegis</span>
    </div>
    <div style="background:#1e293b;border-radius:12px;padding:24px;border-left:4px solid ${color};">
      <div style="display:inline-block;background:${color}20;color:${color};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:12px;border:1px solid ${color}40;">
        ${opts.severity}
      </div>
      <h2 style="color:white;margin:0 0 8px;">${opts.title}</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">${opts.description}</p>
      <a href="${opts.dashboardUrl}" style="display:inline-block;background:#3b6bfa;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
        View in Aegis →
      </a>
    </div>
    <p style="color:#475569;font-size:12px;margin-top:16px;">
      You're receiving this because you have a ${opts.severity} or higher alert threshold configured.
      <a href="${opts.dashboardUrl}/settings" style="color:#3b6bfa;">Manage preferences</a>
    </p>
  </div>
</body>
</html>`;
}
