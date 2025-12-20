"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";

import {
  FaRegClock,
  FaChartLine,
  FaFire,
  FaUsers,
  FaTruck,
  FaUserCheck,
  FaUserClock,
  FaCloudSun,
} from "react-icons/fa";

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
  const [temperature] = useState(31);

  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [availableResponders, setAvailableResponders] = useState(0);
  const [dispatchedResponders, setDispatchedResponders] = useState(0);
  const [availableTrucks, setAvailableTrucks] = useState(0);
  const [availableTeams, setAvailableTeams] = useState(0);

  const [monthData, setMonthData] = useState<any[]>([]);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  const tempClass = temperature >= 32 ? styles.hotTemp : styles.coolTemp;

  /* ================= TIME & DATE ================= */
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

  /* ================= ACTIVE FIRES ================= */
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

  /* ================= RESPONDERS ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "responders"), (snap) => {
      let available = 0;
      let dispatched = 0;
      let trucks = 0;
      let teams = 0;

      snap.forEach((doc) => {
        const d = doc.data();

        if (d.status === "AVAILABLE") {
          available++;
          if (d.type === "Truck") trucks++;
          if (d.type === "Team") teams++;
        }

        if (d.status === "DISPATCHED") {
          dispatched++;
        }
      });

      setAvailableResponders(available);
      setDispatchedResponders(dispatched);
      setAvailableTrucks(trucks);
      setAvailableTeams(teams);
    });

    return () => unsub();
  }, []);

  /* ================= ANALYTICS ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "alerts"), (snapshot) => {
      const monthly = Array(12).fill(0);

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) return;

        let d: Date | null = null;

        if (data.timestamp?.seconds) {
          d = new Date(data.timestamp.seconds * 1000);
        } else if (typeof data.timestamp === "string") {
          d = new Date(data.timestamp);
        }

        if (!d || isNaN(d.getTime())) return;
        monthly[d.getMonth()] += 1;
      });

      setMonthData(
        monthly.map((count, index) => ({
          month: [
            "Jan","Feb","Mar","Apr","May","Jun",
            "Jul","Aug","Sep","Oct","Nov","Dec",
          ][index],
          alerts: count,
        }))
      );
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
          <h2 className={styles.pageTitle}>Fire Command Center</h2>
          <hr className={styles.separator} />

          {/* ================= ROW 1 ================= */}
          <div className={styles.row}>
            <div className={styles.cardInfo}>
              <div className={styles.cardTop}>
                <FaRegClock className={styles.cardIcon} />
                <p className={styles.bigText}>{time}</p>
              </div>
              <span className={styles.cardLabel}>{date}</span>
            </div>

            <div className={`${styles.card} ${tempClass}`}>
              <div className={styles.cardTop}>
                <FaCloudSun className={styles.cardIcon} />
                <p className={styles.bigText}>{temperature}°C</p>
              </div>
              <span className={styles.cardLabel}>Weather</span>
            </div>

            <div className={styles.cardCritical}>
              <div className={styles.cardTop}>
                <FaFire className={styles.cardIcon} />
                <p className={styles.bigNumber}>{activeAlertCount}</p>
              </div>
              <span className={styles.cardLabel}>Active Fire Incidents</span>
            </div>

            <div className={styles.cardSuccess}>
              <div className={styles.cardTop}>
                <FaUsers className={styles.cardIcon} />
                <p className={styles.bigNumber}>{availableTeams}</p>
              </div>
              <span className={styles.cardLabel}>Available Teams</span>
            </div>
          </div>

          {/* ================= ROW 2 ================= */}
          <div className={styles.row}>
            <div className={styles.cardSuccess}>
              <div className={styles.cardTop}>
                <FaUserCheck className={styles.cardIcon} />
                <p className={styles.bigNumber}>{availableResponders}</p>
              </div>
              <span className={styles.cardLabel}>Responders Available</span>
            </div>

            <div className={styles.cardInfo}>
              <div className={styles.cardTop}>
                <FaUserClock className={styles.cardIcon} />
                <p className={styles.bigNumber}>{dispatchedResponders}</p>
              </div>
              <span className={styles.cardLabel}>Dispatched Responders</span>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTop}>
                <FaTruck className={styles.cardIcon} />
                <p className={styles.bigNumber}>{availableTrucks}</p>
              </div>
              <span className={styles.cardLabel}>Available Trucks</span>
            </div>

            <div className={styles.cardSuccess}>
              <div className={styles.cardTop}>
                <FaUsers className={styles.cardIcon} />
                <p className={styles.bigNumber}>{availableTeams}</p>
              </div>
              <span className={styles.cardLabel}>Available Teams</span>
            </div>
          </div>

          {/* ================= ROW 3 (ANALYTICS) ================= */}
            <div
              className={styles.analyticsCard}
              onClick={() => setShowMonthlyModal(true)}
            >
              <FaChartLine />
              <span>Fire Alerts Analytics (Yearly)</span>
            </div>
          </div>
        </div>


      {/* ================= MODAL ================= */}
      {showMonthlyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h2 className={styles.modalTitle}>Yearly Fire Alerts Overview</h2>

            <div className={styles.chartContainer}>
              <ResponsiveContainer>
                <BarChart data={monthData}>
                  <CartesianGrid stroke="#eeeeee" strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="alerts" fill="#2e7d32" />
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
