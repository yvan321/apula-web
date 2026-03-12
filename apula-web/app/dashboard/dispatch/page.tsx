"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./dispatch.module.css";
import { FaSearch, FaTruck } from "react-icons/fa";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

const DispatchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingDispatchIds, setPendingDispatchIds] =
    useState<Set<string> | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showResponderModal, setShowResponderModal] = useState(false);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(
    new Set(),
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [showDispatchInfoModal, setShowDispatchInfoModal] = useState(false);
  const [showNoAlertModal, setShowNoAlertModal] = useState(false);

  const viewDispatchInfo = async (teamName: string) => {
    const snap = await getDocs(
      query(collection(db, "dispatches"), orderBy("timestamp", "desc")),
    );

    const latest = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find(
        (d: any) =>
          d.status === "Dispatched" &&
          d.responders?.some((r: any) => r.teamName === teamName),
      );

    if (!latest) {
      alert("No dispatch record found for this team.");
      return;
    }

    setSelectedDispatch(latest);
    setShowDispatchInfoModal(true);
  };

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vehicles"), (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teams"), (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  const filteredResponders = responders.filter((r) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const rTeamName = (r.teamName || "").toLowerCase();

    return (
      rTeamName.includes(term) ||
      vehicles.some(
        (v) =>
          (v.assignedTeam || "").toLowerCase() === rTeamName &&
          (v.code || "").toLowerCase().includes(term),
      ) ||
      (r.status || "").toLowerCase().includes(term)
    );
  });

  const groupedList = teams
    .map((team) => {
      const members = filteredResponders.filter((r) => r.teamId === team.id);

      if (members.length === 0) return null;

      const vehicle =
        vehicles.find((v) => v.assignedTeamId === team.id)?.code ||
        "Unassigned";

      const statuses = members.map((m) => m.status);

      let status = "Unavailable";
      if (statuses.some((s) => s === "Available")) status = "Available";
      if (statuses.every((s) => s === "Dispatched")) status = "Dispatched";

      return {
        team: team.teamName,
        vehicle,
        responders: members,
        status,
      };
    })
    .filter(Boolean);

  const openAlertModal = async () => {
    const snap = await getDocs(
      query(
        collection(db, "alerts"),
        where("status", "==", "Pending"),
        orderBy("timestamp", "desc"),
      ),
    );

    const pending = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (pending.length === 0) {
      setShowNoAlertModal(true);
      return;
    }

    setAlerts(pending);
  };

  const selectAlertForDispatch = (alert: any) => {
    setSelectedAlert(alert);

    if (pendingDispatchIds) {
      setSelectedResponderIds(new Set(pendingDispatchIds));
      setPendingDispatchIds(null);
    }

    setShowResponderModal(true);
    setAlerts([]);
  };

  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const dispatchResponders = async () => {
    if (!selectedAlert) {
      alert("Select an alert first.");
      return;
    }

    if (selectedResponderIds.size === 0) {
      alert("Please select at least one responder.");
      return;
    }

    const respondersList = responders.filter(
      (r) => selectedResponderIds.has(r.id) && r.status === "Available",
    );

    if (respondersList.length === 0) {
      alert("No available responders selected.");
      return;
    }

    try {
      const batch = writeBatch(db);
      const currentUser = auth.currentUser;

      let dispatchedByName = "Admin Panel";

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            dispatchedByName =
              data.name ||
              currentUser.displayName ||
              currentUser.email ||
              "Admin Panel";
          } else {
            dispatchedByName =
              currentUser.displayName || currentUser.email || "Admin Panel";
          }
        } catch (error) {
          console.error("Error reading dispatcher name:", error);
          dispatchedByName =
            currentUser.displayName || currentUser.email || "Admin Panel";
        }
      }

      const responderEmails = respondersList.map((r) =>
        (r.email || "").toLowerCase(),
      );

      const dispatchRef = doc(collection(db, "dispatches"));

      batch.set(dispatchRef, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,
        snapshotUrl: selectedAlert.snapshotUrl || null,

        responders: respondersList.map((r) => ({
          id: r.id,
          name: r.name,
          email: (r.email || "").toLowerCase(),
          contact: r.contact || "",
          teamName: r.teamName || r.team || "Unassigned",
          teamId: r.teamId || null,
        })),

        responderEmails,

        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact,
        userEmail: selectedAlert.userEmail,

        status: "Dispatched",
        timestamp: serverTimestamp(),
        dispatchedBy: dispatchedByName,

        waveNumber: 1,
        dispatchType: "Primary",
        isBackup: false,
        parentDispatchId: null,
        requestedFromDispatchId: null,
      });

      respondersList.forEach((r) => {
        batch.update(doc(db, "users", r.id), { status: "Dispatched" });
      });

      batch.update(doc(db, "alerts", selectedAlert.id), {
        status: "Dispatched",
        totalDispatchWaves: 1,
        latestWaveNumber: 1,
        backupRequestCount: selectedAlert.backupRequestCount ?? 0,
        backupApprovedCount: selectedAlert.backupApprovedCount ?? 0,
        rootDispatchId: dispatchRef.id,
      });

      const affectedTeamIds = new Set<string>();
      const affectedTeamNames = new Set<string>();

      respondersList.forEach((r) => {
        if (r.teamId) affectedTeamIds.add(r.teamId);
        if (r.teamName) affectedTeamNames.add(r.teamName);
        if (!r.teamName && r.team) affectedTeamNames.add(r.team);
      });

      affectedTeamIds.forEach((tid) => {
        const t = teams.find((x) => x.id === tid);
        if (t) batch.update(doc(db, "teams", t.id), { status: "Dispatched" });
      });

      affectedTeamNames.forEach((tname) => {
        const t = teams.find((x) => (x.teamName || "") === tname);
        if (t) batch.update(doc(db, "teams", t.id), { status: "Dispatched" });
      });

      affectedTeamNames.forEach((tname) => {
        vehicles.forEach((v) => {
          const matchedByName = (v.assignedTeam || "") === tname;
          const matchedById =
            v.assignedTeamId &&
            teams.find(
              (tt) => tt.id === v.assignedTeamId && tt.teamName === tname,
            );

          if (matchedByName || matchedById) {
            batch.update(doc(db, "vehicles", v.id), { status: "Dispatched" });
          }
        });
      });

      await batch.commit();

      setShowResponderModal(false);
      setSelectedResponderIds(new Set());
      setSelectedAlert(null);
      setShowSuccessModal(true);

      setTimeout(() => setShowSuccessModal(false), 2500);
    } catch (err) {
      console.error("Dispatch error:", err);
      alert("Error dispatching responders.");
    }
  };

  const handleDispatchTeam = (group: any) => {
    const availableIds = group.responders
      .filter((r: any) => r.status === "Available")
      .map((r: any) => r.id);

    if (availableIds.length === 0) {
      alert("No available responders to dispatch.");
      return;
    }

    setPendingDispatchIds(new Set(availableIds));
    openAlertModal();
  };

  useEffect(() => {
    if (responders.length === 0 || teams.length === 0 || vehicles.length === 0)
      return;

    teams.forEach((team) => {
      const teamId = team.id;
      const teamName = team.teamName || "";

      const teamMembers = responders.filter((r) => {
        if (r.teamId && teamId) return r.teamId === teamId;
        return (r.teamName || "") === teamName;
      });

      if (teamMembers.length === 0) return;

      const leaderId = team.leaderId;
      const leader = leaderId
        ? teamMembers.find((m) => m.id === leaderId)
        : undefined;

      const leaderResolved = leader && leader.status === "Available";
      const allAvailable = teamMembers.every((m) => m.status === "Available");

      if (!leaderResolved && !allAvailable) return;

      const batch = writeBatch(db);

      teamMembers.forEach((m) => {
        if (m.status !== "Available") {
          batch.update(doc(db, "users", m.id), { status: "Available" });
        }
      });

      batch.update(doc(db, "teams", teamId), { status: "Available" });

      const vehicle = vehicles.find(
        (v) =>
          (v.assignedTeam && v.assignedTeam === teamName) ||
          (v.assignedTeamId && v.assignedTeamId === teamId),
      );

      if (vehicle) {
        batch.update(doc(db, "vehicles", vehicle.id), { status: "Available" });
      }

      batch
        .commit()
        .catch((err) => console.error("Auto-reset commit failed:", err));

      console.log(
        `Auto-reset applied for team ${teamName} (leaderResolved=${!!leaderResolved}, allAvailable=${allAvailable})`,
      );
    });
  }, [responders, teams, vehicles]);

  return (
    <div className={styles.pageWrapper}>
      <AdminHeader />

      <div style={{ position: "absolute", top: 20, right: 30 }}>
        <AlertBellButton />
      </div>

      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Team & Truck Dispatch</h2>
          <hr className={styles.separator} />

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

          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Truck</th>
                <th>Members</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                    Loading...
                  </td>
                </tr>
              ) : groupedList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                    No groups found.
                  </td>
                </tr>
              ) : (
                groupedList.map((group: any, idx: number) => (
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
                      {group.status === "Available" && (
                        <button
                          className={styles.dispatchBtn}
                          onClick={() => handleDispatchTeam(group)}
                        >
                          <span>
                            <FaTruck /> Dispatch Team
                          </span>
                        </button>
                      )}

                      {group.status === "Dispatched" && (
                        <button
                          className={styles.viewBtn}
                          onClick={() => viewDispatchInfo(group.team)}
                        >
                          <span>View Alert</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SELECT ALERT MODAL */}
      {alerts.length > 0 && !showResponderModal && selectedAlert === null && (
        <div className={styles.modalOverlay} onClick={() => setAlerts([])}>
          <div
            className={styles.modalWide}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Select Alert</h3>
            </div>

            <div className={styles.modalBody}>
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
                        <button
                          className={styles.assignBtn}
                          onClick={() => selectAlertForDispatch(a)}
                        >
                          <span>Select</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setAlerts([])}>
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESPONDERS MODAL */}
      {showResponderModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowResponderModal(false)}
        >
          <div
            className={styles.modalWide}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirm Responders</h3>
            </div>

            <div className={styles.modalBody}>
              <p style={{ marginTop: 0, marginBottom: 16 }}>
                <strong>Alert:</strong> {selectedAlert?.type || "Manual"} —{" "}
                {selectedAlert?.location}
              </p>

              <div className={styles.tableScroll}>
                <table className={styles.responderTable}>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Team</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
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
                          <td>{r.teamName || r.team || "Unassigned"}</td>
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
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.assignBtn} onClick={dispatchResponders}>
                <span>Dispatch Selected</span>
              </button>
              <button
                className={styles.closeBtn}
                onClick={() => setShowResponderModal(false)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✔</div>
            <h3 className={styles.successTitle}>Dispatch Successful!</h3>
          </div>
        </div>
      )}

      {/* DISPATCH INFO MODAL */}
      {showDispatchInfoModal && selectedDispatch && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDispatchInfoModal(false)}
        >
          <div
            className={styles.modalWide}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Dispatch Details</h3>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.section}>
                <p>
                  <strong>Alert Type:</strong> {selectedDispatch.alertType}
                </p>
                <p>
                  <strong>Location:</strong> {selectedDispatch.alertLocation}
                </p>
                <p>
                  <strong>Dispatched By:</strong> {selectedDispatch.dispatchedBy}
                </p>
                <p>
                  <strong>Wave:</strong> {selectedDispatch.waveNumber ?? 1}
                </p>
                <p>
                  <strong>Dispatch Type:</strong>{" "}
                  {selectedDispatch.dispatchType ?? "Primary"}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {selectedDispatch.timestamp
                    ? new Date(
                        selectedDispatch.timestamp.seconds * 1000,
                      ).toLocaleString()
                    : "—"}
                </p>
              </div>

              <hr className={styles.divider} />

              <div className={styles.section}>
                <h4>Reported By:</h4>
                <p>
                  <strong>Name:</strong> {selectedDispatch.userReported}
                </p>
                <p>
                  <strong>Contact:</strong> {selectedDispatch.userContact}
                </p>
                <p>
                  <strong>Email:</strong> {selectedDispatch.userEmail}
                </p>
                <p>
                  <strong>Address:</strong> {selectedDispatch.userAddress}
                </p>
              </div>

              <hr className={styles.divider} />

              <div className={styles.section}>
                <h4>Responders:</h4>
                <ul className={styles.responderList}>
                  {selectedDispatch.responders?.map((r: any) => (
                    <li key={r.id}>
                      <strong>{r.name}</strong> — {r.teamName}
                      <br />
                      <small>
                        {r.contact} | {r.email}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowDispatchInfoModal(false)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO ALERT MODAL */}
      {showNoAlertModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>No Pending Alerts</h3>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, textAlign: "center", color: "black" }}>
                There are currently no pending emergency alerts to dispatch.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowNoAlertModal(false)}
              >
                <span>Okay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchPage;