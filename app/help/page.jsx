"use client";

import { useRouter } from "next/navigation";

export default function HelpPage() {
  const router = useRouter();

  // Back button handler
  const goBack = () => {
    try {
      router.back();
    } catch {
      // Fallback to history if router.back() isn't available
      if (
        typeof window !== "undefined" &&
        window.history &&
        window.history.length > 0
      ) {
        window.history.back();
      }
    }
  };

  const faqs = [
    {
      q: 'What does "good sitting posture" actually look like?',
      a: 'A good sitting posture generally means:\n• Ears aligned over your shoulders.\n• Shoulders pulled back and relaxed, not rounded forward.\n• Spine following its natural "S" curve, with lower back supported.\n• Feet flat on the floor, with knees at or slightly below hip level.',
      img: "/good-sitting-posture.jpg",
      imgAlt: "Illustration of good and bad sitting postures",
    },
    {
      q: "I sit at a desk all day. How often should I take breaks?",
      a: "It's recommended to take a short break every 30 minutes. Stand up, stretch, and walk around for 1-2 minutes. Use Tindig's session-based monitoring as a built-in reminder to take these essential breaks.",
    },
    {
      q: "How do I start a live posture detection session?",
      a: '1. From the dashboard click "Start Camera".\n2. Allow camera permissions when prompted.\n3. The app will analyze posture in real-time and save a session when you stop.',
    },
    {
      q: "Can Tindig fix my existing back pain?",
      a: "Tindig is not a medical device. It is a wellness tool designed for awareness and habit formation. While improving your posture can alleviate pain caused by poor habits, it is not a substitute for professional medical diagnosis or treatment. If you have persistent pain, please consult a doctor or physical therapist.",
    },
    {
      q: "My phone sometimes doesn't detect my posture correctly. Why?",
      a: "Tindig relies on your phone's camera and works best under optimal conditions. Make sure you satisfy the following:\n\n• Lighting: Ensure you are in a well-lit area. Poor lighting can affect accuracy.\n• Camera Position: Your phone must be stable, on an even surface, and have an unobstructed view of your upper body. The camera distance must be within arm's reach.\n• Body Angle: The app strictly requires your body to be facing the camera. Any slight angle deviations will likely be detected as bad posture.\n\nRemember, the app focuses on the upper body (head, neck, shoulders) and may not detect issues related to your lower back or pelvis.",
    },
  ];

  const faqStyle =
    "details summary { display: flex; gap: 0.5rem; cursor: pointer; } details summary::-webkit-details-marker { display: none; } .faq-arrow { transition: transform 180ms ease; display: inline-block; } details[open] .faq-arrow { transform: rotate(90deg); }";

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-[var(--foreground)] flex justify-center">
      <div className="w-full max-w-3xl text-center">
        {/* Back button*/}
        <div className="flex items-center justify-start mb-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-base hover:bg-gray-50 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-4">Help & User Manual</h1>

        {/* Insert inline style early so it applies to details in the page */}
        <style dangerouslySetInnerHTML={{ __html: faqStyle }} />

        {/*
        ===============
        Physical Setup Section
        ===============
        */}
        <section
          aria-labelledby="setup-heading"
          className="w-full mb-6 text-left"
        >
          <h2
            id="setup-heading"
            className="text-2xl font-semibold mb-3 text-left"
          >
            Physical Setup
          </h2>

          <div className="bg-white border border-gray-200 rounded-md p-4 mx-auto max-w-3xl text-justify text-sm text-gray-700 space-y-3">
            <p>
              Before you start tracking your posture, you must ensure proper camera setup and environment conditions. Follow these guidelines to get the
              camera and environment right for accurate posture detection.
            </p>
            <img src="./help_setup.png" alt="Visualization of physical setup" />
            <ul className="list-disc pl-5">
              <li>
                Camera position: place your phone on a stable surface directly
                in front of you so your body is centered in the frame.
              </li>
              <li>
                Device stability: avoid holding the device, put it on a tripod
                or lean it against a stable object to prevent jitter.
              </li>
              <li>
                Distance and framing: sit about an arm's length away so your
                head, neck and shoulders are visible. The app needs a clear,
                unobstructed view of your upper body.
              </li>
              <li>
                Lighting: make sure your room has enough light so your face and
                shoulders are not in shadow. Use a front-facing light if
                necessary.
              </li>
            </ul>
          </div>
        </section>

        {/*
        ===============
        FAQ Section
        ===============
        */}
        <section aria-labelledby="faq-heading" className="w-full">
          <h2
            id="faq-heading"
            className="text-2xl font-semibold mb-3 text-center"
          >
            Frequently Asked Questions (FAQ)
          </h2>

          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <details
                key={idx}
                className="bg-white border border-gray-200 rounded-md p-4 mx-auto max-w-3xl"
                aria-expanded="false"
              >
                <summary className="cursor-pointer select-none list-none font-medium text-gray-800 flex w-full items-center justify-start gap-2 text-left">
                  <span className="faq-arrow" aria-hidden>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="inline-block"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="flex-1 text-left">{item.q}</span>
                </summary>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap text-left text-justify mx-auto max-w-[44rem]">
                  {item.a}
                  {item.img && (
                    <img
                      src={item.img}
                      alt={item.imgAlt || ""}
                      className="mt-3 mx-auto rounded shadow max-w-full h-auto"
                    />
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/*
        ===============
        External Resources Section
        ===============
        */}
        <section aria-labelledby="resources-heading" className="w-full mt-6">
          <h2
            id="resources-heading"
            className="text-2xl font-semibold mb-3 text-center"
          >
            External Resources
          </h2>

          <div className="bg-white border border-gray-200 rounded-md p-4 mx-auto max-w-3xl text-left text-sm text-gray-700 space-y-2">
            <p>Further reading and useful links:</p>
            <ul className="list-disc pl-5">
              <li>
                <a
                  href="https://medlineplus.gov/guidetogoodposture.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  MedlinePlus: Guide to Good Posture
                </a>
              </li>
              <li>
                <a
                  href="https://www.healthdirect.gov.au/how-to-improve-your-posture"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  HealthDirect: How to Improve Your Posture
                </a>
              </li>
              <li>
                <a
                  href="https://www.physio-pedia.com/Forward_Head_Posture"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Physio-Pedia: Forward Head Posture
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
