"use client";
import React, { useState } from "react";
import styles from "../login/loginstyles.module.css";
import Image from "next/image";
import logo from "../../assets/fireapula.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new pass
  const [email, setEmail] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 STEP 1: Send OTP via API
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.warn("Please enter your email first.", { position: "top-center" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("OTP sent to your email.", { position: "top-center" });
        setStep(2);
      } else {
        toast.error(data.error || "Failed to send OTP.", { position: "top-center" });
      }
    } catch (err) {
      toast.error("Something went wrong.", { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 STEP 2: Verify OTP via API
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enteredOtp) {
      toast.warn("Please enter the OTP.", { position: "top-center" });
      return;
    }

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("OTP verified successfully!", { position: "top-center" });
        setStep(3);
      } else {
        toast.error(data.error || "Invalid OTP.", { position: "top-center" });
      }
    } catch (err) {
      toast.error("Something went wrong.", { position: "top-center" });
    }
  };

  // 🔹 STEP 3: Reset Password via API
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.", { position: "top-center" });
      return;
    }

    if (newPassword.length < 6) {
      toast.warn("Password must be at least 6 characters.", { position: "top-center" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Password successfully reset!", { position: "top-center" });
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        toast.error(data.error || "Failed to reset password.", { position: "top-center" });
      }
    } catch (err) {
      toast.error("Something went wrong.", { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.bgContainer}>
      <div className={styles.mainContainer}>
        {/* 🔥 Left Section */}
        <div className={styles.leftContainer}>
          <Image src={logo} alt="APULA Logo" className={styles.logo} />
          <h2 className={styles.tagline}>Prevention Starts with Detection</h2>
        </div>

        {/* 🔐 Right Section */}
        <div className={styles.rightContainer}>
          <div className={styles.card}>
            <h2 className={styles.title}>
              {step === 1
                ? "Forgot Password"
                : step === 2
                ? "Verify OTP"
                : "Set New Password"}
            </h2>

            {/* STEP 1: Enter email */}
            {step === 1 && (
              <form onSubmit={handleSendOtp}>
                <p>Enter your email address to receive a verification code.</p>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className={styles.button}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <p>Enter the 6-digit code sent to your email.</p>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Enter OTP"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                />
                <button type="submit" className={styles.button}>
                  Verify OTP
                </button>
              </form>
            )}

            {/* STEP 3: Reset Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <p>Enter and confirm your new password.</p>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="submit"
                  className={styles.button}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save New Password"}
                </button>
              </form>
            )}

            {/* Footer Navigation */}
            <p className={styles.signupText}>
              {step === 1 ? (
                <>
                  Remembered your password?{" "}
                  <a href="/login" className={styles.signupLink}>
                    Back to login
                  </a>
                </>
              ) : (
                <a href="/forgotPass" className={styles.signupLink}>
                  Start Over
                </a>
              )}
            </p>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
