"use client";

import { useEffect, useState } from "react";
import {
  MousePointer,
  RefreshCw,
  ChevronDown,
  Maximize2,
} from "lucide-react";
import { getSessions, getHeatmap, type Session, type HeatmapData } from "@/lib/api";
import Heatmap from "@/components/Heatmap";
import { useAuth } from "@/components/AuthProvider";

export default function HeatmapsPage() {
  const { currentWebsite } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!currentWebsite) return;
      try {
        const data = await getSessions(currentWebsite.site_id, 50);
        setSessions(data.sessions);
        if (data.sessions.length > 0) {
          setSelectedSession(data.sessions[0].session_id);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentWebsite) {
      fetchSessions();
    }
  }, [currentWebsite]);

  useEffect(() => {
    const fetchHeatmap = async () => {
      if (!selectedSession || !currentWebsite) return;

      try {
        setLoadingHeatmap(true);
        const data = await getHeatmap(currentWebsite.site_id, selectedSession);
        setHeatmapData(data);
      } catch (err) {
        console.error("Failed to fetch heatmap:", err);
        setHeatmapData(null);
      } finally {
        setLoadingHeatmap(false);
      }
    };

    fetchHeatmap();
  }, [selectedSession, currentWebsite]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Heatmaps</h1>
          <p className="text-gray-400">
            Visualize where users interact on your pages
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Session Selector */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors min-w-[300px]"
          >
            <MousePointer className="w-5 h-5 text-purple-400" />
            <span className="text-white flex-1 text-left truncate">
              {selectedSession
                ? `Session: ${selectedSession.slice(0, 16)}...`
                : "Select a session"}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-20 mt-2 w-full rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl max-h-64 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => {
                    setSelectedSession(session.session_id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-[var(--card-hover)] transition-colors ${
                    selectedSession === session.session_id
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-300"
                  }`}
                >
                  <p className="font-mono text-sm truncate">
                    {session.session_id}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {session.last_seen
                      ? new Date(session.last_seen).toLocaleString()
                      : "Unknown"}
                  </p>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="px-4 py-3 text-gray-500">No sessions available</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => selectedSession && setSelectedSession(selectedSession)}
          className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loadingHeatmap ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Heatmap Display */}
      <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : loadingHeatmap ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
              <p className="text-gray-400">Loading heatmap data...</p>
            </div>
          </div>
        ) : !selectedSession ? (
          <div className="text-center py-20">
            <MousePointer className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Select a session to view its heatmap</p>
          </div>
        ) : heatmapData && heatmapData.heatmap.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Mouse Activity Heatmap
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{heatmapData.total_points} tracked positions</span>
              </div>
            </div>
            <Heatmap data={heatmapData.heatmap} width={900} height={600} />
          </div>
        ) : (
          <div className="text-center py-20">
            <MousePointer className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-2">No heatmap data for this session</p>
            <p className="text-gray-500 text-sm">
              Mouse movements are sampled to reduce data volume
            </p>
          </div>
        )}
      </div>

      {/* Heatmap Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-2">How it works</h3>
          <p className="text-gray-400 text-sm">
            Mouse positions are sampled every 5th movement to reduce data while
            maintaining accuracy. Points are aggregated into a 10px grid for
            visualization.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-2">Color Scale</h3>
          <p className="text-gray-400 text-sm">
            Purple indicates low activity, transitioning through pink to red for
            high-activity hotspots where users frequently interact.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <h3 className="text-lg font-semibold text-white mb-2">Use Cases</h3>
          <p className="text-gray-400 text-sm">
            Identify UI hotspots, optimize button placement, and understand user
            attention patterns to improve your website&apos;s UX.
          </p>
        </div>
      </div>
    </div>
  );
}
