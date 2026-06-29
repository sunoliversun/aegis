"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Lock, User, Loader2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PLANS = [
  { id: "LITE", name: "Lite", price: "$10/mo", desc: "1 person, core monitoring", highlight: false },
  { id: "STANDARD", name: "Standard", price: "$20/mo", desc: "1 person + insurance", highlight: false },
  { id: "HOUSEHOLD", name: "Household", price: "$30/mo", desc: "Up to 5 members", highlight: true },
  { id: "PREMIUM", name: "Premium", price: "$75/mo", desc: "Concierge analyst", highlight: false },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "plan">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<"LITE" | "STANDARD" | "HOUSEHOLD" | "PREMIUM">("HOUSEHOLD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, plan }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Registration failed");
      }
      router.push("/login?registered=1");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Protect your household with Aegis</h1>
          <p className="mt-1 text-sm text-gray-400">Identity monitoring · Breach alerts · Human response · Insurance</p>
        </div>

        <div className="card">
          {step === "account" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Create your account</h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Full name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => setStep("plan")}
                disabled={!name || !email || password.length < 8}
                className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40"
              >
                Continue →
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-brand-500 hover:underline">Sign in</Link>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Choose your plan</h2>
              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`relative rounded-lg border p-4 text-left transition ${
                      plan === p.id
                        ? "border-brand-500 bg-brand-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    } ${p.highlight ? "ring-1 ring-brand-500" : ""}`}
                  >
                    {p.highlight && (
                      <span className="absolute -top-2 left-3 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-semibold text-white">
                        Popular
                      </span>
                    )}
                    {plan === p.id && (
                      <Check className="absolute right-3 top-3 h-4 w-4 text-brand-500" />
                    )}
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="mt-0.5 text-lg font-bold text-brand-500">{p.price}</div>
                    <div className="mt-1 text-xs text-gray-400">{p.desc}</div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("account")}
                  className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Start protecting
                </button>
              </div>

              <p className="text-center text-xs text-gray-500">
                Insurance policy auto-issued on activation. Cancel anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
