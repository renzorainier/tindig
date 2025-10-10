"use client";

import styles from '../styles/global.css';
import React from 'react';
import { useAuth } from '../contexts/authContext';
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleStartDetection = () => {
    router.push("./main");
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar - Fixed the styling here */}
      <nav className="w-full p-4 shadow-md bg-white">
        <div className="flex justify-between items-center"> {/* Removed shadow-md */}
          <h1 className="text-black font-bold text-lg">Tindig</h1>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-red px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content (rest of your code is unchanged) */}
      <div className="flex justify-center items-center h-[80vh]">
        <button
          onClick={handleStartDetection}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-medium"
        >
          Start Detection Camera for Posture
        </button>
      </div>
    </div>
  );
}
