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
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const DispatchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<any>(null);
  const [dispatchInfo, setDispatchInfo] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // 🔥 LIVE RESPONDER LISTENER
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u: any) => u.role?.toLowerCase() === "responder");

        setResponders(data);
        setLoading(false);
      },
      (err) => console.error("users listener error:", err)
    );

    return () => unsub();
  }, []);

  // 🔥 UPDATE responder → Available if dispatch is resolved
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "dispatches"), (snap) => {
      snap.docs.forEach(async (docSnap) => {
        const dispatch = docSnap.data();

        if (dispatch.status === "Resolved" && dispatch.responderEmail) {
          const q = query(
            collection(db, "users"),
            where("email", "==", dispatch.responderEmail.toLowerCase())
          );

          const resSnap = await getDocs(q);
          resSnap.forEach(async (resDoc) => {
            await updateDoc(doc(db, "users", resDoc.id), {
              status: "Available",
            });
          });
        }
      });
    });

    return () => unsub();
  }, []);

  // 🔥 FILTER responders
  const filteredResponders = responders.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.address?.toLowerCase().includes(term)
    );
  });

  // 🔥 Fetch only PENDING alerts
  const fetchAlerts = async (responder: any) => {
    setSelectedResponder(responder);
    setShowAlertModal(true);

    try {
      const q = query(
        collection(db, "alerts"),
        where("status", "==", "Pending"),
        orderBy("timestamp", "desc")
      );

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAlerts(data);
    } catch (error) {
      console.error("fetchAlerts error:", error);
      setAlerts([]);
    }
  };

  // 🔥 Assign responder
  const assignDispatch = async (alertItem: any) => {
    if (!selectedResponder) return;

    try {
      await addDoc(collection(db, "dispatches"), {
        alertId: alertItem.id,
        alertType: alertItem.type || "Fire Detected",
        alertLocation: alertItem.location || "Unknown",
        userReported: alertItem.userName || "Unknown",
        userAddress: alertItem.userAddress || "Unknown",
        userContact: alertItem.userContact || "Unknown",
        responderId: selectedResponder.id,
        responderName: selectedResponder.name,
        responderEmail: selectedResponder.email.toLowerCase(),
        responderContact: selectedResponder.contact || "",
        dispatchedBy: "Admin Panel",
        status: "Dispatched",
        timestamp: serverTimestamp(),
      });

      // update responder in DB
      await updateDoc(doc(db, "users", selectedResponder.id), {
        status: "Dispatched",
      });

      // update alert
      await updateDoc(doc(db, "alerts", alertItem.id), {
        status: "Dispatched",
      });

      // 🔥 UI Instant update (fix for dispatch button not switching)
      setResponders((prev) =>
        prev.map((r) =>
          r.id === selectedResponder.id
            ? { ...r, status: "Dispatched" }
            : r
        )
      );

      window.alert(`Responder ${selectedResponder.name} dispatched!`);

      setShowAlertModal(false);
      setSelectedResponder(null);
    } catch (error) {
      console.error("assignDispatch error:", error);
      window.alert("Failed to assign responder.");
    }
  };

  // 🔥 Show latest dispatch info
  const openModal = async (responder: any) => {
    setSelectedResponder(responder);
    setDispatchInfo(null);

    try {
      const q = query(
        collection(db, "dispatches"),
        where("responderEmail", "==", responder.email.toLowerCase()),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        setDispatchInfo(snap.docs[0].data());
      }
    } catch (error) {
      console.error("openModal error:", error);
    }
  };

  const closeModal = () => {
    setSelectedResponder(null);
    setDispatchInfo(null);
    setShowAlertModal(false);
  };

  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Responder Dispatch</h2>
          <hr className={styles.separator} />

          {/* Search Bar */}
          <div className={styles.filters}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} size={18} />
              <input
                type="text"
                placeholder="Search responder..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableSection}>
            {loading ? (
              <p>Loading responders...</p>
            ) : (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResponders.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id.slice(0, 6)}...</td>
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
                            onClick={() => fetchAlerts(r)}
                          >
                            <FaTruck /> Dispatch
                          </button>
                        ) : (
                          <button
                            className={styles.viewBtn}
                            onClick={() => openModal(r)}
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

      {/* VIEW DISPATCH MODAL */}
      {selectedResponder && dispatchInfo && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Responder Information</h3>

            <p><strong>Name:</strong> {selectedResponder.name}</p>
            <p><strong>Email:</strong> {selectedResponder.email}</p>
            <p><strong>Contact:</strong> {selectedResponder.contact}</p>

            <hr />
            <h4>🚨 Latest Dispatch</h4>
            <p><strong>Alert:</strong> {dispatchInfo.alertType}</p>
            <p><strong>Location:</strong> {dispatchInfo.alertLocation}</p>
            <p><strong>Reporter:</strong> {dispatchInfo.userReported}</p>
            <p><strong>Reporter Address:</strong> {dispatchInfo.userAddress}</p>
            <p><strong>Reporter Contact:</strong> {dispatchInfo.userContact}</p>

            <p>
              <strong>Timestamp:</strong>{" "}
              {dispatchInfo.timestamp?.seconds
                ? new Date(dispatchInfo.timestamp.seconds * 1000).toLocaleString()
                : "N/A"}
            </p>

            <button className={styles.closeBtn} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ALERT SELECTION MODAL */}
      {showAlertModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAlertModal(false)}
        >
          <div
            className={`${styles.modalContent} ${styles.alertModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Select Alert to Dispatch</h3>

            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className={styles.alertCard}>
                  <h4>{alert.type || "Fire Alert"}</h4>
                  <p><strong>Location:</strong> {alert.location}</p>
                  <p><strong>Reporter:</strong> {alert.userName}</p>
                  <p><strong>Status:</strong> {alert.status}</p>

                  <button
                    className={styles.assignBtn}
                    onClick={() => assignDispatch(alert)}
                  >
                    Assign
                  </button>
                </div>
              ))
            ) : (
              <p>No pending alerts found.</p>
            )}

            <button
              className={styles.closeBtn}
              onClick={() => setShowAlertModal(false)}
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
