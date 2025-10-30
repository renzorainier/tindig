// app/pose/useEMA.js (NEW FILE)

"use client";

import React, { useState, useRef } from "react";

// Lower value = more smoothing (slower response)
const SMOOTHING_ALPHA = 0.2; // A value between 0.3 and 0.8 is usually good

/**
 * Custom Hook for managing the smoothed position of the key landmarks using Exponential Moving Average (EMA).
 * @returns [smoothedLandmarks, updateSmoothedLandmarks]
 */
export default function useEMA(initialLandmarks = null) {
  const [smoothedLandmarks, setSmoothedLandmarks] = useState(initialLandmarks);
  const previousLandmarksRef = useRef(initialLandmarks);

  const updateSmoothedLandmarks = (newLandmarks, alpha = SMOOTHING_ALPHA) => {
    if (!newLandmarks || newLandmarks.length === 0) {
      setSmoothedLandmarks(null);
      previousLandmarksRef.current = null;
      return;
    }

    const prev = previousLandmarksRef.current;
    let smoothed = [];

    for (let i = 0; i < newLandmarks.length; i++) {
      const current = newLandmarks[i];
      const previous = prev ? prev[i] : null;

      if (current && previous) {
        // Apply EMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
        const smoothedX = alpha * current.x + (1 - alpha) * previous.x;
        const smoothedY = alpha * current.y + (1 - alpha) * previous.y;
        const smoothedZ =
          alpha * (current.z || 0) + (1 - alpha) * (previous.z || 0);

        smoothed.push({ x: smoothedX, y: smoothedY, z: smoothedZ });
      } else if (current) {
        // If no previous data, just use the current raw data
        smoothed.push(current);
      } else {
        smoothed.push(null); // Keep array structure for missing landmarks
      }
    }

    if (smoothed.length > 0) {
      setSmoothedLandmarks(smoothed);
      previousLandmarksRef.current = smoothed; // Store the smoothed result for the next frame
    }

    return smoothed;
  };

  return [smoothedLandmarks, updateSmoothedLandmarks];
}
