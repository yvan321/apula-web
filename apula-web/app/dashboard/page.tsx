"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";

import {
  FaChartLine,
  FaFire,
  FaUsers,
  FaTruck,
  FaUserCheck,
  FaUserClock,
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

  /* ================= YEAR STATE ================= */
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  /* ================= COUNTERS ================= */
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [availableResponders, setAvailableResponders] = useState(0);
  const [dispatchedResponders, setDispatchedResponders] = useState(0);
  const [availableTrucks, setAvailableTrucks] = useState(0);
  const [availableTeams, setAvailableTeams] = useState(0);

  /* ================= ANALYTICS ================= */
  const [monthData, setMonthData] = useState<any[]>([]);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  /* ================= ACTIVE FIRE ALERTS ================= */
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
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      let available = 0;
      let dispatched = 0;

      snap.forEach((doc) => {
        const d = doc.data();

        if (d.role === "responder") {
          if (d.status === "Available") available++;
          if (d.status === "Dispatched") dispatched++;
        }
      });

      setAvailableResponders(available);
      setDispatchedResponders(dispatched);
    });

    return () => unsub();
  }, []);

  /* ================= AVAILABLE TEAMS ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teams"), (snap) => {
      let teams = 0;

      snap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Available") teams++;
      });

      setAvailableTeams(teams);
    });

    return () => unsub();
  }, []);

  /* ================= AVAILABLE TRUCKS ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vehicles"), (snap) => {
      let trucks = 0;

      snap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Available") trucks++;
      });

      setAvailableTrucks(trucks);
    });

    return () => unsub();
  }, []);

  /* ================= AUTO DETECT YEARS ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "alerts"), (snapshot) => {
      const years = new Set<number>();

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

        years.add(d.getFullYear());
      });

      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);

      // If selected year doesn't exist anymore, default to newest
      if (!sortedYears.includes(selectedYear) && sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      }
    });

    return () => unsub();
  }, []);

  /* ================= YEARLY ANALYTICS FILTERED ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "alerts"), (snapshot) => {
      const monthly = Array(12).fill(0);

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) return;

        let d: Date | null = null;

        // Firestore Timestamp
        if (data.timestamp?.seconds) {
          d = new Date(data.timestamp.seconds * 1000);
        }
        // String timestamp
        else if (typeof data.timestamp === "string") {
          d = new Date(data.timestamp);
        }

        if (!d || isNaN(d.getTime())) return;

        // ⭐ FILTER BY SELECTED YEAR
        if (d.getFullYear() !== selectedYear) return;

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
  }, [selectedYear]);

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

          {/* ROW 1 */}
          <div className={styles.row}>
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

            <div className={styles.card}>
              <div className={styles.cardTop}>
                <FaTruck className={styles.cardIcon} />
                <p className={styles.bigNumber}>{availableTrucks}</p>
              </div>
              <span className={styles.cardLabel}>Available Trucks</span>
            </div>
          </div>

          {/* ROW 2 */}
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

            {/* ANALYTICS CARD */}
            <div
              className={styles.card}
              onClick={() => setShowMonthlyModal(true)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.cardTop}>
                <FaChartLine className={styles.cardIcon} />
                <p className={styles.bigText}>View</p>
              </div>
              <span className={styles.cardLabel}>
                Fire Alerts Analytics
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showMonthlyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>

            <div className={styles.analyticsHeader}>
              <h2 className={styles.modalTitle}>
                Fire Alerts Overview ({selectedYear})
              </h2>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={styles.yearSelect}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;