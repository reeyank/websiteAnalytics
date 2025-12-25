"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Globe,
  Monitor,
  MousePointer,
  Eye,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getSession, getHeatmap, type SessionDetail, type HeatmapData } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import Heatmap from "@/components/Heatmap";
import { useAuth } from "@/components/AuthProvider";

const eventIcons: Record<string, typeof Activity> = {
  pageview: Eye,
  click: MousePointer,
  scroll: ChevronDown,
  error: AlertCircle,
  visibility: Eye,
  form_interaction: Activity,
  page_exit: ArrowLeft,
  identify: Activity,
};

const eventColors: Record<string, string> = {
  pageview: "bg-blue-500",
  click: "bg-purple-500",
  scroll: "bg-green-500",
  error: "bg-red-500",
  visibility: "bg-yellow-500",
  form_interaction: "bg-cyan-500",
  page_exit: "bg-orange-500",
  identify: "bg-pink-500",
};

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { currentWebsite } = useAuth();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!currentWebsite) return;
      try {
        setLoading(true);
        const [sessionData, heatmapData] = await Promise.all([
          getSession(currentWebsite.site_id, sessionId),
          getHeatmap(currentWebsite.site_id, sessionId),
        ]);
        setSession(sessionData);
        setHeatmap(heatmapData);
      } catch (err) {
        console.error("Failed to fetch session:", err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId && currentWebsite) {
      fetchData();
    }
  }, [sessionId, currentWebsite]);

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-white mb-2">Session Not Found</h2>
        <Link href="/sessions" className="text-purple-400 hover:underline">
          Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/sessions"
          className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Session Details</h1>
          <p className="text-gray-400 font-mono text-sm">{sessionId}</p>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">First Seen</span>
          </div>
          <p className="text-white font-medium">
            {session.first_seen
              ? format(new Date(session.first_seen), "MMM d, yyyy HH:mm")
              : "Unknown"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm">Language</span>
          </div>
          <p className="text-white font-medium">{session.language || "Unknown"}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Monitor className="w-4 h-4" />
            <span className="text-sm">Screen</span>
          </div>
          <p className="text-white font-medium">
            {session.screen_resolution || "Unknown"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Total Events</span>
          </div>
          <p className="text-white font-medium">{session.total_events}</p>
        </div>
      </div>

      {/* Event Types */}
      <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
        <h2 className="text-xl font-semibold text-white mb-4">Event Breakdown</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(session.events_by_type).map(([type, count]) => (
            <div
              key={type}
              className={`px-4 py-2 rounded-full flex items-center gap-2 ${
                eventColors[type] || "bg-gray-500"
              } bg-opacity-20 border border-opacity-30 ${
                eventColors[type]?.replace("bg-", "border-") || "border-gray-500"
              }`}
            >
              <span className="text-white text-sm">{type}</span>
              <span className="text-white font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      {heatmap && heatmap.heatmap.length > 0 && (
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-purple-400" />
            Mouse Heatmap
            <span className="text-sm text-gray-500 font-normal">
              ({heatmap.total_points} points)
            </span>
          </h2>
          <Heatmap data={heatmap.heatmap} />
        </div>
      )}

      {/* Pages Visited */}
      <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Pages Visited
        </h2>
        <div className="space-y-2">
          {session.pages_visited.map((url, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] font-mono text-sm text-gray-300 truncate"
            >
              {url}
            </div>
          ))}
        </div>
      </div>

      {/* Event Timeline */}
      <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Event Timeline
        </h2>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-[var(--border)]" />

          <div className="space-y-4">
            {session.events.map((event, index) => {
              const Icon = eventIcons[event.type] || Activity;
              const isExpanded = expandedEvents.has(index);
              const color = eventColors[event.type] || "bg-gray-500";

              return (
                <div key={index} className="relative pl-16">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-4 w-5 h-5 rounded-full ${color} flex items-center justify-center z-10`}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </div>

                  <div
                    className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                    onClick={() => toggleEvent(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${color} bg-opacity-20 text-white`}
                        >
                          {event.type}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {event.timestamp
                            ? format(new Date(event.timestamp), "HH:mm:ss")
                            : ""}
                        </span>
                      </div>
                      {event.data && Object.keys(event.data).length > 0 && (
                        isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )
                      )}
                    </div>

                    <p className="text-gray-400 text-sm mt-2 truncate">
                      {event.page_url}
                    </p>

                    {isExpanded && event.data && (
                      <pre className="mt-4 p-3 rounded-lg bg-[var(--card)] text-xs text-gray-300 overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
