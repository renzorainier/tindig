// Dashboard page
"use client";

import Chart from "chart.js/auto";
import { useRef, useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";
import { useRouter } from "next/navigation";

import { db } from "../firebase/config";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import SessionSummaryModal from "../main/SessionSummaryModal";

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  // show modal listing all summaries
  const [showAllSummariesModal, setShowAllSummariesModal] = useState(false);
  // selected summary for detail view
  const [selectedSummary, setSelectedSummary] = useState(null);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [totals, setTotals] = useState({ total: 0, good: 0, bad: 0 });

  const [errorMsg, setErrorMsg] = useState(null);
  const [indexWarning, setIndexWarning] = useState(null);

  const [indexSpec, setIndexSpec] = useState(null);
  const [showIndexConfig, setShowIndexConfig] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  // control showing all recent sessions vs limited view
  const [showAllRecent, setShowAllRecent] = useState(false);
  // derive displayed recent sessions (default: last 5)
  const recentSessions = showAllRecent
    ? sessions.slice().reverse()
    : sessions.slice(-5).reverse();

  // Theme (light / dark)
  const [theme, setTheme] = useState("light");

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme");
    const initial =
      saved ||
      (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initial);
    // apply to document
    document.documentElement.setAttribute("data-theme", initial);
    document.documentElement.style.colorScheme =
      initial === "dark" ? "dark" : "light";
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* ignore storage errors */
    }
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme =
      next === "dark" ? "dark" : "light";
  };

  const isGoodSession = (summaryOrMetrics) => {
    // prefer summary if available
    if (!summaryOrMetrics) return false;
    // If a summary object is passed, use the goodPosturePercent threshold
    if (typeof summaryOrMetrics.goodPosturePercent !== "undefined") {
      const gp = Number(summaryOrMetrics.goodPosturePercent || 0);
      return gp >= 50; // treat >=50% good posture as "Good"
    }
    // fallback to old meanMetrics heuristic
    const meanMetrics = summaryOrMetrics.meanMetrics ?? summaryOrMetrics;
    if (!meanMetrics) return false;
    const sh = Number(meanMetrics.shoulderDiffPx ?? 9999);
    const ho = Number(meanMetrics.headOffsetX ?? 9999);
    return sh < 25 && ho < 30;
  };

  useEffect(() => {
    let mounted = true;
    const fetchSessions = async () => {
      try {
        setErrorMsg(null);
        if (!currentUser?.uid) {
          setSessions([]);
          setChartData(null);
          setTotals({ total: 0, good: 0, bad: 0 });
          return;
        }

        console.debug("Fetching sessions for uid:", currentUser.uid);
        const colRef = collection(db, "posture_recordings");
        const orderedQuery = query(
          colRef,
          where("userId", "==", currentUser.uid),
          orderBy("clientCreatedAt", "asc")
        );

        let snap;
        let usedFallback = false; // track whether we used the unordered fallback
        try {
          snap = await getDocs(orderedQuery);
        } catch (qErr) {
          const msg = String(qErr?.message || qErr);
          console.warn("Initial query failed:", msg);
          if (msg.toLowerCase().includes("index")) {
            usedFallback = true;
            // Build a small index spec the user can copy into Firebase Console or firestore.indexes.json
            const spec = {
              collectionId: "posture_recordings",
              queryScope: "COLLECTION",
              fields: [
                { fieldPath: "userId", order: "ASCENDING" },
                { fieldPath: "clientCreatedAt", order: "ASCENDING" },
              ],
            };
            setIndexSpec(spec);
            setIndexWarning(
              "Server-side ordering requires a Firestore composite index. Results are shown unordered. Create the index in Firebase Console (Firestore → Indexes → Add Index) or paste the sample below."
            );
            console.debug(
              "Falling back to unordered query (no orderBy) for uid:",
              currentUser.uid
            );
            try {
              const fallbackQuery = query(
                colRef,
                where("userId", "==", currentUser.uid)
              );
              snap = await getDocs(fallbackQuery);
            } catch (fallbackErr) {
              throw fallbackErr;
            }
          } else {
            throw qErr;
          }
        }
        // If we did NOT fall back, clear any previous index warning/spec (index is present/working)
        if (!usedFallback) {
          setIndexWarning(null);
          setIndexSpec(null);
          setShowIndexConfig(false);
        }
        setErrorMsg(null);

        console.debug("Firestore query returned size:", snap.size);
        snap.docs.forEach((d) => console.debug("doc:", d.id, d.data()));

        if (!mounted) return;

        let docs = snap.docs.map((d) => {
          const data = d.data();
          // numeric timestamp for sorting (fallback to createdAt or now)
          const t = Number(
            data.clientCreatedAt ??
              (data.createdAt?.seconds
                ? data.createdAt.seconds * 1000
                : Date.now())
          );
          // prefer a stored YYYY-MM-DD string if available; otherwise derive a date-only string
          const dateStr =
            data.clientCreatedAtDate ||
            (Number.isFinite(t)
              ? new Date(Number(t)).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]);
          return {
            id: d.id,
            t,
            dateStr,
            meanMetrics: data.meanMetrics || null,
            baseline: data.baseline || null,
            summary: data.summary || null,
            durationMs: data.durationMs ?? null,
            timeline: data.timeline || data.summary?.timeline || [], // Include timeline data
            frames: data.frames || null,
            createdAt: data.createdAt || null,
            userId: data.userId || null,
          };
        });

        docs.sort((a, b) => Number(a.t) - Number(b.t));

        let good = 0;
        let bad = 0;
        docs.forEach((s) => {
          // prefer summary for classification; fallback handled in isGoodSession
          if (isGoodSession(s.summary ?? s.meanMetrics)) good++;
          else bad++;
        });

        // Use the saved YYYY-MM-DD date string when present (no time), otherwise fallback to a date-only string
        const labels = docs.map(
          (s) => s.dateStr || new Date(Number(s.t)).toLocaleDateString()
        );

        const shoulderData = docs.map((s) =>
          Number(s.meanMetrics?.shoulderDiffPx ?? 0)
        );
        const headOffsetData = docs.map((s) =>
          Number(s.meanMetrics?.headOffsetX ?? 0)
        );
        const eyeDistData = docs.map((s) =>
          Number(s.meanMetrics?.interEyeDistancePx ?? 0)
        );

        setSessions(docs);
        setTotals({ total: docs.length, good, bad });
        setChartData({
          labels,
          datasets: [
            {
              label: "Avg Shoulder Diff (px)",
              data: shoulderData,
              borderColor: "rgba(75,192,192,1)",
              backgroundColor: "rgba(75,192,192,0.15)",
              tension: 0.3,
              fill: true,
            },
            {
              label: "Avg Head Offset (px)",
              data: headOffsetData,
              borderColor: "rgba(255,159,64,1)",
              backgroundColor: "rgba(255,159,64,0.15)",
              tension: 0.3,
              fill: true,
            },
            {
              label: "Avg Inter-Eye Dist (px)",
              data: eyeDistData,
              borderColor: "rgba(153,102,255,1)",
              backgroundColor: "rgba(153,102,255,0.15)",
              tension: 0.3,
              fill: true,
            },
          ],
        });
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        setErrorMsg(
          (err && (err.message || String(err))) ||
            "Unknown error fetching sessions"
        );
        setSessions([]);
        setChartData(null);
        setTotals({ total: 0, good: 0, bad: 0 });
      }
    };

    fetchSessions();
    return () => {
      mounted = false;
    };
  }, [currentUser?.uid]);

  // Update chart whenever chartData or window size changes
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext("2d");

    // pick friendly aspect ratio and tick limits for small screens
    const aspectRatio = windowWidth < 480 ? 1.1 : windowWidth < 768 ? 1.6 : 2.5;
    const maxTicks = windowWidth < 480 ? 4 : windowWidth < 768 ? 6 : 10;
    const pointRadius = windowWidth < 480 ? 2 : 4;

    const data = chartData || {
      labels: [],
      datasets: [
        {
          label: "Posture Sessions",
          data: [0],
        },
      ],
    };

    // Make every dataset a line (no bars)
    const lineData = {
      labels: data.labels,
      datasets: (data.datasets || []).map((ds, idx) => ({
        ...ds,
        type: "line",
        borderWidth: 2,
        pointRadius: Math.max(1, pointRadius),
        pointHoverRadius: Math.min(6, pointRadius + 2),
        tension: 0.25,
        fill: ds.fill ?? true,
        order: 2 + idx,
      })),
    };

    const cfg = {
      type: "line",
      data: lineData,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: maxTicks,
            },
            stacked: false,
          },
        },
        plugins: {
          legend: { position: "top" },
          tooltip: { mode: "index", intersect: false },
        },
        interaction: { mode: "nearest", axis: "x", intersect: false },
        elements: { line: { tension: 0.25 } },
      },
    };

    chartInstance.current = new Chart(ctx, cfg);

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [chartData, windowWidth]);

  // resize listener to update windowWidth (debounced-ish)
  useEffect(() => {
    let t = null;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => setWindowWidth(window.innerWidth), 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, []);

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
      <div style={{ userSelect: "none" }} className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between">
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

  const copyIndexSpec = async () => {
    if (!indexSpec) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(indexSpec, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.warn("Clipboard write failed", err);
    }
  };

  return (
    <div
      className="min-h-screen text-[var(--foreground)] flex flex-col items-center"
      style={{
        background:
          "linear-gradient(180deg, var(--background) 0%, var(--background-gradient-end) 100%)",
      }}
    >
      {/* Top nav */}
      <nav className="w-full p-4 nav-surface nav-border shadow-md backdrop-blur-sm sticky top-0 z-30 rounded-b-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="tindig text-lg">Tindig</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm mr-3 hidden sm:block nav-text">
              Signed in as{" "}
              <strong className="nav-strong">
                {currentUser?.email || "User"}
              </strong>
            </div>
            {/* Theme toggle button with additional accessibility features */}
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={theme === "dark"}
              aria-label={`Toggle theme, currently ${theme}`}
              title={`Theme: ${theme}`}
              className="inline-flex items-center gap-3 p-1 rounded-lg border border-white focus:outline-none"
            >
              {/* sliding label (shows Light Mode / Dark Mode) */}
              <span className="inline-flex overflow-hidden w-16 h-6">
                <span
                  className="inline-flex"
                  style={{
                    transform:
                      theme === "dark" ? "translateX(-50%)" : "translateX(0)",
                    transition: "transform 220ms ease",
                  }}
                >
                  <span className="w-16 text-sm select-none inline-flex flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                    <span>Light</span>
                  </span>
                  <span className="w-16 text-sm select-none inline-flex flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-yellow-200"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Dark</span>
                  </span>
                </span>
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="btn-primary px-4 py-2 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-md sm:max-w-3xl w-full mx-4 sm:mx-auto p-4 sm:p-6 mt-4">
        {/* Hero */}
        <section className="rounded-2xl p-4 sm:p-6 mb-6 bg-indigo-600 text-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome back
                {currentUser?.email
                  ? `, ${currentUser.email.split("@")[0]}`
                  : ""}{" "}
                👋
              </h2>
              <p className="mt-1 text-sm opacity-90">
                Track posture trends, review sessions, and start the camera to
                analyze posture in real time.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs opacity-80">Total</div>
                <div className="text-2xl font-bold">{totals.total}</div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80">Good</div>
                <div className="text-2xl font-bold">{totals.good}</div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80">Needs Work</div>
                <div className="text-2xl font-bold text-yellow-200">
                  {totals.bad}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartDetection}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-2xl font-semibold transition w-full sm:w-auto"
            >
              Start Camera
            </button>
            <button
              onClick={() => router.push("/help")}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-2xl w-full sm:w-auto"
            >
              Help
            </button>
          </div>
        </section>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
            Error fetching sessions: {errorMsg}
          </div>
        )}
        {indexWarning && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">Index Warning</div>
                <div className="mt-1 text-xs">
                  Server-side ordering requires a Firestore composite index.
                  Results may be unordered.
                </div>
              </div>
              <div className="text-right">
                <button
                  onClick={() => setShowIndexConfig((s) => !s)}
                  className="text-sm underline"
                >
                  Show
                </button>
              </div>
            </div>
            {showIndexConfig && indexSpec && (
              <pre className="mt-3 overflow-auto text-xs bg-white p-3 border rounded text-gray-800">
                {JSON.stringify(
                  {
                    indexes: [
                      {
                        collectionId: indexSpec.collectionId,
                        fields: indexSpec.fields,
                        queryScope: indexSpec.queryScope,
                      },
                    ],
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        )}

        {/* Stats + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 sm:p-5 shadow-lg ring-1 ring-black/5 dark:ring-white/5 rounded-2xl">
            <h3 className="text-sm text-gray-500">Total Sessions</h3>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-3xl font-bold">{totals.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  All recorded posture sessions
                </p>
              </div>
              <CircleScore
                score={
                  totals.total === 0
                    ? 0
                    : Math.round(
                        (totals.good / Math.max(1, totals.total)) * 100
                      )
                }
              />
            </div>
          </div>
          <div className="card p-4 sm:p-5 shadow-lg ring-1 ring-black/5 dark:ring-white/5 rounded-2xl">
            <h3 className="text-sm text-gray-500">Good Sessions</h3>
            <p className="text-3xl font-bold mt-3 text-green-600">
              {totals.good}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {totals.good}/{totals.total} sessions
            </p>
          </div>
          <div className="card p-4 sm:p-5 shadow-lg ring-1 ring-black/5 dark:ring-white/5 rounded-2xl">
            <h3 className="text-sm text-gray-500">Needs Improvement</h3>
            <p className="text-3xl font-bold mt-3 text-yellow-600">
              {totals.bad}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {totals.bad}/{totals.total} sessions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-3 chart-area shadow-lg ring-1 ring-black/5 dark:ring-white/5 rounded-2xl">
            <h4 className="text-sm font-semibold mb-3">Posture Trends</h4>
            <div className="relative h-72">
              <canvas ref={chartRef} className="chart-canvas"></canvas>
            </div>
          </div>

          {/* Recent Sessions list */}
          <div className="card p-3 shadow-lg ring-1 ring-black/5 dark:ring-white/5 rounded-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Recent Sessions</h4>
              <div className="text-xs text-gray-400">
                {sessions.length} entries
              </div>
            </div>
            <div className="mt-3 divide-y">
              {sessions.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  No sessions recorded yet.
                </div>
              )}
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 flex items-center justify-between rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium">{s.dateStr}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {s.summary
                        ? `Good ${Number(
                            s.summary.goodPosturePercent ?? 0
                          ).toFixed(1)}% • Bad ${Number(
                            s.summary.badPosturePercent ?? 0
                          ).toFixed(1)}%`
                        : `Shoulder ${Number(
                            s.meanMetrics?.shoulderDiffPx ?? 0
                          ).toFixed(1)} px • Head ${Number(
                            s.meanMetrics?.headOffsetX ?? 0
                          ).toFixed(1)} px`}
                    </div>
                  </div>
                  <div className="text-right">
                    {isGoodSession(s.summary ?? s.meanMetrics) ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-green-50 text-green-700">
                        Good
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-yellow-50 text-yellow-800">
                        Needs Work
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {/* toggle button */}
              {sessions.length > 5 && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => setShowAllRecent((s) => !s)}
                    className="text-sm underline"
                    aria-expanded={showAllRecent}
                  >
                    {showAllRecent ? "Show less" : `Show all (${sessions.length})`}
                  </button>
                </div>
              )}
              {/* show-all-summaries button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setShowAllSummariesModal(true)}
                  className="text-sm underline"
                >
                  View all session summaries
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* All Summaries modal (list) */}
      {showAllSummariesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">All Session Summaries</h3>
              <button
                onClick={() => setShowAllSummariesModal(false)}
                className="text-sm text-gray-600 underline"
              >
                Close
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y rounded-md border bg-gray-50 p-2">
              {sessions.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No summaries yet.</div>
              )}
              {sessions
                .slice()
                .reverse()
                .map((s) => {
                  // Safely determine good/bad percentages
                  const isGood = isGoodSession(s.meanMetrics);
                  const hasSummary = !!s.summary;
                  const goodPercent = hasSummary
                    ? Number(s.summary.goodPosturePercent ?? 0)
                    : isGood
                    ? 100
                    : 0;
                  const badPercent = hasSummary
                    ? Number(s.summary.badPosturePercent ?? 0)
                    : isGood
                    ? 0
                    : 100;

                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        const normalized = {
                          // Preserve original summary if it exists
                          ...(s.summary || {}),
                          // Add missing fields
                          goodPosturePercent: s.summary?.goodPosturePercent ?? (isGood ? 100 : 0),
                          badPosturePercent: s.summary?.badPosturePercent ?? (isGood ? 0 : 100),
                          issueBreakdown: s.summary?.issueBreakdown ?? {
                            slouchingTimeMs: 0,
                            leaningBackTimeMs: 0,
                            headTiltTimeMs: 0,
                            shoulderTimeMs: isGood ? 0 : (s.durationMs ?? 0),
                          },
                          // Ensure timeline exists and use original if available
                          timeline: s.timeline || s.summary?.timeline || [{
                            type: isGood ? "Good" : "Bad",
                            reasons: isGood ? [] : ["Posture needs work"],
                            durationMs: s.durationMs ?? 0,
                            startTime: s.t,
                            endTime: s.t + (s.durationMs ?? 0),
                            state: isGood ? "Good" : '["Posture needs work"]',
                          }],
                          totalDurationMs: s.durationMs ?? 0,
                          baseline: s.baseline ?? null,
                          meanMetrics: s.meanMetrics ?? null,
                          clientCreatedAt: s.t,
                          clientCreatedAtDate: s.dateStr,
                          frames: s.frames ?? null,
                          createdAt: s.createdAt ?? null,
                        };
                        setSelectedSummary(normalized);
                        setShowAllSummariesModal(false);
                      }}
                      className="w-full text-left p-3 hover:bg-white/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">{s.dateStr}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {hasSummary
                            ? `Good ${goodPercent.toFixed(1)}% • Bad ${badPercent.toFixed(1)}%`
                            : `${isGood ? "Good" : "Needs Work"} • ${
                                s.durationMs
                                  ? `${Math.round(s.durationMs / 1000)}s`
                                  : "No duration"
                              }`}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">View</div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {/* Detail summary modal */}
      {selectedSummary && (
        <SessionSummaryModal
          summary={selectedSummary}
          onClose={() => setSelectedSummary(null)}
          onSave={() => setSelectedSummary(null)}
        />
      )}
    </div>
  );
}
