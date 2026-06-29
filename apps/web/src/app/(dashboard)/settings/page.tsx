"use client";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

const PLANS = [
  { id: "LITE", name: "Lite", price: "$10/mo", features: ["1 user", "Email monitoring", "Basic alerts", "$10K insurance"] },
  { id: "STANDARD", name: "Standard", price: "$20/mo", features: ["1 user", "Identity + dark web", "SMS alerts", "Data broker removal", "$50K insurance"] },
  { id: "HOUSEHOLD", name: "Household", price: "$30/mo", features: ["Up to 6 members", "All Standard features", "Device scanning", "Human response layer", "$100K insurance"] },
  { id: "PREMIUM", name: "Premium", price: "$75/mo", features: ["Unlimited members", "Dedicated analyst", "Priority escalation", "API access", "$250K insurance"] },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"account" | "plan" | "notifications">("account");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="flex gap-2 border-b border-gray-800 pb-1">
        {(["account", "plan", "notifications"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize rounded-t-lg transition-colors ${activeTab === tab ? "text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "account" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Account</h2>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Name</p>
              <p className="text-white">{session?.user?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-white">{session?.user?.email ?? "—"}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 rounded-xl text-sm font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}

      {activeTab === "plan" && (
        <div className="grid grid-cols-1 gap-4">
          {PLANS.map((plan) => (
            <div key={plan.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                  <p className="text-blue-400 font-semibold">{plan.price}</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">
                  Select
                </button>
              </div>
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
          {[
            { label: "Email alerts for HIGH/CRITICAL events", key: "emailHigh" },
            { label: "SMS alerts for CRITICAL events", key: "smsHigh" },
            { label: "Weekly security digest email", key: "weeklyDigest" },
            { label: "Push notifications (mobile)", key: "pushNotif" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <p className="text-sm text-gray-300">{item.label}</p>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-600">Notification preferences are saved to your account. Changes take effect immediately.</p>
        </div>
      )}
    </div>
  );
}
