import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  isPositive = true,
  subtext = "vs. last 30 days",
  icon,
  iconBgColor = "bg-indigo-50",
  iconColor = "text-indigo-600",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform",
              iconBgColor,
              iconColor
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
            <h4 className="mt-1 text-2xl font-bold tracking-tight text-notari-dark">{value}</h4>
          </div>
        </div>

        {change && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
              isPositive ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
            )}
          >
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{change}</span>
          </div>
        )}
      </div>

      {subtext && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{subtext}</span>
        </div>
      )}
    </Card>
  );
}
