"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./dispatch.module.css";
import { FaSearch, FaTruck, FaEye } from "react-icons/fa";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

const DispatchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showResponderModal, setShowResponderModal] = useState(false);

  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [selectedResponderView, setSelectedResponderView] = useState<any>(null);
  const [dispatchInfo, setDispatchInfo] = useState<any>(null);
const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ------------------------------------------------------------
  // REAL-TIME RESPONDERS
  // ------------------------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ------------------------------------------------------------
  // SEARCH FILTER
  // ------------------------------------------------------------
  const filteredResponders = responders.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.address?.toLowerCase().includes(term)
    );
  });

  // ------------------------------------------------------------
  // FETCH ALERTS (Pending Only)
  // ------------------------------------------------------------
  const openAlertModal = async () => {
    const snap = await getDocs(
      query(
        collection(db, "alerts"),
        where("status", "==", "Pending"),
        orderBy("timestamp", "desc")
      )
    );

    const pending = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (pending.length === 0) {
      window.alert("No pending alerts found.");
      return;
    }

    setAlerts(pending);
  };

  const handleDispatchClick = () => {
    openAlertModal();
    setSelectedAlert(null);
    setShowResponderModal(false);
  };

  // ------------------------------------------------------------
  // SELECT ALERT → PROCEED TO RESPONDER SELECTION
  // ------------------------------------------------------------
  const selectAlertForDispatch = (alert: any) => {
    setSelectedAlert(alert);
    setSelectedResponderIds(new Set());
    setSelectAll(false);
    setShowResponderModal(true);
  };

  // ------------------------------------------------------------
  // MULTI SELECT RESPONDERS
  // ------------------------------------------------------------
  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

const toggleSelectAll = () => {
  if (!selectAll) {
    const availableIds = responders
      .filter((r) => r.status === "Available")
      .map((r) => r.id);

    setSelectedResponderIds(new Set(availableIds));
    setSelectAll(true);
  } else {
    setSelectedResponderIds(new Set());
    setSelectAll(false);
  }
};



  // ------------------------------------------------------------
  // DISPATCH SELECTED RESPONDERS
  // ------------------------------------------------------------
  const dispatchResponders = async () => {
    if (!selectedAlert) return;

    if (selectedResponderIds.size === 0) {
      window.alert("Please select at least one responder.");
      return;
    }

    try {
      const batch = writeBatch(db);

      const respondersList = responders.filter((r) =>
        selectedResponderIds.has(r.id)
      );

      const responderEmails = respondersList.map((r) => r.email.toLowerCase());

      const dispatchRef = doc(collection(db, "dispatches"));

      batch.set(dispatchRef, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,

        responders: respondersList.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email.toLowerCase(),
          contact: r.contact || "",
        })),

        responderEmails,
        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact,
        userEmail: selectedAlert.userEmail,

        status: "Dispatched",
        timestamp: serverTimestamp(),
        dispatchedBy: "Admin Panel",
      });

      // Update responders → Dispatched
      respondersList.forEach((r) =>
        batch.update(doc(db, "users", r.id), { status: "Dispatched" })
      );

      // Update alert → Dispatched
      batch.update(doc(db, "alerts", selectedAlert.id), { status: "Dispatched" });

    await batch.commit();

// Show success modal instead of alert
setShowSuccessModal(true);

setShowResponderModal(false);
setAlerts([]);

