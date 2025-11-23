"use client";

import React, { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import AdminHeader from "@/components/shared/adminHeader";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";
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
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");

  // Load data
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(data);
      setFilteredReports(data);
    });
    return () => unsub();
  }, []);

  // Search + Filter
  useEffect(() => {
    let result = reports;

    if (filterStatus !== "all") {
      result = result.filter((r) => r.status === filterStatus);
    }

    result = result.filter(
      (r) =>
        r.userName?.toLowerCase().includes(search.toLowerCase()) ||
        r.userAddress?.toLowerCase().includes(search.toLowerCase())
    );

    setFilteredReports(result);
  }, [search, reports, filterStatus]);

  const openReport = (report) => setSelectedReport(report);
  const closeModal = () => {
    setSelectedReport(null);
    setEditMode(false);
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedStatus(selectedReport.status);
  };

  const handleSave = async () => {
    const ref = doc(db, "alerts", selectedReport.id);
    await updateDoc(ref, { status: editedStatus });
    setEditMode(false);
  };

  return (
    <div>
      <AdminHeader />

      <div style={{ position: "absolute", top: 20, right: 30 }}>
        <AlertBellButton />
      </div>
      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Incident Reports</h2>
          <hr className={styles.separator} />

          {/* Search + Filters Row */}
          <div className={styles.filtersRow}>
            {/* SEARCH */}
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FiSearch />
            </div>

            {/* FILTERS */}
            <div className={styles.statusFilters}>
              <button
                className={`${styles.filterBtn} ${styles.allBtn} ${
                  filterStatus === "all" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilterStatus("all")}
              >
                All
              </button>

              <button
                className={`${styles.filterBtn} ${styles.pendingBtn} ${
                  filterStatus === "Pending" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilterStatus("Pending")}
              >
                Pending
              </button>

              <button
                className={`${styles.filterBtn} ${styles.dispatchedBtn} ${
                  filterStatus === "Dispatched" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilterStatus("Dispatched")}
              >
                Dispatched
              </button>

              <button
                className={`${styles.filterBtn} ${styles.resolvedBtn} ${
                  filterStatus === "Resolved" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilterStatus("Resolved")}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className={styles.cardGrid}>
            {filteredReports.length === 0 ? (
              <p className={styles.noResults}>No reports found.</p>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  className={styles.cardItem}
                  onClick={() => openReport(report)}
                >
                  <span
                    className={`${styles.status} ${
                      styles[report.status?.toLowerCase()]
                    }`}
                  >
                    {report.status}
                  </span>

                  <h3>{report.userName || "Unknown User"}</h3>

                  <p>
                    <FaMapMarkerAlt /> {report.userAddress || "No address"}
                  </p>

                  <button className={styles.viewBtn}>View</button>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedReport && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              {/* EDIT BUTTON - TOP RIGHT */}
              {!editMode && (
                <button className={styles.editBtn} onClick={handleEdit}>
                 Edit
                </button>
              )}

              {!editMode ? (
                <>
                  <h3 className={styles.modalTitle}>Report Details</h3>

                  <div className={styles.modalDetails}>
                    <p>
                      <FaUser /> {selectedReport.userName || "N/A"}
                    </p>
                    <p>
                      <FaPhone /> {selectedReport.userContact || "N/A"}
                    </p>
                    <p>
                      <FaEnvelope /> {selectedReport.userEmail || "N/A"}
                    </p>
                    <p>
                      <FaMapMarkerAlt /> {selectedReport.userAddress || "N/A"}
                    </p>

                    {/* STATUS INLINE HERE */}
                    <p className={styles.statusRow}>
                      <strong>Status:</strong>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[selectedReport.status?.toLowerCase()]
                        }`}
                      >
                        {selectedReport.status}
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
                    <label>Status</label>
                    <select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Dispatched">Dispatched</option>
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
