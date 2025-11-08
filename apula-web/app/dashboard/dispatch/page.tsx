"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./dispatch.module.css";
import { FaSearch, FaTruck, FaEye } from "react-icons/fa";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";


const DispatchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch responders from Firestore (real-time)
  useEffect(() => {
    const respondersRef = collection(db, "users");

    // Listen for real-time changes
    const unsubscribe = onSnapshot(respondersRef, (snapshot) => {
      const responderData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        // ✅ Show only responders
        .filter((r: any) => r.role?.toLowerCase() === "responder");

      setResponders(responderData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Filter responders by search term
  const filteredResponders = responders.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Dispatch action (update status in Firestore)
  const handleDispatch = async (id: string) => {
    try {
      const responderRef = doc(db, "users", id);
      await updateDoc(responderRef, { status: "Dispatched" });

      alert("Responder dispatched successfully!");
    } catch (error) {
      console.error("Error updating responder:", error);
      alert("Failed to dispatch responder.");
    }
  };

  // ✅ Open & close modal
  const openModal = (responder: any) => setSelectedResponder(responder);
  const closeModal = () => setSelectedResponder(null);

  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          {/* Header */}
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Responder Dispatch</h2>
          </div>
          <hr className={styles.separator} />

          {/* Search */}
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
              <p className={styles.loading}>Loading responders...</p>
            ) : (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResponders.length > 0 ? (
                    filteredResponders.map((r) => (
                      <tr key={r.id}>
                        <td data-label="ID">{r.id.slice(0, 6)}...</td>
                        <td data-label="Name">{r.name || "N/A"}</td>
                        <td data-label="Department">{r.address || "N/A"}</td>
                        <td data-label="Email">{r.email || "N/A"}</td>
                        <td data-label="Status">
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
                        <td data-label="Actions">
                          {r.status === "Available" ? (
                            <button
                              className={styles.dispatchBtn}
                              onClick={() => handleDispatch(r.id)}
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

      {/* ✅ Modal for Details */}
      {selectedResponder && (
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
                <strong>Department:</strong>{" "}
                {selectedResponder.address || "N/A"}
              </p>
              <p>
                <strong>Contact:</strong>{" "}
                {selectedResponder.contact || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {selectedResponder.email || "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {selectedResponder.status || "N/A"}
              </p>
              <p>
                <strong>Created At:</strong>{" "}
                {selectedResponder.createdAt
                  ? new Date(
                      selectedResponder.createdAt.seconds * 1000
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
    </div>
  );
};

export default DispatchPage;
