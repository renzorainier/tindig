"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/app/firebase/config";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper function to set the main error message
  const setErrorMessage = (message) => {
    setError(message);
    // You might want to clear the error after a few seconds
    setTimeout(() => setError(""), 5000);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(""); // Clear any previous errors

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);

      // Check if this is a new user
      const userDoc = await getDoc(userRef);
      const isNewUser = !userDoc.exists();

      if (isNewUser) {
        // Create new account
        await setDoc(userRef, {
          userID: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          createdAt: new Date(),
        });
        console.log("New account created from login page");
      } else {
        // Update existing user's last login
        await setDoc(
          userRef,
          {
            lastLogin: new Date(),
          },
          { merge: true }
        );
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Google Auth Error:", error);
      // Check if this is an account exists with different credential error
      if (error.code === "auth/account-exists-with-different-credential") {
        setErrorMessage(
          "An account already exists with the same email address. Please sign in using your original sign-in method."
        );
      } else {
        // Handle unauthorized domain specifically if you see the error in the console
        if (error.code === "auth/unauthorized-domain") {
          setErrorMessage("Domain not authorized. Please check your Firebase console settings.");
        } else {
          setErrorMessage("Failed to sign in with Google. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Update last login in Firestore
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Email/Password Login Error:", error);

      // Handle specific error codes
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email. Please register first.");
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error.code === "auth/invalid-credential") {
        setError(
          "Invalid login credentials. Please check your email and password."
        );
      } else {
        setError(
          "Failed to sign in. " + (error.message || "Please try again.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-[85%] max-w-sm rounded-2xl p-8">
        <h2 className="text-center mb-6 tindig">Tindig</h2>
        <label className="font-bold mb-6 text-black"> Log In</label>
        <p className="paragraph">
          By continuing, you are agreeing to our
          <span className="terms"> Terms of Service</span> and
          <span className="privacy"> Privacy Policy</span>
        </p>

        {/* Display Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
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
              // LOADING STATE HTML
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  {/* The stroke (ring) */}
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  {/* The path (chasing part) */}
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              // NORMAL STATE HTML
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
    </div>
  );
}