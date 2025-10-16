"use client";

import React, { useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./userpagestyles.module.css";
import { FaUsers, FaUserShield, FaUserTie, FaUser, FaSearch } from "react-icons/fa";

const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null); // ✅ For popup modal

  const users = [
    {
      id: 1,
      name: "Isaac Newbie",
      role: "Responder",
      department: "Fire Department",
      contact: "09171234567",
      address: "Bacoor City, Cavite",
      email: "isaacnewbie@gmail.com",
      created_time: "2025-01-10 14:23",
    },
    {
      id: 2,
      name: "LeBron James",
      role: "Admin",
      department: "Fire Department",
      contact: "09181234567",
      address: "Imus City, Cavite",
      email: "lebronjames@gmail.com",
      created_time: "2025-02-05 09:45",
    },
    {
      id: 3,
      name: "Neil Armstrong",
      role: "User",
      department: "Support",
      contact: "09991234567",
      address: "Dasmariñas, Cavite",
      email: "neilarmstrong@gmail.com",
      created_time: "2025-03-02 11:30",
    },
  ];

  // ✅ Filter by role & search
  const filteredUsers = users.filter(
    (user) =>
      (selectedRole === "All" || user.role === selectedRole) &&
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ✅ Open/close modal
  const openModal = (user) => setSelectedUser(user);
  const closeModal = () => setSelectedUser(null);

  return (
    <div>
      <AdminHeader />

      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
          {/* Header */}
          <div className={styles.headerRow}>
            <h2 className={styles.pageTitle}>Users</h2>
          </div>
          <hr className={styles.separator} />

          {/* Summary Cards */}
          <div className={styles.summaryRow}>
            <div
              className={`${styles.summaryCard} ${styles.allCard} ${
                selectedRole === "All" ? styles.activeCard : ""
              }`}
              onClick={() => setSelectedRole("All")}
            >
              <FaUsers className={styles.summaryIcon} />
              <div className={styles.summaryText}>
                <h4>All</h4>
                <p>24</p>
              </div>
            </div>

            <div
              className={`${styles.summaryCard} ${styles.adminCard} ${
                selectedRole === "Admin" ? styles.activeCard : ""
              }`}
              onClick={() => setSelectedRole("Admin")}
            >
              <FaUserShield className={styles.summaryIcon} />
              <div className={styles.summaryText}>
                <h4>Admin</h4>
                <p>5</p>
              </div>
            </div>

            <div
              className={`${styles.summaryCard} ${styles.responderCard} ${
                selectedRole === "Responder" ? styles.activeCard : ""
              }`}
              onClick={() => setSelectedRole("Responder")}
            >
              <FaUserTie className={styles.summaryIcon} />
              <div className={styles.summaryText}>
                <h4>Responder</h4>
                <p>8</p>
              </div>
            </div>

            <div
              className={`${styles.summaryCard} ${styles.userCard} ${
                selectedRole === "User" ? styles.activeCard : ""
              }`}
              onClick={() => setSelectedRole("User")}
            >
              <FaUser className={styles.summaryIcon} />
              <div className={styles.summaryText}>
                <h4>User</h4>
                <p>11</p>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className={styles.tableSection}>
            <div className={styles.filters}>
              <div className={styles.searchWrapper}>
                <FaSearch className={styles.searchIcon} size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td data-label="ID">{user.id}</td>
                      <td data-label="Name">{user.name}</td>
                      <td data-label="Role">{user.role}</td>
                      <td data-label="Department">{user.department}</td>
                      <td data-label="Actions">
                        <button
                          className={styles.viewBtn}
                          onClick={() => openModal(user)}
                        >
                          View
                        </button>
                        <button className={styles.editBtn}>Edit</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={styles.noResults}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Popup Modal */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>User Information</h3>
            <div className={styles.modalDetails}>
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Role:</strong> {selectedUser.role}</p>
              <p><strong>Contact:</strong> {selectedUser.contact}</p>
              <p><strong>Address:</strong> {selectedUser.address}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Created Time:</strong> {selectedUser.created_time}</p>
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

export default UsersPage;
