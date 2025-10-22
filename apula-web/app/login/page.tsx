"use client";
import React, { useState } from "react";
import styles from "./loginstyles.module.css";
import Image from "next/image";
import logo from "../../assets/fireapula.png";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // 🔹 Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        username,
        password
      );
      const user = userCredential.user;

      // 🔹 Step 2: Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("User data not found in database.");
      }

      const userData = userDoc.data();

      // 🔹 Step 3: Only allow Admins to log in
      if (userData.role !== "Admin") {
        await signOut(auth);
        throw new Error("Access denied. Admins only.");
      }

      // 🔹 Step 4: Success → redirect
      toast.success("Admin login successful!", {
        position: "top-center",
        autoClose: 3000,
        theme: "light",
      });

      // Redirect to admin dashboard
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

  return (
    <div className={styles.bgContainer}>
      <div className={styles.mainContainer}>
        <div className={styles.leftContainer}>
          <Image src={logo} alt="APULA Logo" className={styles.logo} />
          <h2 className={styles.tagline}>Prevention Starts with Detection</h2>
        </div>

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
