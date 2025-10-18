"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./notificationStyles.module.css";

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all"); // ✅ "all" | "read" | "unread"

  // ✅ Mock data
  useEffect(() => {
    const mockAlerts = [
      {
        id: 1,
        type: "🔥 Fire Detected",
        location: "Building A - Room 203",
        time: "10:42 AM",
        date: "October 17, 2025",
        confidence: "92%",
        status: "Pending",
        description:
          "The system detected flames and high heat signatures in Room 203. Immediate response required.",
        read: false,
      },
      {
        id: 2,
        type: "💨 Smoke Detected",
        location: "Warehouse 2",
        time: "9:15 AM",
        date: "October 17, 2025",
        confidence: "87%",
        status: "Resolved",
        description:
          "Smoke was detected in Warehouse 2. Responders confirmed it was a false alarm due to maintenance activity.",
        read: true,
      },
    ];
    setNotifications(mockAlerts);
  }, []);

  // ✅ Handle modal open + mark as read
  const handleOpenModal = (notif) => {
    setSelectedNotif(notif);
    setShowModal(true);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
  };

  const handleCloseModal = () => setShowModal(false);

  // ✅ Filter notifications based on selected filter
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "read") return n.read;
    if (filter === "unread") return !n.read;
    return true;
  });

  return (
    <div>
      <AdminHeader />
      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Notifications</h2>

            {/* ✅ Filter Buttons */}
            <div className={styles.filterContainer}>
              <button
                className={`${styles.filterBtn} ${
                  filter === "all" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                className={`${styles.filterBtn} ${
                  filter === "unread" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilter("unread")}
              >
                Unread
              </button>
              <button
                className={`${styles.filterBtn} ${
                  filter === "read" ? styles.activeFilter : ""
                }`}
                onClick={() => setFilter("read")}
              >
                Read
              </button>
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
                    notif.status === "Pending"
                      ? styles.pending
                      : styles.resolved
                  } ${notif.read ? styles.read : styles.unread}`}
                >
                  <div className={styles.notifInfo}>
                    <h4>
                      {notif.type}{" "}
                      {!notif.read && <span className={styles.unreadDot}></span>}
                    </h4>
                    <p>
                      <strong>Location:</strong> {notif.location}
                    </p>
                    <p>
                      <strong>Time:</strong> {notif.time}
                    </p>
                    <p>
                      <strong>Confidence:</strong> {notif.confidence}
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

      {/* ✅ Modal Popup */}
      {showModal && selectedNotif && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{selectedNotif.type}</h3>
            <p>
              <strong>Location:</strong> {selectedNotif.location}
            </p>
            <p>
              <strong>Date:</strong> {selectedNotif.date}
            </p>
            <p>
              <strong>Time:</strong> {selectedNotif.time}
            </p>
            <p>
              <strong>Confidence:</strong> {selectedNotif.confidence}
            </p>
            <p>
              <strong>Status:</strong> {selectedNotif.status}
            </p>
            <p className={styles.desc}>{selectedNotif.description}</p>
            <button className={styles.closeBtn} onClick={handleCloseModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
