"use client";

import React, { useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./reportStyles.module.css";
import {
  FaFireExtinguisher,
  FaClock,
  FaMapMarkerAlt,
  FaBell,
  FaSearch,
} from "react-icons/fa";

const Reports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const reports = [
    {
      id: 1,
      name: "Juan Dela Cruz",
      location: "Barangay Salitran Zone 3",
      status: "Pending",
      time_reported: "2025-10-16 14:45",
      alert: "🔥 Fire Detected by AI",
    },
    {
      id: 2,
      name: "Maria Santos",
      location: "Imus City Market",
      status: "Acknowledged",
      time_reported: "2025-10-15 20:30",
      alert: "🚨 Smoke Alert",
    },
    {
      id: 3,
      name: "Device 03 - Warehouse 4",
      location: "Dasmariñas Industrial Park",
      status: "Resolved",
      time_reported: "2025-10-14 10:15",
      alert: "🔥 Fire Detected by AI (Resolved)",
    },
  ];

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (report) => setSelectedReport(report);
  const closeModal = () => setSelectedReport(null);

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Fire Incident Reports</h2>
          </div>
          <hr className={styles.separator} />

          {/* Search Bar */}
          <div className={styles.filters}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} size={18} />
              <input
                type="text"
                placeholder="Search reports..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Cards Layout */}
          <div className={styles.cardGrid}>
            {filteredReports.length > 0 ? (
              filteredReports.map((r) => (
                <div key={r.id} className={styles.cardItem}>
                  <h3>{r.name}</h3>
                  <p>
                    <FaMapMarkerAlt /> {r.location}
                  </p>
                  <p>
                    <FaClock /> {r.time_reported}
                  </p>
                  <p>
                    <FaBell /> {r.alert}
                  </p>
                  <span
                    className={`${styles.status} ${
                      styles[r.status.toLowerCase()]
                    }`}
                  >
                    {r.status}
                  </span>
                  <button
                    className={styles.viewBtn}
                    onClick={() => openModal(r)}
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <p className={styles.noResults}>No reports found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedReport && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Fire Incident Details</h3>
            <div className={styles.modalDetails}>
              <p>
                <FaFireExtinguisher /> <strong>Name:</strong>{" "}
                {selectedReport.name}
              </p>
              <p>
                <FaMapMarkerAlt /> <strong>Location:</strong>{" "}
                {selectedReport.location}
              </p>
              <p>
                <FaClock /> <strong>Time Reported:</strong>{" "}
                {selectedReport.time_reported}
              </p>
              <p>
                <FaBell /> <strong>Alert:</strong> {selectedReport.alert}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`${styles.status} ${
                    styles[selectedReport.status.toLowerCase()]
                  }`}
                >
                  {selectedReport.status}
                </span>
              </p>
            </div>
            <button className={styles.closeBtn} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
