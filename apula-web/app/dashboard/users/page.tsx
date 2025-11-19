"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./userpagestyles.module.css";
import { FaUsers, FaUserShield, FaUserTie, FaUser, FaSearch } from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type User = {
  id: string;
  name?: string;
  role?: string;
  department?: string;
  contact?: string;
  address?: string;
  email?: string;
  // createdAt might be a Firestore Timestamp or a plain string
  createdAt?: any;
  created_time?: string; // in case you used that key previously
};

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All"); // keep original "All" label
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as User[];
        setUsers(list);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // normalize role for comparisons (handles "admin" & "Admin")
  const norm = (r?: string) => (r ? r.toString().toLowerCase() : "");

  // counts for cards (case-insensitive)
  const totalAll = users.length;
  const totalAdmins = users.filter((u) => norm(u.role) === "admin").length;
  const totalResponders = users.filter((u) => norm(u.role) === "responder").length;
  const totalUsers = users.filter((u) => norm(u.role) === "user").length;

  // filter logic: preserve original behavior (selectedRole uses capitalized labels)
  const roleMatches = (user: User) => {
    if (selectedRole === "All") return true;
    return norm(user.role) === selectedRole.toLowerCase();
  };

  const matchesSearch = (user: User) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (user.name || "").toLowerCase().includes(q) ||
      (user.role || "").toLowerCase().includes(q) ||
      (user.contact || "").toLowerCase().includes(q)||
      (user.email || "").toLowerCase().includes(q)
    );
  };

  const filteredUsers = users.filter((u) => roleMatches(u) && matchesSearch(u));

  const openModal = (user: User) => setSelectedUser(user);
  const closeModal = () => setSelectedUser(null);

  // Format Firestore Timestamp -> readable string
  const formatCreatedAt = (createdAt: any, created_time?: string) => {
    if (!createdAt && created_time) return created_time;
    if (!createdAt) return "N/A";
    // Firestore Timestamp has seconds/nanoseconds
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString();
    }
    // if it's already a Date or string
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch {}
    return String(createdAt);
  };

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
                <p>{totalAll}</p>
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
                <p>{totalAdmins}</p>
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
                <p>{totalResponders}</p>
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
                <p>{totalUsers}</p>
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
                  <th>Contact</th>   {/* ← changed */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={styles.noResults}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td data-label="ID">{user.id}</td>
                      <td data-label="Name">{user.name ?? "N/A"}</td>
                      <td data-label="Role">{user.role ?? "N/A"}</td>
                      <td data-label="Contact">{user.contact ?? "N/A"}</td> {/* ← changed */}
                      <td data-label="Actions">
                        <button className={styles.viewBtn} onClick={() => openModal(user)}>
                          View
                        </button>
                        <button className={styles.editBtn}>Edit</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.noResults}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>User Information</h3>
            <div className={styles.modalDetails}>
              <p><strong>Name:</strong> {selectedUser.name ?? "N/A"}</p>
              <p><strong>Role:</strong> {selectedUser.role ?? "N/A"}</p>
              <p><strong>Contact:</strong> {selectedUser.contact ?? "N/A"}</p>
              <p><strong>Address:</strong> {selectedUser.address ?? "N/A"}</p>
              <p><strong>Email:</strong> {selectedUser.email ?? "N/A"}</p>
              <p>
                <strong>Created Time:</strong>{" "}
                {formatCreatedAt(selectedUser.createdAt, selectedUser.created_time)}
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
}
