"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./adminDashboardStyles.module.css";
import { useRouter } from "next/navigation";

import {
  FaFire,
  FaUsers,
  FaTruck,
  FaUserCheck,
  FaUserClock,
  FaCheckCircle,
} from "react-icons/fa";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Period = "week" | "month" | "year";

type ChartPoint = {
  label: string;
  alerts: number;
  fullDate?: string;
};

const AdminDashboard = () => {
  const router = useRouter();

  /* ================= COUNTERS ================= */
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [availableResponders, setAvailableResponders] = useState(0);
  const [dispatchedResponders, setDispatchedResponders] = useState(0);
  const [availableTrucks, setAvailableTrucks] = useState(0);
  const [availableTeams, setAvailableTeams] = useState(0);
  const [resolvedTodayCount, setResolvedTodayCount] = useState(0);

  /* ================= ANALYTICS ================= */
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [alertsDates, setAlertsDates] = useState<Date[]>([]);

  /* ================= ACTIVE FIRE ALERTS ================= */
  useEffect(() => {
    const q = query(collection(db, "alerts"), where("status", "==", "Pending"));

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

  /* ================= INCIDENT TIMESTAMPS ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "alerts"), (snapshot) => {
      const parsedDates: Date[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) return;

        let d: Date | null = null;

        if (data.timestamp?.seconds) {
          d = new Date(data.timestamp.seconds * 1000);
        } else if (typeof data.timestamp === "string") {
          d = new Date(data.timestamp);
        } else if (data.timestamp instanceof Date) {
          d = data.timestamp;
        }

        if (!d || isNaN(d.getTime())) return;

        parsedDates.push(d);
      });

      setAlertsDates(parsedDates);

      const years = Array.from(
        new Set(parsedDates.map((d) => d.getFullYear()))
      ).sort((a, b) => a - b);

      const currentYear = new Date().getFullYear();
      const finalYears = years.length > 0 ? years : [currentYear];

      setAvailableYears(finalYears);

      if (!finalYears.includes(selectedYear)) {
        setSelectedYear(finalYears[finalYears.length - 1]);
      }
    });

    return () => unsub();
  }, [selectedYear]);

  /* ================= RESOLVED TODAY ================= */
  useEffect(() => {
    const resolvedQuery = query(
      collection(db, "alerts"),
      where("status", "==", "Resolved")
    );

    const unsub = onSnapshot(resolvedQuery, (snapshot) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      let count = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const rawDate = data.resolvedAt || data.updatedAt || data.timestamp;
        if (!rawDate) return;

        let resolvedDate: Date | null = null;

        if (rawDate?.seconds) {
          resolvedDate = new Date(rawDate.seconds * 1000);
        } else if (typeof rawDate === "string") {
          resolvedDate = new Date(rawDate);
        } else if (rawDate instanceof Date) {
          resolvedDate = rawDate;
        }

        if (!resolvedDate || isNaN(resolvedDate.getTime())) return;

        if (resolvedDate >= startOfDay && resolvedDate < endOfDay) {
          count += 1;
        }
      });

      setResolvedTodayCount(count);
    });

    return () => unsub();
  }, []);

  /* ================= PERIOD AGGREGATION ================= */
  useEffect(() => {
    if (selectedPeriod === "week") {
      const currentYear = new Date().getFullYear();

      let referenceDate: Date;

      if (selectedYear === currentYear) {
        referenceDate = new Date();
      } else {
        const datesInSelectedYear = alertsDates.filter(
          (d) => d.getFullYear() === selectedYear
        );

        referenceDate =
          datesInSelectedYear.length > 0
            ? new Date(
                Math.max(...datesInSelectedYear.map((d) => d.getTime()))
              )
            : new Date(selectedYear, 11, 31);
      }

      const weekStart = new Date(referenceDate);
      const day = weekStart.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diffToMonday);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const buckets: ChartPoint[] = Array.from({ length: 7 }, (_, index) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + index);

        return {
          label: d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          fullDate: d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          alerts: 0,
        };
      });

      alertsDates.forEach((d) => {
        if (d < weekStart || d > weekEnd) return;

        const alertDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const startDay = new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate()
        );

        const diffDays = Math.floor(
          (alertDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays >= 0 && diffDays < 7) {
          buckets[diffDays].alerts += 1;
        }
      });

      setChartData(buckets);
      return;
    }

    if (selectedPeriod === "month") {
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];

      const buckets: ChartPoint[] = monthNames.map((month, index) => ({
        label: month,
        fullDate: `${month} ${selectedYear}`,
        alerts: 0,
      }));

      alertsDates.forEach((d) => {
        if (d.getFullYear() === selectedYear) {
          buckets[d.getMonth()].alerts += 1;
        }
      });

      setChartData(buckets);
      return;
    }

    const yearlyBuckets = availableYears.map((year) => ({
      label: String(year),
      fullDate: String(year),
      alerts: 0,
    }));

    alertsDates.forEach((d) => {
      const index = availableYears.indexOf(d.getFullYear());
      if (index !== -1) {
        yearlyBuckets[index].alerts += 1;
      }
    });

    setChartData(yearlyBuckets);
  }, [alertsDates, selectedPeriod, selectedYear, availableYears]);

  const tooltipLabelFormatter = (label: string | number) => {
    const point = chartData.find((entry) => entry.label === String(label));
    return point?.fullDate || String(label);
  };

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

            <div className={styles.cardSuccess}>
              <div className={styles.cardTop}>
                <FaCheckCircle className={styles.cardIcon} />
                <p className={styles.bigNumber}>{resolvedTodayCount}</p>
              </div>
              <span className={styles.cardLabel}>Resolved Fire Incidents (Today)</span>
            </div>
          </div>

          <div className={styles.analyticsSection}>
            <div className={styles.analyticsHeader}>
              <h2 className={styles.analyticsTitle}>Fire Incidents Overview</h2>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {selectedPeriod !== "year" && (
                  <select
                    className={styles.yearSelect}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  className={styles.viewMoreBtn}
                  onClick={() => router.push("/dashboard/analytics")}
                >
                  <span>View More</span>
                </button>
              </div>
            </div>

            <div className={styles.periodSwitcher}>
              {(["week", "month", "year"] as Period[]).map((period) => (
                <button
                  key={period}
                  className={`${styles.periodBtn} ${
                    selectedPeriod === period ? styles.periodBtnActive : ""
                  }`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.chartsGrid}>
              <div className={styles.chartContainer}>
                <h4 className={styles.chartTitle}>Line Trend</h4>

                <div className={styles.chartScroll}>
                  <div className={styles.chartInner}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 16, right: 20, left: 0, bottom: 12 }}
                      >
                        <CartesianGrid stroke="#eeeeee" strokeDasharray="3 3" />
                        <XAxis dataKey="label" padding={{ left: 10, right: 10 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip labelFormatter={tooltipLabelFormatter} />
                        <Line
                          type="monotone"
                          dataKey="alerts"
                          stroke="#a30000"
                          strokeWidth={3}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;