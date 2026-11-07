"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mail, MessageSquare, Phone, Shield, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ScanType = "EMAIL" | "SMS" | "CALL";
type Verdict = "SAFE" | "SUSPICIOUS" | "PHISHING";

const TYPE_CONFIG: Record<ScanType, { label: string; Icon: typeof Mail; placeholder: string; senderLabel: string }> = {
  EMAIL: {
    label: "Email",
    Icon: Mail,
    placeholder: "Paste the full email body here...",
    senderLabel: "From address",
  },
  SMS: {
    label: "SMS / Text",
    Icon: MessageSquare,
    placeholder: "Paste the SMS content here...",
    senderLabel: "Phone number",
  },
  CALL: {
    label: "Phone Call",
    Icon: Phone,
    placeholder: "Describe what the caller said, or paste a transcript...",
    senderLabel: "Caller ID / number",
  },
};

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bg: string; Icon: typeof Shield }> = {
  SAFE: { label: "Safe", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", Icon: CheckCircle },
  SUSPICIOUS: { label: "Suspicious", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", Icon: AlertTriangle },
  PHISHING: { label: "Phishing Detected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", Icon: AlertTriangle },
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "text-blue-400 bg-blue-500/10",
  MEDIUM: "text-yellow-400 bg-yellow-500/10",
  HIGH: "text-orange-400 bg-orange-500/10",
  CRITICAL: "text-red-400 bg-red-500/10",
};

type Finding = { flag: string; detail: string; severity: string };
type ScanResult = {
  id: string;
  verdict: Verdict;
  riskScore: number;
  summary: string;
  findings: Finding[];
};

function RiskMeter({ score }: { score: number }) {
  const color = score >= 70 ? "bg-red-500" : score >= 30 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-semibold text-white">{score}</span>
    </div>
  );
}

function ScanHistoryRow({ scan }: { scan: { id: string; type: string; sender: string | null; subject: string | null; verdict: Verdict; riskScore: number; summary: string; scannedAt: Date } }) {
  const [open, setOpen] = useState(false);
  const { label, color, Icon } = VERDICT_CONFIG[scan.verdict];
  const TypeIcon = TYPE_CONFIG[scan.type as ScanType]?.Icon ?? Mail;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left"
      >
        <TypeIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold", color)}>{label}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-500">{scan.type}</span>
            {scan.sender && <span className="truncate text-xs text-gray-400">{scan.sender}</span>}
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-300">{scan.summary}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(scan.scannedAt), { addSuffix: true })}</span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-800 px-4 py-3">
          <RiskMeter score={scan.riskScore} />
          <p className="mt-2 text-sm text-gray-300">{scan.summary}</p>
        </div>
      )}
    </div>
  );
}

export default function ScreeningPage() {
  const [type, setType] = useState<ScanType>("EMAIL");
  const [content, setContent] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);

  const { data: stats } = trpc.screening.stats.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.screening.list.useQuery({ limit: 20 });

  const scan = trpc.screening.scan.useMutation({
    onSuccess: (data) => {
      setResult(data as ScanResult);
      refetchHistory();
    },
  });

  const config = TYPE_CONFIG[type];
  const verdictConfig = result ? VERDICT_CONFIG[result.verdict] : null;

  const handleScan = () => {
    if (!content.trim()) return;
    setResult(null);
    scan.mutate({ type, content, sender: sender || undefined, subject: subject || undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Message Screening</h1>
        <p className="mt-1 text-sm text-gray-400">Scan emails, texts, and calls for phishing and fraud</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Scanned", value: stats.total, color: "text-white" },
            { label: "Phishing", value: stats.phishing, color: "text-red-400" },
            { label: "Suspicious", value: stats.suspicious, color: "text-yellow-400" },
            { label: "Safe", value: stats.safe, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={cn("mt-1 text-2xl font-bold", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner */}
        <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-white">Scan a Message</h2>

          {/* Type selector */}
          <div className="flex gap-2">
            {(["EMAIL", "SMS", "CALL"] as ScanType[]).map((t) => {
              const { label, Icon } = TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition",
                    type === t
                      ? "border-brand-500 bg-brand-500/10 text-brand-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Sender */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">{config.senderLabel} <span className="text-gray-600">(optional)</span></label>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder={type === "EMAIL" ? "noreply@example.com" : type === "SMS" ? "+1 (555) 000-0000" : "Caller ID or number"}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Subject (email only) */}
          {type === "EMAIL" && (
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Subject <span className="text-gray-600">(optional)</span></label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Action Required: Verify your account"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={config.placeholder}
              rows={6}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={!content.trim() || scan.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scan.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Scan Now
              </>
            )}
          </button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {!result && !scan.isPending && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-900/50 p-8 text-center">
              <div>
                <Shield className="mx-auto h-10 w-10 text-gray-700" />
                <p className="mt-3 text-sm text-gray-500">Scan result will appear here</p>
              </div>
            </div>
          )}

          {scan.isPending && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-gray-800 bg-gray-900 p-8">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-400" />
                <p className="mt-3 text-sm text-gray-400">Analyzing message...</p>
              </div>
            </div>
          )}

          {result && verdictConfig && (
            <div className={cn("rounded-xl border p-5 space-y-4", verdictConfig.bg)}>
              <div className="flex items-center gap-3">
                <verdictConfig.Icon className={cn("h-6 w-6", verdictConfig.color)} />
                <div className="flex-1">
                  <p className={cn("text-lg font-bold", verdictConfig.color)}>{verdictConfig.label}</p>
                  <p className="text-sm text-gray-300">{result.summary}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-400">Risk Score</p>
                <RiskMeter score={result.riskScore} />
              </div>

              {result.findings.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-400">Findings ({result.findings.length})</p>
                  <div className="space-y-2">
                    {result.findings.map((f, i) => (
                      <div key={i} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", SEVERITY_COLOR[f.severity] ?? "text-gray-400 bg-gray-800")}>
                            {f.severity}
                          </span>
                          <span className="text-sm font-medium text-white">{f.flag}</span>
                        </div>
                        <p className="text-xs text-gray-400">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.verdict !== "SAFE" && (
                <div className="rounded-lg bg-gray-900/60 p-3">
                  <p className="text-xs font-medium text-gray-300">What to do</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-gray-400">
                    <li>• Do not click any links in the message</li>
                    <li>• Do not reply or call back any number provided</li>
                    <li>• Report to your email provider or carrier</li>
                    {result.verdict === "PHISHING" && <li>• If you already interacted, change your passwords immediately</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {scan.isError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
              Scan failed. Please try again.
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history && history.scans.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Scan History</h2>
          <div className="space-y-2">
            {history.scans.map((s: Parameters<typeof ScanHistoryRow>[0]["scan"]) => (
              <ScanHistoryRow key={s.id} scan={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
