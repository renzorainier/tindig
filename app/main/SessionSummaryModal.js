"use client";

import React from "react";

// Helper to format milliseconds into a "1m 20s" string
function formatTime(ms) {
  if (ms < 1000) return "< 1s"; // Handle very short durations
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function SessionSummaryModal({ summary, onClose, onSave }) {
  if (!summary) return null;

  const issueBreakdown = [
    { name: "Slouching", time: summary.issueBreakdown.slouchingTimeMs },
    { name: "Leaning Back", time: summary.issueBreakdown.leaningBackTimeMs },
    { name: "Head Offset", time: summary.issueBreakdown.headTiltTimeMs },
    { name: "Shoulders Uneven", time: summary.issueBreakdown.shoulderTimeMs },
  ].sort((a, b) => b.time - a.time);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-indigo-600">
          Session Summary
        </h2>

        <div className="mb-4 text-center text-lg text-gray-700">
          Total Time:{" "}
          <span className="font-bold">{formatTime(summary.totalDurationMs)}</span>
        </div>

        <div className="my-6 h-20 w-full overflow-hidden rounded-full bg-red-200 flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${summary.goodPosturePercent}%` }}
            title={`Good Posture: ${summary.goodPosturePercent.toFixed(0)}%`}
          ></div>
          <div
            className="h-full bg-red-500"
            style={{ width: `${summary.badPosturePercent}%` }}
            title={`Bad Posture: ${summary.badPosturePercent.toFixed(0)}%`}
          ></div>
        </div>

        <div className="mb-6 flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.goodPosturePercent.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500">Good Posture</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {summary.badPosturePercent.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500">Bad Posture</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 border-b pb-2 font-bold text-gray-800">
            Issue Breakdown
          </h3>
          <ul className="space-y-2">
            {issueBreakdown.map((issue) =>
              // Only show issues that actually happened
              issue.time > 0 ? (
                <li
                  key={issue.name}
                  className="flex items-center justify-between text-gray-700"
                >
                  <span>{issue.name}</span>
                  <span className="font-medium">{formatTime(issue.time)}</span>
                </li>
              ) : null
            )}
          </ul>
        </div>

        {/* --- NEW: SESSION TIMELINE --- */}
        <div className="mb-6">
          <h3 className="mb-3 border-b pb-2 font-bold text-gray-800">
            Session Log
          </h3>
          <ul className="h-40 max-h-40 space-y-2 overflow-y-auto rounded-md border bg-gray-50 p-3">
            {summary.timeline.map((event, index) => (
              <li
                key={index}
                className="flex items-center justify-between text-sm"
              >
                {event.type === "Good" ? (
                  <span className="font-medium text-green-600">
                    Good Posture
                  </span>
                ) : (
                  <span className="font-medium text-red-600">
                    Bad Posture{" "}
                    <span className="text-xs text-red-400">
                      ({event.reasons.join(", ")})
                    </span>
                  </span>
                )}
                <span className="text-gray-500">
                  {formatTime(event.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* --- END NEW --- */}

        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-md hover:bg-indigo-700"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}
