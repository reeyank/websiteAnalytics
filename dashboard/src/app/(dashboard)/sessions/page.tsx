"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  Monitor,
  ChevronRight,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Timer,
} from "lucide-react";
import { getSessions, type Session } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/components/AuthProvider";

export default function SessionsPage() {
  const { currentWebsite } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("all");

  const fetchSessions = async () => {
    if (!currentWebsite) return;
    try {
      setLoading(true);
      const data = await getSessions(currentWebsite.site_id, 100);
      setSessions(data.sessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWebsite) {
      fetchSessions();
    }
  }, [currentWebsite]);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.session_id.toLowerCase().includes(search.toLowerCase()) ||
      s.visitor_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const endedSessions = sessions.filter((s) => s.status === "ended").length;

  const getBrowserFromUA = (ua: string | null): string => {
    if (!ua) return "Unknown";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Other";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sessions</h1>
          <p className="text-gray-400">
            View all tracked user sessions and their activity
          </p>
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search sessions by ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["all", "active", "ended"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === status
                ? status === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : status === "ended"
                  ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                  : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-[var(--card)] text-gray-400 border border-[var(--border)] hover:text-white"
            }`}
          >
            {status === "all" ? "All" : status === "active" ? "Active" : "Ended"}
            <span className="ml-2 text-xs opacity-70">
              {status === "all"
                ? sessions.length
                : status === "active"
                ? activeSessions
                : endedSessions}
            </span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <p className="text-sm text-gray-400">Total Sessions</p>
          <p className="text-2xl font-bold text-white">{sessions.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400">Active</p>
          <p className="text-2xl font-bold text-green-400">{activeSessions}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
          <p className="text-sm text-gray-400">Ended</p>
          <p className="text-2xl font-bold text-gray-300">{endedSessions}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <p className="text-sm text-gray-400">Showing</p>
          <p className="text-2xl font-bold text-white">{filteredSessions.length}</p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No sessions found</p>
          </div>
        ) : (
          filteredSessions.map((session, index) => (
            <Link
              key={session.session_id}
              href={`/sessions/${session.session_id}`}
              className="block p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-all group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    session.status === "active"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                      : "bg-gradient-to-br from-gray-500 to-gray-600"
                  }`}>
                    {session.status === "active" ? (
                      <UserCheck className="w-6 h-6 text-white" />
                    ) : (
                      <UserX className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-white">
                        {session.session_id.slice(0, 16)}...
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
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.last_seen
                          ? formatDistanceToNow(new Date(session.last_seen), {
                              addSuffix: true,
                            })
                          : "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {getBrowserFromUA(session.user_agent)}
                      </span>
                      {session.duration_ms && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {Math.round(session.duration_ms / 1000)}s
                        </span>
                      )}
                      {session.event_count > 0 && (
                        <span className="text-purple-400">
                          {session.event_count} events
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500">First seen</p>
                    <p className="text-sm text-gray-300">
                      {session.first_seen
                        ? format(new Date(session.first_seen), "MMM d, HH:mm")
                        : "Unknown"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
