"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./dispatch.module.css";
import { FaSearch, FaTruck, FaEye } from "react-icons/fa";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

const DispatchPage: React.FC = () => {
  // UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // dispatch flow states
  const [pendingDispatchIds, setPendingDispatchIds] = useState<Set<string> | null>(null); // used when user clicks Dispatch Team (holds available ids)
  const [selectedAlert, setSelectedAlert] = useState<any>(null); // chosen alert to dispatch against
  const [showResponderModal, setShowResponderModal] = useState(false);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ---------------------------
  // Real-time responders fetch
  // ---------------------------
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ---------------------------
  // Filtering (search by team or vehicle or status)
  // ---------------------------
  const filteredResponders = responders.filter((r) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (r.team?.toLowerCase() || "").includes(term) ||
      (r.vehicle?.toLowerCase() || "").includes(term) ||
      (r.status?.toLowerCase() || "").includes(term)
    );
  });

  // ---------------------------
  // Group responders by team + vehicle
  // ---------------------------
  const teamVehicleGroups: Record<string, any> = {};
  filteredResponders.forEach((r) => {
    const team = r.team || "Unassigned";
    const vehicle = r.vehicle || "Unassigned";
    const key = `${team}___${vehicle}`;
    if (!teamVehicleGroups[key]) {
      teamVehicleGroups[key] = { team, vehicle, responders: [] as any[] };
    }
    teamVehicleGroups[key].responders.push(r);
  });

  // Determine group status using your requested rules:
  // - Available: at least one responder Available
  // - Dispatched: every responder is Dispatched
  // - Unavailable: otherwise (no Available, not all Dispatched)
  const groupedList = Object.values(teamVehicleGroups).map((group: any) => {
    const statuses = group.responders.map((r: any) => r.status);
    let groupStatus = "Unavailable";
    if (statuses.some((s: string) => s === "Available")) groupStatus = "Available";
    if (statuses.length > 0 && statuses.every((s: string) => s === "Dispatched")) groupStatus = "Dispatched";
    return { ...group, status: groupStatus };
  });

  // ---------------------------
  // Open alert modal (fetch pending alerts)
  // ---------------------------
  const openAlertModal = async () => {
    const snap = await getDocs(
      query(collection(db, "alerts"), where("status", "==", "Pending"), orderBy("timestamp", "desc"))
    );
    const pending = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (pending.length === 0) {
      window.alert("No pending alerts found.");
      return;
    }
    setAlerts(pending);
  };

  // When alert is selected from alerts list modal
  const selectAlertForDispatch = (alert: any) => {
    setSelectedAlert(alert);
    // move pendingDispatchIds to selectedResponderIds (preselect)
    if (pendingDispatchIds) {
      setSelectedResponderIds(new Set(pendingDispatchIds));
      setPendingDispatchIds(null);
    } else {
      // fallback: no pending ids (shouldn't happen), open responder modal empty
      setSelectedResponderIds(new Set());
    }
    // open responder confirmation modal
    setShowResponderModal(true);
    // hide alert list
    setAlerts([]);
  };

  // ---------------------------
  // Toggle selection inside responder confirmation modal
  // ---------------------------
  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---------------------------
  // Dispatch selected responders (Option A: only dispatch those with status === "Available")
  // ---------------------------
  const dispatchResponders = async () => {
    if (!selectedAlert) {
      window.alert("Please select an alert first.");
      return;
    }
    if (selectedResponderIds.size === 0) {
      window.alert("Please select at least one responder to dispatch.");
      return;
    }

    // Filter selected responders to only those that are still Available
    const respondersList = responders.filter(
      (r) => selectedResponderIds.has(r.id) && r.status === "Available"
    );

    if (respondersList.length === 0) {
      window.alert("No available responders selected to dispatch.");
      return;
    }

    try {
      const batch = writeBatch(db);

      const responderEmails = respondersList.map((r) => (r.email || "").toLowerCase());

      const dispatchRef = doc(collection(db, "dispatches"));

      batch.set(dispatchRef, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,
        responders: respondersList.map((r) => ({
          id: r.id,
          name: r.name,
          email: (r.email || "").toLowerCase(),
          contact: r.contact || "",
          team: r.team || "Unassigned",
          vehicle: r.vehicle || "Unassigned",
        })),
        responderEmails,
        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact,
        userEmail: selectedAlert.userEmail,
        status: "Dispatched",
        timestamp: serverTimestamp(),
        dispatchedBy: "Admin Panel",
      });

      // Update each responder doc: set status = "Dispatched"
      respondersList.forEach((r) => {
        batch.update(doc(db, "users", r.id), { status: "Dispatched" });
      });

      // Update alert status to Dispatched
      batch.update(doc(db, "alerts", selectedAlert.id), { status: "Dispatched" });

      await batch.commit();

      // success UI
      setShowResponderModal(false);
      setSelectedResponderIds(new Set());
      setSelectedAlert(null);
      setShowSuccessModal(true);

      // auto-close success
      setTimeout(() => setShowSuccessModal(false), 2500);
    } catch (err) {
      console.error("Dispatch error:", err);
      window.alert("Error dispatching responders.");
    }
  };

  // ---------------------------
  // Handler when clicking Dispatch Team in main table
  // - collect available responders in the group
  // - if none available show alert
  // - else store available ids in pendingDispatchIds and open alert list
  // ---------------------------
  const handleDispatchTeam = (group: any) => {
    const availableIds = group.responders.filter((r: any) => r.status === "Available").map((r: any) => r.id);
    if (availableIds.length === 0) {
      window.alert("No available responders in this team/vehicle to dispatch.");
      return;
    }
    setPendingDispatchIds(new Set(availableIds));
    openAlertModal();
  };

  // ---------------------------
  // Utility: open view modal for a responder (if you still want)
  // ---------------------------
  const openViewModal = async (responder: any) => {
    // find the latest dispatch that contains this responder email
    const snap = await getDocs(
      query(collection(db, "dispatches"), where("responderEmails", "array-contains", (responder.email || "").toLowerCase()), orderBy("timestamp", "desc"), limit(1))
    );
    if (!snap.empty) {
      setDispatchInfo(snap.docs[0].data());
    } else {
      setDispatchInfo(null);
    }
    setSelectedResponderIds(new Set([responder.id]));
    setShowResponderModal(true);
  };

  return (
    <div className={styles.pageWrapper}>
      <AdminHeader />

      <div style={{ position: "absolute", top: 20, right: 30 }}>
        <AlertBellButton />
      </div>

      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Team & Vehicle Dispatch</h2>
          <hr className={styles.separator} />

          {/* SEARCH */}
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search team or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* GROUP TABLE */}
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Vehicle</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {groupedList.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                    No groups found.
                  </td>
                </tr>
              )}

              {groupedList.map((group: any, idx: number) => (
                <tr key={idx}>
                  <td>{group.team}</td>
                  <td>{group.vehicle}</td>
                  <td>{group.responders.length}</td>
                  <td>
                    <span
                      className={
                        group.status === "Available"
                          ? styles.statusAvailable
                          : group.status === "Dispatched"
                          ? styles.statusDispatched
                          : styles.statusUnavailable
                      }
                    >
                      {group.status}
                    </span>
                  </td>
                  <td>
                    <button className={styles.dispatchBtn} onClick={() => handleDispatchTeam(group)}>
                      <FaTruck /> Dispatch Team
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ALERT SELECTION MODAL */}
      {alerts.length > 0 && !showResponderModal && selectedAlert === null && (
        <div className={styles.modalOverlay} onClick={() => setAlerts([])}>
          <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Select Alert</h3>

            <div className={styles.tableScroll}>
              <table className={styles.alertTable}>
                <thead>
                  <tr>
                    <th>Reporter</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Select</th>
                  </tr>
                </thead>

                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.userName}</td>
                      <td>{a.userContact}</td>
                      <td>{a.userAddress}</td>
                      <td>
                        <button className={styles.assignBtn} onClick={() => selectAlertForDispatch(a)}>
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className={styles.closeBtn} onClick={() => setAlerts([])}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONDER CONFIRMATION MODAL */}
      {showResponderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResponderModal(false)}>
          <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirm Responders to Dispatch</h3>

            <p style={{ marginBottom: 8 }}>
              <strong>Alert:</strong> {selectedAlert?.type || "Manual"}{" "}
              <span style={{ marginLeft: 12 }}>{selectedAlert?.location || ""}</span>
            </p>

            <div className={styles.tableScroll}>
              <table className={styles.responderTable}>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Team</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from(selectedResponderIds).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                        No responders preselected. You can select responders from the main list then retry.
                      </td>
                    </tr>
                  )}

                  {responders
                    .filter((r) => selectedResponderIds.has(r.id))
                    .map((r) => (
                      <tr key={r.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedResponderIds.has(r.id)}
                            onChange={() => toggleResponder(r.id)}
                          />
                        </td>
                        <td>{r.name}</td>
                        <td>{r.contact || "—"}</td>
                        <td>{r.team || "Unassigned"}</td>
                        <td>{r.vehicle || "Unassigned"}</td>
                        <td>
                          <span
                            className={
                              r.status === "Available"
                                ? styles.statusAvailable
                                : r.status === "Dispatched"
                                ? styles.statusDispatched
                                : styles.statusUnavailable
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.assignBtn} onClick={dispatchResponders}>
                Dispatch Selected
              </button>
              <button className={styles.closeBtn} onClick={() => setShowResponderModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✔</div>
            <h3 className={styles.successTitle}>Dispatch Successful!</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchPage;
