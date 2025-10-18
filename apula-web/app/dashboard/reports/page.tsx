"use client";

import React, { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClipboardList,
} from "react-icons/fa";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./reportStyles.module.css";

const ReportPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");

  // ✅ Simulated Data
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        name: "John Doe",
        contact: "09123456789",
        email: "johndoe@gmail.com",
        address: "Bacoor, Cavite",
        description: "Fire near the kitchen area.",
        status: "Pending",
        date: "2025-10-18 14:25",
      },
      {
        id: 2,
        name: "Jane Smith",
        contact: "09987654321",
        email: "janesmith@gmail.com",
        address: "Imus, Cavite",
        description: "Smoke detected in the living room.",
        status: "Acknowledged",
        date: "2025-10-18 09:40",
      },
      {
        id: 3,
        name: "Carlos Reyes",
        contact: "09112223333",
        email: "carlosreyes@gmail.com",
        address: "Dasmariñas, Cavite",
        description: "Small fire in the warehouse.",
        status: "Resolved",
        date: "2025-10-17 19:15",
      },
    ];
    setReports(mockData);
    setFilteredReports(mockData);
  }, []);

  // ✅ Search
  useEffect(() => {
    const result = reports.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.address.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredReports(result);
  }, [search, reports]);

  // ✅ Open Report Modal
  const openReport = (report) => {
    setSelectedReport(report);
  };

  // ✅ Close Modal
  const closeModal = () => {
    setSelectedReport(null);
    setEditMode(false);
  };

  // ✅ Enable Edit Mode (Status Only)
  const handleEdit = () => {
    setEditMode(true);
    setEditedStatus(selectedReport.status);
  };

  // ✅ Save Status Update
  const handleSave = () => {
    const updatedReports = reports.map((r) =>
      r.id === selectedReport.id ? { ...r, status: editedStatus } : r
    );
    setReports(updatedReports);
    setFilteredReports(updatedReports);
    setSelectedReport({ ...selectedReport, status: editedStatus });
    setEditMode(false);
  };

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Incident Reports</h2>
          <hr className={styles.separator} />

          {/* 🔍 Search */}
          <div className={styles.filters}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FiSearch />
            </div>
          </div>

          {/* 🧾 Report Cards */}
          <div className={styles.cardGrid}>
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <div key={report.id} className={styles.cardItem}>
                  <h3>{report.name}</h3>
                  <p>
                    <FaMapMarkerAlt /> {report.address}
                  </p>
                  <p>
                    <FaClipboardList /> {report.description}
                  </p>
                  <p
                    className={`${styles.status} ${
                      styles[report.status.toLowerCase()]
                    }`}
                  >
                    {report.status}
                  </p>
                  <button
                    className={styles.viewBtn}
                    onClick={() => openReport(report)}
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

        {/* 🪟 View Modal */}
        {selectedReport && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              {!editMode ? (
                <>
                  <button className={styles.editBtn} onClick={handleEdit}>
                    ✏️ Edit
                  </button>
                  <h3 className={styles.modalTitle}>Report Details</h3>
                  <div className={styles.modalDetails}>
                    <p>
                      <FaUser /> <strong>Name:</strong> {selectedReport.name}
                    </p>
                    <p>
                      <FaPhone /> <strong>Contact:</strong>{" "}
                      {selectedReport.contact}
                    </p>
                    <p>
                      <FaEnvelope /> <strong>Email:</strong>{" "}
                      {selectedReport.email}
                    </p>
                    <p>
                      <FaMapMarkerAlt /> <strong>Address:</strong>{" "}
                      {selectedReport.address}
                    </p>
                    <p>
                      <FaClipboardList /> <strong>Description:</strong>{" "}
                      {selectedReport.description}
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
                    <p>
                      <strong>Date:</strong> {selectedReport.date}
                    </p>
                  </div>
                  <button className={styles.closeBtn} onClick={closeModal}>
                    Close
                  </button>
                </>
              ) : (
                <>
                  <h3 className={styles.modalTitle}>Edit Status</h3>
                  <div className={styles.editForm}>
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    <div className={styles.editActions}>
                      <button className={styles.saveBtn} onClick={handleSave}>
                        Save
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;
