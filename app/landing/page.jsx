"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const goToSignUp = () => router.push("/register");

  // Simple carousel images (placeholders) - replace src with your images
  const images = ["/vercel.svg", "/next.svg", "/window.svg"];

  function Carousel({ items = images, interval = 4000 }) {
    const [index, setIndex] = useState(0);
    const timeoutRef = useRef(null);
    const containerRef = useRef(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);

    useEffect(() => {
      if (!isDragging.current) {
        timeoutRef.current = setTimeout(() => {
          setIndex((i) => (i + 1) % items.length);
        }, interval);
      }
      return () => clearTimeout(timeoutRef.current);
    }, [index, items.length, interval]);

    const prev = () => {
      clearTimeout(timeoutRef.current);
      setIndex((i) => (i - 1 + items.length) % items.length);
    };

    const next = () => {
      clearTimeout(timeoutRef.current);
      setIndex((i) => (i + 1) % items.length);
    };

    // Pointer / touch handlers for swipe
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onPointerDown = (e) => {
        isDragging.current = true;
        clearTimeout(timeoutRef.current);
        startX.current = e.touches ? e.touches[0].clientX : e.clientX;
        currentX.current = startX.current;
      };

      const onPointerMove = (e) => {
        if (!isDragging.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        currentX.current = clientX;
      };

      const onPointerUp = () => {
        if (!isDragging.current) return;
        const dx = currentX.current - startX.current;
        const threshold = 50; // px
        if (dx > threshold) {
          prev();
        } else if (dx < -threshold) {
          next();
        }
        isDragging.current = false;
        startX.current = 0;
        currentX.current = 0;
      };

      // Touch events
      el.addEventListener("touchstart", onPointerDown, { passive: true });
      el.addEventListener("touchmove", onPointerMove, { passive: true });
      el.addEventListener("touchend", onPointerUp);

      // Mouse events for desktop drag
      el.addEventListener("mousedown", onPointerDown);
      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);

      return () => {
        el.removeEventListener("touchstart", onPointerDown);
        el.removeEventListener("touchmove", onPointerMove);
        el.removeEventListener("touchend", onPointerUp);
        el.removeEventListener("mousedown", onPointerDown);
        window.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);
      };
    }, [items.length]);

    return (
      <div className="w-full flex flex-col items-center mb-6">
        <div
          ref={containerRef}
          className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded-xl bg-transparent"
        >
          {items.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`slide-${i}`}
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {/* Line indicators */}
        <div className="flex items-center gap-2 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1 transition-all rounded-full ${
                i === index
                  ? "w-8 bg-[var(--button)]"
                  : "w-6 bg-[rgba(43,43,43,0.2)] opacity-60"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="w-full max-w-3xl p-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Welcome to Tindig
        </h1>
        <p className="text-[rgba(43,43,43,0.8)] mb-8">
          Improve your posture with simple daily sessions and measurable
          progress.
        </p>

        {/* Carousel inserted here */}
        <Carousel />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={goToSignUp}
            className="btn-primary px-8 py-4 rounded-full text-base md:text-lg font-semibold shadow-sm min-w-[160px]"
            aria-label="Get started - Sign up"
          >
            Get Started
          </button>

          {/* Omitted login redirect*/}
          {/*
          <div className="text-sm text-[rgba(43,43,43,0.75)] flex items-center gap-2">
            <span>Already have an account?</span>
            <a
              href="/login"
              className="text-[var(--button)] underline font-medium"
              aria-label="Login"
            >
              Login
            </a>
          </div>
          */}
        </div>
      </div>
    </main>
  );
}
