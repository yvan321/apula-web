"use client";

import React, { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import AdminHeader from "@/components/shared/adminHeader";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";
import styles from "./reportStyles.module.css";
import jsPDF from "jspdf";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const ReportPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");

  const [responders, setResponders] = useState([]);
  const [dispatchInfo, setDispatchInfo] = useState(null);

  // ================= LOAD ALERTS =================
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(data);
      setFilteredReports(data);
    });
    return () => unsub();
  }, []);

  // ================= SEARCH + FILTER =================
  useEffect(() => {
    let result = [...reports];

    if (filterStatus !== "All") {
      result = result.filter((r) => r.status === filterStatus);
    }

    result = result.filter(
      (r) =>
        r.userName?.toLowerCase().includes(search.toLowerCase()) ||
        r.userAddress?.toLowerCase().includes(search.toLowerCase())
    );

    setFilteredReports(result);
  }, [reports, search, filterStatus]);

  // ================= LOAD DISPATCH + RESPONDERS =================
  useEffect(() => {
    if (!selectedReport) return;

    const loadDispatch = async () => {
      const q = query(
        collection(db, "dispatches"),
        where("alertId", "==", selectedReport.id)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const dispatch = snap.docs[0].data();
        setDispatchInfo(dispatch);
        setResponders(dispatch.responders || []);
      } else {
        setDispatchInfo(null);
        setResponders([]);
      }
    };

    loadDispatch();
  }, [selectedReport]);

  // ================= ACTIONS =================
  const openReport = (report) => setSelectedReport(report);

  const closeModal = () => {
    setSelectedReport(null);
    setEditMode(false);
    setResponders([]);
    setDispatchInfo(null);
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedStatus(selectedReport.status);
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    const ref = doc(db, "alerts", selectedReport.id);
    await updateDoc(ref, { status: editedStatus });
    setEditMode(false);
  };

  // ================= PDF (ONE REPORT) =================
  const downloadSingleReportPDF = (report) => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Incident Report", 14, y);
    y += 15;

    doc.setFontSize(11);
    doc.text(`Name: ${report.userName}`, 14, y); y += 8;
    doc.text(`Contact: ${report.userContact}`, 14, y); y += 8;
    doc.text(`Email: ${report.userEmail}`, 14, y); y += 8;
    doc.text(`Address: ${report.userAddress}`, 14, y); y += 8;
    doc.text(`Status: ${report.status}`, 14, y); y += 8;

    const receivedAt = report.timestamp
      ? new Date(report.timestamp.seconds * 1000).toLocaleString()
      : "Unknown";

    doc.text(`Alert Received At: ${receivedAt}`, 14, y);
    y += 8;

    if (dispatchInfo?.timestamp) {
      const dispatchedAt = new Date(
        dispatchInfo.timestamp.seconds * 1000
      ).toLocaleString();

      doc.text(`Dispatched At: ${dispatchedAt}`, 14, y);
      y += 8;
    }

    if (responders.length > 0) {
      y += 6;
      doc.setFontSize(13);
      doc.text("Assigned Responders:", 14, y);
      y += 8;

      doc.setFontSize(11);
      responders.forEach((r) => {
        doc.text(`Name: ${r.name}`, 20, y); y += 6;
        doc.text(`Contact: ${r.contact}`, 20, y); y += 6;
        doc.text(`Email: ${r.email}`, 20, y); y += 8;
      });
    }

    doc.save(`incident_report_${report.id}.pdf`);
  };

  // ================= RENDER =================
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

          {/* SEARCH + FILTER */}
          <div className={styles.filtersRow}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FiSearch />
            </div>

            <div className={styles.statusFilters}>
              {["All", "Pending", "Dispatched", "Resolved"].map((s) => (
                <button
                  key={s}
                  className={`${styles.filterBtn} ${styles[`${s.toLowerCase()}Btn`]} ${
                    filterStatus === s ? styles.activeFilter : ""
                  }`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className={styles.tableWrapper}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Received At</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.userAddress}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[r.status?.toLowerCase()]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.timestamp
                        ? new Date(r.timestamp.seconds * 1000).toLocaleString()
                        : "Unknown"}
                    </td>
                    <td>
                      <button
                        className={styles.viewBtn}
                        onClick={() => openReport(r)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {/* MODAL */}
{selectedReport && (
  <div className={styles.modalOverlay}>
    <div className={styles.modalContent}>
      <h3 className={styles.modalTitle}>Report Details</h3>

     <div className={`${styles.modalDetails} ${styles.modalSection}`}>

        <p className={styles.iconRow}>
  <FaUser />
  {selectedReport.userName}
</p>

        <p className={styles.iconRow}>
  <FaPhone />
  {selectedReport.userContact}
</p>

        <p className={styles.iconRow}>
  <FaEnvelope />
  {selectedReport.userEmail}
</p>

        <p className={styles.iconRow}>
  <FaMapMarkerAlt />
  {selectedReport.userAddress}
</p>

        <p>
          <strong>Alert Received At:</strong>{" "}
          {new Date(
            selectedReport.timestamp.seconds * 1000
          ).toLocaleString()}
        </p>

        {dispatchInfo?.timestamp && (
          <p>
            <strong>Dispatched At:</strong>{" "}
            {new Date(
              dispatchInfo.timestamp.seconds * 1000
            ).toLocaleString()}
          </p>
        )}
      </div>

      {responders.length > 0 && (
        <div className={styles.responderSection}>
          <div className={styles.responderTitle}>
            Assigned Responder(s)
          </div>

          {responders.map((r, i) => (
            <div key={i} className={styles.responderItem}>
              {r.name} • {r.contact}
            </div>
          ))}
        </div>
      )}

      <div className={styles.modalActions}>
        <button
          className={styles.saveBtn}
          onClick={() => downloadSingleReportPDF(selectedReport)}
        >
          Download PDF
        </button>

        <button
          className={styles.closeBtn}
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
};

export default ReportPage;
