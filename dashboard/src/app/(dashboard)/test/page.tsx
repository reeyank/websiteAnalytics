"use client";

import { useState } from "react";
import Script from "next/script";
import {
  MousePointer,
  Scroll,
  PointerIcon,
  FormInput,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function TestPage() {
  const [trackingStatus, setTrackingStatus] = useState<"loading" | "active" | "error">("loading");
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setEventLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev.slice(0, 19),
    ]);
  };

  const triggerCustomEvent = () => {
    if ((window as any).WebAnalytics) {
      (window as any).WebAnalytics.track("button_click", {
        buttonId: "test-button",
        label: "Test Custom Event",
      });
      addLog("Custom event triggered: button_click");
    }
  };

  const triggerIdentify = () => {
    if ((window as any).WebAnalytics) {
      (window as any).WebAnalytics.identify("test-user-123", {
        name: "Test User",
        email: "test@example.com",
        plan: "premium",
      });
      addLog("User identified: test-user-123");
    }
  };

  const triggerError = () => {
    addLog("Triggering test error...");
    throw new Error("Test error for analytics tracking");
  };

  const flushEvents = () => {
    if ((window as any).WebAnalytics) {
      (window as any).WebAnalytics.flush();
      addLog("Events flushed to server");
    }
  };

  return (
    <>
      <Script
        src="https://api.publickeyboard.com/script.js"
        data-site-id="a4aa5a02-8c49-4e14-a016-42103a643624"
        data-endpoint="https://api.publickeyboard.com/api/analytics"
        strategy="afterInteractive"
        onLoad={() => {
          setTrackingStatus("active");
          addLog("Tracking script loaded successfully");
        }}
        onError={() => {
          setTrackingStatus("error");
          addLog("Failed to load tracking script");
        }}
      />

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Tracking Test Page
          </h1>
          <p className="text-gray-400">
            Interact with this page to generate analytics events
          </p>
        </div>

        {/* Status */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            trackingStatus === "active"
              ? "bg-green-500/10 border-green-500/30"
              : trackingStatus === "error"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}
        >
          {trackingStatus === "active" ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : trackingStatus === "error" ? (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
          )}
          <div>
            <p className="font-medium text-white">
              {trackingStatus === "active"
                ? "Tracking Active"
                : trackingStatus === "error"
                ? "Tracking Error"
                : "Loading Tracker..."}
            </p>
            <p className="text-sm text-gray-400">
              {trackingStatus === "active"
                ? "All interactions are being recorded"
                : trackingStatus === "error"
                ? "Make sure script.js is in the public folder"
                : "Initializing tracking script..."}
            </p>
          </div>
        </div>

        {/* Interaction Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Click Test */}
          <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <MousePointer className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Click Events</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Click anywhere on this card or the buttons below
            </p>
            <div className="space-y-2">
              <button
                onClick={() => addLog("Primary button clicked")}
                className="w-full px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
              >
                Primary Button
              </button>
              <button
                onClick={() => addLog("Secondary button clicked")}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-white hover:border-purple-500 transition-colors"
              >
                Secondary Button
              </button>
            </div>
          </div>

          {/* Scroll Test */}
          <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Scroll className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Scroll Events</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Scroll this container to trigger scroll tracking
            </p>
            <div className="h-32 overflow-y-auto rounded-lg bg-[var(--background)] p-4 text-sm text-gray-500">
              <p className="mb-4">Scroll down to see more content...</p>
              <p className="mb-4">Keep scrolling...</p>
              <p className="mb-4">Almost there...</p>
              <p className="mb-4">A bit more...</p>
              <p className="mb-4">You made it! Scroll depth is being tracked.</p>
              <p className="text-green-400">End of scrollable area</p>
            </div>
          </div>

          {/* Mouse Movement */}
          <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <PointerIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Mouse Tracking</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Move your mouse around this area
            </p>
            <div
              className="h-32 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-center cursor-crosshair"
              onMouseMove={() => {}}
            >
              <p className="text-blue-400 text-sm">Mouse tracking zone</p>
            </div>
          </div>

          {/* Form Interaction */}
          <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <FormInput className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Form Events</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Interact with form fields
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Text input..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                onFocus={() => addLog("Text input focused")}
                onBlur={() => addLog("Text input blurred")}
              />
              <select
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-white focus:outline-none focus:border-cyan-500"
                onChange={() => addLog("Select value changed")}
              >
                <option>Select an option</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>

          {/* Custom Events */}
          <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Custom Events</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Trigger custom analytics events
            </p>
            <div className="space-y-2">
              <button
                onClick={triggerCustomEvent}
                className="w-full px-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 transition-colors"
              >
                Track Custom Event
              </button>
              <button
                onClick={triggerIdentify}
                className="w-full px-4 py-2 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 hover:bg-pink-500/30 transition-colors"
              >
                Identify User
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Actions</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Test error tracking and flush events
            </p>
            <div className="space-y-2">
              <button
                onClick={flushEvents}
                className="w-full px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                Flush Events Now
              </button>
              <button
                onClick={triggerError}
                className="w-full px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Trigger Test Error
              </button>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-lg font-semibold text-white mb-4">Event Log</h3>
          <div className="h-48 overflow-y-auto rounded-lg bg-[var(--background)] p-4 font-mono text-sm">
            {eventLog.length === 0 ? (
              <p className="text-gray-500">
                Interact with the page to see events here...
              </p>
            ) : (
              eventLog.map((log, index) => (
                <p key={index} className="text-gray-400 mb-1">
                  {log}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-3">
            How to Test
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Make sure the FastAPI backend is running on port 8000</li>
            <li>Interact with the elements above (click, scroll, type, etc.)</li>
            <li>Events are batched and sent every 5 seconds or when 10 events accumulate</li>
            <li>Click &quot;Flush Events Now&quot; to send immediately</li>
            <li>Check the Dashboard, Sessions, or Live Events pages to see your data</li>
          </ol>
        </div>
      </div>
    </>
  );
}
