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

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderIds, setSelectedResponderIds] = useState<
    Set<string>
  >(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // ✅ Real-time listener for alerts (notifications)
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(alerts);
      },
      (err) => {
        console.error("alerts onSnapshot error:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  // ✅ Open modal & mark as read
  const handleOpenModal = async (notif: any) => {
    setSelectedNotif(notif);
    setShowModal(true);

    try {
      // mark read in Firestore
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

  // 🚒 Fetch responder accounts and open dispatch modal
  const fetchResponders = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "responder"));
      const snapshot = await getDocs(q);
      const responderList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setResponders(responderList);
      setSelectedResponderIds(new Set());
      setSelectAll(false);
      setShowDispatchModal(true);
    } catch (error) {
      console.error("❌ Failed to load responders:", error);
    }
  };

  // toggle a single responder checkbox
  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // if toggled off -> uncheck "selectAll"
      if (next.size !== responders.length) setSelectAll(false);
      return next;
    });
  };

  // select/deselect all responders in modal
  const toggleSelectAll = () => {
    if (!selectAll) {
      // select all
      const allIds = new Set(responders.map((r) => r.id));
      setSelectedResponderIds(allIds);
      setSelectAll(true);
    } else {
      // deselect all
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }
  };

  // 🚨 Dispatch multiple responders (batch)
  const handleDispatchMultiple = async () => {
    if (!selectedNotif) return;
    if (selectedResponderIds.size === 0) {
      alert("Please select at least one responder to dispatch.");
      return;
    }

    try {
      const batch = writeBatch(db);

      // reporter fields (safe fallback)
      const reporterName = selectedNotif.userName || "Unknown";
      const reporterAddress = selectedNotif.userAddress || "N/A";
      const reporterContact = selectedNotif.userContact || "N/A";
      const reporterEmail = selectedNotif.userEmail || "N/A";

      // Create a dispatch doc for each selected responder, update responder status
      for (const responderId of Array.from(selectedResponderIds)) {
        const responder = responders.find((r) => r.id === responderId);
        if (!responder) continue;

        const dispatchRef = doc(collection(db, "dispatches"));
       batch.set(dispatchRef, {
  alertId: selectedNotif.id,
  alertType: selectedNotif.type || "🔥 Fire Detected",
  alertLocation: selectedNotif.location || selectedNotif.alertLocation || "Unknown",

  responders: [
    {
      id: responder.id,
      name: responder.name,
      email: responder.email.toLowerCase(),
      contact: responder.contact || "",
    },
  ],

  responderEmails: [responder.email.toLowerCase()],

  userReported: reporterName,
  userAddress: reporterAddress,
  userContact: reporterContact,
  userEmail: reporterEmail,

  status: "Dispatched",
  timestamp: serverTimestamp(),
  dispatchedBy: "Admin Panel",
});


        // update responder status
        const responderRef = doc(db, "users", responder.id);
        batch.update(responderRef, { status: "Dispatched" });
      }

      // Update the alert status once (still Dispatched)
      const alertRef = doc(db, "alerts", selectedNotif.id);
      batch.update(alertRef, { status: "Dispatched" });

      await batch.commit();

      // keep UI of notifications same (you requested not to update); we just close modals
      alert(`🚒 Dispatched ${selectedResponderIds.size} responder(s) successfully.`);
      setShowDispatchModal(false);
      setShowModal(false);
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error("❌ Dispatch multiple failed:", error);
      alert("Failed to dispatch selected responders. Please try again.");
    }
  };

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Notifications</h2>

            {/* Filter Buttons */}
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

          {/* Notification List */}
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
                      <strong>Location:</strong> {notif.location || "Unknown Location"}
                    </p>
                    <p>
                      <strong>Reported by:</strong> {notif.userName || "Unknown User"}
                    </p>
                    <p>
                      <strong>Status:</strong> {notif.status}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {notif.timestamp?.seconds
                        ? new Date(notif.timestamp.seconds * 1000).toLocaleString()
                        : "Pending..."}
                    </p>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      notif.status === "Pending" ? styles.statusPending : styles.statusResolved
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

      {/* Fire Alert Modal (keep same UI) */}
      {showModal && selectedNotif && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>🔥 Fire Detected</h3>

            {/* ---- Alert details ---- */}
            <p><strong>Location:</strong> {selectedNotif.location || "N/A"}</p>
            <p><strong>Status:</strong> {selectedNotif.status || "N/A"}</p>
            <p>
              <strong>Date & Time:</strong>{" "}
              {selectedNotif.timestamp?.seconds
                ? new Date(selectedNotif.timestamp.seconds * 1000).toLocaleString()
                : "Pending..."}
            </p>

            <hr style={{ margin: "10px 0" }} />
            <h4>User Information</h4>
            <p><strong>Name:</strong> {selectedNotif.userName || "N/A"}</p>
            <p><strong>Address:</strong> {selectedNotif.userAddress || "N/A"}</p>
            <p><strong>Contact:</strong> {selectedNotif.userContact || "N/A"}</p>
            <p><strong>Email:</strong> {selectedNotif.userEmail || "N/A"}</p>

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

      {/* Dispatch Responders Modal */}
      {showDispatchModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDispatchModal(false)}>
          <div
            className={`${styles.modalContent} ${styles.dispatchModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dispatchHeader}>
              <h3>🚒 Dispatch Responders</h3>
              <p className={styles.subText}>Select one or more responders to assign this alert.</p>
            </div>

            {/* Select All control */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
                <strong>Select All</strong>
              </label>
              <div style={{ marginLeft: "auto", fontSize: 14, color: "#666" }}>
                {selectedResponderIds.size} selected
              </div>
            </div>

            <div className={styles.responderList} style={{ maxHeight: 360, overflowY: "auto" }}>
              {responders.length === 0 ? (
                <p className={styles.noResponder}>No responders available.</p>
              ) : (
                responders.map((responder) => {
                  const checked = selectedResponderIds.has(responder.id);
                  return (
                    <div key={responder.id} className={styles.responderCard}>
                      <label style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleResponder(responder.id)}
                        />
                        <div className={styles.responderInfo} style={{ flex: 1 }}>
                          <p className={styles.responderName}>{responder.name}</p>
                          <p className={styles.responderEmail}>{responder.email}</p>
                          <p className={styles.responderContact}>📞 {responder.contact || "N/A"}</p>
                        </div>
                        <div style={{ minWidth: 120, textAlign: "right" }}>
                          <span style={{ fontSize: 12, color: "#666" }}>{responder.status || "Available"}</span>
                        </div>
                      </label>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className={styles.dispatchNowBtn}
                onClick={handleDispatchMultiple}
                style={{ flex: "0 0 160px" }}
              >
                🚀 Dispatch Selected
              </button>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowDispatchModal(false);
                  setSelectedResponderIds(new Set());
                  setSelectAll(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
