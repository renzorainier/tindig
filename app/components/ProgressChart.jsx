"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function hexToRgba(hex = "#d8245c", alpha = 1) {
  const h = hex.replace("#", "").trim();
  const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ProgressChart({ labels = [], points = [] }) {
  // read CSS variables so chart matches theme
  const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const graphColor = css?.getPropertyValue("--graph")?.trim() || "#d8245c";
  const buttonColor = css?.getPropertyValue("--button")?.trim() || "#388efe";

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Progress",
        data: points,
        borderColor: graphColor,
        backgroundColor: hexToRgba(graphColor, 0.12),
        fill: true,
        tension: 0.32,
        pointRadius: 3,
        pointBackgroundColor: buttonColor,
      },
    ],
  }), [labels, points, graphColor, buttonColor]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "rgba(0,0,0,0.55)" } },
      y: { grid: { color: "rgba(0,0,0,0.04)" }, beginAtZero: true, ticks: { color: "rgba(0,0,0,0.55)" } },
    },
  }), []);

  return (
    <div className="w-full h-44 md:h-64">
      <Line data={data} options={options} />
    </div>
  );
}