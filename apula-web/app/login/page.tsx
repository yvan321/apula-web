"use client";
import React, { useState } from "react";
import styles from "./loginstyles.module.css";
import Image from "next/image";
import logo from "../../assets/fireapula.png";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        username,
        password
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("User data not found in database.");
      }

      const userData = userDoc.data();

      if (userData.role !== "admin") {
  await signOut(auth);
  throw new Error("Access denied. Admins only.");
}

      toast.success("Admin login successful!", {
        position: "top-center",
        autoClose: 3000,
        theme: "light",
      });

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!username) {
      toast.warn("Please enter your email first.", {
        position: "top-center",
      });
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, username);
      toast.success("Password reset link sent! Check your email.", {
        position: "top-center",
        autoClose: 4000,
      });
    } catch (error: any) {
      toast.error(
        error.message.includes("user-not-found")
          ? "No account found with that email."
          : "Failed to send reset email.",
        { position: "top-center" }
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={styles.bgContainer}>
      <div className={styles.mainContainer}>
        {/* 🔥 Left Side */}
        <div className={styles.leftContainer}>
          <Image src={logo} alt="APULA Logo" className={styles.logo} />
          <h2 className={styles.tagline}>Prevention Starts with Detection</h2>
        </div>

        {/* 🧩 Right Side (Login Form) */}
        <div className={styles.rightContainer}>
          <div className={styles.card}>
            <h2 className={styles.title}>Admin Log In</h2>
            <form onSubmit={handleLogin}>
              <input
                className={styles.input}
                placeholder="Enter email"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className={styles.input}
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className={styles.forgotWrapper}>
                <a href="/forgotPass" className={styles.forgotLink}>
                  Forgot Password?
                </a>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className={styles.signupText}>
              Not an admin?{" "}
              <a href="/signup" className={styles.signupLink}>
                Go to user app
              </a>
            </p>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
