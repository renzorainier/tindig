"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useAuth } from "../contexts/authContext";
import { useRouter } from "next/navigation";
import CalibrationManager from "./CalibrationManager";
import useEMA from "./useEMA";
import SessionSummaryModal from "./SessionSummaryModal";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

function analyzePostureMetrics(landmarks, canvasWidth, canvasHeight) {
  // ... (function unchanged)
  if (!landmarks) return null;
  const HEAD = 0;
  const L_SHOULDER = 11;
  const R_SHOULDER = 12;
  const L_EYE = 2;
  const R_EYE = 5;
  const head = landmarks[HEAD];
  const leftShoulder = landmarks[L_SHOULDER];
  const rightShoulder = landmarks[R_SHOULDER];
  const leftEye = landmarks[L_EYE];
  const rightEye = landmarks[R_EYE];
  if (!head || !leftShoulder || !rightShoulder || !leftEye || !rightEye)
    return null;
  const shoulderDiffPx =
    Math.abs(leftShoulder.y - rightShoulder.y) * canvasHeight;
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const headOffsetX = Math.abs(head.x - shoulderMidX) * canvasWidth;
  const eyeDiffX = (leftEye.x - rightEye.x) * canvasWidth;
  const eyeDiffY = (leftEye.y - rightEye.y) * canvasHeight;
  const interEyeDistancePx = Math.sqrt(
    eyeDiffX * eyeDiffX + eyeDiffY * eyeDiffY
  );
  return {
    shoulderDiffPx,
    headOffsetX,
    interEyeDistancePx,
  };
}

const BAD_POSTURE_THRESHOLD_MS = 3000;
const GOOD_POSTURE_THRESHOLD_MS = 1500;

const FLICKER_WINDOW_MS = 1500;
const FLICKER_COUNT_THRESHOLD = 4;
const PAUSE_RESET_MS = 2000;

