"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./notificationStyles.module.css";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const NotificationPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [responders, setResponders] = useState<any[]>([]);

  // ✅ Real-time listener for alerts
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(alerts);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Open modal & mark as read
  const handleOpenModal = async (notif: any) => {
    setSelectedNotif(notif);
    setShowModal(true);
    try {
      await updateDoc(doc(db, "alerts", notif.id), { read: true });
    } catch (error) {
      console.error("⚠️ Failed to mark alert as read:", error);
    }
  };

  const handleCloseModal = () => setShowModal(false);

  // ✅ Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "read") return n.read;
    if (filter === "unread") return !n.read;
    return true;
  });

  // 🚒 Fetch responder accounts
  const fetchResponders = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "responder"));
      const snapshot = await getDocs(q);
      const responderList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setResponders(responderList);
      setShowDispatchModal(true);
    } catch (error) {
      console.error("❌ Failed to load responders:", error);
    }
  };

  // 🚨 Dispatch responder (includes reporter info)
  const handleDispatch = async (responder: any) => {
    if (!selectedNotif) return;

    try {
      const batch = writeBatch(db);

      // ✅ Extract reporter details safely
      const reporterName = selectedNotif.userName || "Unknown";
      const reporterAddress = selectedNotif.userAddress || "N/A";
      const reporterContact = selectedNotif.userContact || "N/A";
      const reporterEmail = selectedNotif.userEmail || "N/A";

      // 1️⃣ Add dispatch record
      const dispatchRef = doc(collection(db, "dispatches"));
      batch.set(dispatchRef, {
        alertId: selectedNotif.id,
        alertType: selectedNotif.type || "🔥 Fire Detected",
        alertLocation: selectedNotif.location || selectedNotif.alertLocation || "Unknown",
        responderId: responder.id,
        responderName: responder.name,
        responderContact: responder.contact,
        responderEmail: responder.email.toLowerCase(),
        userReported: reporterName,
        userAddress: reporterAddress, // ✅ FIXED
        userContact: reporterContact, // ✅ FIXED
        userEmail: reporterEmail,
        status: "Dispatched",
        timestamp: serverTimestamp(),
        dispatchedBy: "Admin Panel",
      });

      // 2️⃣ Update alert status
      const alertRef = doc(db, "alerts", selectedNotif.id);
      batch.update(alertRef, { status: "Dispatched" });

      // 3️⃣ Update responder status
      const responderRef = doc(db, "users", responder.id);
      batch.update(responderRef, { status: "Dispatched" });

      await batch.commit();

      alert(`🚒 Responder ${responder.name} has been dispatched successfully!`);
      setShowDispatchModal(false);
      setShowModal(false);
    } catch (error) {
      console.error("❌ Dispatch failed:", error);
      alert("Failed to dispatch responder. Please try again.");
    }
  };

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Notifications</h2>

            {/* 🔍 Filter Buttons */}
            <div className={styles.filterContainer}>
              {["all", "unread", "read"].map((btn) => (
                <button
                  key={btn}
                  className={`${styles.filterBtn} ${
                    filter === btn ? styles.activeFilter : ""
                  }`}
                  onClick={() => setFilter(btn)}
                >
                  {btn.charAt(0).toUpperCase() + btn.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <hr className={styles.separator} />

          {/* ✅ Notification List */}
          <div className={styles.notificationList}>
            {filteredNotifications.length === 0 ? (
              <p className={styles.noNotif}>No notifications found.</p>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleOpenModal(notif)}
                  className={`${styles.notificationCard} ${
                    notif.read ? styles.read : styles.unread
                  }`}
                >
                  <div className={styles.notifInfo}>
                    <h4>
                      {notif.type}{" "}
                      {!notif.read && <span className={styles.unreadDot}></span>}
                    </h4>
                    <p>
                      <strong>Location:</strong>{" "}
                      {notif.location || "Unknown Location"}
                    </p>
                    <p>
                      <strong>Reported by:</strong>{" "}
                      {notif.userName || "Unknown User"}
                    </p>
                    <p>
                      <strong>Status:</strong> {notif.status}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {notif.timestamp?.seconds
                        ? new Date(
                            notif.timestamp.seconds * 1000
                          ).toLocaleString()
                        : "Pending..."}
                    </p>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      notif.status === "Pending"
                        ? styles.statusPending
                        : styles.statusResolved
                    }`}
                  >
                    {notif.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 🔥 Fire Alert Modal */}
      {showModal && selectedNotif && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>🔥 Fire Detected</h3>
            <p>
              <strong>Location:</strong> {selectedNotif.location}
            </p>
            <p>
              <strong>Status:</strong> {selectedNotif.status}
            </p>
            <p>
              <strong>Date & Time:</strong>{" "}
              {selectedNotif.timestamp?.seconds
                ? new Date(
                    selectedNotif.timestamp.seconds * 1000
                  ).toLocaleString()
                : "Pending..."}
            </p>

            <hr style={{ margin: "10px 0" }} />
            <h4>User Information</h4>
            <p>
              <strong>Name:</strong> {selectedNotif.userName || "N/A"}
            </p>
            <p>
              <strong>Address:</strong> {selectedNotif.userAddress || "N/A"}
            </p>
            <p>
              <strong>Contact:</strong> {selectedNotif.userContact || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {selectedNotif.userEmail || "N/A"}
            </p>

            <hr style={{ margin: "10px 0" }} />
            <p className={styles.desc}>
              {selectedNotif.description || "Fire detected in this area."}
            </p>

            <div className={styles.modalActions}>
              <button className={styles.dispatchBtn} onClick={fetchResponders}>
                🚒 Dispatch
              </button>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 Dispatch Responders Modal */}
      {showDispatchModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDispatchModal(false)}
        >
          <div
            className={`${styles.modalContent} ${styles.dispatchModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dispatchHeader}>
              <h3>🚒 Dispatch Responders</h3>
              <p className={styles.subText}>
                Select a responder to assign this alert.
              </p>
            </div>

            <div className={styles.responderList}>
              {responders.length === 0 ? (
                <p className={styles.noResponder}>No responders available.</p>
              ) : (
                responders.map((responder) => (
                  <div key={responder.id} className={styles.responderCard}>
                    <div className={styles.responderInfo}>
                      <p className={styles.responderName}>{responder.name}</p>
                      <p className={styles.responderEmail}>
                        {responder.email}
                      </p>
                      <p className={styles.responderContact}>
                        📞 {responder.contact}
                      </p>
                    </div>
                    <button
                      className={styles.dispatchNowBtn}
                      onClick={() => handleDispatch(responder)}
                    >
                      🚀 Dispatch
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              className={styles.closeBtn}
              onClick={() => setShowDispatchModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
