"use client";

import React, { useRef, useEffect } from "react";

// --- Constants ---
const CALIBRATION_FRAMES = 30;

// --- Helper Functions (Copied from PoseCamera) ---
function mean(values) {
  const n = values.length;
  if (n === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / n;
}

function stddev(values, mu = null) {
  if (values.length === 0) return 0;
  const m = mu === null ? mean(values) : mu;
  const variance =
    values.reduce((s, v) => s + (v - m) * (v - m), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * This component manages the state and logic for the calibration process.
 * It renders the "Calibrate" / "Cancel" buttons and performs the
 * calculations when it has enough data.
 */
export default function CalibrationManager({
  isCalibrating,
  isLoading,
  hasBaseline,
  rawMetrics,
  onStart,
  onCancel,
  onComplete,
  onStatusUpdate, // Function to update parent's status message
  isPaused, // --- NEW: Receive pause state ---
}) {
  const calibrationSamplesRef = useRef([]);

  // This Effect runs when `rawMetrics` changes (i.e., on every frame
  // during calibration)
  useEffect(() => {
    // Only collect if we are in calibration mode and have valid metrics
    if (!isCalibrating || !rawMetrics) {
      return;
    }

    // 1. Collect the sample
    calibrationSamplesRef.current.push(rawMetrics);
    const collected = calibrationSamplesRef.current.length;

    // 2. Update status
    onStatusUpdate(`Calibrating... (${collected}/${CALIBRATION_FRAMES})`);

    // 3. Check if calibration is complete
    if (collected >= CALIBRATION_FRAMES) {
      // compute baseline
      const shoulderVals = calibrationSamplesRef.current.map(
        (s) => s.shoulderDiffPx
      );
      const headOffsetVals = calibrationSamplesRef.current.map(
        (s) => s.headOffsetX
      );
      const eyeDistVals = calibrationSamplesRef.current.map(
        (s) => s.interEyeDistancePx
      );

      const meanShoulder = mean(shoulderVals);
      const stdShoulder = stddev(shoulderVals, meanShoulder);
      const meanHeadOffset = mean(headOffsetVals);
      const stdHeadOffset = stddev(headOffsetVals, meanHeadOffset);
      const meanEyeDist = mean(eyeDistVals);
      const stdEyeDist = stddev(eyeDistVals, meanEyeDist);

      const newBaseline = {
        meanShoulder,
        stdShoulder,
        meanHeadOffset,
        stdHeadOffset,
        meanEyeDist,
        stdEyeDist,
        createdAt: Date.now(),
        frames: CALIBRATION_FRAMES,
      };

      // 4. Send the completed baseline to the parent
      onComplete(newBaseline);

      // 5. Reset internal samples
      calibrationSamplesRef.current = [];
    }
  }, [isCalibrating, rawMetrics, onComplete, onStatusUpdate]);

  // Handle the "Start" button click
  const handleStart = () => {
    // Reset samples in case of a re-calibration
    calibrationSamplesRef.current = [];
    // Call the parent's start function
    onStart();
  };

  // Render the correct button based on calibration state
  if (isCalibrating) {
    return (
      <button
        onClick={onCancel} // Just call the parent's cancel function
        // --- MODIFIED: Sleeker button styles ---
        className="flex-1 min-w-[140px] px-5 py-2 bg-red-500 text-white hover:bg-red-600 active:bg-red-700 rounded-lg font-semibold transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center text-base"
        disabled={isLoading}
      >
        Cancel Calibration
      </button>
    );
  }

  return (
    <button
      onClick={handleStart}
      // --- MODIFIED: Sleeker button styles ---
      className="flex-1 min-w-[140px] px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 rounded-lg font-semibold transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center text-base"
      title="Resets existing baseline and starts a new calibration. Stand in your natural good posture and click Calibrate."
      // --- MODIFIED: Add isPaused to disabled check ---
      disabled={isLoading || isCalibrating || isPaused}
    >
      {hasBaseline ? "Recalibrate" : "Calibrate Posture"}
    </button>
  );
}
