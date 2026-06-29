"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export default function MembersPage() {
  const { data: household, isLoading, refetch } = trpc.household.get.useQuery();
  const addMember = trpc.household.addMember.useMutation({ onSuccess: () => { refetch(); setEmail(""); setName(""); setShowAdd(false); } });

  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const members = (household as any)?.members ?? [];

  if (isLoading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Household Members</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">
          + Add Member
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Invite Member</h2>
          <div className="space-y-3">
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => addMember.mutate({ email, name })}
                disabled={!email || !name || addMember.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {addMember.isPending ? "Adding..." : "Add Member"}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
            {addMember.error && <p className="text-sm text-red-400">{addMember.error.message}</p>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {members.map((member: any) => (
          <div key={member.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-xl">
              {member.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{member.user?.name ?? "Unknown"}</p>
                {member.role === "OWNER" && (
                  <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 rounded px-2 py-0.5">Owner</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{member.user?.email}</p>
              {member.joinedAt && (
                <p className="text-xs text-gray-600 mt-1">Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
