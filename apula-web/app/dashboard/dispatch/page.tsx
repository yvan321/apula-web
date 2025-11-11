"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./dispatch.module.css";
import { FaSearch, FaTruck, FaEye, FaMapMarkerAlt } from "react-icons/fa";
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

const DispatchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<any>(null);
  const [dispatchInfo, setDispatchInfo] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // ✅ Real-time listener for responders
  useEffect(() => {
    const respondersRef = collection(db, "users");

    const unsubscribe = onSnapshot(respondersRef, (snapshot) => {
      const responderData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((r: any) => r.role?.toLowerCase() === "responder");

      setResponders(responderData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Real-time listener for dispatches
  useEffect(() => {
    const dispatchesRef = collection(db, "dispatches");

    const unsubscribe = onSnapshot(dispatchesRef, async (snapshot) => {
      const dispatchData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      for (const dispatch of dispatchData) {
        if (dispatch.status === "Resolved" && dispatch.responderEmail) {
          const q = query(
            collection(db, "users"),
            where("email", "==", dispatch.responderEmail.toLowerCase())
          );
          const resSnapshot = await getDocs(q);
          resSnapshot.forEach(async (userDoc) => {
            const userRef = doc(db, "users", userDoc.id);
            await updateDoc(userRef, { status: "Available" });
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Filter responders
  const filteredResponders = responders.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Fetch available alerts (not resolved)
  const fetchAlerts = async (responder: any) => {
    setSelectedResponder(responder);
    setShowAlertModal(true);

    try {
      const q = query(
        collection(db, "alerts"),
        where("status", "!=", "Resolved"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAlerts(alertsData);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  // ✅ Confirm dispatch (assign responder to alert)
  const assignDispatch = async (alert: any) => {
    if (!selectedResponder) return;
    try {
      // 1️⃣ Add dispatch record
      await addDoc(collection(db, "dispatches"), {
        alertId: alert.id,
        alertType: alert.type || "Fire",
        alertLocation: alert.location || "Unknown",
        userReported: alert.userName || "Unknown",
        userAddress: alert.userAddress || "Unknown",
        userContact: alert.userContact || "Unknown",
        responderId: selectedResponder.id,
        responderName: selectedResponder.name,
        responderEmail: selectedResponder.email.toLowerCase(),
        responderContact: selectedResponder.contact || "",
        status: "Dispatched",
        timestamp: serverTimestamp(),
      });

      // 2️⃣ Update user
      await updateDoc(doc(db, "users", selectedResponder.id), {
        status: "Dispatched",
      });

      // 3️⃣ Update alert
      await updateDoc(doc(db, "alerts", alert.id), {
        status: "Dispatched",
      });

      alert(`🚒 Responder ${selectedResponder.name} assigned to alert successfully!`);

      setShowAlertModal(false);
      setSelectedResponder(null);
    } catch (error) {
      console.error("Error dispatching responder:", error);
      alert("Failed to assign responder.");
    }
  };

  // ✅ View dispatch details
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
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setDispatchInfo(snapshot.docs[0].data());
      }
    } catch (error) {
      console.error("Error fetching dispatch info:", error);
    }
  };

  const closeModal = () => {
    setSelectedResponder(null);
    setDispatchInfo(null);
  };

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Responder Dispatch</h2>
          </div>
          <hr className={styles.separator} />

          {/* 🔍 Search */}
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

          {/* 🧾 Table */}
          <div className={styles.tableSection}>
            {loading ? (
              <p className={styles.loading}>Loading responders...</p>
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
                  {filteredResponders.length > 0 ? (
                    filteredResponders.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id.slice(0, 6)}...</td>
                        <td>{r.name || "N/A"}</td>
                        <td>{r.email || "N/A"}</td>
                        <td>{r.address || "N/A"}</td>
                        <td>
                          <span
                            className={
                              r.status === "Available"
                                ? styles.statusAvailable
                                : styles.statusDispatched
                            }
                          >
                            {r.status || "Available"}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.noResults}>
                        No responders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Modal: View Dispatch Info */}
      {selectedResponder && dispatchInfo && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Responder Information</h3>
            <div className={styles.modalDetails}>
              <p>
                <strong>Name:</strong> {selectedResponder.name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {selectedResponder.email || "N/A"}
              </p>
              <p>
                <strong>Contact:</strong> {selectedResponder.contact || "N/A"}
              </p>
              <hr />
              <h4>🚨 Latest Dispatch Info</h4>
              <p>
                <strong>Alert Type:</strong> {dispatchInfo.alertType || "N/A"}
              </p>
              <p>
                <strong>Location:</strong> {dispatchInfo.alertLocation || "N/A"}
              </p>
              <p>
                <strong>Reported By:</strong> {dispatchInfo.userReported || "N/A"}
              </p>
              <p>
                <strong>Reporter Contact:</strong>{" "}
                {dispatchInfo.userContact || "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {dispatchInfo.status || "N/A"}
              </p>
              <p>
                <strong>Timestamp:</strong>{" "}
                {dispatchInfo.timestamp?.seconds
                  ? new Date(
                      dispatchInfo.timestamp.seconds * 1000
                    ).toLocaleString()
                  : "N/A"}
              </p>
            </div>
            <button className={styles.closeBtn} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* 🚨 Modal: Select Alert */}
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
                  <p>
                    <strong>Location:</strong> {alert.location || "N/A"}
                  </p>
                  <p>
                    <strong>Reporter:</strong> {alert.userName || "N/A"}
                  </p>
                  <p>
                    <strong>Status:</strong> {alert.status || "N/A"}
                  </p>
                  <button
                    className={styles.assignBtn}
                    onClick={() => assignDispatch(alert)}
                  >
                    Assign
                  </button>
                </div>
              ))
            ) : (
              <p>No active alerts found.</p>
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
