"use client";
import React, { useState } from "react";
import styles from "./signupStyles.module.css";
import Image from "next/image";
import logo from "../../assets/fireapula.png";

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [details, setDetails] = useState({
    password: "",
    confirmPassword: "",
    name: "",
    contact: "",
    address: "",
  });
  const [error, setError] = useState("");

  // ✅ Step 1: Email submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email.");
    if (!email.endsWith("@gmail.com"))
      return setError("Email must be a Gmail address (e.g., user@gmail.com).");

    setError("");
    setLoading(true);

    // Simulate sending OTP
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  // ✅ Step 2: OTP verification
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return setError("Please enter the OTP.");
    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (otp === "123456") {
        setStep(3);
      } else {
        setError("Invalid OTP. Please try again.");
      }
    }, 1000);
  };

  // ✅ Step 3: Password setup
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { password, confirmPassword } = details;

    if (!password || !confirmPassword)
      return setError("Please enter both password fields.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setStep(4);
    }, 800);
  };

  // ✅ Step 4: Final registration
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, contact, address } = details;

    if (!name || !contact || !address) {
      return setError("Please fill in all fields.");
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      window.location.href = "/login"; // Redirect to login page
    }, 1000);
  };

  return (
    <div className={styles.bgContainer}>
      <div className={styles.mainContainer}>
        {/* ✅ Left Side */}
        <div className={styles.leftContainer}>
          <Image src={logo} alt="APULA Logo" className={styles.logo} />
          <h2 className={styles.tagline}>Prevention Starts with Detection</h2>
        </div>

        {/* ✅ Right Side */}
        <div className={styles.rightContainer}>
          <div className={styles.card}>
            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleEmailSubmit}>
                <h2 className={styles.title}>Sign Up</h2>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="Enter your Gmail address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <form onSubmit={handleOtpSubmit}>
                <h2 className={styles.title}>Enter OTP</h2>
                <p className={styles.subtitle}>
                  Please enter the 6-digit OTP sent to your Gmail.
                </p>
                <input
                  className={styles.input}
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            )}

            {/* Step 3: Password setup */}
            {step === 3 && (
              <form onSubmit={handlePasswordSubmit}>
                <h2 className={styles.title}>Set Your Password</h2>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Enter password"
                  value={details.password}
                  onChange={(e) =>
                    setDetails({ ...details, password: e.target.value })
                  }
                />
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Confirm password"
                  value={details.confirmPassword}
                  onChange={(e) =>
                    setDetails({ ...details, confirmPassword: e.target.value })
                  }
                />
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? "Checking..." : "Next"}
                </button>
              </form>
            )}

            {/* Step 4: Additional Details */}
            {step === 4 && (
              <form onSubmit={handleFinalSubmit}>
                <h2 className={styles.title}>Additional Details</h2>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Full Name"
                  value={details.name}
                  onChange={(e) =>
                    setDetails({ ...details, name: e.target.value })
                  }
                />
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Contact Number"
                  value={details.contact}
                  onChange={(e) =>
                    setDetails({ ...details, contact: e.target.value })
                  }
                />
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Address"
                  value={details.address}
                  onChange={(e) =>
                    setDetails({ ...details, address: e.target.value })
                  }
                />
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? "Registering..." : "Register"}
                </button>
              </form>
            )}

            {/* ✅ Always show login link */}
            <p className={styles.loginText}>
              Already have an account?{" "}
              <a href="/login" className={styles.loginLink}>
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
