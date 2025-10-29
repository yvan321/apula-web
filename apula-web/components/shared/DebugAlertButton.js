"use client";
import React from "react";
import { useAlert } from "@/context/AlertContext";
import { FaBell } from "react-icons/fa";
import styles from "./debugButton.module.css";

const DebugAlertButton = () => {
  const { triggerAlert } = useAlert();

  const handleClick = () => {
    // 🔥 Example fire alert with image
    triggerAlert(
      "Fire detected near Building A - Sensor #3. Temperature exceeded 85°C.",
      "/images/fire_snapshot.jpg" // 📸 sample image path (put it in /public/images)
    );
  };

  return (
    <button
      className={styles.debugButton}
      title="Trigger Fire Alert"
      onClick={handleClick}
    >
      <FaBell className={styles.icon} />
    </button>
  );
};

export default DebugAlertButton;
