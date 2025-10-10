"use client";

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
      {/* Navbar */}
      <nav className="bg-blue-600 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-white font-bold text-lg">Dashboard</h1>
          <div className="flex items-center">
            <span className="text-white mr-4">
              {currentUser?.email || "User"}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
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
