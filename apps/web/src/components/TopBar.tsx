"use client";

import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Props {
  user: { name?: string | null; email?: string | null };
}

export default function TopBar({ user }: Props) {
  const { data } = trpc.alerts.list.useQuery({ limit: 10, status: "NEW" });
  const newCount = data?.alerts.length ?? 0;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950 px-6">
      <div className="text-sm text-gray-400">
        Welcome back, <span className="font-medium text-white">{user.name ?? user.email}</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-1.5 text-gray-400 hover:text-white">
          <Bell className="h-5 w-5" />
          {newCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
          {(user.name ?? user.email ?? "U")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
