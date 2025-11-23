"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";
import { FaRegClock, FaChartLine } from "react-icons/fa";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const AdminDashboard = () => {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  const [userCount, setUserCount] = useState(0);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [temperature] = useState(31);

  const [monthData, setMonthData] = useState([]);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  const tempClass = temperature >= 32 ? styles.hotTemp : styles.coolTemp;

  /* ---------------------- TIME & DATE ---------------------- */
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

  /* ---------------------- USERS ---------------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) =>
      setUserCount(snap.size)
    );
    return () => unsub();
  }, []);

  /* ---------------------- ACTIVE ALERTS ---------------------- */
  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("status", "!=", "Resolved")
    );
    const unsub = onSnapshot(q, (snap) => setActiveAlertCount(snap.size));
    return () => unsub();
  }, []);

  /* ---------------------- RESOLVED ALERTS ---------------------- */
  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("status", "==", "Resolved")
    );
    const unsub = onSnapshot(q, (snap) => setResolvedCount(snap.size));
    return () => unsub();
  }, []);

  /* ---------------------- ALL ALERTS (FULL YEAR GRAPH) ---------------------- */
  useEffect(() => {
    const q = collection(db, "alerts");

    const unsub = onSnapshot(q, (snapshot) => {
      const monthly = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0,
      };

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.createdAt) return;

        const m = data.createdAt.toDate().getMonth();
        monthly[m] += 1;
      });

      const formatted = Object.keys(monthly).map((m) => ({
        month: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ][m],
        alerts: monthly[m],
      }));

      setMonthData(formatted);
    });

    return () => unsub();
  }, []);

  return (
    <div>
      <AdminHeader />

      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
        <AlertBellButton />
      </div>
      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Admin Dashboard</h2>
          <hr className={styles.separator} />

          {/* ---------------- TOP ROW ---------------- */}
          <div className={styles.topRow}>
            {/* TIME */}
            <div className={`${styles.topCard} ${styles.cardTime}`}>
              <FaRegClock className={styles.timeIcon} />
              <p className={styles.timeText}>{time}</p>
              <p className={styles.dateText}>{date}</p>
            </div>

            {/* TEMP */}
            <div
              className={`${styles.topCard} ${styles.cardTemperature} ${tempClass}`}
            >
              <h3 className={styles.tempValue}>{temperature}°C</h3>
              <p className={styles.tempStatus}>
                {temperature >= 32 ? "Hot" : "Cool"} Weather in Bacoor City
              </p>
            </div>

            {/* ANALYTICS */}
            <div
              className={`${styles.topCard} ${styles.monthlyCard}`}
              style={{
                cursor: "pointer",
                display: "flex",
                flexDirection: "column", 
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                gap: "0px",
              }}
              onClick={() => setShowMonthlyModal(true)}
            >
              <FaChartLine className={styles.analyticsIcon} />

              <div>
                <h4 className={styles.analyticsTitle}>ANALYTICS</h4>
                <p className={styles.summaryLabel}>Fire Alerts (Yearly)</p>
              </div>
            </div>
          </div>

          {/* ---------------- SUMMARY ROW ---------------- */}
          <div className={styles.summaryRow}>
            <div className={`${styles.summaryCard} ${styles.usersCard}`}>
              <h4>Registered Users</h4>
              <p className={styles.summaryValue}>{userCount}</p>
              <p className={styles.summaryLabel}>App users & responders</p>
            </div>

            <div className={`${styles.summaryCard} ${styles.respondersCard}`}>
              <h4>Active Alerts</h4>
              <p className={styles.summaryValue}>{activeAlertCount}</p>
              <p className={styles.summaryLabel}>Not yet resolved</p>
            </div>

            <div className={`${styles.summaryCard} ${styles.callsCard}`}>
              <h4>Resolved Incidents</h4>
              <p className={styles.summaryValue}>{resolvedCount}</p>
              <p className={styles.summaryLabel}>Verified responses</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- MODERN POPUP ---------------- */}
      {showMonthlyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h2 className={styles.modalTitle}>Yearly Fire Alerts Overview</h2>

            {/* CHART */}
            <div className={styles.chartContainer}>
              <ResponsiveContainer>
                <BarChart data={monthData}>
                  <CartesianGrid stroke="#eeeeee" strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-30} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="alerts"
                    fill="#2e7d32"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <button
              className={styles.closeBtn}
              onClick={() => setShowMonthlyModal(false)}
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
