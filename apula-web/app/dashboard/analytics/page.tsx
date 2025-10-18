"use client";

import React from "react";
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
import nyclogo from "@/public/analytics.png"; // ✅ your analytics logo

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AnalyticsPage = () => {
  const data = {
    labels: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    datasets: [
      {
        label: "Fire Incidents",
        data: [3, 2, 4, 1, 6, 5, 7, 8, 3, 2, 4, 6],
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
        text: "Monthly Fire Incidents - 2025",
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
          {/* ✅ Page Title + Separator */}
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Analytics</h2>
          </div>
          <hr className={styles.separator} />

          {/* ✅ Main Content Layout */}
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
                This report visualizes the number of fire incidents detected each month
                by the Apula system. The data helps monitor fire trends and evaluate
                response efficiency throughout the year.
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
