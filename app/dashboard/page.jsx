"use client";

import { useEffect } from "react";
import { useAuth } from "../contexts/authContext";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleStartDetection = () => {
    router.push("./main");
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    }
  }, [currentUser, router]);

  const handleLogout = async () => {
    try {
      await logout(); 
      router.push("/login");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  // Card div for containing progress stats
  function StatCard({ title, value, description, progress }) {
    return (
      <div className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm text-[var(--foreground)]">{title}</h3>
          <p className="text-2xl font-semibold mt-2">{value}</p>
          {description && (
            <p className="text-xs text-[var(--foreground)] mt-1">
              {description}
            </p>
          )}
        </div>

        <div className="mt-4">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                background: "var(--button)",
              }}
              aria-hidden="true"
            />
          </div>
          <div className="text-xs text-[var(--foreground)] mt-2">
            {progress}% progress
          </div>
        </div>
      </div>
    );
  }

  function CircleScore({ score }) {
    const pct = Math.max(0, Math.min(100, score));
    const r = 28;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return (
      <div className="flex items-center justify-center">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
          <g transform="translate(36,36)">
            <circle r={r} fill="none" stroke="#eee" strokeWidth="6" />
            <circle
              r={r}
              fill="none"
              stroke="var(--button)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform="rotate(-90)"
            />
          </g>
        </svg>
        <div className="absolute text-sm font-semibold">{pct}%</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-[var(--foreground)]">
      {/* Navbar - Fixed the styling here */}
      <nav className="w-full p-4 shadow-md bg-white">
        <div className="flex justify-between items-center">
          {" "}
          {/* Removed shadow-md */}
          <h1 className="font-bold text-lg text-[var(--foreground)]">Tindig</h1>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="btn-logout px-4 py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content (rest of your code is unchanged) */}
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Progress Summary</h2>
        </div>

        {/* Floating Start Detection button - fixed, always on top */}
        <button
          onClick={handleStartDetection}
          className="fixed left-1/2 bottom-6 z-50 bg-[#388efe] hover:bg-[#2f76d9] text-white px-6 py-4 rounded-full shadow-lg text-base md:text-lg font-semibold flex items-center gap-3 transform -translate-x-1/2"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
          aria-label="Start detection camera"
        >
          Start Posture Session
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Streak"
            value="12 days"
            description="Keep it up! Last session: today"
            progress={80}
          />

          <StatCard
            title="Weekly Sessions"
            value="4 / 5"
            description="Sessions completed this week"
            progress={80}
          />

          <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-between">
            <div className="w-full flex justify-between items-center">
              <div>
                <h3 className="text-sm text-[var(--foreground)]">
                  Posture Score
                </h3>
                <p className="text-2xl font-semibold mt-2">72</p>
                <p className="text-xs text-[var(--foreground)] mt-1">
                  Average for last 7 days
                </p>
              </div>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <CircleScore score={72} />
              </div>
            </div>

            <div className="w-full mt-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `72%`, background: "var(--button)" }}
                />
              </div>
              <div className="text-xs text-[var(--foreground)] mt-2">
                Goal: 80%
              </div>
            </div>
          </div>
        </div>

        {/* Additional rows/cards - example mini-cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <StatCard
            title="Focus Minutes"
            value="35"
            description="Today"
            progress={58}
          />
          <StatCard
            title="Bad Posture Events"
            value="3"
            description="Yesterday"
            progress={40}
          />
          <StatCard
            title="Consistency"
            value="4.2"
            description="Avg. score"
            progress={64}
          />
        </div>
      </main>
    </div>
  );
}
