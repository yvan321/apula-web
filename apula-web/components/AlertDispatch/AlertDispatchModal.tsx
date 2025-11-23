"use client";

import React, { useEffect, useState } from "react";
import styles from "@/app/dashboard/dispatch/dispatch.module.css";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  serverTimestamp,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const AlertDispatchModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  // Open modal via event
  useEffect(() => {
    const openModal = () => {
      loadAlerts();
      setShowModal(true);
      setSelectedAlert(null); // always reset when opening
    };

    window.addEventListener("open-alert-dispatch", openModal);
    return () => window.removeEventListener("open-alert-dispatch", openModal);
  }, []);

  // Load pending alerts
  const loadAlerts = async () => {
    const snap = await getDocs(
      query(
        collection(db, "alerts"),
        where("status", "==", "Pending"),
        orderBy("timestamp", "desc")
      )
    );

    setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Realtime responders
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => unsub();
  }, []);

  const selectAlert = (alert: any) => {
    setSelectedAlert(alert);
  };

  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!selectAll) {
      const ids = responders.filter((r) => r.status === "Available").map((r) => r.id);
      setSelectedResponderIds(new Set(ids));
      setSelectAll(true);
    } else {
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }
  };

  const dispatchResponders = async () => {
    if (!selectedAlert) return;
    if (selectedResponderIds.size === 0) {
      alert("Please select at least one responder.");
      return;
    }

    try {
      const batch = writeBatch(db);

      const selected = responders.filter((r) => selectedResponderIds.has(r.id));
      const emails = selected.map((r) => r.email.toLowerCase());

      const dispatchRef = doc(collection(db, "dispatches"));

      batch.set(dispatchRef, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,
        responders: selected.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email.toLowerCase(),
          contact: r.contact || "",
        })),
        responderEmails: emails,
        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact,
        userEmail: selectedAlert.userEmail,
        status: "Dispatched",
        dispatchedBy: "Admin Panel",
        timestamp: serverTimestamp(),
      });

      selected.forEach((r) =>
        batch.update(doc(db, "users", r.id), { status: "Dispatched" })
      );

      batch.update(doc(db, "alerts", selectedAlert.id), { status: "Dispatched" });

      await batch.commit();

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setShowModal(false);
        setSelectedAlert(null);
        setSelectedResponderIds(new Set());
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Dispatch failed.");
    }
  };

  if (!showModal) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalWide}>

        {/* STEP 1 — SELECT ALERT */}
     {/* STEP 1 — SELECT ALERT */}
{!selectedAlert && (
  <>
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
                  onClick={() => selectAlert(alert)}
                >
                  Select
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <button
      className={styles.closeBtn}
      onClick={() => {
        setShowModal(false);
        setSelectedAlert(null);
      }}
    >
      Close
    </button>
  </>
)}


        {/* STEP 2 — SELECT RESPONDERS */}
        {selectedAlert && (
          <>
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
                          disabled={r.status !== "Available"}
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

              {/* FIX: Close modal and reset to Step 1 */}
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setSelectedAlert(null);
                  setShowModal(false);
                }}
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* SUCCESS MESSAGE */}
        {showSuccess && (
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✔</div>
            <h3 className={styles.successTitle}>Dispatch Successful!</h3>
            <p className={styles.successMessage}>
              Responders have been dispatched successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertDispatchModal;
