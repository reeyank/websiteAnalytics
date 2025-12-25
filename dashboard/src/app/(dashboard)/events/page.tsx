"use client";

import { useEffect, useState, useRef } from "react";
import {
  Activity,
  Eye,
  MousePointer,
  ArrowDown,
  AlertCircle,
  LogOut,
  FormInput,
  Pause,
  Play,
} from "lucide-react";
import { getSessions, getSession, type SessionDetail } from "@/lib/api";
import { format } from "date-fns";
import { useAuth } from "@/components/AuthProvider";

interface LiveEvent {
  id: string;
  type: string;
  timestamp: string;
  sessionId: string;
  pageUrl: string;
  data: Record<string, unknown> | null;
}

const eventIcons: Record<string, typeof Activity> = {
  pageview: Eye,
  click: MousePointer,
  scroll: ArrowDown,
  error: AlertCircle,
  page_exit: LogOut,
  form_interaction: FormInput,
};

const eventColors: Record<string, string> = {
  pageview: "from-blue-500 to-blue-600",
  click: "from-purple-500 to-purple-600",
  scroll: "from-green-500 to-green-600",
  error: "from-red-500 to-red-600",
  page_exit: "from-orange-500 to-orange-600",
  form_interaction: "from-cyan-500 to-cyan-600",
  visibility: "from-yellow-500 to-yellow-600",
  identify: "from-pink-500 to-pink-600",
};

export default function EventsPage() {
  const { currentWebsite } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isPaused || !currentWebsite) return;

    const fetchLatestEvents = async () => {
      try {
        const sessionsData = await getSessions(currentWebsite.site_id, 5);
        const newEvents: LiveEvent[] = [];

        for (const session of sessionsData.sessions.slice(0, 3)) {
          try {
            const sessionDetail = await getSession(currentWebsite.site_id, session.session_id);
            sessionDetail.events.slice(-10).forEach((event, index) => {
              const eventId = `${session.session_id}-${event.timestamp}-${index}`;
              if (!seenEventsRef.current.has(eventId)) {
                seenEventsRef.current.add(eventId);
                newEvents.push({
                  id: eventId,
                  type: event.type,
                  timestamp: event.timestamp || new Date().toISOString(),
                  sessionId: session.session_id,
                  pageUrl: event.page_url,
                  data: event.data,
                });
              }
            });
          } catch (e) {
            // Ignore individual session errors
          }
        }

        if (newEvents.length > 0) {
          setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };

    fetchLatestEvents();
    const interval = setInterval(fetchLatestEvents, 5000);
    return () => clearInterval(interval);
  }, [isPaused, currentWebsite]);

  const filteredEvents = filter
    ? events.filter((e) => e.type === filter)
    : events;

  const eventTypes = [...new Set(events.map((e) => e.type))];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Live Events</h1>
          <p className="text-gray-400">
            Real-time stream of analytics events
          </p>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
            isPaused
              ? "bg-green-500/20 border-green-500/50 text-green-400"
              : "bg-[var(--card)] border-[var(--border)] text-white"
          }`}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            filter === null
              ? "bg-purple-500 text-white"
              : "bg-[var(--card)] text-gray-400 hover:text-white"
          }`}
        >
          All Events
        </button>
        {eventTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              filter === type
                ? "bg-purple-500 text-white"
                : "bg-[var(--card)] text-gray-400 hover:text-white"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"
          }`}
        />
        <span className="text-sm text-gray-400">
          {isPaused ? "Paused" : "Listening for events..."}
        </span>
        <span className="text-sm text-gray-500">
          ({filteredEvents.length} events)
        </span>
      </div>

      {/* Events Stream */}
      <div
        ref={containerRef}
        className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-600 animate-pulse" />
            <p className="text-gray-400">Waiting for events...</p>
            <p className="text-gray-500 text-sm mt-2">
              Make sure the tracking script is active on your website
            </p>
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const Icon = eventIcons[event.type] || Activity;
            const gradient = eventColors[event.type] || "from-gray-500 to-gray-600";

            return (
              <div
                key={event.id}
                className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-all animate-fade-in"
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {event.type}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {event.sessionId.slice(0, 8)}...
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(event.timestamp), "HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 truncate">
                      {event.pageUrl}
                    </p>
                    {event.data && Object.keys(event.data).length > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-[var(--background)] text-xs">
                        {event.type === "click" && event.data.element ? (
                          <span className="text-purple-400">
                            Clicked: {(event.data.element as Record<string, unknown>)?.tag as string || "element"}
                            {(event.data.element as Record<string, unknown>)?.id ? ` #${(event.data.element as Record<string, unknown>).id}` : ""}
                          </span>
                        ) : event.type === "scroll" ? (
                          <span className="text-green-400">
                            Scroll depth: {(event.data as Record<string, unknown>)?.depth as number || 0}%
                          </span>
                        ) : event.type === "error" ? (
                          <span className="text-red-400">
                            {(event.data as Record<string, unknown>)?.message as string || "Unknown error"}
                          </span>
                        ) : event.type === "page_exit" ? (
                          <span className="text-orange-400">
                            Time on page: {Math.round(((event.data as Record<string, unknown>)?.timeOnPage as number || 0) / 1000)}s
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