// OPTIONAL: auto-close after 2.5 seconds
setTimeout(() => setShowSuccessModal(false), 2500);

    } catch (err) {
      console.error(err);
      window.alert("Error dispatching responders.");
    }
  };

  // ------------------------------------------------------------
  // VIEW DISPATCH INFO (for dispatched responders)
  // ------------------------------------------------------------
  const openViewModal = async (responder: any) => {
    setSelectedResponderView(responder);
    setDispatchInfo(null);

    const snap = await getDocs(
      query(
        collection(db, "dispatches"),
        where("responderEmails", "array-contains", responder.email.toLowerCase()),
        orderBy("timestamp", "desc"),
        limit(1)
      )
    );

    if (!snap.empty) setDispatchInfo(snap.docs[0].data());
  };

  const closeView = () => {
    setSelectedResponderView(null);
    setDispatchInfo(null);
  };

  return (
    <div className={styles.pageWrapper}>
      <AdminHeader />

      {/* 🔔 Bell Icon at top-right */}
      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
        <AlertBellButton />
      </div>

      {/* 🚨 Alert Dispatch Modal (opens when bell is clicked) */}
      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Responder Dispatch</h2>
          <hr className={styles.separator} />

          {/* SEARCH */}
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search responder…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* RESPONDER TABLE */}
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredResponders.map((r) => (
                <tr key={r.id}>
                  <td>{r.id.slice(0, 6)}…</td>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.address}</td>
                  <td>
                    <span
  className={
    r.status === "Available"
      ? styles.statusAvailable
      : r.status === "Unavailable"
      ? styles.statusUnavailable
      : styles.statusDispatched
  }
>
  {r.status}
</span>
                  </td>

                 <td>
  {r.status === "Available" && (
    <button className={styles.dispatchBtn} onClick={handleDispatchClick}>
      <FaTruck /> Dispatch
    </button>
  )}

  {r.status === "Dispatched" && (
    <button className={styles.viewBtn} onClick={() => openViewModal(r)}>
      <FaEye /> View
    </button>
  )}

  {r.status === "Unavailable" && (
    <span style={{ color: "#888", fontStyle: "italic" }}>No Action</span>
  )}
</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DISPATCH MODAL */}
      {selectedResponderView && dispatchInfo && (
        <div className={styles.modalOverlay} onClick={closeView}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Responder Dispatch Info</h3>

            <p><strong>Name:</strong> {selectedResponderView.name}</p>
            <p><strong>Email:</strong> {selectedResponderView.email}</p>
            <p><strong>Contact:</strong> {selectedResponderView.contact}</p>

            <hr />

            <h4>🚨 Latest Dispatch</h4>

            <p><strong>Alert:</strong> {dispatchInfo.alertType}</p>
            <p><strong>Location:</strong> {dispatchInfo.alertLocation}</p>
            <p><strong>Reporter:</strong> {dispatchInfo.userReported}</p>
            <p><strong>Reporter Contact:</strong> {dispatchInfo.userContact}</p>
            <p><strong>Reporter Address:</strong> {dispatchInfo.userAddress}</p>
            <p><strong>Reporter Email:</strong> {dispatchInfo.userEmail}</p>

            <p>
              <strong>Timestamp:</strong>{" "}
              {dispatchInfo.timestamp?.seconds
                ? new Date(dispatchInfo.timestamp.seconds * 1000).toLocaleString()
                : "N/A"}
            </p>

            <button className={styles.closeBtn} onClick={closeView}>Close</button>
          </div>
        </div>
      )}

      {/* ALERT SELECTION MODAL (TABLE VERSION) */}
{alerts.length > 0 && !showResponderModal && selectedAlert === null && (
  <div className={styles.modalOverlay} onClick={() => setAlerts([])}>
    <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
      <h3 className={styles.modalTitle}>Select Alert</h3>

      <div className={styles.tableScroll}>
        <table className={styles.alertTable}>
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Select</th>
            </tr>
          </thead>

          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.userName}</td>
                <td>{alert.userContact}</td>
                <td>{alert.userAddress}</td>

                <td>
                  <button
                    className={styles.assignBtn}
                    onClick={() => selectAlertForDispatch(alert)}
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className={styles.closeBtn} onClick={() => setAlerts([])}>
        Close
      </button>
    </div>
  </div>
)}


      {/* RESPONDER SELECTION MODAL (TABLE VERSION) */}
      {showResponderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResponderModal(false)}>
          <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Select Responders</h3>

            <label className={styles.selectAllRow}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              <span>Select All Responders</span>
            </label>

            <div className={styles.tableScroll}>
              <table className={styles.responderTable}>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                  </tr>
                </thead>

                <tbody>
                  {responders.map((r) => (
                    <tr key={r.id}>
                      <td>
                       <input
  type="checkbox"
  disabled={r.status === "Unavailable" || r.status === "Dispatched"}
  checked={selectedResponderIds.has(r.id)}
  onChange={() => toggleResponder(r.id)}
/>

{r.status === "Dispatched" && (
  <span className={styles.disabledTag}>Already Dispatched</span>
)}

{r.status === "Unavailable" && (
  <span className={styles.disabledTag}>Unavailable</span>
)}


                      </td>
                      <td>{r.name}</td>
                      <td>{r.email}</td>
                      <td>{r.contact || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.assignBtn} onClick={dispatchResponders}>
                Dispatch Selected
              </button>

              <button className={styles.closeBtn} onClick={() => setShowResponderModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>

        
      )}

      {/* SUCCESS MODAL */}



      {/* SUCCESS MODAL */}
{showSuccessModal && (
  <div className={styles.modalOverlay}>
    <div className={styles.successModal}>
      <div className={styles.successIcon}>✔</div>
      <h3 className={styles.successTitle}>Dispatch Successful!</h3>
      <p className={styles.successMessage}>
        Responders have been dispatched successfully.
      </p>

      <button
        className={styles.successCloseBtn}
        onClick={() => setShowSuccessModal(false)}
      >
        Close
      </button>
    </div>
  </div>
)}

    </div>
  );
};

export default DispatchPage;
