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

  // Modal steps: 1 = Alert list, 2 = Team list, 3 = Confirmation
  const [dispatchStep, setDispatchStep] = useState<1 | 2 | 3>(1);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());

  // -------------------------------------------
  // OPEN MODAL EVENT HANDLER
  // -------------------------------------------
  useEffect(() => {
    const openModal = () => {
      loadAlerts();
      setShowModal(true);
      setDispatchStep(1); // Start at "Alert Selection"
      setSelectedAlert(null);
      setSelectedResponderIds(new Set());
    };

    window.addEventListener("open-alert-dispatch", openModal);
    return () => window.removeEventListener("open-alert-dispatch", openModal);
  }, []);

  // -------------------------------------------
  // LOAD PENDING ALERTS (Step 1)
  // -------------------------------------------
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

  // -------------------------------------------
  // REALTIME RESPONDERS
  // -------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, []);

  // -------------------------------------------
  // GROUP RESPONDERS BY TEAM + VEHICLE
  // -------------------------------------------
  const teamVehicleGroups: Record<string, any> = {};

  responders.forEach((r) => {
    const team = r.team || "Unassigned";
    const vehicle = r.vehicle || "Unassigned";

    const key = `${team}___${vehicle}`;
    if (!teamVehicleGroups[key]) {
      teamVehicleGroups[key] = { team, vehicle, responders: [] };
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

  // -------------------------------------------
  // STEP 1 → SELECT ALERT
  // -------------------------------------------
  const handleAlertSelect = (alert: any) => {
    setSelectedAlert(alert);
    setDispatchStep(2); // Move to team list
  };

  // -------------------------------------------
  // STEP 2 → SELECT TEAM
  // -------------------------------------------
  const handleDispatchTeam = (group: any) => {
    const available = group.responders.filter((r: any) => r.status === "Available");

    if (available.length === 0) {
      alert("No available responders in this team.");
      return;
    }

    setSelectedResponderIds(new Set(available.map((r: any) => r.id)));
    setDispatchStep(3); // Move to confirmation
  };

  // -------------------------------------------
  // STEP 3 → DISPATCH RESPONDERS
  // -------------------------------------------
  const dispatchResponders = async () => {
    const selected = responders.filter((r) => selectedResponderIds.has(r.id));

    try {
      const batch = writeBatch(db);

      const dispatchRef = doc(collection(db, "dispatches"));

      batch.set(dispatchRef, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,

        responders: selected.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email.toLowerCase(),
          contact: r.contact || "",
          team: r.team,
          vehicle: r.vehicle,
        })),

        responderEmails: selected.map((r) => r.email.toLowerCase()),
        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact,
        userEmail: selectedAlert.userEmail,

        status: "Dispatched",
        timestamp: serverTimestamp(),
        dispatchedBy: "Admin Panel",
      });

      selected.forEach((r) =>
        batch.update(doc(db, "users", r.id), { status: "Dispatched" })
      );

      batch.update(doc(db, "alerts", selectedAlert.id), { status: "Dispatched" });

      await batch.commit();

      setShowModal(false);
      setDispatchStep(1);
    } catch (err) {
      console.error(err);
      alert("Dispatch failed.");
    }
  };

  if (!showModal) return null;

  // ======================================================
  // UI SECTIONS (STEP 1 → STEP 2 → STEP 3)
  // ======================================================
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalWide}>

        {/* ---------------- STEP 1: ALERT SELECTION ---------------- */}
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

        {/* ---------------- STEP 2: TEAM LIST ---------------- */}
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
                {groupedList.map((g: any, i: number) => (
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

        {/* ---------------- STEP 3: CONFIRM RESPONDERS ---------------- */}
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
                  .map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.team}</td>
                      <td>{r.vehicle}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
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
