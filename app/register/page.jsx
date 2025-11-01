"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/app/firebase/config";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/authContext";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const { currentUser } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);

      // Check if this is a new user
      // Get the document to check if user exists
      const userDoc = await getDoc(userRef);
      const isNewUser = !userDoc.exists();

      if (isNewUser) {
        // New user - set creation time
        await setDoc(userRef, {
          userID: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          createdAt: new Date(),
        });
      } else {
        // Existing user - update last login time
        await setDoc(
          userRef,
          {
            userID: user.uid,
            email: user.email,
            displayName: user.displayName || "",
            lastLogin: new Date(),
          },
          { merge: true }
        );
      }

      // Redirect to dashboard after successful sign-up
      router.push("/dashboard");
    } catch (error) {
      console.error("Google Sign-Up Error:", error);
      // Check if this is an account exists with different credential error
      if (error.code === "auth/account-exists-with-different-credential") {
        setErrorMessage(
          "An account already exists with the same email address. Please sign in using your original sign-in method."
        );
      } else {
        setErrorMessage("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate form
    if (password !== confirmPassword) {
      return setErrorMessage("Passwords don't match");
    }

    if (password.length < 6) {
      return setErrorMessage("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save user to Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        userID: user.uid,
        email: user.email,
        createdAt: new Date(),
        authProvider: "email",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Email Sign-Up Error:", error);
      // Handle specific Firebase errors
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Email already in use. Try logging in instead.");
      } else {
        setErrorMessage(
          error.message || "Failed to register. Please try again."
        );
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
        className="relative w-full flex items-center justify-center text-white overflow-hidden"
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
        style={{ height: "70vh" }}
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
          <h2 className="text-center mb-6 tindig">Tindig</h2>
          <h2 className="font-bold text-black">Sign Up</h2>
          <p className="paragraph">
            By continuing, you are agreeing to our
            <span className="terms"> Terms of Service</span> and
            <span className="privacy"> Privacy Policy</span>
          </p>

          <div className="google-signin-btn-container">
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="google-signin-btn"
            >
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
            </button>
          </div>

          {/* Footer */}
          <div className="paragraph mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </section>
      {/* Footer - Solid color */}
      <section
        style={{ height: "7vh", backgroundColor: "var(--svg-divider-bg)" }}
        className="w-full relative flex items-center justify-center"
      >
        <section
          style={{ height: "7vh", backgroundColor: "var(--svg-divider-bg)" }}
          className="w-full relative flex items-center justify-center"
        >
          <div className="absolute bottom-0 left-0 w-full -mt-0 pointer-events-none">
            <svg
              className="svg-divider w-full block"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1000 180"
              preserveAspectRatio="none"
              aria-hidden
            >
              <g fill="currentColor" transform="translate(0 100) scale(1 -1)">
                <path
                  d="M500 80.7C358 68 0 4 0 4V0h1000v84.7c-216 23.3-358 8.6-500-4Z"
                  opacity=".3"
                ></path>
                <path
                  d="M500 65.7C358 53 0 4 0 4V0h1000v62.7c-216 23.3-358 15.6-500 3Z"
                  opacity=".5"
                ></path>
                <path d="M500 50.7C358 38 0 4 0 4V0h1000v40.7C784 64 642 63.3 500 50.7Z"></path>
              </g>
            </svg>
          </div>
        </section>
      </section>
    </div>
  );
};

export default Register;
