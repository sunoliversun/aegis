"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Alert, RemediationStep } from "@aegis/db";

const SEVERITY_CONFIG = {
  CRITICAL: { label: "Critical", className: "badge-severity-critical" },
  HIGH: { label: "High", className: "badge-severity-high" },
  MEDIUM: { label: "Medium", className: "badge-severity-medium" },
  LOW: { label: "Low", className: "badge-severity-low" },
  INFO: { label: "Info", className: "badge-severity-info" },
};

interface AlertWithSteps extends Alert {
  remediationSteps: RemediationStep[];
  member?: { firstName: string; lastName: string } | null;
  device?: { name: string; type: string } | null;
}

interface Props {
  alert: AlertWithSteps;
  onUpdate?: () => void;
}

export default function AlertCard({ alert, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(alert.severity === "CRITICAL");
  const acknowledge = trpc.alerts.acknowledge.useMutation({ onSuccess: onUpdate });
  const resolve = trpc.alerts.resolve.useMutation({ onSuccess: onUpdate });
  const escalate = trpc.alerts.requestEscalation.useMutation({ onSuccess: onUpdate });
  const completeStep = trpc.alerts.completeStep.useMutation({ onSuccess: onUpdate });

  const cfg = SEVERITY_CONFIG[alert.severity];
  const isHigh = alert.severity === "CRITICAL" || alert.severity === "HIGH";

  return (
    <div className={`rounded-xl border transition ${
      alert.severity === "CRITICAL" ? "border-red-500/40 bg-red-500/5" :
      alert.severity === "HIGH" ? "border-orange-500/30 bg-orange-500/5" :
      "border-gray-800 bg-gray-900"
    }`}>
      {/* Header */}
      <div
        className="flex cursor-pointer items-start gap-4 p-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
          alert.severity === "CRITICAL" ? "bg-red-500/20" :
          alert.severity === "HIGH" ? "bg-orange-500/20" : "bg-gray-800"
        }`}>
          <AlertTriangle className={`h-4.5 w-4.5 ${
            alert.severity === "CRITICAL" ? "text-red-400" :
            alert.severity === "HIGH" ? "text-orange-400" : "text-gray-400"
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{alert.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cfg.className}`}>
              {cfg.label}
            </span>
            {alert.status === "ESCALATED" && (
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400 ring-1 ring-purple-500/20">
                Escalated
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-400 line-clamp-1">{alert.description}</p>
          <p className="mt-1 text-xs text-gray-600">
            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            {alert.member ? ` · ${alert.member.firstName} ${alert.member.lastName}` : ""}
          </p>
        </div>
        <div className="ml-2 flex-shrink-0 text-gray-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded: steps + actions */}
      {expanded && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-4">
          {alert.remediationSteps.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Remediation steps</h4>
              <div className="space-y-2">
                {alert.remediationSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 rounded-lg p-3 ${step.completedAt ? "bg-green-500/5 opacity-60" : "bg-gray-800"}`}
                  >
                    <button
                      onClick={() => !step.completedAt && completeStep.mutate({ stepId: step.id })}
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                        step.completedAt ? "border-green-500 bg-green-500/20" : "border-gray-600 hover:border-brand-500"
                      }`}
                    >
                      {step.completedAt && <CheckCircle className="h-3 w-3 text-green-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${step.completedAt ? "line-through text-gray-500" : "text-gray-200"}`}>
                        {step.order}. {step.title}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
                      {step.actionUrl && !step.completedAt && (
                        <a href={step.actionUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand-500 hover:underline">
                          Take action →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {alert.status === "NEW" && (
              <button
                onClick={() => acknowledge.mutate({ id: alert.id })}
                disabled={acknowledge.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800"
              >
                {acknowledge.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Acknowledge
              </button>
            )}
            {(alert.status === "ACKNOWLEDGED" || alert.status === "IN_REMEDIATION") && (
              <button
                onClick={() => resolve.mutate({ id: alert.id })}
                disabled={resolve.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20"
              >
                {resolve.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Mark resolved
              </button>
            )}
            {isHigh && alert.status !== "ESCALATED" && alert.status !== "RESOLVED" && (
              <button
                onClick={() => escalate.mutate({ alertId: alert.id })}
                disabled={escalate.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20"
              >
                {escalate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
                Escalate to analyst
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
