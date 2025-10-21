"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const goToSignUp = () => router.push("/register");

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section
        style={{
          height: "50vh",
          backgroundImage:
            "linear-gradient(rgba(0,0,127,0.2), rgba(0,0,127,0.2)), url('https://cdn.svgator.com/images/2022/06/animated-svg-background-css.svg')",
          backgroundSize: "cover",
        }}
        className="relative overflow-hidden flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-3xl px-6 py-2 flex flex-col items-center text-center">
          <img
            src="/Vector.png"
            alt="Tindig illustration"
            className="mx-auto mb-8 w-30 h-auto drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Welcome to Tindig
          </h1>
          <p className="text-[rgba(43,43,43,0.8)] mb-2">
            Improve your posture with simple daily sessions and measurable
            progress.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-6">
          <button
            onClick={goToSignUp}
            className="btn-primary px-8 py-4 rounded-full text-base md:text-lg font-semibold shadow-sm min-w-[160px]"
            aria-label="Get started - Sign up"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        style={{ backgroundColor: "var(--background)", height: "50vh" }}
        className="mt-6 bg-white/80 p-6 rounded-lg shadow-sm text-left"
      >
        <h2 className="text-2xl font-bold mb-6">How it works</h2>

        <div className="space-y-6">
          <article className="flex items-start gap-4">
            <div className="flex-none w-12 h-12 flex items-center justify-center rounded-md bg-[var(--button)]/10 text-[var(--button)]">
              {/* phone-check icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7 7h10v10H7z"
                />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">
                Personalize your baseline
              </h3>
              <p className="mt-1 text-sm text-[rgba(43,43,43,0.8)]">
                During a quick setup, sit in your ideal posture. The app learns
                your baseline so feedback is tailored to your body.
              </p>
            </div>
          </article>

          <article className="flex items-start gap-4">
            <div className="flex-none w-12 h-12 flex items-center justify-center rounded-md bg-[var(--button)]/10 text-[var(--button)]">
              {/* eye/skeleton icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1"
                />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">Your on-screen monitor</h3>
              <p className="mt-1 text-sm text-[rgba(43,43,43,0.8)]">
                Start a short session. A live overlay and subtle haptics guide
                you to correct posture in real time.
              </p>
            </div>
          </article>

          <article className="flex items-start gap-4">
            <div className="flex-none w-12 h-12 flex items-center justify-center rounded-md bg-[var(--button)]/10 text-[var(--button)]">
              {/* chart (bar) icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <rect x="3" y="11" width="4" height="10" rx="1" />
                <rect x="9" y="6" width="4" height="15" rx="1" />
                <rect x="15" y="2" width="4" height="19" rx="1" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">See your improvement</h3>
              <p className="mt-1 text-sm text-[rgba(43,43,43,0.8)]">
                Track trends and your progress over time. Small daily sessions
                add up towards building habits.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
