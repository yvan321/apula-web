"use client";
import React, { useState } from "react";
import styles from "./loginstyles.module.css";
import Image from "next/image";
import logo from "../../assets/fireapula.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (username === "admin" && password === "1234") {
        alert("Login successful!");
        window.location.href = "/dashboard";
      } else {
        setError("Invalid username or password.");
      }
    }, 1000);
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
            <h2 className={styles.title}>Log In</h2>
            <form onSubmit={handleLogin}>
              <input
                className={styles.input}
                placeholder="Enter username"
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
              Don’t have an account?{" "}
              <a href="/register" className={styles.signupLink}>
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
