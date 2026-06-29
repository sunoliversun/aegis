"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, Loader2 } from "lucide-react";

const ASSET_TYPES = [
  { value: "EMAIL", label: "Email address", placeholder: "you@example.com" },
  { value: "PHONE", label: "Phone number", placeholder: "+1 555 000 0000" },
  { value: "SSN", label: "Social Security Number", placeholder: "XXX-XX-XXXX" },
  { value: "CREDIT_CARD", label: "Credit card number", placeholder: "4111 1111 1111 1111" },
  { value: "BANK_ACCOUNT", label: "Bank account number", placeholder: "Account number" },
  { value: "USERNAME", label: "Username / handle", placeholder: "@username" },
  { value: "DOMAIN", label: "Domain / website", placeholder: "example.com" },
] as const;

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddAssetModal({ onClose, onAdded }: Props) {
  const [type, setType] = useState<(typeof ASSET_TYPES)[number]["value"]>("EMAIL");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  const addAsset = trpc.assets.add.useMutation({ onSuccess: onAdded });
  const selectedType = ASSET_TYPES.find((t) => t.value === type)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add monitored asset</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Asset type</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as any); setValue(""); }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">{selectedType.label}</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selectedType.placeholder}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
            />
            {(type === "SSN" || type === "CREDIT_CARD" || type === "BANK_ACCOUNT") && (
              <p className="mt-1 text-xs text-gray-500">
                Encrypted with AES-256 before storage. Never shared. Used only for breach lookups.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "Work email", "Chase checking"'
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {addAsset.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{addAsset.error.message}</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-300 hover:bg-gray-800">
              Cancel
            </button>
            <button
              onClick={() => addAsset.mutate({ type, value, label: label || undefined })}
              disabled={!value || addAsset.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {addAsset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add & start monitoring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
