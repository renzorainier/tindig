// app/pose/page.js (This is the NEW page component)

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
      // THIS IS THE FIRST LOG YOU ASKED FOR:
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
      resolve(event.target.result || null); // Returns the ArrayBuffer or null
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
        let modelBuffer = await getModelFromDb(); // This is an ArrayBuffer

        if (!modelBuffer) {
          // NEW: More explicit log for a cache MISS
          console.log("Model not found in cache. Fetching from network...");

          const response = await fetch(MODEL_ASSET_PATH);
          if (!response.ok) {
            throw new Error(`Failed to fetch model: ${response.statusText}`);
          }
          modelBuffer = await response.arrayBuffer(); // This is an ArrayBuffer

          // Save the fetched model to the cache for next time
          // This function will log "✅ Model saved to IndexedDB."
          await saveModelToDb(modelBuffer);

        } else {
          // NEW: THIS IS THE SECOND LOG YOU ASKED FOR:
          console.log("✅ Cache hit! Loading model from IndexedDB.");
        }

        // --- FIX ---
        // MediaPipe's 'modelAssetBuffer' expects a Uint8Array, not an ArrayBuffer.
        // We must convert it.
        const modelUint8Array = new Uint8Array(modelBuffer);

        // Create landmarker from the buffer
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            // --- FIX ---
            // Pass the correctly typed Uint8Array to the model
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
  }, []); // Run once on mount

  // 1. Show a loading screen
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center p-4 min-h-screen font-sans"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">
          Loading Posture Model...
        </h1>
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
        <p className="text-gray-500 mt-4">Please wait, this may take a moment.</p>
      </div>
    );
  }

  // 2. Show an error screen
  if (errorMessage) {
    return (
      <div
        className="flex flex-col items-center justify-center p-4 min-h-screen font-sans"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Model Failed to Load
        </h1>
        <p className="text-gray-500 mt-4">{errorMessage}</p>
      </div>
    );
  }

  // 3. If loaded, render the main app
  return <PoseCamera poseLandmarker={poseLandmarker} />;
}
