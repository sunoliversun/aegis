"use client";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

const DEVICE_ICONS: Record<string, string> = {
  ROUTER: "📡",
  COMPUTER: "💻",
  PHONE: "📱",
  TABLET: "📟",
  SMART_TV: "📺",
  SMART_SPEAKER: "🔊",
  CAMERA: "📷",
  THERMOSTAT: "🌡️",
  GAMING_CONSOLE: "🎮",
  OTHER: "🔌",
};

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm text-gray-400 w-8 text-right">{score}</span>
    </div>
  );
}

export default function DevicesPage() {
  const { data: household, isLoading } = trpc.household.get.useQuery();
  const devices = (household as any)?.devices ?? [];
  const lastScan = (household as any)?.networkScans?.[0];

  if (isLoading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Devices & Network</h1>

      {lastScan && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Last Network Scan</h2>
          <p className="text-sm text-gray-500 mb-4">{formatDistanceToNow(new Date(lastScan.scannedAt), { addSuffix: true })}</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{lastScan.deviceCount}</p>
              <p className="text-xs text-gray-500 mt-1">Devices Found</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{lastScan.openPorts?.length ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Open Ports</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${(lastScan.riskFlags?.length ?? 0) > 0 ? "text-red-400" : "text-green-400"}`}>{lastScan.riskFlags?.length ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Risk Flags</p>
            </div>
          </div>
          {lastScan.riskFlags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lastScan.riskFlags.map((f: string) => (
                <span key={f} className="text-xs bg-red-900/30 text-red-400 border border-red-900 rounded px-2 py-1">{f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.length === 0 ? (
          <div className="col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500">
            No devices registered. Devices are discovered automatically during network scans.
          </div>
        ) : (
          devices.map((device: any) => (
            <div key={device.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{DEVICE_ICONS[device.deviceType] ?? "🔌"}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{device.name}</h3>
                    <span className={`w-2 h-2 rounded-full ${device.isOnline ? "bg-green-500" : "bg-gray-600"}`} />
                  </div>
                  <p className="text-sm text-gray-500">{device.manufacturer ?? device.deviceType} · {device.ipAddress ?? "no IP"}</p>
                  {device.macAddress && <p className="text-xs text-gray-600 mt-1 font-mono">{device.macAddress}</p>}
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                <RiskBar score={device.riskScore ?? 0} />
              </div>
              {device.vulnerabilities?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ {device.vulnerabilities.length} Vulnerabilit{device.vulnerabilities.length !== 1 ? "ies" : "y"}</p>
                  <div className="space-y-1">
                    {device.vulnerabilities.slice(0, 3).map((v: any) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${v.severity === "CRITICAL" ? "bg-red-500" : v.severity === "HIGH" ? "bg-orange-500" : "bg-yellow-500"}`} />
                        <span className="text-xs text-gray-400">{v.title}</span>
                      </div>
                    ))}
                    {device.vulnerabilities.length > 3 && <p className="text-xs text-gray-600">+{device.vulnerabilities.length - 3} more</p>}
                  </div>
                </div>
              )}
              {device.lastSeenAt && (
                <p className="text-xs text-gray-600 mt-3">Last seen {formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
