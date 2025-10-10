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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-[85%] max-w-sm bg-white shadow-md rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder=""
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder=""
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder=""
              required
            />
          </div>

          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Google Sign-Up Button */}
        <div className="w-full flex justify-center mb-4">
          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full border border-gray-300 bg-white text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              {/* Google icon paths */}
            </svg>
            {loading ? "Signing Up..." : "Sign up with Google"}
          </button>
        </div>

        {/* Footer */}
        <div className="text-sm text-center mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
