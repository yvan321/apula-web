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
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const ReportPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");

  // ✅ Real-time Firestore data
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
      setFilteredReports(data);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Search filter
  useEffect(() => {
    const result = reports.filter(
      (r) =>
        r.userName?.toLowerCase().includes(search.toLowerCase()) ||
        r.userAddress?.toLowerCase().includes(search.toLowerCase())
      // || r.description?.toLowerCase().includes(search.toLowerCase()) // 🔸 Commented out
    );
    setFilteredReports(result);
  }, [search, reports]);

  // ✅ Open modal
  const openReport = (report) => setSelectedReport(report);

  // ✅ Close modal
  const closeModal = () => {
    setSelectedReport(null);
    setEditMode(false);
  };

  // ✅ Edit mode toggle
  const handleEdit = () => {
    setEditMode(true);
    setEditedStatus(selectedReport.status);
  };

  // ✅ Save updated status to Firestore
  const handleSave = async () => {
    try {
      const ref = doc(db, "alerts", selectedReport.id);
      await updateDoc(ref, { status: editedStatus });
      setEditMode(false);
      alert("✅ Status updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update status:", error);
    }
  };

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Incident Reports</h2>
          <hr className={styles.separator} />

          {/* 🔍 Search bar */}
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
                  <h3>{report.userName || "Unknown User"}</h3>
                  <p>
                    <FaMapMarkerAlt /> {report.userAddress || "No address"}
                  </p>

                  {/* 🗒️ Description commented out */}
                  {/*
                  <p>
                    <FaClipboardList />{" "}
                    {report.description || "No description provided."}
                  </p>
                  */}

                  <p
                    className={`${styles.status} ${
                      styles[report.status?.toLowerCase() || "pending"]
                    }`}
                  >
                    {report.status || "Pending"}
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

        {/* 🪟 Modal */}
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
                      <FaUser /> <strong>Name:</strong>{" "}
                      {selectedReport.userName || "N/A"}
                    </p>
                    <p>
                      <FaPhone /> <strong>Contact:</strong>{" "}
                      {selectedReport.userContact || "N/A"}
                    </p>
                    <p>
                      <FaEnvelope /> <strong>Email:</strong>{" "}
                      {selectedReport.userEmail || "N/A"}
                    </p>
                    <p>
                      <FaMapMarkerAlt /> <strong>Address:</strong>{" "}
                      {selectedReport.userAddress || "N/A"}
                    </p>

                    {/* 🗒️ Description commented out */}
                    {/*
                    <p>
                      <FaClipboardList /> <strong>Description:</strong>{" "}
                      {selectedReport.description || "N/A"}
                    </p>
                    */}

                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        className={`${styles.status} ${
                          styles[selectedReport.status?.toLowerCase() || "pending"]
                        }`}
                      >
                        {selectedReport.status || "Pending"}
                      </span>
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {selectedReport.timestamp
                        ? new Date(
                            selectedReport.timestamp.seconds * 1000
                          ).toLocaleString()
                        : "Unknown"}
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
