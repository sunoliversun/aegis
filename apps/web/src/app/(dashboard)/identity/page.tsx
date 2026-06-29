"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Shield, AlertCircle, Mail, Phone, CreditCard, Building2, FileText, User, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AddAssetModal from "@/components/AddAssetModal";
import { formatDistanceToNow } from "date-fns";

const ASSET_ICONS: Record<string, React.ElementType> = {
  EMAIL: Mail, PHONE: Phone, CREDIT_CARD: CreditCard, BANK_ACCOUNT: Building2,
  SSN: FileText, PASSPORT: FileText, ADDRESS: Globe, USERNAME: User, DOMAIN: Globe,
};

export default function IdentityPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: assets, isLoading, refetch } = trpc.assets.list.useQuery();

  const breachedCount = assets?.filter((a) => a.breachRecords.length > 0).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Identity Monitor</h1>
          <p className="mt-1 text-sm text-gray-400">Watching {assets?.length ?? 0} assets for breaches and dark web exposure</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Add asset
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Assets monitored", value: assets?.length ?? 0, color: "text-white" },
          { label: "Breached", value: breachedCount, color: breachedCount > 0 ? "text-red-400" : "text-green-400" },
          { label: "Clean", value: (assets?.length ?? 0) - breachedCount, color: "text-green-400" },
          { label: "Total breaches", value: assets?.reduce((acc, a) => acc + a.breachRecords.length, 0) ?? 0, color: "text-orange-400" },
        ].map((stat) => (
          <div key={stat.label} className="card-sm">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Asset list */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-white">Monitored Assets</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : assets?.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Shield className="mb-3 h-10 w-10 text-gray-600" />
            <p className="font-medium text-gray-400">No assets added yet</p>
            <p className="mt-1 text-sm text-gray-600">Add your email, SSN, phone and more to start monitoring</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Add your first asset
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {assets?.map((asset) => {
              const Icon = ASSET_ICONS[asset.type] ?? Shield;
              const hasBreaches = asset.breachRecords.length > 0;
              return (
                <div
                  key={asset.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition ${
                    hasBreaches ? "border-red-500/30 bg-red-500/5" : "border-gray-800 bg-gray-800/50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasBreaches ? "bg-red-500/10" : "bg-gray-700"}`}>
                    <Icon className={`h-5 w-5 ${hasBreaches ? "text-red-400" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-200">{asset.maskedValue}</span>
                      {asset.label && <span className="text-xs text-gray-500">({asset.label})</span>}
                      <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">{asset.type.replace("_", " ")}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Last scanned {asset.lastScannedAt ? formatDistanceToNow(new Date(asset.lastScannedAt), { addSuffix: true }) : "never"} ·
                      Monitored for {asset.member.firstName} {asset.member.lastName}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasBreaches ? (
                      <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {asset.breachRecords.length} breach{asset.breachRecords.length !== 1 ? "es" : ""}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                        <Shield className="h-3.5 w-3.5" />
                        Clean
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onAdded={() => { refetch(); setShowAdd(false); }} />}
    </div>
  );
}
