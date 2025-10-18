"use client";
import React from "react";
import { useAlert } from "@/context/AlertContext";
import { FaBell } from "react-icons/fa";
import styles from "./debugButton.module.css";

const DebugAlertButton = () => {
  const { triggerAlert } = useAlert();

  const handleClick = () => {
    triggerAlert("Fire detected near Building A - Sensor #3");
  };

  return (
    <button className={styles.debugButton} onClick={handleClick}>
      <FaBell className={styles.icon} />
    </button>
  );
};

export default DebugAlertButton;
