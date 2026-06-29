"use client";

import AlertCard from "./AlertCard";
import { Skeleton } from "./ui/skeleton";
import { CheckCircle } from "lucide-react";

interface Props {
  alerts: any[];
  loading?: boolean;
  compact?: boolean;
  onUpdate?: () => void;
}

export default function AlertFeed({ alerts, loading, compact, onUpdate }: Props) {
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );

  if (alerts.length === 0) return (
    <div className="flex flex-col items-center py-8 text-center">
      <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
      <p className="text-sm font-medium text-gray-400">No active alerts</p>
      <p className="text-xs text-gray-600">Your household is clear right now</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
