"use client";

import { useMemo, useState } from "react";
import type { HeatmapPoint } from "@/lib/api";

interface HeatmapProps {
  data: HeatmapPoint[];
  width?: number;
  height?: number;
}

export default function Heatmap({ data, width = 800, height = 600 }: HeatmapProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HeatmapPoint | null>(null);

  const { normalizedData, maxCount } = useMemo(() => {
    if (data.length === 0) return { normalizedData: [], maxCount: 0 };

    const maxX = Math.max(...data.map((p) => p.x));
    const maxY = Math.max(...data.map((p) => p.y));
    const maxCount = Math.max(...data.map((p) => p.count));

    // Scale points to fit the container
    const scaleX = maxX > 0 ? width / maxX : 1;
    const scaleY = maxY > 0 ? height / maxY : 1;
    const scale = Math.min(scaleX, scaleY, 1);

    const normalizedData = data.map((point) => ({
      ...point,
      scaledX: point.x * scale,
      scaledY: point.y * scale,
      intensity: point.count / maxCount,
    }));

    return { normalizedData, maxCount };
  }, [data, width, height]);

  const getColor = (intensity: number): string => {
    // Color gradient from purple to red
    if (intensity < 0.25) {
      return `rgba(139, 92, 246, ${0.2 + intensity * 2})`; // Purple
    } else if (intensity < 0.5) {
      return `rgba(168, 85, 247, ${0.4 + intensity})`; // Purple-pink
    } else if (intensity < 0.75) {
      return `rgba(236, 72, 153, ${0.6 + intensity * 0.4})`; // Pink
    } else {
      return `rgba(239, 68, 68, ${0.8 + intensity * 0.2})`; // Red
    }
  };

  const getSize = (intensity: number): number => {
    return 20 + intensity * 40;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No heatmap data available
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-gray-400">Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-purple-500/30" />
          <span className="text-xs text-gray-500">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-pink-500/60" />
          <span className="text-xs text-gray-500">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-red-500/90" />
          <span className="text-xs text-gray-500">High</span>
        </div>
      </div>

      {/* Heatmap Container */}
      <div
        className="relative rounded-xl overflow-hidden bg-[var(--background)] border border-[var(--border)]"
        style={{ width, height }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, #fff 1px, transparent 1px),
              linear-gradient(to bottom, #fff 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Heatmap points */}
        <svg width={width} height={height} className="absolute inset-0">
          <defs>
            {normalizedData.map((point, index) => (
              <radialGradient key={`grad-${index}`} id={`heatGrad-${index}`}>
                <stop offset="0%" stopColor={getColor(point.intensity)} />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            ))}
          </defs>

          {normalizedData.map((point, index) => {
            const size = getSize(point.intensity);
            return (
              <circle
                key={index}
                cx={point.scaledX}
                cy={point.scaledY}
                r={size / 2}
                fill={`url(#heatGrad-${index})`}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {/* Center crosshair markers */}
        {normalizedData.map((point, index) => (
          <div
            key={`marker-${index}`}
            className="absolute w-2 h-2 rounded-full bg-white/50 transform -translate-x-1 -translate-y-1 pointer-events-none"
            style={{
              left: point.scaledX,
              top: point.scaledY,
            }}
          />
        ))}

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm shadow-xl pointer-events-none"
            style={{
              left: Math.min((hoveredPoint as any).scaledX + 15, width - 120),
              top: Math.min((hoveredPoint as any).scaledY + 15, height - 60),
            }}
          >
            <p className="text-gray-400">
              Position: <span className="text-white">{hoveredPoint.x}, {hoveredPoint.y}</span>
            </p>
            <p className="text-gray-400">
              Count: <span className="text-purple-400 font-bold">{hoveredPoint.count}</span>
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>{data.length} unique positions</span>
        <span>Max interactions: {maxCount}</span>
      </div>
    </div>
  );
}
