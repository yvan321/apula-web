"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";
import styles from "./notificationStyles.module.css";
import { db } from "@/lib/firebase";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");

  /* 🔊 SOUND STATES */
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /* PAGINATION */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  /* SOUND INITIALIZE */
  useEffect(() => {
    const audioElement = new Audio("/sounds/fire_alarm.mp3");
    audioElement.loop = true;
    setAudio(audioElement);
  }, []);

  /* REALTIME ALERT LISTENER */
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const alerts = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setNotifications(alerts);
      },
      (err) => console.error("alerts onSnapshot error:", err)
    );

    return () => unsubscribe();
  }, []);

  /* SOUND LOGIC */
  useEffect(() => {
    if (!audio) return;

    const hasUnread = notifications.some((n) => !n.read);

    if (hasUnread && !isPlaying) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }

    if (!hasUnread && isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  }, [notifications, audio]);

  /* RESET PAGE WHEN FILTER CHANGES */
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  /* OPEN MODAL */
  const handleOpenModal = async (notif: any) => {
    setSelectedNotif(notif);
    setShowModal(true);

    try {
      await updateDoc(doc(db, "alerts", notif.id), { read: true });
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };

  const handleCloseModal = () => setShowModal(false);

  /* FILTER LOGIC */
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "read") return n.read;
    if (filter === "unread") return !n.read;
    return true;
  });

  /* PAGINATION LOGIC */
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedNotifications = filteredNotifications.slice(
    startIndex,
    endIndex
  );

  return (
    <div>
      <AdminHeader />

      {/* Bell */}
      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
        <AlertBellButton />
      </div>

      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          {/* HEADER */}
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Notifications</h2>

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

          {/* NOTIFICATION LIST */}
          <div className={styles.notificationList}>
            {filteredNotifications.length === 0 ? (
              <p className={styles.noNotif}>No notifications found.</p>
            ) : (
              paginatedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleOpenModal(notif)}
                  className={`${styles.notificationCard} ${
                    notif.read ? styles.read : styles.unread
                  }`}
                >
                  <div className={styles.notifInfo}>
                    <h4>
                      {notif.type}
                      {!notif.read && (
                        <span className={styles.unreadDot}></span>
                      )}
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
                      notif.status === "Pending" || notif.status === "Active"
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

          {/* PAGINATION */}
          {filteredNotifications.length > 0 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() =>
                  setCurrentPage((prev) => Math.max(prev - 1, 1))
                }
                disabled={currentPage === 1}
              >
                Prev
              </button>

              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                className={styles.pageBtn}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && selectedNotif && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Fire Alert Details</h3>

            <p>
              <strong>Location:</strong> {selectedNotif.location || "N/A"}
            </p>

            <p>
              <strong>Status:</strong> {selectedNotif.status || "N/A"}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {selectedNotif.timestamp?.seconds
                ? new Date(
                    selectedNotif.timestamp.seconds * 1000
                  ).toLocaleString()
                : "Pending..."}
            </p>

            <hr />

            <h4><strong>User Information</strong></h4>

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

            <p className={styles.desc}>
              {selectedNotif.description ||
                "Fire detected in this area."}
            </p>

            <button className={styles.closeBtn} onClick={handleCloseModal}>
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;