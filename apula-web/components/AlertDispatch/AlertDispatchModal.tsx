"use client";

import React, { useEffect, useState } from "react";
import styles from "@/app/dashboard/dispatch/dispatch.module.css";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  serverTimestamp,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const AlertDispatchModal = () => {
  const [showModal, setShowModal] = useState(false);

  const [dispatchStep, setDispatchStep] = useState<1 | 2 | 3>(1);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());

  const [teams, setTeams] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // ------------------------------------------------------------
  // OPEN MODAL WHEN TRIGGERED FROM AlertBellButton
  // ------------------------------------------------------------
  useEffect(() => {
    const openModal = () => {
      loadAlerts();
      setDispatchStep(1);
      setSelectedAlert(null);
      setSelectedResponderIds(new Set());
      setShowModal(true);
    };

    window.addEventListener("open-alert-dispatch", openModal);
    return () => window.removeEventListener("open-alert-dispatch", openModal);
  }, []);

  // ------------------------------------------------------------
  // LOAD PENDING ALERTS
  // ------------------------------------------------------------
  const loadAlerts = async () => {
    const snap = await getDocs(
      query(
        collection(db, "alerts"),
        where("status", "==", "Pending"),
        orderBy("timestamp", "desc")
      )
    );
    setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // ------------------------------------------------------------
  // REAL-TIME RESPONDERS
  // ------------------------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, []);

  // ------------------------------------------------------------
  // LOAD TEAMS & VEHICLES
  // ------------------------------------------------------------
  useEffect(() => {
    getDocs(collection(db, "teams")).then((snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    getDocs(collection(db, "vehicles")).then((snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ------------------------------------------------------------
  // AUTO RESET LOGIC:
  // A. If TEAM LEADER becomes Available → reset team + vehicle
  // B. If ALL responders become Available → reset team + vehicle
  // ------------------------------------------------------------
  useEffect(() => {
    if (responders.length === 0 || teams.length === 0 || vehicles.length === 0)
      return;

    teams.forEach((team) => {
      const teamResponders = responders.filter((r) => r.teamId === team.id);
      if (teamResponders.length === 0) return;

      const teamName = team.teamName;

      // Find assigned vehicle
      const vehicle = vehicles.find((v) => v.assignedTeam === teamName);

      // Find team leader
      const leader = teamResponders.find((r) => r.id === team.leaderId);

      const leaderResolved = leader && leader.status === "Available";
      const allAvailable = teamResponders.every((r) => r.status === "Available");

      // If neither condition met → DO NOTHING
      if (!leaderResolved && !allAvailable) return;

      console.log(
        `RESET TRIGGERED → Team ${teamName}, leaderResolved=${leaderResolved}, allAvailable=${allAvailable}`
      );

      // Perform database reset
      const batch = writeBatch(db);

      // Reset responders
      teamResponders.forEach((res) => {
        batch.update(doc(db, "users", res.id), { status: "Available" });
      });

      // Reset team
      batch.update(doc(db, "teams", team.id), { status: "Available" });

      // Reset vehicle
      if (vehicle) {
        batch.update(doc(db, "vehicles", vehicle.id), { status: "Available" });
      }

      batch.commit();
    });
  }, [responders, teams, vehicles]);

  // ------------------------------------------------------------
  // GROUP USING teamName + vehicle.code
  // ------------------------------------------------------------
  const teamVehicleGroups: Record<string, any> = {};

  responders.forEach((r) => {
    const teamName = teams.find((t) => t.id === r.teamId)?.teamName || "Unassigned";

    const vehicle = vehicles.find((v) => v.assignedTeam === teamName);
    const vehicleCode = vehicle?.code || "Unassigned";

    const key = `${teamName}___${vehicleCode}`;

    if (!teamVehicleGroups[key]) {
      teamVehicleGroups[key] = {
        team: teamName,
        vehicle: vehicleCode,
        responders: [],
      };
    }

    teamVehicleGroups[key].responders.push(r);
  });

  const groupedList = Object.values(teamVehicleGroups).map((group: any) => {
    const statuses = group.responders.map((r: any) => r.status);

    let status = "Unavailable";
    if (statuses.some((s) => s === "Available")) status = "Available";
    if (statuses.every((s) => s === "Dispatched")) status = "Dispatched";

    return { ...group, status };
  });

  // ------------------------------------------------------------
  // STEP 1 → SELECT ALERT
  // ------------------------------------------------------------
  const handleAlertSelect = (alert: any) => {
    setSelectedAlert(alert);
    setDispatchStep(2);
  };

  // ------------------------------------------------------------
  // STEP 2 → SELECT TEAM
  // ------------------------------------------------------------
  const handleDispatchTeam = (group: any) => {
    const available = group.responders.filter((r: any) => r.status === "Available");

    if (available.length === 0) {
      alert("No available responders in this team.");
      return;
    }

    setSelectedResponderIds(new Set(available.map((r: any) => r.id)));
    setDispatchStep(3);
  };

  // ------------------------------------------------------------
  // STEP 3 → DISPATCH NOW
  // ------------------------------------------------------------
  // --- SAME IMPORTS ABOVE ---

  const dispatchResponders = async () => {
    const selected = responders.filter((r) => selectedResponderIds.has(r.id));

    try {
      const batch = writeBatch(db);
      const ref = doc(collection(db, "dispatches"));

      batch.set(ref, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,

        responders: selected.map((r) => {
          const teamName =
            teams.find((t) => t.id === r.teamId)?.teamName || "Unassigned";

          const vehicle = vehicles.find((v) => v.assignedTeam === teamName);
          const vehicleCode = vehicle?.code || "Unassigned";

          return {
            id: r.id,
            name: r.name,
            email: (r.email || "").toLowerCase(),
            contact: r.contact || "",
            team: teamName,
            vehicle: vehicleCode,
          };
        }),

        responderEmails: selected.map((r) => (r.email || "").toLowerCase()),

        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact,
        userEmail: selectedAlert.userEmail,

        status: "Dispatched",
        dispatchedBy: "Admin Panel",
        timestamp: serverTimestamp(),
      });

      // Update responders → Dispatched
      selected.forEach((r) =>
        batch.update(doc(db, "users", r.id), { status: "Dispatched" })
      );

      // Update alert → Dispatched
      batch.update(doc(db, "alerts", selectedAlert.id), {
        status: "Dispatched",
      });

      // ------------------------------------------------------------
      // 🚒 UPDATE TEAM + VEHICLE STATUS ON DISPATCH
      // ------------------------------------------------------------
      if (selected.length > 0) {
        const firstResponder = selected[0];
        const team = teams.find((t) => t.id === firstResponder.teamId);

        if (team) {
          batch.update(doc(db, "teams", team.id), { status: "Dispatched" });
        }

        const teamName = team?.teamName;
        const vehicle = vehicles.find((v) => v.assignedTeam === teamName);

        if (vehicle) {
          batch.update(doc(db, "vehicles", vehicle.id), { status: "Dispatched" });
        }
      }
      // ------------------------------------------------------------

      await batch.commit();

      setShowModal(false);
      setDispatchStep(1);
    } catch (err) {
      console.error(err);
      alert("Dispatch failed.");
    }
  };



  // ------------------------------------------------------------
  // UI (unchanged)
  // ------------------------------------------------------------
  
  if (!showModal) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalWide}>
        
        {/* STEP 1: ALERTS */}
        {dispatchStep === 1 && (
          <>
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
                        <button
                          className={styles.assignBtn}
                          onClick={() => handleAlertSelect(a)}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
              Close
            </button>
          </>
        )}

        {/* STEP 2: TEAM LIST */}
        {dispatchStep === 2 && (
          <>
            <h3 className={styles.modalTitle}>Select Team to Dispatch</h3>

            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Vehicle</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Dispatch</th>
                </tr>
              </thead>

              <tbody>
                {groupedList.map((g: any, i) => (
                  <tr key={i}>
                    <td>{g.team}</td>
                    <td>{g.vehicle}</td>
                    <td>{g.responders.length}</td>
                    <td>
                      <span
                        className={
                          g.status === "Available"
                            ? styles.statusAvailable
                            : g.status === "Dispatched"
                            ? styles.statusDispatched
                            : styles.statusUnavailable
                        }
                      >
                        {g.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.assignBtn}
                        onClick={() => handleDispatchTeam(g)}
                      >
                        Dispatch Team
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </>
        )}

        {/* STEP 3: CONFIRM RESPONDERS */}
        {dispatchStep === 3 && (
          <>
            <h3 className={styles.modalTitle}>Confirm Responders</h3>

            <table className={styles.responderTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Team</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {responders
                  .filter((r) => selectedResponderIds.has(r.id))
                  .map((r) => {
                    const teamName =
                      teams.find((t) => t.id === r.teamId)?.teamName ||
                      "Unassigned";

                    const vehicle =
                      vehicles.find((v) => v.assignedTeam === teamName);

                    const vehicleCode = vehicle?.code || "Unassigned";

                    return (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>{teamName}</td>
                        <td>{vehicleCode}</td>
                        <td>{r.status}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div className={styles.modalActions}>
              <button className={styles.assignBtn} onClick={dispatchResponders}>
                Dispatch Now
              </button>

              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default AlertDispatchModal;
