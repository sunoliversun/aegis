"use client";

import { AlertTriangle, Database, Users, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  score: any;
  brokerStats: any;
  memberCount: number;
  loading: boolean;
}

export default function QuickStats({ score, brokerStats, memberCount, loading }: Props) {
  const stats = [
    {
      label: "Active threats",
      value: loading ? null : (score?.breakdown.alerts.critical ?? 0) + (score?.breakdown.alerts.high ?? 0),
      sub: loading ? null : `${score?.breakdown.alerts.critical ?? 0} critical`,
      Icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Breached assets",
      value: loading ? null : score?.breakdown.breaches.total ?? 0,
      sub: loading ? null : `of ${score?.breakdown.breaches.of ?? 0} monitored`,
      Icon: Shield,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Broker exposures",
      value: loading ? null : brokerStats?.reappeared ?? 0,
      sub: loading ? null : `${brokerStats?.confirmed ?? 0} removed`,
      Icon: Database,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Members protected",
      value: loading ? null : memberCount,
      sub: "all active",
      Icon: Users,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="card flex items-start gap-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
            <s.Icon className={`h-5 w-5 ${s.color}`} />
          </div>
          <div>
            {loading ? (
              <>
                <Skeleton className="mb-1 h-7 w-12" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
                {s.sub && <div className="text-xs text-gray-600">{s.sub}</div>}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
