"use client";

import React, { useState, useEffect } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import PoseCamera from "./PoseCamera";
import { FiCpu, FiAlertTriangle } from "react-icons/fi";

const DB_NAME = "MediaPipeModelDB";
const STORE_NAME = "models";
const MODEL_KEY = "pose_landmarker_lite";

function openModelDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) =>
      reject(`IndexedDB error: ${event.target.errorCode}`);
  });
}

async function saveModelToDb(modelBuffer) {
  const db = await openModelDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(modelBuffer, MODEL_KEY);
    transaction.oncomplete = () => {
      console.log("✅ Model saved to IndexedDB.");
      resolve();
    };
    transaction.onerror = (event) =>
      reject(`Failed to save model: ${event.target.error}`);
  });
}

async function getModelFromDb() {
  const db = await openModelDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(MODEL_KEY);
    request.onsuccess = (event) => resolve(event.target.result || null);
    request.onerror = (event) =>
      reject(`Failed to get model: ${event.target.error}`);
  });
}

export default function PoseModelLoader() {
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const MODEL_ASSET_PATH =
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

  useEffect(() => {
    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );

        let modelBuffer = await getModelFromDb();

        if (!modelBuffer) {
          console.log("Model not found in cache. Fetching from network...");
          const response = await fetch(MODEL_ASSET_PATH);
          if (!response.ok) throw new Error(`Failed to fetch model`);
          modelBuffer = await response.arrayBuffer();
          await saveModelToDb(modelBuffer);
        } else {
          console.log("✅ Cache hit! Loading model from IndexedDB.");
        }

        const modelUint8Array = new Uint8Array(modelBuffer);

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetBuffer: modelUint8Array,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        setPoseLandmarker(landmarker);
      } catch (err) {
        console.error("❌ Model initialization failed:", err);
        setErrorMessage(
          `Failed to load model: ${err.message || "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    initModel();
  }, []);

  // --- Loading UI ---
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen font-sans transition-colors duration-500"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <div className="flex flex-col items-center gap-6 p-8 bg-[var(--card-bg)] rounded-3xl shadow-lg border border-[var(--border-color)] backdrop-blur-sm animate-fadeIn">
          <div className="relative">
            {/* 🔵 Animated Blue Ring */}
            <div className="h-24 w-24 rounded-full border-4 border-blue-300 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 animate-spin"></div>

            {/* CPU Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <FiCpu className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            Loading Pose Model
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Preparing AI posture analysis... please wait
          </p>
        </div>
      </div>
    );
  }

  // --- Error UI ---
  if (errorMessage) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen transition-colors duration-500"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <div className="flex flex-col items-center gap-4 p-8 bg-[var(--card-bg)] rounded-3xl shadow-lg border border-[var(--border-color)] text-center">
          <FiAlertTriangle className="w-12 h-12 text-red-500 animate-bounce" />
          <h1 className="text-2xl font-bold text-red-500">
            Model Failed to Load
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // --- Main Component ---
  return <PoseCamera poseLandmarker={poseLandmarker} />;
}
