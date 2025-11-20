"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";
import { FaRegClock } from "react-icons/fa";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

// 🔔 Import Bell + Modal
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

const AdminDashboard = () => {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // 🔥 Firestore counts
  const [userCount, setUserCount] = useState(0);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [temperature, setTemperature] = useState(31); // static sample

  // =============================
  // 🕒 UPDATE TIME + DATE
  // =============================
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

  // =============================
  // 📊 REGISTERED USERS COUNT
  // =============================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUserCount(snap.size);
    });
    return () => unsub();
  }, []);

  // =============================
  // 📊 ACTIVE ALERT COUNT
  // =============================
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

  // =============================
  // 📊 RESOLVED ALERT COUNT
  // =============================
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

  // =============================
  // 🌡️ TEMPERATURE DISPLAY
  // =============================
  const tempClass = temperature >= 32 ? styles.hotTemp : styles.coolTemp;

  return (
    <div>
      <AdminHeader />

      {/* 🔔 Bell Icon at top-right */}
      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
        <AlertBellButton />
      </div>

      {/* 🚨 Alert Dispatch Modal (opens when bell is clicked) */}
      <AlertDispatchModal />

      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Admin Dashboard</h2>
          </div>

          <hr className={styles.separator} />

          {/* 
          ================================
            1ST ROW – TIME + TEMPERATURE
          ================================
          */}
          <div className={styles.topRow}>
            {/* 🕒 TIME CARD */}
            <div className={styles.cardTime}>
              <FaRegClock className={styles.timeIcon} />
              <div className={styles.timeInfo}>
                <p className={styles.timeText}>{time}</p>
                <p className={styles.dateText}>{date}</p>
              </div>
            </div>

            {/* 🌡️ TEMPERATURE CARD */}
            <div className={`${styles.cardTemperature} ${tempClass}`}>
              <h3 className={styles.tempValue}>{temperature}°C</h3>
              <p className={styles.tempStatus}>
                {temperature >= 32 ? "Hot" : "Cool"} Weather in Bacoor City
              </p>
            </div>
          </div>

          {/* 
          ================================
            2ND ROW – SUMMARY CARDS
          ================================
          */}
          <div className={styles.summaryRow}>
            {/* Users */}
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
