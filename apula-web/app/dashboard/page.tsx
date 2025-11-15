"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";
import { FaRegClock } from "react-icons/fa";
import DebugAlertButton from "@/components/shared/DebugAlertButton";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

const AdminDashboard = () => {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // 🔥 Firestore counts
  const [userCount, setUserCount] = useState(0);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [temperature, setTemperature] = useState(31); // static for demo

  // 🕒 Update time/date
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

  // 📌 LIVE COUNT: Registered Users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUserCount(snap.size);
    });
    return () => unsub();
  }, []);

  // 📌 LIVE COUNT: Active Alerts (NOT resolved)
  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("status", "!=", "Resolved")
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveAlertCount(snap.size);
    });

    return () => unsub();
  }, []);

  // 📌 LIVE COUNT: Resolved Alerts
  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("status", "==", "Resolved")
    );
    const unsub = onSnapshot(q, (snap) => {
      setResolvedCount(snap.size);
    });

    return () => unsub();
  }, []);

  // 🥵 Temperature UI
  const tempClass = temperature >= 32 ? styles.hotTemp : styles.coolTemp;

  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <DebugAlertButton />

        <div data-aos="fade-up" className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Admin Dashboard</h2>
          </div>

          <hr className={styles.separator} />

          {/* ========== 1st Row: Time + Temperature ========== */}
          <div className={styles.topRow}>
            {/* Time */}
            <div className={styles.cardTime}>
              <FaRegClock className={styles.timeIcon} />
              <div className={styles.timeInfo}>
                <p className={styles.timeText}>{time}</p>
                <p className={styles.dateText}>{date}</p>
              </div>
            </div>

            {/* Temperature */}
            <div className={`${styles.cardTemperature} ${tempClass}`}>
              <h3 className={styles.tempValue}>{temperature}°C</h3>
              <p className={styles.tempStatus}>
                {temperature >= 32 ? "Hot" : "Cool"} Weather in Bacoor City
              </p>
            </div>
          </div>

          {/* ========== 2nd Row: DATA SUMMARY ========== */}
          <div className={styles.summaryRow}>
            {/* Registered Users */}
            <div className={`${styles.summaryCard} ${styles.usersCard}`}>
              <h4>Registered Users</h4>
              <p className={styles.summaryValue}>{userCount}</p>
              <p className={styles.summaryLabel}>App users & responders</p>
            </div>

            {/* Active Alerts */}
            <div className={`${styles.summaryCard} ${styles.respondersCard}`}>
              <h4>Active Alerts</h4>
              <p className={styles.summaryValue}>{activeAlertCount}</p>
              <p className={styles.summaryLabel}>
                Fire alerts not yet resolved
              </p>
            </div>

            {/* Resolved */}
            <div className={`${styles.summaryCard} ${styles.callsCard}`}>
              <h4>Resolved Incidents</h4>
              <p className={styles.summaryValue}>{resolvedCount}</p>
              <p className={styles.summaryLabel}>
                Completed & verified responses
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
