"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import { db } from "@/lib/firebase";

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { FaUserCheck, FaUserTimes, FaSearch } from "react-icons/fa";
import styles from "./responderRequest.module.css";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

const ResponderRequestsPage = () => {
  const [responders, setResponders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  // 🔥 Load pending responders (verified but NOT approved)
  useEffect(() => {
    const loadResponders = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "responder"),
          where("verified", "==", true),   // Email verified
          where("approved", "==", false)   // Waiting for admin approval
        );

        const querySnapshot = await getDocs(q);
        const list: any[] = [];

        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });

        setResponders(list);
      } catch (error) {
        console.error("Error loading responders:", error);
      }
    };

    loadResponders();
  }, []);

  // 🔍 Filter by search
  const filtered = responders.filter((r: any) =>
    `${r.name} ${r.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ⚡ Choose accept or decline
  const handleAction = (action: string, responder: any) => {
    setConfirmAction({ action, responder });
  };

  // 🚀 Firestore update when admin Approves/Declines
  const executeAction = async () => {
    if (!confirmAction) return;

    const { responder, action } = confirmAction;

    try {
      const ref = doc(db, "users", responder.id);

      if (action === "accept") {
        await updateDoc(ref, {
          approved: true,
          status: "Available", // NEW responders become available
        });
      } else {
        await updateDoc(ref, {
          approved: false,
          status: "declined",
        });
      }

      // Remove from UI after action
      setResponders((prev) => prev.filter((r: any) => r.id !== responder.id));

      alert(
        `${responder.name} has been ${
          action === "accept" ? "approved" : "declined"
        }.`
      );
    } catch (err) {
      console.error("Error updating:", err);
      alert("Failed to update responder.");
    }

    setConfirmAction(null);
  };

  return (
    <div>
      <AdminHeader />

      
            {/* 🔔 Bell Icon at top-right */}
            <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
              <AlertBellButton />
            </div>
      
            {/* 🚨 Alert Dispatch Modal (opens when bell is clicked) */}
            <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Responder Requests</h2>
          <hr className={styles.separator} />

          {/* Search */}
          <div className={styles.filters}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} size={18} />
              <input
                type="text"
                placeholder="Search responder..."
                value={searchTerm}
                className={styles.searchInput}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableSection}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length ? (
                  filtered.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.email}</td>
                      <td>{r.address}</td>
                      <td>{r.status}</td>
                      <td>
                        <button
                          className={styles.acceptBtn}
                          onClick={() => handleAction("accept", r)}
                        >
                          <FaUserCheck /> Accept
                        </button>

                        <button
                          className={styles.declineBtn}
                          onClick={() => handleAction("decline", r)}
                        >
                          <FaUserTimes /> Decline
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.noResults}>
                      No pending responders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3>
              {confirmAction.action === "accept"
                ? "Accept Responder"
                : "Decline Responder"}
            </h3>

            <p>
              Are you sure you want to{" "}
              {confirmAction.action === "accept" ? "approve" : "decline"}{" "}
              <strong>{confirmAction.responder.name}</strong>?
            </p>

            <div className={styles.confirmButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>

              <button
                className={
                  confirmAction.action === "accept"
                    ? styles.acceptBtn
                    : styles.declineBtn
                }
                onClick={executeAction}
              >
                {confirmAction.action === "accept" ? "Accept" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponderRequestsPage;
