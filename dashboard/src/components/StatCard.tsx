"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "purple" | "blue" | "green" | "orange" | "pink";
}

const colorClasses = {
  purple: "from-purple-500 to-purple-700",
  blue: "from-blue-500 to-blue-700",
  green: "from-emerald-500 to-emerald-700",
  orange: "from-orange-500 to-orange-700",
  pink: "from-pink-500 to-pink-700",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "purple",
}: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-1">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${
                trend.isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              <span>{trend.isPositive ? "+" : "-"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500">vs last period</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} opacity-80 group-hover:opacity-100 transition-opacity`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent blur-2xl group-hover:from-purple-500/20 transition-all" />
    </div>
  );
}
