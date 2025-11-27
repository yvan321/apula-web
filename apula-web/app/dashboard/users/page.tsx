"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";
import styles from "./userpagestyles.module.css";
import { FaUsers, FaUserShield, FaUserTie, FaUser, FaSearch } from "react-icons/fa";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"; // <-- UPDATED
import { db } from "@/lib/firebase";



type User = {
  id: string;
  name?: string;
  role?: string;
  department?: string;
  contact?: string;
  address?: string;
  email?: string;
  status?: string;
  createdAt?: any;
  created_time?: string;
};

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);


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

  const norm = (r?: string) => (r ? r.toLowerCase() : "");

  const totalAll = users.length;
  const totalAdmins = users.filter((u) => norm(u.role) === "admin").length;
  const totalResponders = users.filter((u) => norm(u.role) === "responder").length;
  const totalUsers = users.filter((u) => norm(u.role) === "user").length;

  const roleMatches = (user: User) => {
    if (selectedRole === "All") return true;
    return norm(user.role) === selectedRole.toLowerCase();
  };

  const matchesSearch = (user: User) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;

    return (
      (user.name || "").toLowerCase().includes(q) ||
      (user.role || "").toLowerCase().includes(q) ||
      (user.contact || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q)
    );
  };

  const filteredUsers = users.filter((u) => roleMatches(u) && matchesSearch(u));

  const openModal = (user: User) => setSelectedUser(user);
  const closeModal = () => setSelectedUser(null);

  const formatCreatedAt = (createdAt: any, created_time?: string) => {
    if (!createdAt && created_time) return created_time;
    if (!createdAt) return "N/A";

    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString();
    }

    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch {}

    return String(createdAt);
  };

  return (
    <div>
      <AdminHeader />

      {/* Notification Bell */}
      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 50 }}>
        <AlertBellButton />
      </div>

      <AlertDispatchModal />

      <div className={styles.container}>
        <div data-aos="fade-up" className={styles.contentSection}>
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

          {/* Table */}
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
                  <th>Contact</th>
                 
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={styles.noResults}>Loading...</td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name ?? "N/A"}</td>
                      <td>{user.role ?? "N/A"}</td>
                      <td>{user.contact ?? "N/A"}</td>
                   

                      <td>
                        {/* Always show View */}
                        <button
                          className={styles.viewBtn}
                          onClick={() => openModal(user)}
                        >
                          View
                        </button>

                        {/* Show Edit ONLY for responders */}
                        {user.role === "responder" && (
                          <button
                            className={styles.editBtn}
                            onClick={() => setEditTarget(user)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={styles.noResults}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
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

      {/* EDIT MODAL (Responder Only) */}
      {editTarget && (
        <div className={styles.modalOverlay} onClick={() => setEditTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Responder Status</h3>

            <div className={styles.modalDetails}>
              <p><strong>Name:</strong> {editTarget.name}</p>
              <p><strong>Role:</strong> {editTarget.role}</p>

              <label><strong>Status:</strong></label>
              <select
                value={editTarget.status ?? "Available"}
                onChange={(e) =>
                  setEditTarget((prev) => prev && { ...prev, status: e.target.value })
                }
                className={styles.inputField}
              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
              
              </select>

              <p><strong>Email:</strong> {editTarget.email}</p>
              <p><strong>Contact:</strong> {editTarget.contact}</p>
            </div>

        <button
  className={styles.saveBtn}
  onClick={async () => {
    if (!editTarget) return;

    try {
      // Update Firestore
      await updateDoc(doc(db, "users", editTarget.id), {
        status: editTarget.status,
      });

      // Update UI
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editTarget.id ? { ...u, status: editTarget.status } : u
        )
      );

      // Show success modal
      setShowSuccess(true);

      // Auto-close success after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }

    setEditTarget(null);
  }}
>
  Save
</button>




            <button className={styles.closeBtn} onClick={() => setEditTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
  <div className={styles.successOverlay}>
    <div className={styles.successModal}>
      <h3>Status Updated!</h3>
      <p>The responder’s status has been successfully saved.</p>
    </div>
  </div>
)}

    </div>
  );
}
