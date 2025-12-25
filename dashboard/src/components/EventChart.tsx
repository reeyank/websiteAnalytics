"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface EventChartProps {
  data: Record<string, number>;
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#84cc16",
];

export default function EventChart({ data }: EventChartProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({
      name: name.replace("custom:", "").replace("_", " "),
      value,
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No event data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis type="number" stroke="#666" />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#666"
          width={100}
          tick={{ fill: "#999", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a25",
            border: "1px solid #2a2a3a",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#fff" }}
          itemStyle={{ color: "#8b5cf6" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
