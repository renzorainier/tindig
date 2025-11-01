"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/authContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, loginWithGoogle, createUserProfile } = useAuth();

  // Helper function to set the main error message
  const setErrorMessage = (message) => {
    setError(message);
    setTimeout(() => setError(""), 5000);
  };

  // Function to handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await loginWithGoogle();
      const user = result.user;
      const isNewUser = result?.additionalUserInfo?.isNewUser;

      if (isNewUser) {
        await createUserProfile(user.uid, {
          email: user.email,
          displayName: user.displayName || "",
          createdAt: new Date(),
        });
      } else {
        await createUserProfile(user.uid, { lastLogin: new Date() });
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Google Auth Error:", err);
      if (err.code === "auth/account-exists-with-different-credential") {
        setErrorMessage(
          "An account already exists with the same email address. Please sign in using your original sign-in method."
        );
      } else if (err.code === "auth/unauthorized-domain") {
        setErrorMessage(
          "Domain not authorized. Please check your Firebase console settings."
        );
      } else {
        setErrorMessage("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Unused Function for handling Email/Password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      const user = result.user;

      if (user) {
        await createUserProfile(user.uid, { lastLogin: new Date() });
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Email/Password Login Error:", err);

      if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please register first.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-credential") {
        setError(
          "Invalid login credentials. Please check your email and password."
        );
      } else {
        setError("Failed to sign in. " + (err.message || "Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ userSelect: "none" }}>
      {/* Top half - visuals */}
      <section
        style={{ height: "25vh", backgroundColor: "var(--svg-divider-bg)" }}
        className="relative w-full flex items-center justify-center overflow-hidden"
      >
        <div className="max-w-4xl w-full px-6 flex items-center justify-center">
          <div className="absolute bottom-0">
            <img
              src="/Vector.png"
              alt="Tindig illustration"
              className="outline-shadow mx-auto mb-4 w-36 h-auto"
            />
          </div>
        </div>
      </section>

      {/* Bottom half - form */}
      <section
        style={{ height: "70vh", backgroundColor: "var(--background)" }}
        className="w-full relative flex items-center justify-center"
      >
        {/* Divider*/}
        <div className="absolute top-0 left-0 w-full -mt-0 pointer-events-none">
          <svg
            className="svg-divider"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
          >
            <g>
              <path
                d="M1000 100C500 100 500 64 0 64V0h1000v100Z"
                opacity="0.5"
              ></path>
              <path
                d="M1000 100C500 100 500 34 0 34V0h1000v100Z"
                opacity="0.5"
              ></path>
              <path d="M1000 100C500 100 500 4 0 4V0h1000v100Z"></path>
            </g>
          </svg>
        </div>

        <div className="w-[85%] max-w-sm rounded-2xl p-8 bg-white shadow-xl">
          <h2 className="text-center mb-6 tindig text-gray-800">Tindig</h2>
          <label className="font-bold mb-6 text-black">Log In</label>

          <p className="paragraph">
            By continuing, you are agreeing to our
            <span className="terms"> Terms of Service</span> and
            <span className="privacy"> Privacy Policy</span>
          </p>

          {/* Display Error Message */}
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Google Login */}
          <div className="google-signin-btn-container">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="google-signin-btn"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="google-signin-icon" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>

          <p className="paragraph mt-5">
            Need an account?{" "}
            <Link href="/register" className="text-indigo-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </section>

      {/* Footer - Solid color */}
      <section
        style={{ height: "7vh", backgroundColor: "var(--svg-divider-bg)" }}
        className="w-full relative flex items-center justify-center"
      >
        <div className="absolute bottom-0 left-0 w-full -mt-0 pointer-events-none">
          <svg className="svg-divider w-full block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden>
            <g fill="currentColor" transform="translate(0 100) scale(1 -1)">
              <path d="M500 80.7C358 68 0 4 0 4V0h1000v84.7c-216 23.3-358 8.6-500-4Z" opacity=".3"></path>
              <path d="M500 65.7C358 53 0 4 0 4V0h1000v62.7c-216 23.3-358 15.6-500 3Z" opacity=".5"></path>
              <path d="M500 50.7C358 38 0 4 0 4V0h1000v40.7C784 64 642 63.3 500 50.7Z"></path>
            </g>
          </svg>
        </div>
      </section>
    </div>
  );
}
