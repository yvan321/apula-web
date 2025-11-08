"use client";

import React, { useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./dispatch.module.css";
import { FaSearch, FaTruck, FaEye } from "react-icons/fa";

const DispatchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResponder, setSelectedResponder] = useState(null);

  // ✅ Sample responders with status
  const [responders, setResponders] = useState([
    {
      id: 1,
      name: "LeBron James",
      department: "Fire Department",
      contact: "09181234567",
      address: "Imus City, Cavite",
      email: "lebronresponder@gmail.com",
      created_time: "2025-02-05 09:45",
      status: "Available",
    },
    {
      id: 2,
      name: "Stephen Curry",
      department: "Fire Department",
      contact: "09174561234",
      address: "Bacoor City, Cavite",
      email: "scurryresponder@gmail.com",
      created_time: "2025-03-12 10:12",
      status: "Dispatched",
    },
  ]);

  // ✅ Filter responders based on search input
  const filteredResponders = responders.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Open modal for viewing details
  const openModal = (responder) => setSelectedResponder(responder);
  const closeModal = () => setSelectedResponder(null);

  // ✅ Dispatch action (change status)
  const handleDispatch = (responderId) => {
    setResponders((prev) =>
      prev.map((r) =>
        r.id === responderId ? { ...r, status: "Dispatched" } : r
      )
    );
  };

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
                      <td data-label="ID">{r.id}</td>
                      <td data-label="Name">{r.name}</td>
                      <td data-label="Department">{r.department}</td>
                      <td data-label="Email">{r.email}</td>
                      <td data-label="Status">
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
                    <td colSpan="6" className={styles.noResults}>
                      No responders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              <p><strong>Name:</strong> {selectedResponder.name}</p>
              <p><strong>Department:</strong> {selectedResponder.department}</p>
              <p><strong>Contact:</strong> {selectedResponder.contact}</p>
              <p><strong>Address:</strong> {selectedResponder.address}</p>
              <p><strong>Email:</strong> {selectedResponder.email}</p>
              <p><strong>Status:</strong> {selectedResponder.status}</p>
              <p><strong>Created Time:</strong> {selectedResponder.created_time}</p>
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
