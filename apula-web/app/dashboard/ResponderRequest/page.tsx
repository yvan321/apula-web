"use client";

import React, { useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./responderRequest.module.css";
import { FaUserCheck, FaUserTimes, FaSearch } from "react-icons/fa";

const ResponderRequestsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // accept / decline

  // ✅ Sample data (pending requests)
  const responderRequests = [
    {
      id: 1,
      name: "LeBron James",
      department: "Fire Department",
      contact: "09181234567",
      address: "Imus City, Cavite",
      email: "lebronresponder@gmail.com",
      created_time: "2025-02-05 09:45",
    },
    {
      id: 2,
      name: "Stephen Curry",
      department: "Fire Department",
      contact: "09174561234",
      address: "Bacoor City, Cavite",
      email: "scurryresponder@gmail.com",
      created_time: "2025-03-12 10:12",
    },
  ];

  // ✅ Filter by search
  const filteredResponders = responderRequests.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Open/close modal
  const openModal = (responder) => setSelectedResponder(responder);
  const closeModal = () => setSelectedResponder(null);

  // ✅ Confirm action (accept/decline)
  const handleConfirm = (action, responder) => {
    setConfirmAction({ action, responder });
  };

  const executeAction = () => {
    if (confirmAction) {
      const { action, responder } = confirmAction;
      alert(
        `Responder ${responder.name} has been ${
          action === "accept" ? "accepted" : "declined"
        }.`
      );
      setConfirmAction(null);
    }
  };

  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          {/* Header */}
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Responder Requests</h2>
          </div>
          <hr className={styles.separator} />

          {/* Search Filter */}
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

          {/* Table Section */}
          <div className={styles.tableSection}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponders.length > 0 ? (
                  filteredResponders.map((r) => (
                    <tr key={r.id}>
                      <td data-label="ID">{r.id}</td>
                      <td data-label="Name">{r.name}</td>
                      <td data-label="Department">{r.department}</td>
                      <td data-label="Email">{r.email}</td>
                      <td data-label="Actions">
                        <button
                          className={styles.viewBtn}
                          onClick={() => openModal(r)}
                        >
                          View
                        </button>
                        <button
                          className={styles.acceptBtn}
                          onClick={() => handleConfirm("accept", r)}
                        >
                          <FaUserCheck /> Accept
                        </button>
                        <button
                          className={styles.declineBtn}
                          onClick={() => handleConfirm("decline", r)}
                        >
                          <FaUserTimes /> Decline
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={styles.noResults}>
                      No responder requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Popup Modal for Details */}
      {selectedResponder && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Responder Information</h3>
            <div className={styles.modalDetails}>
              <p><strong>Name:</strong> {selectedResponder.name}</p>
              <p><strong>Department:</strong> {selectedResponder.department}</p>
              <p><strong>Contact:</strong> {selectedResponder.contact}</p>
              <p><strong>Address:</strong> {selectedResponder.address}</p>
              <p><strong>Email:</strong> {selectedResponder.email}</p>
              <p><strong>Created Time:</strong> {selectedResponder.created_time}</p>
            </div>
            <button className={styles.closeBtn} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ✅ Confirmation Modal */}
      {confirmAction && (
        <div className={styles.modalOverlay} onClick={() => setConfirmAction(null)}>
          <div
            className={styles.confirmModal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {confirmAction.action === "accept"
                ? "Accept Responder"
                : "Decline Responder"}
            </h3>
            <p>
              Are you sure you want to{" "}
              {confirmAction.action === "accept" ? "accept" : "decline"}{" "}
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
