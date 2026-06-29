"use client";

import { trpc } from "@/lib/trpc";
import ScoreGauge from "@/components/ScoreGauge";
import AlertFeed from "@/components/AlertFeed";
import QuickStats from "@/components/QuickStats";
import RecentActivity from "@/components/RecentActivity";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: score, isLoading: scoreLoading } = trpc.household.score.useQuery();
  const { data: household, isLoading: householdLoading } = trpc.household.get.useQuery();
  const { data: alertsData, isLoading: alertsLoading } = trpc.alerts.list.useQuery({
    limit: 5,
    status: "NEW",
  });
  const { data: brokerStats } = trpc.brokers.stats.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {householdLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            `${household?.name ?? "Your"} Household`
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {household?.members.length ?? 0} member{(household?.members.length ?? 0) !== 1 ? "s" : ""} protected ·{" "}
          {household?.plan} plan
        </p>
      </div>

      {/* Score + Quick Stats row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center lg:col-span-1">
          {scoreLoading ? (
            <Skeleton className="h-48 w-48 rounded-full" />
          ) : (
            <ScoreGauge score={score?.score ?? 100} band={score?.band ?? "protected"} />
          )}
          <p className="mt-4 text-center text-sm text-gray-400">Household Security Score</p>
          {score && (
            <p className={`mt-1 text-sm font-semibold capitalize ${
              score.band === "protected" ? "text-green-400" :
              score.band === "some_risks" ? "text-yellow-400" :
              score.band === "needs_attention" ? "text-orange-400" : "text-red-400"
            }`}>
              {score.band.replace("_", " ")}
            </p>
          )}
        </div>

        <div className="lg:col-span-2">
          <QuickStats
            score={score}
            brokerStats={brokerStats}
            memberCount={household?.members.length ?? 0}
            loading={scoreLoading}
          />
        </div>
      </div>

      {/* Alert feed + activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Active Alerts</h2>
            <a href="/alerts" className="text-xs text-brand-500 hover:underline">View all →</a>
          </div>
          <AlertFeed alerts={alertsData?.alerts ?? []} loading={alertsLoading} compact />
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Score Breakdown</h2>
          </div>
          {score ? (
            <div className="space-y-3">
              {[
                { label: "Active threats", penalty: score.breakdown.alerts.penalty, max: 35, count: `${score.breakdown.alerts.critical} critical, ${score.breakdown.alerts.high} high` },
                { label: "Credential exposure", penalty: score.breakdown.breaches.penalty, max: 20, count: `${score.breakdown.breaches.total} of ${score.breakdown.breaches.of} assets breached` },
                { label: "Data broker exposure", penalty: score.breakdown.brokers.penalty, max: 15, count: `${score.breakdown.brokers.exposed} sites found` },
                { label: "Device vulnerabilities", penalty: score.breakdown.devices.penalty, max: 15, count: `${score.breakdown.devices.vulnerable} of ${score.breakdown.devices.total} devices at risk` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-300">{item.label}</span>
                    <span className="text-xs text-gray-500">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all ${item.penalty > item.max * 0.7 ? "bg-red-500" : item.penalty > item.max * 0.4 ? "bg-orange-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, (item.penalty / item.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
