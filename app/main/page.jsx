"use client";

import React, { useEffect, useRef, useState } from "react";
// Assuming these dependencies are available in the execution environment
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const CALIBRATION_FRAMES = 30;
// Lower value = more smoothing (slower response)
const SMOOTHING_ALPHA = 0.5; // A value between 0.3 and 0.8 is usually good for a responsive but stable feel.


/* -------------------- NEW: Temporal Smoothing Utility -------------------- */

/**
 * Custom Hook for managing the smoothed position of the key landmarks using Exponential Moving Average (EMA).
 * @returns [smoothedLandmarks, updateSmoothedLandmarks]
 */
function useEMA(initialLandmarks = null) {
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
                // Keep Z as the raw one, or smooth it too if needed
                const smoothedZ = alpha * (current.z || 0) + (1 - alpha) * (previous.z || 0);

                smoothed.push({ x: smoothedX, y: smoothedY, z: smoothedZ });
            } else if (current) {
                // If no previous data, just use the current raw data
                smoothed.push(current);
            } else {
                smoothed.push(null); // Keep array structure for missing landmarks
            }
        }

        // Only update state if there are actual landmarks to show
        if (smoothed.length > 0) {
            setSmoothedLandmarks(smoothed);
            previousLandmarksRef.current = smoothed; // Store the smoothed result for the next frame
        }

        return smoothed;
    };

    return [smoothedLandmarks, updateSmoothedLandmarks];
}

/* ---------- Posture metrics (returns raw numeric metrics) ---------- */
// This function will now accept the SMOOTHED landmarks
function analyzePostureMetrics(landmarks, canvasWidth, canvasHeight) {
    if (!landmarks) return null;

    const HEAD = 0; // nose
    const L_SHOULDER = 11;
    const R_SHOULDER = 12;
    // Landmarker indices for the eyes/face for distance-based depth
    const L_EYE = 2; // Left eye corner
    const R_EYE = 5; // Right eye corner

    const head = landmarks[HEAD];
    const leftShoulder = landmarks[L_SHOULDER];
    const rightShoulder = landmarks[R_SHOULDER];
    const leftEye = landmarks[L_EYE];
    const rightEye = landmarks[R_EYE];

    if (!head || !leftShoulder || !rightShoulder || !leftEye || !rightEye) return null;

    // 1. Shoulder Tilt (Lateral Lean)
    const shoulderDiffPx = Math.abs(leftShoulder.y - rightShoulder.y) * canvasHeight;

    // 2. Head Lateral Offset
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const headOffsetX = Math.abs(head.x - shoulderMidX) * canvasWidth;

    // 3. Inter-Eye Distance (in pixels) for Depth/Slouch detection
    // Calculate the pixel distance between the two eyes (or chosen face landmarks)
    const eyeDiffX = (leftEye.x - rightEye.x) * canvasWidth;
    const eyeDiffY = (leftEye.y - rightEye.y) * canvasHeight;
    const interEyeDistancePx = Math.sqrt(eyeDiffX * eyeDiffX + eyeDiffY * eyeDiffY);

    return {
        shoulderDiffPx,
        headOffsetX,
        interEyeDistancePx, // Metric for Slouching/Leaning
    };
}

