"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";
import { FaRegClock } from "react-icons/fa";
import DebugAlertButton from "@/components/shared/DebugAlertButton";

const AdminDashboard = () => {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [temperature, setTemperature] = useState(31); // default temp (for demo)

  // ✅ Update time and date every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Choose gradient based on temperature
  const tempClass = temperature >= 32 ? styles.hotTemp : styles.coolTemp;

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
         <DebugAlertButton />
        <div data-aos="fade-up" className={styles.contentSection}>
          {/* Header */}
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Admin Dashboard</h2>
          </div>
          <hr className={styles.separator} />

          {/* --- 1st Row: Time & Temperature --- */}
          <div className={styles.topRow}>
            {/* Time Card */}
            <div className={styles.cardTime}>
              <FaRegClock className={styles.timeIcon} />
              <div className={styles.timeInfo}>
                <p className={styles.timeText}>{time}</p>
                <p className={styles.dateText}>{date}</p>
              </div>
            </div>

            {/* Temperature Card */}
            <div className={`${styles.cardTemperature} ${tempClass}`}>
              <h3 className={styles.tempValue}>{temperature}°C</h3>
              <p className={styles.tempStatus}>
                {temperature >= 32 ? "Hot" : "Cool"} Weather in Bacoor City
              </p>
            </div>
          </div>

          {/* --- 2nd Row: Summary Data --- */}
          <div className={styles.summaryRow}>
            <div className={`${styles.summaryCard} ${styles.usersCard}`}>
              <h4>Registered Users</h4>
              <p className={styles.summaryValue}>24</p>
              <p className={styles.summaryLabel}>App users & responders</p>
            </div>

            <div className={`${styles.summaryCard} ${styles.respondersCard}`}>
              <h4>Active Alerts</h4>
              <p className={styles.summaryValue}>3</p>
              <p className={styles.summaryLabel}>
                Real-time fire detections from Apula app
              </p>
            </div>

            <div className={`${styles.summaryCard} ${styles.callsCard}`}>
              <h4>Resolved Incidents</h4>
              <p className={styles.summaryValue}>15</p>
              <p className={styles.summaryLabel}>
                Verified and documented fire events
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
