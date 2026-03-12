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

type Responder = {
  id: string;
  name?: string;
  email?: string;
  address?: string;
  status?: string;
  role?: string;
  verified?: boolean;
  approved?: boolean;
};

type ConfirmAction =
  | {
      action: "accept" | "decline";
      responder: Responder;
    }
  | null;

const ResponderRequestsPage = () => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    const loadResponders = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "responder"),
          where("verified", "==", true),
          where("approved", "==", false)
        );

        const querySnapshot = await getDocs(q);
        const list: Responder[] = [];

        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Responder);
        });

        setResponders(list);
      } catch (error) {
        console.error("Error loading responders:", error);
      }
    };

    loadResponders();
  }, []);

  const filtered = responders.filter((r) =>
    `${r.name ?? ""} ${r.email ?? ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleAction = (action: "accept" | "decline", responder: Responder) => {
    setConfirmAction({ action, responder });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    const { responder, action } = confirmAction;

    try {
      const ref = doc(db, "users", responder.id);

      if (action === "accept") {
        await updateDoc(ref, {
          approved: true,
          status: "Available",
        });
      } else {
        await updateDoc(ref, {
          approved: false,
          status: "Declined",
        });
      }

      setResponders((prev) => prev.filter((r) => r.id !== responder.id));

      alert(
        `${responder.name ?? "Responder"} has been ${
          action === "accept" ? "approved" : "declined"
        }.`
      );
    } catch (err) {
      console.error("Error updating:", err);
      setErrorMessage("Failed to update responder.");
    }

    setConfirmAction(null);
  };

  return (
    <div>
      <AdminHeader />

      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
        <AlertBellButton />
      </div>

      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Responder Requests</h2>
          </div>

          <hr className={styles.separator} />

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
                  filtered.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Name">{r.name ?? "N/A"}</td>
                      <td data-label="Email">{r.email ?? "N/A"}</td>
                      <td data-label="Address">{r.address ?? "N/A"}</td>
                      <td data-label="Status">{r.status ?? "Pending"}</td>
                      <td data-label="Actions" className={styles.actionCell}>
                        <button
                          className={styles.acceptBtn}
                          onClick={() => handleAction("accept", r)}
                        >
                          <span className={styles.btnContent}>
                            <FaUserCheck />
                            Accept
                          </span>
                        </button>

                        <button
                          className={styles.declineBtn}
                          onClick={() => handleAction("decline", r)}
                        >
                          <span className={styles.btnContent}>
                            <FaUserTimes />
                            Decline
                          </span>
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

      {confirmAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3 className={styles.modalTitle}>
              {confirmAction.action === "accept"
                ? "Accept Responder"
                : "Decline Responder"}
            </h3>

            <p className={styles.confirmText}>
              Are you sure you want to{" "}
              {confirmAction.action === "accept" ? "approve" : "decline"}{" "}
              <strong>{confirmAction.responder.name}</strong>?
            </p>

            <div className={styles.confirmButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() => setConfirmAction(null)}
              >
                <span>Cancel</span>
              </button>

              <button
                className={
                  confirmAction.action === "accept"
                    ? styles.acceptBtn
                    : styles.declineBtn
                }
                onClick={executeAction}
              >
                <span>
                  {confirmAction.action === "accept" ? "Accept" : "Decline"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
  <div className={styles.modalOverlay}>
    <div className={styles.confirmModal}>
      <h3>Success</h3>
      <p>{successMessage}</p>

      <button
        className={styles.acceptBtn}
        onClick={() => setSuccessMessage(null)}
      >
        Okay
      </button>
    </div>
  </div>
)}

{errorMessage && (
  <div className={styles.modalOverlay}>
    <div className={styles.confirmModal}>
      <h3>Error</h3>
      <p>{errorMessage}</p>

      <button
        className={styles.cancelBtn}
        onClick={() => setErrorMessage(null)}
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default ResponderRequestsPage;