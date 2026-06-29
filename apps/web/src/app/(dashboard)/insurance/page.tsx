"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Shield, Plus, DollarSign, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";

const CLAIM_STATUS_CONFIG = {
  DRAFT: { label: "Draft", Icon: FileText, color: "text-gray-400" },
  SUBMITTED: { label: "Submitted", Icon: Clock, color: "text-blue-400" },
  UNDER_REVIEW: { label: "Under review", Icon: Clock, color: "text-yellow-400" },
  APPROVED: { label: "Approved", Icon: CheckCircle, color: "text-green-400" },
  DENIED: { label: "Denied", Icon: XCircle, color: "text-red-400" },
  PAID: { label: "Paid", Icon: CheckCircle, color: "text-green-400" },
};

export default function InsurancePage() {
  const [showClaim, setShowClaim] = useState(false);
  const { data: policy, isLoading: policyLoading } = trpc.insurance.policy.useQuery();
  const { data: claims, isLoading: claimsLoading, refetch } = trpc.insurance.claims.useQuery();
  const submitClaim = trpc.insurance.fileClaim.useMutation({ onSuccess: () => { refetch(); setShowClaim(false); } });

  const [claimForm, setClaimForm] = useState({ type: "IDENTITY_THEFT", description: "", amountClaimed: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cyber Insurance</h1>
          <p className="mt-1 text-sm text-gray-400">Financial protection against cybercrime losses</p>
        </div>
        <button
          onClick={() => setShowClaim(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> File claim
        </button>
      </div>

      {/* Policy card */}
      {policyLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : policy ? (
        <div className="card border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-500" />
                <span className="font-semibold text-white">{policy.carrier}</span>
                {policy.active ? (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
                    Inactive
                  </span>
                )}
              </div>
              {policy.policyId && (
                <p className="mt-1 font-mono text-xs text-gray-500">Policy #{policy.policyId}</p>
              )}
            </div>
            <span className="rounded-lg bg-brand-500/20 px-3 py-1 text-sm font-semibold text-brand-500">
              {policy.plan} Plan
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            {[
              { label: "Identity theft", amount: policy.coverage.identityTheft },
              { label: "Financial fraud", amount: policy.coverage.financialFraud },
              { label: "Ransomware", amount: policy.coverage.ransomware },
            ].map((cov) => (
              <div key={cov.label}>
                <div className="text-xs text-gray-400">{cov.label} coverage</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {cov.amount === 0 ? "Not covered" : `$${cov.amount.toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Claims */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Claims</h2>
        {claimsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : claims?.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-gray-600" />
            <p className="font-medium text-gray-400">No claims filed</p>
            <p className="mt-1 text-sm text-gray-600">If you've experienced a cybercrime loss, file a claim above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims?.map((claim) => {
              const cfg = CLAIM_STATUS_CONFIG[claim.status];
              return (
                <div key={claim.id} className="card flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{claim.type.replace("_", " ")}</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        <cfg.Icon className="h-3.5 w-3.5" /> {cfg.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-400 line-clamp-1">{claim.description}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>Claimed: ${claim.amountClaimed.toLocaleString()}</span>
                      {claim.amountApproved != null && <span>Approved: ${claim.amountApproved.toLocaleString()}</span>}
                      <span>{format(new Date(claim.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  {claim.carrierClaimId && (
                    <span className="font-mono text-xs text-gray-500">{claim.carrierClaimId}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File claim modal */}
      {showClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold text-white">File a Claim</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Claim type</label>
                <select
                  value={claimForm.type}
                  onChange={(e) => setClaimForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
                >
                  {["IDENTITY_THEFT", "FINANCIAL_FRAUD", "RANSOMWARE", "HARASSMENT", "EXTORTION"].map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Description</label>
                <textarea
                  value={claimForm.description}
                  onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe what happened..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Amount claimed ($)</label>
                <input
                  type="number"
                  value={claimForm.amountClaimed}
                  onChange={(e) => setClaimForm((f) => ({ ...f, amountClaimed: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowClaim(false)} className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-300 hover:bg-gray-800">
                  Cancel
                </button>
                <button
                  onClick={() => submitClaim.mutate({ type: claimForm.type as any, description: claimForm.description, amountClaimed: parseFloat(claimForm.amountClaimed) })}
                  disabled={submitClaim.isPending || !claimForm.description || !claimForm.amountClaimed}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitClaim.isPending ? "Filing..." : "File claim"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
