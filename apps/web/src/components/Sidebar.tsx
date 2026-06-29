"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Bell, Eye, Database, Monitor, Wifi, FileText, Users, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", Icon: Shield },
  { href: "/alerts", label: "Alerts", Icon: Bell },
  { href: "/identity", label: "Identity", Icon: Eye },
  { href: "/brokers", label: "Data Brokers", Icon: Database },
  { href: "/devices", label: "Devices", Icon: Monitor },
  { href: "/network", label: "Network", Icon: Wifi },
  { href: "/insurance", label: "Insurance", Icon: FileText },
  { href: "/members", label: "Members", Icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-800 bg-gray-950">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
          <Shield className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Aegis</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-500/10 text-brand-500"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-800 p-3 space-y-0.5">
        <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
