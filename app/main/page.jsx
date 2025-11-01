"use client";

import React, { useState, useEffect } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import PoseCamera from "./PoseCamera"; // Your main component

// --- IndexedDB Helper Functions ---
const DB_NAME = "MediaPipeModelDB";
const STORE_NAME = "models";
const MODEL_KEY = "pose_landmarker_lite";

/**
 * Opens the IndexedDB.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database object.
 */
function openModelDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(`IndexedDB error: ${event.target.errorCode}`);
    };
  });
}

/**
 * Saves the model (as an ArrayBuffer) to IndexedDB.
 * @param {ArrayBuffer} modelBuffer The model data.
 */
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
    transaction.onerror = (event) => {
      reject(`Failed to save model: ${event.target.error}`);
    };
  });
}

/**
 * Retrieves the model from IndexedDB.
 * @returns {Promise<ArrayBuffer | null>} A promise that resolves with the model data or null if not found.
 */
async function getModelFromDb() {
  const db = await openModelDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(MODEL_KEY);
    request.onsuccess = (event) => {
      resolve(event.target.result || null);
    };
    request.onerror = (event) => {
      reject(`Failed to get model: ${event.target.error}`);
    };
  });
}

// --- End of IndexedDB Helpers ---

/**
 * This component acts as a wrapper.
 * It loads the MediaPipe model, using IndexedDB as a cache.
 */
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

        // Check cache first
        let modelBuffer = await getModelFromDb();

        if (!modelBuffer) {
          console.log("Model not found in cache. Fetching from network...");

          const response = await fetch(MODEL_ASSET_PATH);
          if (!response.ok) {
            throw new Error(`Failed to fetch model: ${response.statusText}`);
          }
          modelBuffer = await response.arrayBuffer();

          await saveModelToDb(modelBuffer);
        } else {
          console.log("✅ Cache hit! Loading model from IndexedDB.");
        }

        // Convert ArrayBuffer to Uint8Array
        const modelUint8Array = new Uint8Array(modelBuffer);

        // Create landmarker
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
        console.error("Failed to initialize pose landmarker:", err);
        setErrorMessage(`Failed to load model: ${err.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    };

    initModel();
  }, []);

  // --- 1. Loading Screen (Dark/Light Mode Compatible) ---
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen font-sans animate-fadeIn"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <h1 className="text-3xl font-extrabold mb-6 tracking-tight text-indigo-500 dark:text-indigo-400">
          Loading Posture Model
        </h1>

        {/* Modern Spinner */}
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-indigo-500 dark:border-t-indigo-400 animate-spin shadow-md"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-semibold text-sm text-indigo-500 dark:text-indigo-300 animate-pulse">
              AI
            </span>
          </div>
        </div>

        {/* Loading text */}
        <p className="mt-6 text-gray-500 dark:text-gray-400 text-sm animate-pulse">
          Initializing pose model... please wait a moment.
        </p>
      </div>
    );
  }

  // --- 2. Error Screen ---
  if (errorMessage) {
    return (
      <div
        className="flex flex-col items-center justify-center p-4 min-h-screen font-sans"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <h1 className="text-3xl font-bold text-red-500 mb-4">
          Model Failed to Load
        </h1>
        <p className="text-gray-500 mt-2">{errorMessage}</p>
      </div>
    );
  }

  // --- 3. If loaded, render the main app ---
  return <PoseCamera poseLandmarker={poseLandmarker} />;
}
