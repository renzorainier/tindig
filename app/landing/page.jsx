"use client";

import { useRouter } from "next/navigation";

// A simple SVG icon component for clarity
const IconWrapper = ({ children }) => (
  <div className="flex-none w-12 h-12 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600">
    {children}
  </div>
);

export default function LandingPage() {
  const router = useRouter();

  // Navigate to the registration page
  const goToSignUp = () => router.push("/register");

  // Smooth scroll to the "How it works" section
  const scrollToFeatures = () => {
    document.getElementById("how-it-works")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen flex flex-col bg-white text-gray-800 font-inter" style={{ userSelect: "none" }}>
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center w-full px-4 py-20 sm:py-24 md:py-32 overflow-hidden">
        {/* Subtle background glow */}
        <div
          className="absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle_at_center,_rgba(29,78,216,0.08),_transparent_40%)]" />
        </div>

        <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center">
          <img
            src="./Vector.png"
            alt="Tindig Logo"
            className="mx-auto mb-8 w-24 sm:w-32 h-auto rounded-full drop-shadow-lg"
          />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
            Welcome to Tindig
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-xl">
            Improve your posture with simple daily sessions and measurable
            progress.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <button
              onClick={goToSignUp}
              className="bg-blue-600 text-white px-8 py-3 rounded-full text-base md:text-lg font-semibold shadow-lg hover:bg-blue-700 transition-all duration-300 w-full sm:w-auto min-w-[180px] hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
              aria-label="Get started - Sign up"
            >
              Get Started
            </button>
            <button
              onClick={scrollToFeatures}
              className="bg-white text-blue-600 px-8 py-3 rounded-full text-base md:text-lg font-semibold ring-1 ring-gray-300 hover:bg-gray-100 transition-all duration-300 w-full sm:w-auto min-w-[180px] shadow-sm"
              aria-label="Learn how it works"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works" // ID for scroll-to
        className="w-full bg-gray-50 py-20 sm:py-24"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 text-gray-900">
            How it works
          </h2>

          {/* Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Card styling added */}
            <article className="flex flex-col items-start text-left gap-4 bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <IconWrapper>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </IconWrapper>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  Personalize your baseline
                </h3>
                <p className="text-base text-gray-600">
                  During a quick setup, sit in your ideal posture. The app learns
                  your baseline so feedback is tailored to your body.
                </p>
              </div>
            </article>

            {/* Feature 2: Card styling added */}
            <article className="flex flex-col items-start text-left gap-4 bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <IconWrapper>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </IconWrapper>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  Your on-screen monitor
                </h3>
                <p className="text-base text-gray-600">
                  Start a short session. A live overlay and subtle haptics guide
                  you to correct posture in real time.
                </p>
              </div>
            </article>

            {/* Feature 3: Card styling added */}
            <article className="flex flex-col items-start text-left gap-4 bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <IconWrapper>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0v-6a2 2 0 012-2h2a2 2 0 012 2v6m0 0v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6m0 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              </IconWrapper>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  See your improvement
                </h3>
                <p className="text-base text-gray-600">
                  Track trends and your progress over time. Small daily sessions
                  add up towards building habits.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* NEW: "See It in Action" Section */}




    </main>
  );
}