/* ---------- helpers to compute mean/std ---------- */
function mean(values) {
    const n = values.length;
    if (n === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / n;
}
function stddev(values, mu = null) {
    if (values.length === 0) return 0;
    const m = mu === null ? mean(values) : mu;
    const variance = values.reduce((s, v) => s + (v - m) * (v - m), 0) / values.length;
    return Math.sqrt(variance);
}

// ------------------------------------------------------------------------------------------------

/* ---------- Main Component ---------- */
export default function PoseCamera() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Use the new EMA hook for smoothed landmark data
    const [smoothedLandmarks, updateSmoothedLandmarks] = useEMA(null);

    const [statusMessage, setStatusMessage] = useState("Initializing...");
    const [isLoading, setIsLoading] = useState(true);
    // Use an array to hold multiple posture issue reasons or instructions
    const [triggeredReasons, setTriggeredReasons] = useState([]);

    const [realtimeMetrics, setRealtimeMetrics] = useState(null);

    // baseline persistent (mean + std)
    const [baseline, setBaseline] = useState(() => {
        try {
            const raw = localStorage.getItem("postureBaseline");
            if (raw) {
                const stored = JSON.parse(raw);
                return {
                    meanShoulder: stored.meanShoulder,
                    stdShoulder: stored.stdShoulder,
                    meanHeadOffset: stored.meanHeadOffset,
                    stdHeadOffset: stored.stdHeadOffset,
                    // Include new eye distance metrics
                    meanEyeDist: stored.meanEyeDist || 0,
                    stdEyeDist: stored.stdEyeDist || 0,
                    createdAt: stored.createdAt,
                    frames: stored.frames,
                };
            }
            return null;
        } catch {
            return null;
        }
    });

    const [calibrating, setCalibrating] = useState(false);
    const calibratingRef = useRef(false);
    // Calibration samples should use the raw metrics for accurate baseline noise calculation
    const calibrationSamplesRef = useRef([]);

    const poseLandmarkerRef = useRef(null);
    const runningRef = useRef(false);

    /* ---- Draw skeleton (Head + Shoulders + Eyes only) ---- */
    // This function will now use the SMOOTHED landmarks
    const drawSkeleton = (ctx, landmarks, width, height) => {
        if (!landmarks || landmarks.length === 0) return;
        const HEAD = 0;
        const L_SHOULDER = 11;
        const R_SHOULDER = 12;
        const L_EYE = 2;
        const R_EYE = 5;

        const colors = {
            [HEAD]: "#FF4500", // Orange-Red for Nose
            [L_SHOULDER]: "#44ff1eff", // Neon Green for Shoulders
            [R_SHOULDER]: "#44ff1eff",
            [L_EYE]: "#00BFFF", // Deep Sky Blue for Eyes
            [R_EYE]: "#00BFFF",
        };

        [HEAD, L_SHOULDER, R_SHOULDER, L_EYE, R_EYE].forEach((i) => {
            const lm = landmarks[i];
            if (!lm) return;
            const x = lm.x * width;
            const y = lm.y * height;
            ctx.beginPath();
            ctx.arc(x, y, i === HEAD ? 6 : 4, 0, 2 * Math.PI); // Smaller dot for eyes
            ctx.fillStyle = colors[i];
            ctx.fill();
        });

        const left = landmarks[L_SHOULDER];
        const right = landmarks[R_SHOULDER];
        if (left && right) {
            ctx.beginPath();
            ctx.moveTo(left.x * width, left.y * height);
            ctx.lineTo(right.x * width, right.y * height);
            ctx.strokeStyle = "#FFD700"; // Gold for connecting line
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    };

    /* ---- Prediction loop (Modified) ---- */
    const predict = async () => {
        if (!runningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!canvas || !video || video.readyState !== 4) {
            requestAnimationFrame(predict);
            return;
        }

        const ctx = canvas.getContext("2d");
        const poseLandmarker = poseLandmarkerRef.current;

        // Draw the current video frame on the canvas background
        ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        let rawLandmarks = null;
        let finalLandmarks = null; // Will hold raw (calibration) or smoothed (live) landmarks

        // 1. Pose detection
        if (poseLandmarker) {
            try {
                const poseResults = poseLandmarker.detectForVideo(video, performance.now());
                if (poseResults.landmarks && poseResults.landmarks.length > 0) {
                    rawLandmarks = poseResults.landmarks[0];

                    // 2. Apply smoothing or keep raw, depending on calibration status
                    if (calibratingRef.current) {
                        // Use RAW for calibration to accurately capture noise/variation
                        finalLandmarks = rawLandmarks;
                    } else {
                        // Use SMOOTHED for live tracking to reduce jitter
                        finalLandmarks = updateSmoothedLandmarks(rawLandmarks);
                    }

                    // 3. Draw the skeleton using the final landmarks (smoothed or raw)
                    drawSkeleton(ctx, finalLandmarks, VIDEO_WIDTH, VIDEO_HEIGHT);
                    if (!calibratingRef.current) {
                        setStatusMessage("Pose Detected");
                    }
                } else {
                    // Update smoothing with null to reset
                    updateSmoothedLandmarks(null);
                    if (!calibratingRef.current) {
                        setStatusMessage("No Pose Detected");
                        // Set a single reason when no pose is found
                        setTriggeredReasons(["Step back or adjust lighting to detect your pose."]);
                    }
                }
            } catch (err) {
                if (!isLoading) console.error("Pose detect error:", err);
            }
        }

        // 4. Posture metrics and either calibration or live analysis
        if (finalLandmarks) {
            // Note: analyzePostureMetrics uses finalLandmarks (raw during calibration, smoothed during live)
            const metrics = analyzePostureMetrics(
                finalLandmarks,
                VIDEO_WIDTH,
                VIDEO_HEIGHT
            );

            // 🔹 If calibrating, only collect samples (using RAW metrics)
            if (calibratingRef.current && metrics) {
                // Collect RAW metrics from rawLandmarks for a truer baseline of the user's posture/noise
                const rawMetrics = analyzePostureMetrics(
                    rawLandmarks, // Use RAW landmarks here
                    VIDEO_WIDTH,
                    VIDEO_HEIGHT
                );

                if (rawMetrics) {
                    calibrationSamplesRef.current.push(rawMetrics);
                }

                const collected = calibrationSamplesRef.current.length;
                setStatusMessage(`Calibrating... (${collected}/${CALIBRATION_FRAMES})`);
                // Set a single reason for calibration instruction
                setTriggeredReasons(["Hold a natural, relaxed posture for calibration."]);

                if (collected >= CALIBRATION_FRAMES) {
                    // compute baseline
                    const shoulderVals = calibrationSamplesRef.current.map((s) => s.shoulderDiffPx);
                    const headOffsetVals = calibrationSamplesRef.current.map((s) => s.headOffsetX);
                    const eyeDistVals = calibrationSamplesRef.current.map((s) => s.interEyeDistancePx);

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

                    // persist and apply immediately
                    try {
                        localStorage.setItem("postureBaseline", JSON.stringify(newBaseline));
                    } catch (e) {
                        console.warn("Could not persist baseline:", e);
                    }

                    setBaseline(newBaseline);
                    calibratingRef.current = false;
                    calibrationSamplesRef.current = [];
                    setCalibrating(false);
                    setStatusMessage("Calibration complete ✅");
                    // Clear reasons after calibration
                    setTriggeredReasons(["Personalized tracking started."]);
                    setTimeout(() => setStatusMessage("Ready"), 2000);
                }

                // Stop here — don’t do posture checking during calibration
                requestAnimationFrame(predict);
                return;
            }

            // 🔹 Normal live posture analysis (using SMOOTHED metrics)
            if (!calibratingRef.current && metrics) {
                // Store real-time metrics for display (which are now derived from smoothed landmarks)
                setRealtimeMetrics(metrics);

                // Collect reasons into an array
                const reasons = [];

                // Define fixed default thresholds if no baseline exists
                const SH_THRESH_DEFAULT = 20; // pixels difference
                const HO_THRESH_DEFAULT = 30; // pixels offset
                const STRICT_PERCENT_CHANGE_THRESH = 0.05; // 5% change for depth fallback

                let shouldersNotStraight = false;
                let headTilt = false;
                let slouchingForward = false;
                let leaningBack = false;

                if (baseline) {
                    // Use baseline mean + buffer (e.g., 1.5 sigma or a minimum safety margin)
                    const shoulderThresh = baseline.meanShoulder + Math.max(12, baseline.stdShoulder * 1.5);
                    const headOffsetThresh = baseline.meanHeadOffset + Math.max(18, baseline.stdHeadOffset * 1.5);

                    /* 🌟 STRICTER ADJUSTMENT for Leaning Front/Back */
                    const STRICTNESS_MULTIPLIER = 1.5; // Increased for a slightly stricter trigger
                    const MIN_PIXEL_BUFFER = 7; // Small fixed buffer

                    // Slouching: Current distance is significantly GREATER (closer to camera) than mean
                    const slouchThresh = baseline.meanEyeDist + Math.max(MIN_PIXEL_BUFFER, baseline.stdEyeDist * STRICTNESS_MULTIPLIER);

                    // Leaning Back: Current distance is significantly LESS (further from camera) than mean
                    const leanThresh = baseline.meanEyeDist - Math.max(MIN_PIXEL_BUFFER, baseline.stdEyeDist * STRICTNESS_MULTIPLIER);

                    shouldersNotStraight = metrics.shoulderDiffPx > shoulderThresh;
                    headTilt = metrics.headOffsetX > headOffsetThresh;
                    slouchingForward = metrics.interEyeDistancePx > slouchThresh;
                    leaningBack = metrics.interEyeDistancePx < leanThresh;

                } else {
                    // Use fixed defaults if no baseline exists
                    shouldersNotStraight = metrics.shoulderDiffPx > SH_THRESH_DEFAULT;
                    headTilt = metrics.headOffsetX > HO_THRESH_DEFAULT;

                    if (metrics.interEyeDistancePx && smoothedLandmarks) {
                        const L_EYE = 2;
                        const R_EYE = 5;
                        const dist = metrics.interEyeDistancePx;

                        // Fallback: Using the current smoothed inter-eye distance as a rough proxy for a base
                        // This is non-ideal but prevents triggering on the first frame.
                        const leftEye = smoothedLandmarks[L_EYE];
                        const rightEye = smoothedLandmarks[R_EYE];

                        if (leftEye && rightEye) {
                            const initialDist = Math.sqrt(
                                ((leftEye.x - rightEye.x) * VIDEO_WIDTH) ** 2 +
                                ((leftEye.y - rightEye.y) * VIDEO_HEIGHT) ** 2
                            );
                            slouchingForward = dist > initialDist * (1 + STRICT_PERCENT_CHANGE_THRESH);
                            leaningBack = dist < initialDist * (1 - STRICT_PERCENT_CHANGE_THRESH);
                        }
                    }
                }

                // Logic to collect ALL triggered reasons
                if (slouchingForward) {
                    reasons.push("Slouching: Head too far forward. Sit up straight!");
                }
                if (leaningBack) {
                    reasons.push("Leaning Back: Too far from the screen. Center yourself.");
                }
                if (shouldersNotStraight) {
                    reasons.push("Shoulders Uneven: Level your shoulders.");
                }
                if (headTilt) {
                    reasons.push("Head Offset/Tilt: Keep your head centered.");
                }

                if (reasons.length > 0) {
                    setStatusMessage("Bad Posture ❌");
                    setTriggeredReasons(reasons);
                } else {
                    // Only update status if no other issue is found
                    setStatusMessage("Good Posture ✅");
                    setTriggeredReasons(["Keep it up!"]);
                }
            }
        }

        requestAnimationFrame(predict);
    };

    /* ---- Initialization (No change needed) ---- */
    useEffect(() => {
        let stream;
        const init = async () => {
            try {
                setStatusMessage("Loading Pose model...");
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
                );
                poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                });
                setStatusMessage("Pose model loaded.");
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                runningRef.current = true;
                setIsLoading(false);
                setStatusMessage(baseline ? "Ready" : "Please Calibrate Posture");
                // Initial reasons based on calibration status
                setTriggeredReasons(baseline ? ["Ready for real-time tracking."] : ["Calibration is required for accurate tracking."]);
                requestAnimationFrame(predict);
            } catch (err) {
                console.error("Initialization failed:", err);
                const userFriendlyError = err.message.includes("Permission denied")
                    ? "Camera access denied. Please allow camera access."
                    : `Initialization failed: ${err.name || "Unknown Error"}`;
                setStatusMessage(userFriendlyError);
                setIsLoading(false);
                // Initial reason on error
                setTriggeredReasons([userFriendlyError]);
            }
        };
        init();
        return () => {
            runningRef.current = false;
            if (stream) stream.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---- Calibration controls (Modified) ---- */
    const startCalibration = () => {
        if (isLoading || !poseLandmarkerRef.current || videoRef.current?.readyState !== 4) {
            setStatusMessage("Pose model not ready or camera not streaming yet.");
            setTriggeredReasons(["Wait for the model to load and the camera to start."]);
            return;
        }

        // --- Integrated: Reset Baseline logic ---
        try {
            localStorage.removeItem("postureBaseline");
        } catch { /* Handle potential localStorage access error silently */ }
        setBaseline(null);
        // --- End: Reset Baseline logic ---

        calibratingRef.current = true;
        calibrationSamplesRef.current = [];
        setCalibrating(true);
        setStatusMessage(`Calibrating... (0/${CALIBRATION_FRAMES})`);
        // Set clear calibration instruction
        setTriggeredReasons(["Hold a natural 'good posture' for a few seconds."]);
    };

    const cancelCalibration = () => {
        calibratingRef.current = false;
        calibrationSamplesRef.current = [];
        setCalibrating(false);
        setStatusMessage("Calibration cancelled");
        // Set state back to "Ready" or prompt for calibration if no baseline exists
        setTriggeredReasons(baseline ? ["Tracking resumed."] : ["Baseline is required to proceed. Please recalibrate."]);
        setTimeout(() => {
            setStatusMessage(baseline ? "Ready" : "Please Calibrate Posture");
            if (baseline) setTriggeredReasons(["Ready for real-time tracking."]);
        }, 800);
    };

    const isBadPosture = statusMessage.includes("Bad Posture");
    const isCalibrating = statusMessage.includes("Calibrating");

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-gray-900 text-white font-sans">

            {/* Header */}
            <header className="mb-6 max-w-lg w-full">
                <h1 className="text-3xl font-extrabold text-center text-yellow-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 inline-block mr-2 align-middle">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 2.2229a8 8 0 011.455 1.455m-1.455-1.455L.954 13.546m14.088-11.323l-12.02 12.02m12.02-12.02l-12.02 12.02m12.02-12.02L.954 13.546A8 8 0 0015.042 2.2229zM19.042 6.2229a8 8 0 011.455 1.455m-1.455-1.455L5.954 17.546m13.088-15.323L5.954 17.546A8 8 0 0019.042 6.2229zM15.042 2.2229a8 8 0 011.455 1.455m-1.455-1.455L.954 13.546M15.042 2.2229l-12.02 12.02m12.02-12.02l-12.02 12.02m12.02-12.02L.954 13.546A8 8 0 0015.042 2.2229z" />
                    </svg>
                    Posture Analyzer
                </h1>
                <p className="text-gray-400 text-center text-sm">Real-time tracking for shoulders, head, and slouching/leaning.</p>
            </header>

            {/* Camera/Canvas Display */}
            <div className="relative w-full max-w-lg aspect-[4/3] shadow-2xl rounded-2xl overflow-hidden mb-6 border-4 border-gray-700">
                {/* Loading spinner */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
                    </div>
                )}

                {/* Canvas draws video and overlay */}
                <canvas
                    ref={canvasRef}
                    width={VIDEO_WIDTH}
                    height={VIDEO_HEIGHT}
                    className="absolute top-0 left-0 w-full h-full object-cover rounded-2xl bg-black"
                    style={{ transform: 'scaleX(-1)' }} // Mirror the canvas output
                />

                {/* Hidden raw video element - used as input source */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="hidden"
                    style={{ transform: 'scaleX(-1)' }} // Mirror the video feed
                />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 justify-center mb-6 max-w-lg w-full">
                {!calibrating ? (
                    <button
                        onClick={startCalibration}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl font-semibold transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center"
                        title="Resets existing baseline and starts a new calibration. Stand in your natural good posture and click Calibrate."
                        disabled={isLoading || calibrating}
                    >
                        {baseline ? "Recalibrate Posture" : "Start Calibration"}
                    </button>
                ) : (
                    <button
                        onClick={cancelCalibration}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl font-semibold transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center"
                        disabled={isLoading}
                    >
                        Cancel Calibration
                    </button>
                )}
            </div>

            {/* Status & Metrics Panel */}
            <div className="w-full max-w-lg bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-700">

                {/* Main Status Indicator */}
                <div
                    className={`p-3 rounded-lg font-bold text-center w-full transition-colors duration-500 mb-4
                        ${isBadPosture ? "bg-red-700" : isCalibrating ? "bg-yellow-600 text-gray-900" : "bg-green-700"}`}
                >
                    <p className="text-xl">{isLoading ? "Loading Pose Model..." : statusMessage}</p>
                </div>

                {/* Triggered Reasons/Instructions */}
                {triggeredReasons.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4 p-2 border-b border-gray-700">
                        {triggeredReasons.map((reason, index) => (
                            <span
                                key={index}
                                className={`px-3 py-1 text-xs font-medium rounded-full
                                    ${isBadPosture
                                        ? "bg-red-900 text-yellow-300 border border-yellow-300" // Highlight bad reasons
                                        : isCalibrating
                                            ? "bg-yellow-800 text-gray-900"
                                            : "bg-green-900 text-green-300" // Green for good/ready
                                    }`}
                            >
                                {reason}
                            </span>
                        ))}
                    </div>
                )}

                {/* Real-Time Metrics Display */}
                {realtimeMetrics && (
                    <div className="mb-4">
                        <h4 className="font-bold text-blue-300 mb-2 border-b border-gray-700 pb-1">Live Metrics (Smoothed):</h4>
                        <div className="grid grid-cols-2 gap-y-1 text-sm">
                            <div className="truncate">
                                <strong>Shoulder Diff:</strong> <span className="text-yellow-200">{realtimeMetrics.shoulderDiffPx.toFixed(1)} px</span>
                            </div>
                            <div className="truncate">
                                <strong>Head Offset:</strong> <span className="text-yellow-200">{realtimeMetrics.headOffsetX.toFixed(1)} px</span>
                            </div>
                            <div className="truncate col-span-2">
                                <strong>Inter-Eye Distance:</strong> <span className="text-yellow-200">{realtimeMetrics.interEyeDistancePx.toFixed(1)} px</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Personalized Baseline */}
                {baseline && (
                    <div>
                        <h4 className="font-bold text-yellow-300 mb-2 border-b border-gray-700 pb-1">Personal Baseline (Reference):</h4>
                        <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-300">
                            <div className="truncate" title={`Mean: ${baseline.meanShoulder.toFixed(1)}, Std Dev: ${baseline.stdShoulder.toFixed(2)}`}>
                                <strong>Avg. Shldr Diff:</strong> {baseline.meanShoulder.toFixed(1)} px
                            </div>
                            <div className="truncate" title={`Mean: ${baseline.meanHeadOffset.toFixed(1)}, Std Dev: ${baseline.stdHeadOffset.toFixed(2)}`}>
                                <strong>Avg. Head Offset:</strong> {baseline.meanHeadOffset.toFixed(1)} px
                            </div>
                            <div className="truncate col-span-2" title={`Mean: ${baseline.meanEyeDist.toFixed(1)}, Std Dev: ${baseline.stdEyeDist.toFixed(2)}`}>
                                <strong>Avg. Inter-Eye Dist:</strong> {baseline.meanEyeDist.toFixed(1)} px (±{baseline.stdEyeDist.toFixed(2)})
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">Tracking personalized to your calibrated "good" posture.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