export default function PoseCamera({ poseLandmarker }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { currentUser } = useAuth();
  const router = useRouter();

  // --- EXISTING AUDIO REF ---
  const audioAlertRef = useRef(null); // For bad posture

  // --- NEW AUDIO REFS ---
  const audioGoodPostureRef = useRef(null); // For achieving good posture
  const audioCalibrateStartRef = useRef(null); // For starting calibration
  const audioCalibrateDoneRef = useRef(null); // For completing calibration
  const audioStartRecordRef = useRef(null); // For starting recording
  const audioStopRecordRef = useRef(null); // For stopping recording
  const audioPauseRef = useRef(null); // For when tracking pauses (unstable)
  const audioResumeRef = useRef(null); // For when tracking resumes

  const [badPostureCountdown, setBadPostureCountdown] = useState(0);
  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    }
  }, [currentUser, router]);
  const [smoothedLandmarks, updateSmoothedLandmarks] = useEMA(null);
  const [statusMessage, setStatusMessage] = useState("Initializing camera...");
  const [isLoading, setIsLoading] = useState(true);
  const [triggeredReasons, setTriggeredReasons] = useState([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(false);
  const recordingSamplesRef = useRef([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [baseline, setBaseline] = useState(() => {
    try {
      const raw = localStorage.getItem("postureBaseline");
      if (raw) {
        return JSON.parse(raw);
      }
      return null;
    } catch {
      return null;
    }
  });
  const [calibrating, setCalibrating] = useState(false);
  const calibratingRef = useRef(false);
  const [rawMetricsForCalibrator, setRawMetricsForCalibrator] =
    useState(null);
  const runningRef = useRef(false);
  const wasBadPostureRef = useRef(false);
  const badPostureStartTimeRef = useRef(null);
  const goodPostureStartTimeRef = useRef(null);

  const [showDetails, setShowDetails] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  // --- NEW: Ref to fix stale closure in predict() ---
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const lastRawStateRef = useRef(null);
  const lastFlipTimeRef = useRef(null);
  const flipCountRef = useRef(0);
  const goodPostureHoldTimerRef = useRef(null);

  const drawSkeleton = (ctx, landmarks, width, height) => {
    // ... (function unchanged)
    if (!landmarks || landmarks.length === 0) return;
    const HEAD = 0;
    const L_SHOULDER = 11;
    const R_SHOULDER = 12;
    const L_EYE = 2;
    const R_EYE = 5;
    const colors = {
      [HEAD]: "#00BFFF",
      [L_SHOULDER]: "#00BFFF",
      [R_SHOULDER]: "#00BFFF",
      [L_EYE]: "#00BFFF",
      [R_EYE]: "#00BFFF",
    };
    [HEAD, L_SHOULDER, R_SHOULDER, L_EYE, R_EYE].forEach((i) => {
      const lm = landmarks[i];
      if (!lm) return;
      const x = lm.x * width;
      const y = lm.y * height;
      ctx.beginPath();
      ctx.arc(x, y, i === HEAD ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = colors[i];
      ctx.fill();
    });
    const left = landmarks[L_SHOULDER];
    const right = landmarks[R_SHOULDER];
    if (left && right) {
      ctx.beginPath();
      ctx.moveTo(left.x * width, left.y * height);
      ctx.lineTo(right.x * width, right.y * height);
      ctx.strokeStyle = "#0498c9";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const predict = async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !video || video.readyState !== 4 || !video.videoWidth) {
      requestAnimationFrame(predict);
      return;
    }
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    let rawLandmarks = null;
    let finalLandmarks = null;
    if (poseLandmarker) {
      try {
        const poseResults = poseLandmarker.detectForVideo(
          video,
          performance.now()
        );
        if (poseResults.landmarks && poseResults.landmarks.length > 0) {
          rawLandmarks = poseResults.landmarks[0];
          if (calibratingRef.current) {
            finalLandmarks = rawLandmarks;
          } else {
            finalLandmarks = updateSmoothedLandmarks(rawLandmarks);
          }
          drawSkeleton(ctx, finalLandmarks, videoWidth, videoHeight);
          // --- MODIFIED: Read from isPausedRef.current ---
          if (!calibratingRef.current && !isPausedRef.current) {
            setStatusMessage("Pose Detected");
          }
        } else {
          updateSmoothedLandmarks(null);
          // --- MODIFIED: Read from isPausedRef.current ---
          if (!calibratingRef.current && !isPausedRef.current) {
            setStatusMessage("No Pose Detected");
            setTriggeredReasons([
              "Step back or adjust lighting to detect your pose.",
            ]);
          }
        }
      } catch (err) {
        if (!isLoading) console.error("Pose detect error:", err);
      }
    }
    if (finalLandmarks) {
      const metrics = analyzePostureMetrics(
        finalLandmarks,
        videoWidth,
        videoHeight
      );
      if (calibratingRef.current && metrics) {
        const rawMetrics = analyzePostureMetrics(
          rawLandmarks,
          videoWidth,
          videoHeight
        );
        setRawMetricsForCalibrator(rawMetrics);
        requestAnimationFrame(predict);
        return;
      }
      setRawMetricsForCalibrator(null);
      if (!calibratingRef.current && metrics) {
        setRealtimeMetrics(metrics);
        const reasons = [];
        // ... (threshold logic unchanged) ...
        const SH_THRESH_DEFAULT = 20;
        const HO_THRESH_DEFAULT = 30;
        const STRICT_PERCENT_CHANGE_THRESH = 0.05;
        let shouldersNotStraight = false;
        let headTilt = false;
        let slouchingForward = false;
        let leaningBack = false;
        if (baseline) {
          const shoulderThresh =
            baseline.meanShoulder + Math.max(12, baseline.stdShoulder * 1.5);
          const headOffsetThresh =
            baseline.meanHeadOffset +
            Math.max(18, baseline.stdHeadOffset * 1.5);
          const STRICTNESS_MULTIPLIER = 1.5;
          const MIN_PIXEL_BUFFER = 7;
          const slouchThresh =
            baseline.meanEyeDist +
            Math.max(
              MIN_PIXEL_BUFFER,
              baseline.stdEyeDist * STRICTNESS_MULTIPLIER
            );
          const leanThresh =
            baseline.meanEyeDist -
            Math.max(
              MIN_PIXEL_BUFFER,
              baseline.stdEyeDist * STRICTNESS_MULTIPLIER
            );
          shouldersNotStraight = metrics.shoulderDiffPx > shoulderThresh;
          headTilt = metrics.headOffsetX > headOffsetThresh;
          slouchingForward = metrics.interEyeDistancePx > slouchThresh;
          leaningBack = metrics.interEyeDistancePx < leanThresh;
        } else {
          shouldersNotStraight = metrics.shoulderDiffPx > SH_THRESH_DEFAULT;
          headTilt = metrics.headOffsetX > HO_THRESH_DEFAULT;
          if (metrics.interEyeDistancePx && smoothedLandmarks) {
            const L_EYE = 2;
            const R_EYE = 5;
            const dist = metrics.interEyeDistancePx;
            const leftEye = smoothedLandmarks[L_EYE];
            const rightEye = smoothedLandmarks[R_EYE];
            if (leftEye && rightEye) {
              const initialDist = Math.sqrt(
                ((leftEye.x - rightEye.x) * videoWidth) ** 2 +
                  ((leftEye.y - rightEye.y) * videoHeight) ** 2
              );
              slouchingForward =
                dist > initialDist * (1 + STRICT_PERCENT_CHANGE_THRESH);
              leaningBack =
                dist < initialDist * (1 - STRICT_PERCENT_CHANGE_THRESH);
            }
          }
        }
        if (slouchingForward) {
          reasons.push("Slouching");
        }
        if (leaningBack) {
          reasons.push("Leaning Back");
        }
        if (shouldersNotStraight) {
          reasons.push("Shoulders Uneven");
        }
        if (headTilt) {
          reasons.push("Head Offset");
        }
        const fullReasons = reasons.map((r) => {
          if (r === "Slouching")
            return "Slouching: Move back from screen";
          if (r === "Leaning Back")
            return "Leaning: Move closer";
          if (r === "Shoulders Uneven")
            return "Shoulders: Level them";
          if (r === "Head Offset")
            return "Head: Center position";
          return r;
        });

        // --- Flicker Detection & Paused State Logic ---
        const currentIsBad = reasons.length > 0;

        if (
          currentIsBad !== lastRawStateRef.current &&
          lastRawStateRef.current !== null
        ) {
          const now = Date.now();
          if (
            lastFlipTimeRef.current &&
            now - lastFlipTimeRef.current < FLICKER_WINDOW_MS
          ) {
            flipCountRef.current += 1;
          } else {
            flipCountRef.current = 1;
          }
          lastFlipTimeRef.current = now;

          if (flipCountRef.current >= FLICKER_COUNT_THRESHOLD) {
            // --- MODIFIED: Read from isPausedRef.current ---
            if (!isPausedRef.current) {
              // --- NEW: Console log as requested ---
              console.log("Posture unstable, pausing tracker...");

              // --- NEW: Play Pause Sound ---
              playPauseSound();

              setIsPaused(true); // Write using setIsPaused
            }
          }
        }
        lastRawStateRef.current = currentIsBad;

        // --- MODIFIED: Read from isPausedRef.current ---
        if (isPausedRef.current) {
          if (!currentIsBad) {
            if (goodPostureHoldTimerRef.current === null) {
              goodPostureHoldTimerRef.current = Date.now();
            }
            const elapsed = Date.now() - goodPostureHoldTimerRef.current;

            if (elapsed >= PAUSE_RESET_MS) {
              console.log("Resuming tracker..."); // --- Optional: log for unpausing

              // --- NEW: Play Resume Sound ---
              playResumeSound();

              setIsPaused(false); // Write using setIsPaused
              goodPostureHoldTimerRef.current = null;
              flipCountRef.current = 0;
              lastFlipTimeRef.current = null;
            } else {
              setStatusMessage("Posture Unstable ⚠️");
              setTriggeredReasons(["Hold good posture to resume tracking..."]);
              requestAnimationFrame(predict);
              return;
            }
          } else {
            goodPostureHoldTimerRef.current = null;
            setStatusMessage("Posture Unstable ⚠️");
            setTriggeredReasons(["Please fix your posture to resume."]);
            requestAnimationFrame(predict);
            return;
          }
        }

        // --- Original Hysteresis Logic ---
        if (reasons.length > 0) {
          // ... (logic unchanged) ...
          goodPostureStartTimeRef.current = null;
          if (badPostureStartTimeRef.current === null) {
            badPostureStartTimeRef.current = Date.now();
          }
          const elapsed = Date.now() - badPostureStartTimeRef.current;
          const countdownProgress = Math.min(
            elapsed / BAD_POSTURE_THRESHOLD_MS,
            1
          );
          setBadPostureCountdown(countdownProgress);
          if (elapsed >= BAD_POSTURE_THRESHOLD_MS) {
            setStatusMessage("Bad Posture ❌");
            setTriggeredReasons(fullReasons);
            if (wasBadPostureRef.current === false) {
              playBadPostureSound();
            }
            wasBadPostureRef.current = true;
          } else {
            const secondsLeft = Math.ceil(
              (BAD_POSTURE_THRESHOLD_MS - elapsed) / 1000
            );
            setStatusMessage(`Loosing Good Posture... ${secondsLeft}`);
            setTriggeredReasons(fullReasons);
          }
        } else {
          // ... (logic unchanged) ...
          badPostureStartTimeRef.current = null;
          setBadPostureCountdown(0);
          if (goodPostureStartTimeRef.current === null) {
            goodPostureStartTimeRef.current = Date.now();
          }
          const elapsed = Date.now() - goodPostureStartTimeRef.current;
          if (elapsed >= GOOD_POSTURE_THRESHOLD_MS) {
            setStatusMessage("Good Posture ✅");
            setTriggeredReasons(["Keep it up!"]);

            // --- NEW: Play Good Posture Sound ---
            if (wasBadPostureRef.current === true) {
              // Only play if they *were* in bad posture
              playGoodPostureSound();
            }

            wasBadPostureRef.current = false;
          } else {
            setStatusMessage("Returning to Good...");
            setTriggeredReasons(["Returning to Good..."]);
          }
        }

        // --- MODIFIED: Read from isPausedRef.current ---
        if (recordingRef.current && !isPausedRef.current) {
          const isBadFrame = reasons.length > 0;
          recordingSamplesRef.current.push({
            t: Date.now(),
            metrics: metrics,
            isBad: isBadFrame,
            reasons: isBadFrame ? reasons : [],
          });
        }
      }
    }
    requestAnimationFrame(predict);
  };

  useEffect(() => {
    // ... (init function unchanged)
    let stream;
    const init = async () => {
      if (!poseLandmarker) {
        setStatusMessage("Error: Pose model not provided.");
        setIsLoading(false);
        return;
      }
      setStatusMessage("Model loaded. Initializing camera...");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
        });
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            const actualWidth = video.videoWidth;
            const actualHeight = video.videoHeight;
            console.log(
              `Requested ${VIDEO_WIDTH}x${VIDEO_HEIGHT}, Got ${actualWidth}x${actualHeight}`
            );
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            const container = canvas.parentElement;
            if (container) {
              container.classList.remove("aspect-[4/3]");
              container.style.aspectRatio = `${actualWidth} / ${actualHeight}`;
            }
            video.play();
            runningRef.current = true;
            setIsLoading(false);
            setStatusMessage(baseline ? "Ready" : "Please Calibrate Posture");
            setTriggeredReasons(
              baseline
                ? ["Ready for real-time tracking."]
                : ["Calibration is required for accurate tracking."]
            );
            requestAnimationFrame(predict);
          };
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        const userFriendlyError = err.message.includes("Permission denied")
          ? "Camera access denied. Please allow camera access."
          : `Initialization failed: ${err.name || "Unknown Error"}`;
        setStatusMessage(userFriendlyError);
        setIsLoading(false);
        setTriggeredReasons([userFriendlyError]);
      }
    };
    init();
    return () => {
      runningRef.current = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [poseLandmarker, currentUser, baseline, router]);

  const handleStartCalibration = () => {
    // ... (function unchanged)
    if (
      isLoading ||
      !poseLandmarker ||
      videoRef.current?.readyState !== 4
    ) {
      setStatusMessage("Pose model not ready or camera not streaming yet.");
      setTriggeredReasons([
        "Wait for the model to load and the camera to start.",
      ]);
      return;
    }

    // --- NEW: Play Calibrate Start Sound ---
    playCalibrateStartSound();

    try {
      localStorage.removeItem("postureBaseline");
    } catch {}
    setBaseline(null);
    setIsPaused(false);
    flipCountRef.current = 0;
    lastFlipTimeRef.current = null;
    goodPostureHoldTimerRef.current = null;
    calibratingRef.current = true;
    setCalibrating(true);
    setStatusMessage(`Calibrating... (0/...)`);
    setTriggeredReasons(["Hold a natural 'good posture' for a few seconds."]);
  };

  const handleCancelCalibration = () => {
    // ... (function unchanged)
    calibratingRef.current = false;
    setCalibrating(false);
    setStatusMessage("Calibration cancelled");
    setTriggeredReasons(
      baseline
        ? ["Tracking resumed."]
        : ["Baseline is required to proceed. Please recalibrate."]
    );
    setTimeout(() => {
      setStatusMessage(baseline ? "Ready" : "Please Calibrate Posture");
      if (baseline) setTriggeredReasons(["Ready for real-time tracking."]);
    }, 800);
  };

  const handleCalibrationComplete = (newBaseline) => {
    // --- NEW: Play Calibrate Done Sound ---
    playCalibrateDoneSound();

    // ... (function unchanged)
    try {
      localStorage.setItem("postureBaseline", JSON.stringify(newBaseline));
    } catch (e) {
      console.warn("Could not persist baseline:", e);
    }
    setBaseline(newBaseline);
    calibratingRef.current = false;
    setCalibrating(false);
    setRawMetricsForCalibrator(null);
    setStatusMessage("Calibration complete ✅");
    setTriggeredReasons(["Personalized tracking started."]);
    setTimeout(() => setStatusMessage("Ready"), 2000);
  };

  const startRecording = () => {
    // ... (function unchanged)
    if (isLoading || !poseLandmarker) {
      setStatusMessage("Model not ready for recording");
      return;
    }

    // --- NEW: Play Start Record Sound ---
    playStartRecordSound();

    setSaveResult(null);
    recordingRef.current = true;
    recordingSamplesRef.current = [];
    setIsRecording(true);
    setStatusMessage("Recording...");
  };

  const processRecordingData = (samples) => {
    // ... (function unchanged)
    if (!samples || samples.length < 2) return null;
    const timeline = [];
    let currentEvent = null;
    const getSampleState = (sample) => {
      if (!sample.isBad) return "Good";
      return JSON.stringify(sample.reasons.sort());
    };
    const firstSample = samples[0];
    currentEvent = {
      type: firstSample.isBad ? "Bad" : "Good",
      reasons: firstSample.reasons,
      startTime: firstSample.t,
      state: getSampleState(firstSample),
    };
    const totalDurationMs = samples[samples.length - 1].t - samples[0].t;
    let goodPostureTimeMs = 0;
    let issueTimes = {
      "Slouching": 0,
      "Leaning Back": 0,
      "Shoulders Uneven": 0,
      "Head Offset": 0,
    };
    let totalMetrics = { shoulderDiffPx: 0, headOffsetX: 0, interEyeDistancePx: 0 };
    for (let i = 0; i < samples.length - 1; i++) {
      const currentSample = samples[i];
      const nextSample = samples[i + 1];
      const durationMs = nextSample.t - currentSample.t;
      totalMetrics.shoulderDiffPx += currentSample.metrics.shoulderDiffPx;
      totalMetrics.headOffsetX += currentSample.metrics.headOffsetX;
      totalMetrics.interEyeDistancePx += currentSample.metrics.interEyeDistancePx;
      if (currentSample.isBad) {
        currentSample.reasons.forEach(reason => {
          if (issueTimes.hasOwnProperty(reason)) {
            issueTimes[reason] += durationMs;
          }
        });
      } else {
        goodPostureTimeMs += durationMs;
      }
      const nextState = getSampleState(nextSample);
      if (currentEvent.state !== nextState) {
        currentEvent.endTime = nextSample.t;
        currentEvent.durationMs = currentEvent.endTime - currentEvent.startTime;
        timeline.push(currentEvent);
        currentEvent = {
          type: nextSample.isBad ? "Bad" : "Good",
          reasons: nextSample.reasons,
          startTime: nextSample.t,
          state: nextState,
        };
      }
    }
    const lastSample = samples[samples.length - 1];
    currentEvent.endTime = lastSample.t;
    currentEvent.durationMs = currentEvent.endTime - currentEvent.startTime;
    timeline.push(currentEvent);
    const badPostureTimeMs = totalDurationMs - goodPostureTimeMs;
    const goodPosturePercent = (goodPostureTimeMs / totalDurationMs) * 100;
    const badPosturePercent = (badPostureTimeMs / totalDurationMs) * 100;
    const meanMetrics = {
        shoulderDiffPx: totalMetrics.shoulderDiffPx / samples.length,
        headOffsetX: totalMetrics.headOffsetX / samples.length,
        interEyeDistancePx: totalMetrics.interEyeDistancePx / samples.length,
    };
    return {
      totalDurationMs,
      goodPostureTimeMs,
      badPostureTimeMs,
      goodPosturePercent,
      badPosturePercent,
      issueBreakdown: {
        slouchingTimeMs: issueTimes["Slouching"],
        leaningBackTimeMs: issueTimes["Leaning Back"],
        shoulderTimeMs: issueTimes["Shoulders Uneven"],
        headTiltTimeMs: issueTimes["Head Offset"],
      },
      meanMetrics,
      frames: samples.length,
      baseline: baseline || null,
      userId: currentUser?.uid || null,
      clientCreatedAt: Date.now(),
      clientCreatedAtDate: new Date().toISOString().split("T")[0],
      timeline: timeline,
    };
  };

  const stopRecordingAndShowSummary = () => {
    // --- NEW: Play Stop Record Sound ---
    playStopRecordSound();

    // ... (function unchanged)
    recordingRef.current = false;
    setIsRecording(false);
    setStatusMessage("Processing session...");
    const rawSamples = recordingSamplesRef.current;
    if (rawSamples.length < 10) {
      setStatusMessage("Recording too short!");
      recordingSamplesRef.current = [];
      setTimeout(() => setStatusMessage(baseline ? "Ready" : "Please Calibrate Posture"), 2000);
      return;
    }
    const summary = processRecordingData(rawSamples);
    setSessionSummary(summary);
    recordingSamplesRef.current = [];
  };

  const handleCloseSummary = async () => {
    // ... (function unchanged)
    if (!sessionSummary) return;

    setIsSaving(true);
    setSessionSummary(null);
    setStatusMessage("Saving recording...");
    const payload = {
      createdAt: serverTimestamp(),
      clientCreatedAt: sessionSummary.clientCreatedAt,
      clientCreatedAtDate: sessionSummary.clientCreatedAtDate,
      durationMs: sessionSummary.totalDurationMs,
      frames: sessionSummary.frames,
      baseline: sessionSummary.baseline,
      userId: sessionSummary.userId,
      meanMetrics: sessionSummary.meanMetrics,
      summary: {
        goodPosturePercent: sessionSummary.goodPosturePercent,
        badPosturePercent: sessionSummary.badPosturePercent,
        issueBreakdown: sessionSummary.issueBreakdown,
      },
      timeline: sessionSummary.timeline,
    };
    try {
      const colRef = collection(db, "posture_recordings");
      const docRef = await addDoc(colRef, payload);
      console.log("Saved recording id:", docRef.id);
      setSaveResult({ ok: true, id: docRef.id });
      setStatusMessage("Recording saved ✅");
    } catch (err) {
      console.error("Failed to save recording:", err);
      const message = (err && (err.message || String(err))) || "Unknown error";
      setSaveResult({ ok: false, error: message });
      setStatusMessage("Failed to save recording");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setStatusMessage(baseline ? "Ready" : "Please Calibrate Posture");
      }, 1200);
    }
  };

  const goBack = () => {
    // ... (function unchanged)
    try {
      router.back();
    } catch {
      if (
        typeof window !== "undefined" &&
        window.history &&
        window.history.length > 0
      ) {
        window.history.back();
      }
    }
  };

  // --- NEW GENERIC HELPER ---
  const playAudio = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.warn("Could not play sound:", e));
    }
  };

  // --- EXISTING FUNCTION (now using helper) ---
  const playBadPostureSound = () => {
    playAudio(audioAlertRef);
  };

  // --- NEW SOUND FUNCTIONS ---
  const playGoodPostureSound = () => {
    playAudio(audioGoodPostureRef);
  };

  const playCalibrateStartSound = () => {
    playAudio(audioCalibrateStartRef);
  };

  const playCalibrateDoneSound = () => {
    playAudio(audioCalibrateDoneRef);
  };

  const playStartRecordSound = () => {
    playAudio(audioStartRecordRef);
  };

  const playStopRecordSound = () => {
    playAudio(audioStopRecordRef);
  };

  const playPauseSound = () => {
    playAudio(audioPauseRef);
  };

  const playResumeSound = () => {
    playAudio(audioResumeRef);
  };

  const visualState = (() => {
    // ... (function unchanged)
    if (isLoading) return "loading";
    if (calibrating) return "calibrating";

    const msg = statusMessage || "";
    if (msg.includes("Unstable")) return "warning";
    if (msg.includes("Bad Posture")) return "bad";
    if (msg.includes("Loosing") || msg.includes("Returning")) return "warning";
    if (msg.includes("Good Posture") || msg.includes("Ready") || msg.includes("complete"))
      return "good";

    return "idle";
  })();

  const stateStyles = {
    // ... (object unchanged)
    good: {
      statusBox: "bg-green-100 text-green-700 border-green-300",
      reasonPill: "bg-green-200 text-green-800",
    },
    bad: {
      statusBox: "bg-red-100 text-red-700 border-red-300",
      reasonPill: "bg-red-200 text-red-800",
    },
    warning: {
      statusBox: "bg-yellow-100 text-yellow-700 border-yellow-300",
      reasonPill: "bg-yellow-200 text-yellow-800",
    },
    calibrating: {
      statusBox: "bg-blue-100 text-blue-700 border-blue-300",
      reasonPill: "bg-blue-200 text-blue-800",
    },
    loading: {
      statusBox: "bg-gray-100 text-gray-700 border-gray-300",
      reasonPill: "bg-gray-200 text-gray-800",
    },
    idle: {
      statusBox: "bg-gray-100 text-gray-700 border-gray-300",
      reasonPill: "bg-gray-200 text-gray-800",
    },
  };

  const currentStyle = stateStyles[visualState] || stateStyles.idle;

  // --- JSX Below is Unchanged (except for new <audio> tags) ---

  return (
    <div
      className="flex flex-col items-center justify-center p-4 min-h-screen font-sans"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
<header className="mb-8 max-w-lg w-full">
  <div className="flex items-center relative">
    <button
      onClick={goBack}
      title="Go back"
      className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
      // Changed top-1 to top-1/2 for better vertical centering
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Back
    </button>
    <h1
      className="text-4xl font-extrabold text-center text-indigo-600 w-full pt-2"
    >
      Posture Analyzer
    </h1>
  </div>
  <p className="text-gray-500 text-center text-base mt-1">
    Real-time tracking for shoulders, head, and slouching/leaning.
  </p>
</header>
      <div className="relative w-full max-w-lg  shadow-xl rounded-xl overflow-hidden mb-8 border-4 border-gray-200 bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          className="absolute top-0 left-0 w-full h-full object-contain rounded-xl bg-black"
          style={{ transform: "scaleX(-1)" }}
        />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-xl border border-gray-200">
        <div
          className={`p-4 rounded-lg font-bold text-center w-full transition-all duration-500 mb-5 text-lg border-2 ${currentStyle.statusBox}`}
        >
          <p className="text-xl">
            {isLoading ? "Loading Camera..." : statusMessage}
          </p>
        </div>

        {badPostureCountdown > 0 && !isPaused && (
          <div
            className="w-full bg-gray-200 rounded-full h-2.5 mb-4 -mt-2"
            title={
              visualState === "bad"
                ? "Bad Posture Detected"
                : "Hold posture..."
            }
          >
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                visualState === "bad" ? "bg-red-500" : "bg-yellow-400"
              }`}
              style={{ width: `${badPostureCountdown * 100}%` }}
            ></div>
          </div>
        )}

        {triggeredReasons.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-5 p-3 border-b border-gray-200">
            {triggeredReasons.map((reason, index) => (
              <span
                key={index}
                className={`px-4 py-2 text-sm sm:text-base md:text-lg font-medium rounded-full break-words max-w-full text-center flex items-center justify-center transition-colors duration-300 ${currentStyle.reasonPill}`}
                style={{
                  wordBreak: 'break-word',
                  hyphens: 'auto',
                  minHeight: '2.5rem'
                }}
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center pt-5 mt-5 border-t border-gray-200">
          <CalibrationManager
            isCalibrating={calibrating}
            isLoading={isLoading}
            hasBaseline={!!baseline}
            rawMetrics={rawMetricsForCalibrator}
            onStart={handleStartCalibration}
            onCancel={handleCancelCalibration}
            onComplete={handleCalibrationComplete}
            onStatusUpdate={setStatusMessage}
            isPaused={isPaused}
          />

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex-1 min-w-[140px] px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 rounded-lg font-semibold transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center text-base"
              disabled={isLoading || calibrating || isPaused}
              title="Start recording samples for the graph"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecordingAndShowSummary}
              className="flex-1 min-w-[140px] px-5 py-2 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 rounded-lg font-semibold transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center text-base"
              disabled={isLoading || isSaving}
              title="Stop recording and show summary"
            >
              {isSaving ? "Saving..." : "Stop Session"}
            </button>
          )}
        </div>

        {saveResult && (
           <div className="mt-5 pt-5 border-t border-gray-200">
            <div
              className={`p-3 rounded-md text-sm ${
                saveResult.ok
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {saveResult.ok ? (
                <div>
                  Saved recording: <strong>{saveResult.id}</strong>
                </div>
              ) : (
                <div>
                  Error saving: <strong>{saveResult.error}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex justify-between items-center w-full text-left text-gray-600 hover:text-indigo-600"
          >
            <span className="font-semibold text-base">
              {showDetails ? "Hide" : "Show"} Technical Details
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform duration-300 ${
                showDetails ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <div
            className="transition-all duration-500 ease-in-out overflow-hidden"
            style={{
              maxHeight: showDetails ? "500px" : "0px",
              opacity: showDetails ? 1 : 0,
            }}
          >
            <div className="pt-4">
              {realtimeMetrics && (
                <div className="mb-5">
                  <h4 className="font-bold text-indigo-600 mb-2 border-b border-gray-200 pb-1 text-base">
                    Live Metrics (Smoothed):
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="truncate">
                      <strong>Shoulder Diff:</strong>{" "}
                      <span className="text-gray-600 font-medium">
                        {realtimeMetrics.shoulderDiffPx.toFixed(1)} px
                      </span>
                    </div>
                    <div className="truncate">
                      <strong>Head Offset:</strong>{" "}
                      <span className="text-gray-600 font-medium">
                        {realtimeMetrics.headOffsetX.toFixed(1)} px
                      </span>
                    </div>
                    <div className="truncate col-span-2">
                      <strong>Inter-Eye Distance:</strong>{" "}
                      <span className="text-gray-600 font-medium">
                        {realtimeMetrics.interEyeDistancePx.toFixed(1)} px
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {baseline && (
                <div>
                  <h4 className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1 text-base">
                    Personal Baseline (Reference):
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-500">
                    <div
                      className="truncate"
                      title={`Mean: ${baseline.meanShoulder.toFixed(
                        1
                      )}, Std Dev: ${baseline.stdShoulder.toFixed(2)}`}
                    >
                      <strong>Avg. Shldr Diff:</strong>{" "}
                      {baseline.meanShoulder.toFixed(1)} px
                    </div>
                    <div
                      className="truncate"
                      title={`Mean: ${baseline.meanHeadOffset.toFixed(
                        1
                      )}, Std Dev: ${baseline.stdHeadOffset.toFixed(2)}`}
                    >
                      <strong>Avg. Head Offset:</strong>{" "}
                      {baseline.meanHeadOffset.toFixed(1)} px
                    </div>
                    <div
                      className="truncate col-span-2"
                      title={`Mean: ${baseline.meanEyeDist.toFixed(
                        1
                      )}, Std Dev: ${baseline.stdEyeDist.toFixed(2)}`}
                    >
                      <strong>Avg. Inter-Eye Dist:</strong>{" "}
                      {baseline.meanEyeDist.toFixed(1)} px (±
                      {baseline.stdEyeDist.toFixed(2)})
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Tracking personalized to your calibrated "good" posture.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ALL AUDIO TAGS --- */}
      <audio ref={audioAlertRef} src="/wrong.wav" preload="auto" />
      <audio ref={audioGoodPostureRef} src="/good.wav" preload="auto" />
      <audio
        ref={audioCalibrateStartRef}
        src="/calibrate.wav"
        preload="auto"
      />
      <audio
        ref={audioCalibrateDoneRef}
        src="/calibrate-done.wav"
        preload="auto"
      />
      <audio ref={audioStartRecordRef} src="/calibrate.wav" preload="auto" />
      <audio ref={audioStopRecordRef} src="/calibrate-done.wav" preload="auto" />
      <audio ref={audioPauseRef} src="/pause.wav" preload="auto" />
      <audio ref={audioResumeRef} src="/resume.wav" preload="auto" />

      <SessionSummaryModal
        summary={sessionSummary}
        onClose={handleCloseSummary}
      />
    </div>
  );
}
