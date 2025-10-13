// Dashboard page
"use client";

import Chart from 'chart.js/auto';
import { useRef, useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";
import { useRouter } from "next/navigation";

import { db } from '../firebase/config';
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import ProgressChart from "../components/ProgressChart";

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [totals, setTotals] = useState({ total: 0, good: 0, bad: 0 });

  const [errorMsg, setErrorMsg] = useState(null);
  const [indexWarning, setIndexWarning] = useState(null);

  // Add state for providing a copyable index spec and small UI controls
  const [indexSpec, setIndexSpec] = useState(null);
  const [showIndexConfig, setShowIndexConfig] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // track window width so the chart can adapt for mobile
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const isGoodSession = (meanMetrics) => {
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
        const orderedQuery = query(colRef, where("userId", "==", currentUser.uid), orderBy("clientCreatedAt", "asc"));

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
                 { fieldPath: "clientCreatedAt", order: "ASCENDING" }
               ]
             };
             setIndexSpec(spec);
             setIndexWarning(
               "Server-side ordering requires a Firestore composite index. Results are shown unordered. Create the index in Firebase Console (Firestore → Indexes → Add Index) or paste the sample below."
             );
             console.debug("Falling back to unordered query (no orderBy) for uid:", currentUser.uid);
             try {
               const fallbackQuery = query(colRef, where("userId", "==", currentUser.uid));
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
          const t = Number(data.clientCreatedAt ?? (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now()));
          // prefer a stored YYYY-MM-DD string if available; otherwise derive a date-only string
          const dateStr = data.clientCreatedAtDate
            || (Number.isFinite(t) ? new Date(Number(t)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          return {
            id: d.id,
            t,
            dateStr,
            meanMetrics: data.meanMetrics || null,
            baseline: data.baseline || null,
          };
        });

        docs.sort((a, b) => Number(a.t) - Number(b.t));

        let good = 0;
        let bad = 0;
        docs.forEach((s) => {
          if (isGoodSession(s.meanMetrics)) good++; else bad++;
        });

        // Use the saved YYYY-MM-DD date string when present (no time), otherwise fallback to a date-only string
        const labels = docs.map((s) => s.dateStr || (new Date(Number(s.t)).toLocaleDateString()));

        const shoulderData = docs.map((s) => Number(s.meanMetrics?.shoulderDiffPx ?? 0));
        const headOffsetData = docs.map((s) => Number(s.meanMetrics?.headOffsetX ?? 0));
        const eyeDistData = docs.map((s) => Number(s.meanMetrics?.interEyeDistancePx ?? 0));

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
        setErrorMsg(err && (err.message || String(err)) || "Unknown error fetching sessions");
        setSessions([]);
        setChartData(null);
        setTotals({ total: 0, good: 0, bad: 0 });
      }
    };

    fetchSessions();
    return () => { mounted = false; };
  }, [currentUser?.uid]);

  // Update chart whenever chartData or window size changes
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');

    // pick friendly aspect ratio and tick limits for small screens
    const aspectRatio = windowWidth < 480 ? 1.1 : windowWidth < 768 ? 1.6 : 2.5;
    const maxTicks = windowWidth < 480 ? 4 : windowWidth < 768 ? 6 : 10;
    const pointRadius = windowWidth < 480 ? 2 : 4;

    const data = chartData || {
      labels: [],
      datasets: [{
        label: 'Posture Sessions',
        data: [0],
      }],
    };

    // For this dataset: render first two series as grouped bars (shoulder/head)
    // and the inter-eye distance as a line to show trend.
    // Configure bar sizing responsive to window width.
    const isNarrow = windowWidth < 480;
    const barThickness = isNarrow ? 12 : windowWidth < 768 ? 18 : 24;
    const maxBarThickness = Math.round(barThickness * 1.4);

    // Ensure datasets have explicit types so Chart.js builds a mixed chart
    const mixedData = {
      labels: data.labels,
      datasets: (data.datasets || []).map((ds, idx) => {
        if (idx === 2) {
          // third dataset = inter-eye distance -> line
          return {
            ...ds,
            type: 'line',
            borderWidth: 2,
            pointRadius: Math.max(1, pointRadius),
            pointHoverRadius: Math.min(6, pointRadius + 2),
            tension: 0.25,
            order: 3,
          };
        }
        // first two datasets -> bars
        return {
          ...ds,
          type: 'bar',
          borderRadius: 4,
          borderSkipped: false,
          barThickness,
          maxBarThickness,
          categoryPercentage: 0.7,
          barPercentage: 0.95,
          order: 2,
        };
      }),
    };

    const cfg = {
      type: 'bar', // base type (individual datasets may override)
      data: mixedData,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: {
            ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: maxTicks },
            stacked: false,
          },
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
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
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
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

        
      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-6">Dashboard for {currentUser?.email || 'User'}</h2>

        
        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-100 text-red-700 text-sm">
            Error fetching sessions: {errorMsg}
          </div>
        )}

        
        {indexWarning && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm">
            <div>{indexWarning}</div>
            <div className="mt-2 text-xs text-yellow-700">Where: Firebase Console → Firestore → Indexes → Add Index</div>
            {indexSpec && (
              <div className="mt-3">
                <button
                  onClick={() => setShowIndexConfig((s) => !s)}
                  className="text-sm px-2 py-1 bg-yellow-100 border border-yellow-200 rounded mr-2"
                >
                  {showIndexConfig ? "Hide index config" : "Show index config"}
                </button>
                <button
                  onClick={copyIndexSpec}
                  className="text-sm px-2 py-1 bg-yellow-100 border border-yellow-200 rounded"
                >
                  Copy JSON
                </button>
                {copySuccess && <span className="ml-2 text-xs text-green-700">Copied</span>}
                {showIndexConfig && (
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
          </div>
         )}

        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm text-gray-500">Total Sessions</h4>
            <p className="text-3xl font-bold mt-2">{totals.total}</p>
            <p className="text-xs text-gray-400 mt-1">All recorded posture sessions</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm text-gray-500">Good Posture</h4>
            <p className="text-3xl font-bold mt-2">{totals.good}</p>
            <p className="text-xs text-gray-400 mt-1">{totals.good}/{totals.total} sessions are good</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm text-gray-500">Bad Posture</h4>
            <p className="text-3xl font-bold mt-2 text-red-600">{totals.bad}</p>
            <p className="text-xs text-gray-400 mt-1">{totals.bad}/{totals.total} sessions are bad</p>
          </div>
        </div>

        
        <div className="bg-white p-6 rounded-lg shadow-xl mb-8">
          <div className="relative h-80 sm:h-96"> {/* taller on mobile for improved readability */}
            <canvas ref={chartRef} className="w-full h-full"></canvas>
          </div>
        </div>

        
        <div className="flex justify-center items-center">
          <button
            onClick={handleStartDetection}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg shadow-xl text-xl font-bold transition duration-300 ease-in-out transform hover:scale-105"
          >
            Start Posture Detection Camera
          </button>
        </div>
      </div>
    </div>
  );
}