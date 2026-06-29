"use client";

import { trpc } from "@/lib/trpc";
import { Database, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  CONFIRMED: { label: "Removed", color: "text-green-400", bg: "bg-green-500/10", ring: "ring-green-500/20", Icon: CheckCircle2 },
  SUBMITTED: { label: "Submitted", color: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/20", Icon: Clock },
  PENDING: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-500/10", ring: "ring-yellow-500/20", Icon: Clock },
  REAPPEARED: { label: "Re-appeared", color: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/20", Icon: RefreshCw },
  FAILED: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20", Icon: XCircle },
};

export default function BrokersPage() {
  const { data: stats, isLoading: statsLoading } = trpc.brokers.stats.useQuery();
  const { data: removals, isLoading } = trpc.brokers.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Data Broker Removal</h1>
        <p className="mt-1 text-sm text-gray-400">
          Automated opt-out submissions to data broker and people-search sites
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : stats ? (
          [
            { label: "Total sites", value: stats.total, color: "text-white" },
            { label: "Removed", value: stats.confirmed, color: "text-green-400" },
            { label: "In progress", value: stats.pending, color: "text-blue-400" },
            { label: "Re-appeared", value: stats.reappeared, color: "text-orange-400" },
            { label: "Protected", value: `${stats.protectedPct}%`, color: stats.protectedPct > 80 ? "text-green-400" : "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="card-sm text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="mt-1 text-xs text-gray-400">{s.label}</div>
            </div>
          ))
        ) : null}
      </div>

      {/* Progress bar */}
      {stats && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Overall removal progress</span>
            <span className="text-sm font-semibold text-white">{stats.protectedPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-green-500 transition-all"
              style={{ width: `${stats.protectedPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {stats.confirmed} of {stats.total} sites confirmed removed · Removals resubmitted every 30 days
          </p>
        </div>
      )}

      {/* Removal table */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="font-semibold text-white">Broker Removal Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Broker</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-6 py-3"><Skeleton className="h-4" /></td>
                    ))}
                  </tr>
                ))
              ) : removals?.map((r) => {
                const cfg = STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-200">{r.brokerName}</div>
                      <div className="text-xs text-gray-500">{r.brokerUrl}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-300">
                      {r.member.firstName} {r.member.lastName}
                    </td>
                    <td className="px-6 py-3 text-gray-400">{r.category ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
                        <cfg.Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
