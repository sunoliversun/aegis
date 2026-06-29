"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AlertCard from "@/components/AlertCard";
import { Filter, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SEVERITIES = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const STATUSES = ["ALL", "NEW", "ACKNOWLEDGED", "IN_REMEDIATION", "ESCALATED", "RESOLVED"] as const;

export default function AlertsPage() {
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("ALL");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("NEW");

  const { data, isLoading, refetch } = trpc.alerts.list.useQuery({
    limit: 50,
    ...(severity !== "ALL" && { severity }),
    ...(status !== "ALL" && { status }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="mt-1 text-sm text-gray-400">All threats detected across your household</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">Severity:</span>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                severity === s ? "bg-brand-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5">
          <span className="text-xs text-gray-400">Status:</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                status === s ? "bg-brand-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : data?.alerts.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-gray-600" />
            <p className="font-medium text-gray-400">No alerts match your filters</p>
            <p className="mt-1 text-sm text-gray-600">
              {status === "NEW" ? "You're all clear — no new threats detected." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          data?.alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onUpdate={() => refetch()} />
          ))
        )}
      </div>
    </div>
  );
}
