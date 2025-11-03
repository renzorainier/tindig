"use client";

import React from "react";
import {
  FiX,
  FiClock,
  FiActivity,
  FiList,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
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

// Reusable close button
function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label="Close modal"
      className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
    >
      <FiX className="w-6 h-6" />
    </button>
  );
}

export default function SessionSummaryModal({ summary, onClose, onSave }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-summary-title"
    >
      <div
        className="relative w-full sm:max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b text-center relative">
          <h2
            id="session-summary-title"
            className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2 text-blue-700"
          >
            <FiActivity className="text-blue-600" />
            Session Summary
          </h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {/* Total Time */}
          <div className="mb-4 rounded-lg bg-blue-50 p-4 text-center text-base sm:text-lg text-blue-800 flex items-center justify-center gap-2">
            <FiClock className="text-blue-500" />
            Total Time:
            <span className="font-bold text-blue-700">
              {formatTime(summary.totalDurationMs)}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className="my-6 h-10 sm:h-12 w-full overflow-hidden rounded-full bg-blue-200 flex"
            role="progressbar"
            aria-valuenow={summary.goodPosturePercent}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Posture score: ${summary.goodPosturePercent.toFixed(0)}% good`}
          >
            <div
              className="h-full bg-blue-500"
              style={{ width: `${summary.goodPosturePercent}%` }}
            ></div>
            <div
              className="h-full bg-blue-300"
              style={{ width: `${summary.badPosturePercent}%` }}
            ></div>
          </div>

          {/* Posture Stats */}
          <div className="mb-6 flex justify-around">
            <div className="text-center">
              <FiCheckCircle className="inline mb-1 text-blue-700 w-6 h-6" />
              <div className="text-2xl sm:text-3xl font-bold text-blue-700">
                {summary.goodPosturePercent.toFixed(0)}%
              </div>
              <div className="text-sm text-blue-500">Good Posture</div>
            </div>
            <div className="text-center">
              <FiAlertCircle className="inline mb-1 text-blue-400 w-6 h-6" />
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                {summary.badPosturePercent.toFixed(0)}%
              </div>
              <div className="text-sm text-blue-500">Needs Improvement</div>
            </div>
          </div>

          {/* Issue Breakdown */}
          <div className="mb-6">
            <h3 className="mb-3 border-b pb-2 font-bold flex items-center gap-2 text-blue-800">
              <FiList /> Issue Breakdown
            </h3>
            {relevantIssues.length > 0 ? (
              <ul className="space-y-2">
                {relevantIssues.map((issue) => (
                  <li
                    key={issue.name}
                    className="flex items-center justify-between text-blue-700"
                  >
                    <span>{issue.name}</span>
                    <span className="font-medium">{formatTime(issue.time)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blue-400 italic">
                No specific issues detected. Great job!
              </p>
            )}
          </div>

          {/* Session Log */}
          <div className="mb-6">
            <h3 className="mb-3 border-b pb-2 font-bold flex items-center gap-2 text-blue-800">
              <FiList /> Session Log
            </h3>
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-blue-200 bg-blue-50 p-3">
              {summary.timeline.length > 0 ? (
                summary.timeline.map((event, index) => (
                  <li key={index} className="flex items-center justify-between text-sm">
                    {event.type === "Good" ? (
                      <span className="font-medium text-blue-700">
                        <FiCheckCircle className="inline mr-1" />
                        Good Posture
                      </span>
                    ) : (
                      <span className="font-medium text-blue-400">
                        <FiAlertCircle className="inline mr-1" />
                        Needs Improvement{" "}
                        <span className="text-xs text-blue-300">
                          ({event.reasons.join(", ")})
                        </span>
                      </span>
                    )}
                    <span className="text-blue-500">
                      {formatTime(event.durationMs)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-blue-400 italic">
                  No session log entries.
                </li>
              )}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="mb-3 border-b pb-2 font-bold flex items-center gap-2 text-blue-800">
              <FiActivity /> Analysis & Recommendations
            </h3>
            <div className="rounded-lg bg-blue-50 p-4 text-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-medium">
                <FiCheckCircle /> Summary:
              </div>
              <p className="text-blue-700">
                {summary.goodPosturePercent >= 80
                  ? "Excellent posture maintenance! Keep up the good work."
                  : summary.goodPosturePercent >= 50
                  ? "Decent posture overall, but there's room for improvement."
                  : "Your posture needs attention. Consider the following recommendations:"}
              </p>

              <div className="space-y-2 text-blue-700">
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
        <div className="p-4 sm:p-6 border-t mt-auto bg-blue-50">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-6 py-3 font-semibold text-blue-700 shadow-sm hover:bg-blue-100 transition"
            >
              <FiArrowLeftCircle className="w-5 h-5" />
              Close
            </button>
            <button
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-700 transition"
            >
              <FiSave className="w-5 h-5" />
              Save Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
