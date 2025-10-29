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
  const [generatedOtp, setGeneratedOtp] = useState("123456"); // ✅ persist fixed OTP
  const [enteredOtp, setEnteredOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Step 1: Mock sending OTP
  const handleSendOtp = (e) => {
    e.preventDefault();

    if (!email) {
      toast.warn("Please enter your email first.", { position: "top-center" });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      console.log("📩 Mock OTP sent to email:", generatedOtp); // ✅ always 123456
      toast.success("OTP sent to your email (mock: 123456).", {
        position: "top-center",
        autoClose: 3000,
      });
      setStep(2);
      setLoading(false);
    }, 1200);
  };

  // 🔹 Step 2: Verify OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();

    console.log("🔍 Entered:", enteredOtp, "| Expected:", generatedOtp);

    if (enteredOtp.trim() === generatedOtp.trim()) {
      toast.success("✅ OTP verified successfully!", {
        position: "top-center",
      });
      setStep(3);
    } else {
      toast.error("Incorrect OTP. Please try again.", {
        position: "top-center",
      });
    }
  };

  // 🔹 Step 3: Save new password (mock)
  const handleResetPassword = (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.", { position: "top-center" });
      return;
    }

    if (newPassword.length < 6) {
      toast.warn("Password must be at least 6 characters.", {
        position: "top-center",
      });
      return;
    }

    toast.success("Password successfully reset!", { position: "top-center" });
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
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
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#777",
                    marginBottom: "8px",
                  }}
                >
                  (Mock OTP: <strong>123456</strong>)
                </p>
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
                <button type="submit" className={styles.button}>
                  Save New Password
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
