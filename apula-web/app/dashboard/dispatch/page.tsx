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

  // -------------------------------------------------------------------
  // 🔥 REAL-TIME RESPONDER LISTENER
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // 🔍 SEARCH FILTER
  // -------------------------------------------------------------------
  const filteredResponders = responders.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.address?.toLowerCase().includes(term)
    );
  });

  // -------------------------------------------------------------------
  // 🔥 FETCH ALERTS FOR DISPATCH
  // -------------------------------------------------------------------
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

  const selectAlertForDispatch = (alert: any) => {
    setSelectedAlert(alert);
    setSelectedResponderIds(new Set());
    setSelectAll(false);
    setShowResponderModal(true);
  };

  // -------------------------------------------------------------------
  // ✔ MULTI SELECT
  // -------------------------------------------------------------------
  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!selectAll) {
      setSelectedResponderIds(new Set(responders.map((r) => r.id)));
      setSelectAll(true);
    } else {
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }
  };

  // -------------------------------------------------------------------
  // 🚑 MULTI DISPATCH – BATCH WRITE
  // -------------------------------------------------------------------
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

      respondersList.forEach((r) => {
        batch.update(doc(db, "users", r.id), { status: "Dispatched" });
      });

      batch.update(doc(db, "alerts", selectedAlert.id), { status: "Dispatched" });

      await batch.commit();

      window.alert("Dispatch completed successfully!");

      setShowResponderModal(false);
      setAlerts([]);
    } catch (err) {
      console.error(err);
      window.alert("Error dispatching responders.");
    }
  };

  // -------------------------------------------------------------------
  // 👁 VIEW DISPATCH MODAL
  // -------------------------------------------------------------------
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

    if (!snap.empty) {
      setDispatchInfo(snap.docs[0].data());
    }
  };

  const closeView = () => {
    setSelectedResponderView(null);
    setDispatchInfo(null);
  };

  // -------------------------------------------------------------------
  // 🔄 RESET RESPONDERS
  // -------------------------------------------------------------------
  const resetAllResponders = async () => {
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "responder"))
    );

    snap.forEach((u) =>
      updateDoc(doc(db, "users", u.id), { status: "Available" })
    );

    window.alert("All responders reset to Available.");
  };

  // -------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------
  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Responder Dispatch</h2>
          <hr className={styles.separator} />

          {/* SEARCH */}
          <div className={styles.filters}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search responder…"
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

         
          </div>

          {/* TABLE */}
          <div className={styles.tableSection}>
            {loading ? (
              <p>Loading responders…</p>
            ) : (
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
                              : styles.statusDispatched
                          }
                        >
                          {r.status}
                        </span>
                      </td>

                      <td>
                        {r.status === "Available" ? (
                          <button
                            className={styles.dispatchBtn}
                            onClick={() => handleDispatchClick()}
                          >
                            <FaTruck /> Dispatch
                          </button>
                        ) : (
                          <button
                            className={styles.viewBtn}
                            onClick={() => openViewModal(r)}
                          >
                            <FaEye /> View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
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

      {/* ALERT MODAL */}
      {alerts.length > 0 && !showResponderModal && selectedAlert === null && (
        <div className={styles.modalOverlay} onClick={() => setAlerts([])}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Select Alert</h3>

            {alerts.map((alert) => (
  <div key={alert.id} className={styles.alertCard}>
    <h4>{alert.type}</h4>

    <p><strong>Location:</strong> {alert.location}</p>
    <p><strong>Reporter:</strong> {alert.userName}</p>

    <p><strong>Reporter Contact:</strong> {alert.userContact || "No contact provided"}</p>
    <p><strong>Reporter Email:</strong> {alert.userEmail || "No email provided"}</p>
    <p><strong>Reporter Address:</strong> {alert.userAddress || "No address provided"}</p>

    <button
      className={styles.assignBtn}
      onClick={() => selectAlertForDispatch(alert)}
    >
      Select
    </button>
  </div>
))}


            <button className={styles.closeBtn} onClick={() => setAlerts([])}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* RESPONDER SELECT MODAL */}
      {showResponderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResponderModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Select Responders</h3>

            <label>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} /> Select All
            </label>

            <div className={styles.responderList}>
              {responders.map((r) => (
                <label key={r.id} className={styles.responderCard}>
                  <input
                    type="checkbox"
                    checked={selectedResponderIds.has(r.id)}
                    onChange={() => toggleResponder(r.id)}
                  />
                  {r.name} — {r.email}
                </label>
              ))}
            </div>

            <button className={styles.assignBtn} onClick={dispatchResponders}>
              Dispatch Selected
            </button>

            <button className={styles.closeBtn} onClick={() => setShowResponderModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchPage;
