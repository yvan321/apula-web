"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./analyticsStyles.module.css";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import Image from "next/image";
import nyclogo from "@/public/analytics.png";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AnalyticsPage = () => {
  const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "alerts"), (snapshot) => {
      const monthCounts = Array(12).fill(0);

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        if (data.timestamp?.seconds) {
          const date = new Date(data.timestamp.seconds * 1000);
          const monthIndex = date.getMonth(); // 0 = Jan, 11 = Dec

          monthCounts[monthIndex] += 1;
        }
      });

      setMonthlyData(monthCounts);
    });

    return () => unsub();
  }, []);

  const data = {
    labels: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ],
    datasets: [
      {
        label: "Fire Incidents",
        data: monthlyData,
        backgroundColor: "#ff4d4f",
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Monthly Fire Incidents (based on Firestore alert timestamps)",
        font: { size: 16, weight: "bold" },
        color: "#333",
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: "#eee" } },
    },
  };

  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>

          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Analytics</h2>
          </div>
          <hr className={styles.separator} />

          <div className={styles.pageLayout}>
            {/* LEFT SECTION */}
            <div className={styles.leftSection}>
              <Image
                src={nyclogo}
                alt="Apula Analytics Logo"
                className={styles.logo}
                width={150}
                height={150}
                priority
              />
              <h3 className={styles.subTitle}>Fire Incident Analytics</h3>
              <p className={styles.pageDescription}>
                This chart displays real monthly fire incidents detected by the Apula
                system, based on timestamps recorded in Firestore.
              </p>
            </div>

            {/* RIGHT SECTION */}
            <div className={styles.rightSection}>
              <div className={styles.chartContainer}>
                <Bar data={data} options={options} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
