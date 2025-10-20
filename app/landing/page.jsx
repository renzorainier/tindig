"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const goToSignUp = () => router.push("/register");

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

  {/* Carousel removed */}

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
