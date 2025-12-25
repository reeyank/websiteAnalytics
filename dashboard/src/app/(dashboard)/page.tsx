"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Users,
  MousePointer,
  Eye,
  TrendingUp,
  Clock,
  RefreshCw,
  UserCheck,
  UserX,
  Timer,
  Plus,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import EventChart from "@/components/EventChart";
import { getStats, getSessions, type Stats, type Session } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/components/AuthProvider";

export default function Dashboard() {
  const { currentWebsite, websites } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentWebsite) return;

    try {
      setLoading(true);
      const [statsData, sessionsData] = await Promise.all([
        getStats(currentWebsite.site_id),
        getSessions(currentWebsite.site_id, 10),
      ]);
      setStats(statsData);
      setSessions(sessionsData.sessions);
      setError(null);
    } catch (err) {
      setError("Failed to connect to API. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWebsite) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [currentWebsite]);

  // No websites - show add website prompt
  if (!loading && websites.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Plus className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Add Your First Website</h2>
          <p className="text-gray-400 mb-6">
            Start tracking analytics by adding your first website.
          </p>
          <button
            onClick={() => router.push("/websites")}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            Add Website
          </button>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 rounded-2xl bg-red-500/10 border border-red-500/30 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            {currentWebsite?.name || "Analytics Dashboard"}
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            {currentWebsite?.domain || "Real-time insights into your website traffic"}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Total Events"
          value={stats?.total_events || 0}
          subtitle="All tracked events"
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Active Sessions"
          value={stats?.active_sessions || 0}
          subtitle={`${stats?.ended_sessions || 0} ended`}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Ended Sessions"
          value={stats?.ended_sessions || 0}
          subtitle={`${stats?.total_sessions || 0} total`}
          icon={UserX}
          color="orange"
        />
        <StatCard
          title="Avg Duration"
          value={stats?.avg_session_duration_ms
            ? `${Math.round(stats.avg_session_duration_ms / 1000)}s`
            : "N/A"}
          subtitle="Average session time"
          icon={Timer}
          color="blue"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Events by Type */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Events by Type
          </h2>
          <EventChart data={stats?.events_by_type || {}} />
        </div>

        {/* Recent Sessions */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Sessions
          </h2>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sessions yet</p>
            ) : (
              sessions.map((session) => (
                <a
                  key={session.session_id}
                  href={`/sessions/${session.session_id}`}
                  className="block p-3 sm:p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm text-white font-mono truncate max-w-[100px] sm:max-w-[150px]">
                          {session.session_id.slice(0, 8)}...
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            session.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.last_seen
                          ? formatDistanceToNow(new Date(session.last_seen), {
                              addSuffix: true,
                            })
                          : "Unknown"}
                        {session.duration_ms && (
                          <span className="ml-2">
                            • {Math.round(session.duration_ms / 1000)}s
                          </span>
                        )}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${
                      session.status === "active"
                        ? "bg-green-500/20 group-hover:bg-green-500/30"
                        : "bg-gray-500/20 group-hover:bg-gray-500/30"
                    }`}>
                      {session.status === "active" ? (
                        <UserCheck className="w-4 h-4 text-green-400" />
                      ) : (
                        <UserX className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && Object.keys(stats.events_by_type).length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Event Breakdown
          </h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {Object.entries(stats.events_by_type).map(([type, count]) => (
              <div
                key={type}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center gap-2"
              >
                <span className="text-gray-400 text-xs sm:text-sm">{type}</span>
                <span className="text-white font-bold text-sm sm:text-base">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
