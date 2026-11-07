"use client";

import { Wifi, Router, Shield, AlertTriangle, Monitor, Smartphone, Laptop } from "lucide-react";

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Network Security</h1>
        <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors">
          Run Scan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
            <Router className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Router Status</p>
            <p className="font-semibold text-green-400">Secure</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
            <Wifi className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Devices Online</p>
            <p className="font-semibold text-white">—</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Open Ports</p>
            <p className="font-semibold text-white">—</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-brand-400" />
          <h2 className="font-semibold text-white">Devices on Your Network</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wifi className="h-12 w-12 text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">No scan results yet</p>
          <p className="text-sm text-gray-600 mt-1">Run a scan to discover devices on your network and check for vulnerabilities.</p>
          <button className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors">
            Start Network Scan
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-white mb-4">Device Types Monitored</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Laptop, label: "Laptops & Desktops" },
            { icon: Smartphone, label: "Phones & Tablets" },
            { icon: Monitor, label: "Smart Devices" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 rounded-lg bg-gray-800/50 p-4 text-center">
              <Icon className="h-6 w-6 text-gray-400" />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
