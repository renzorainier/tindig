"use client";

import React from "react";
import {
  // FiX removed
  FiClock,
  FiActivity,
  FiList,
  FiCheckCircle,
  FiAlertCircle,
  // FiSave removed
  FiArrowLeftCircle,
} from "react-icons/fi";

// Helper to format milliseconds into "1m 20s"
function formatTime(ms) {
  if (ms < 1000) return "< 1s";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// REMOVED: The CloseButton component is no longer needed.

// FIXED: Removed onSave from the props
export default function SessionSummaryModal({ summary, onClose }) {
  if (!summary) return null;

  const relevantIssues = [
    { name: "Slouching", time: summary.issueBreakdown.slouchingTimeMs },
    { name: "Leaning Back", time: summary.issueBreakdown.leaningBackTimeMs },
    { name: "Head Offset", time: summary.issueBreakdown.headTiltTimeMs },
    { name: "Shoulders Uneven", time: summary.issueBreakdown.shoulderTimeMs },
  ]
    .filter((issue) => issue.time > 0)
    .sort((a, b) => b.time - a.time);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-summary-title"
    >
      <div
        // Main BG: dark:bg-gray-800
        className="relative w-full sm:max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 text-center relative">
          <h2
            id="session-summary-title"
            className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300"
          >
            <FiActivity className="text-blue-600 dark:text-blue-400" />
            Session Summary
          </h2>
          {/* REMOVED: CloseButton was here */}
        </div>

        {/* Body (No changes) */}
        <div className="p-4 sm:p-6 overflow-y-auto text-gray-800 dark:text-gray-200">
          {/* Total Time */}
          <div className="mb-4 rounded-lg bg-blue-50 dark:bg-gray-700 p-4 text-center text-base sm:text-lg text-blue-800 dark:text-blue-200 flex items-center justify-center gap-2">
            <FiClock className="text-blue-500 dark:text-blue-400" />
            Total Time:
            <span className="font-bold text-blue-700 dark:text-blue-300">
              {formatTime(summary.totalDurationMs)}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className="my-6 h-10 sm:h-12 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-gray-700 flex"
            role="progressbar"
            aria-valuenow={summary.goodPosturePercent}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Posture score: ${summary.goodPosturePercent.toFixed(
              0
            )}% good`}
          >
            <div
              className="h-full bg-blue-500 dark:bg-blue-400"
              style={{ width: `${summary.goodPosturePercent}%` }}
            ></div>
            <div
              className="h-full bg-blue-300 dark:bg-blue-600"
              style={{ width: `${summary.badPosturePercent}%` }}
            ></div>
          </div>

          {/* Posture Stats */}
          <div className="mb-6 flex justify-around">
            <div className="text-center">
              <FiCheckCircle className="inline mb-1 text-blue-700 dark:text-blue-300 w-6 h-6" />
              <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">
                {summary.goodPosturePercent.toFixed(0)}%
              </div>
              <div className="text-sm text-blue-500 dark:text-blue-400">
                Good Posture
              </div>
            </div>
            <div className="text-center">
              <FiAlertCircle className="inline mb-1 text-blue-400 dark:text-blue-500 w-6 h-6" />
              <div className="text-2xl sm:text-3xl font-bold text-blue-400 dark:text-blue-500">
                {summary.badPosturePercent.toFixed(0)}%
              </div>
              <div className="text-sm text-blue-500 dark:text-blue-400">
                Needs Improvement
              </div>
            </div>
          </div>

          {/* Issue Breakdown */}
          <div className="mb-6">
            <h3 className="mb-3 border-b border-gray-200 dark:border-gray-700 pb-2 font-bold flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <FiList /> Issue Breakdown
            </h3>
            {relevantIssues.length > 0 ? (
              <ul className="space-y-2">
                {relevantIssues.map((issue) => (
                  <li
                    key={issue.name}
                    className="flex items-center justify-between text-blue-700 dark:text-blue-300"
                  >
                    <span>{issue.name}</span>
                    <span className="font-medium">
                      {formatTime(issue.time)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blue-400 dark:text-gray-400 italic">
                No specific issues detected. Great job!
              </p>
            )}
          </div>

          {/* Session Log */}
          <div className="mb-6">
            <h3 className="mb-3 border-b border-gray-200 dark:border-gray-700 pb-2 font-bold flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <FiList /> Session Log
            </h3>
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-gray-700 p-3">
              {summary.timeline.length > 0 ? (
                summary.timeline.map((event, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    {event.type === "Good" ? (
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        <FiCheckCircle className="inline mr-1" />
                        Good Posture
                      </span>
                    ) : (
                      <span className="font-medium text-blue-400 dark:text-orange-400">
                        <FiAlertCircle className="inline mr-1" />
                        Needs Improvement{" "}
                        <span className="text-xs text-blue-300 dark:text-orange-500">
                          ({event.reasons.join(", ")})
                        </span>
                      </span>
                    )}
                    <span className="text-blue-500 dark:text-blue-400">
                      {formatTime(event.durationMs)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-blue-400 dark:text-gray-400 italic">
                  No session log entries.
                </li>
              )}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="mb-3 border-b border-gray-200 dark:border-gray-700 pb-2 font-bold flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <FiActivity /> Analysis & Recommendations
            </h3>
            <div className="rounded-lg bg-blue-50 dark:bg-gray-700 p-4 text-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-medium">
                <FiCheckCircle /> Summary:
              </div>
              <p className="text-blue-700 dark:text-blue-300">
                {summary.goodPosturePercent >= 80
                  ? "Excellent posture maintenance! Keep up the good work."
                  : summary.goodPosturePercent >= 50
                  ? "Decent posture overall, but there's room for improvement."
                  : "Your posture needs attention. Consider the following recommendations:"}
              </p>

              <div className="space-y-2 text-blue-700 dark:text-blue-300">
                {summary.issueBreakdown.slouchingTimeMs > 0 && (
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <p>
                      <strong>Slouching detected:</strong> Raise your screen to
                      eye level and keep your back straight.
                    </p>
                  </div>
                )}
                {summary.issueBreakdown.leaningBackTimeMs > 0 && (
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <p>
                      <strong>Leaning back:</strong> Adjust your chair closer to
                      the desk for better alignment.
                    </p>
                  </div>
                )}
                {summary.issueBreakdown.headTiltTimeMs > 0 && (
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <p>
                      <strong>Head position:</strong> Keep your head aligned
                      with your shoulders. Adjust monitor height if needed.
                    </p>
                  </div>
                )}
                {summary.issueBreakdown.shoulderTimeMs > 0 && (
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <p>
                      <strong>Uneven shoulders:</strong> Try light shoulder
                      stretches every 30 minutes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 mt-auto bg-white dark:bg-gray-900">
          {/* FIXED: Simplified flex container */}
          <div className="flex">
            {/* FIXED: This button now has the primary styles */}
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 transition"
            >
              <FiArrowLeftCircle className="w-5 h-5" />
              Close
            </button>
            {/* REMOVED: Save Session button was here */}
          </div>
        </div>
      </div>
    </div>
  );
}
