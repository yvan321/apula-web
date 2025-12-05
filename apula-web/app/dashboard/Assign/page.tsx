"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./tv.module.css";
import { FaSearch } from "react-icons/fa";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  writeBatch,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

export default function AssignPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [teamList, setTeamList] = useState<any[]>([]);
  const [vehicleList, setVehicleList] = useState<any[]>([]);

  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});

  // ------------------- Load responders -------------------
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "responder"));
    const unsub = onSnapshot(q, (snap) => {
      setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ------------------- Load team + vehicle lists -------------------
  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) =>
      setTeamList(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubVehicles = onSnapshot(collection(db, "vehicles"), (snap) =>
      setVehicleList(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubTeams();
      unsubVehicles();
    };
  }, []);

  // ------------------- Search filter -------------------
  const filteredResponders = responders.filter((r) =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ------------------- Select toggle -------------------
  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!selectAll) {
      setSelectedResponderIds(new Set(responders.map((r) => r.id)));
      setSelectAll(true);
    } else {
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }
  };

  // ------------------- Update team only -------------------
  const updateTeam = (responderId: string, teamId: string) => {
    setTeamAssignments((prev) => ({ ...prev, [responderId]: teamId }));
  };

  // ------------------- SAVE ASSIGNMENTS -------------------
  const saveAssignments = async () => {
    if (selectedResponderIds.size === 0) {
      alert("Select at least one responder.");
      return;
    }

    try {
      const batch = writeBatch(db);

      const selected = responders.filter((r) => selectedResponderIds.has(r.id));

      const assignmentRef = doc(collection(db, "assignments"));

      const payload = selected.map((r) => {
        const teamDoc = teamList.find((t) => t.id === teamAssignments[r.id]);

        // AUTO-GET VEHICLE BASED ON TEAM
        let vehicleDoc = null;

        if (teamDoc) {
          vehicleDoc = vehicleList.find(
            (v) => v.assignedTeam === teamDoc.teamName
          );
        }

        return {
          id: r.id,
          name: r.name,
          team: {
            id: teamDoc?.id || "",
            name: teamDoc?.teamName || "",
          },
          vehicle: {
            id: vehicleDoc?.id || "",
            code: vehicleDoc?.code || "Unassigned",
            plate: vehicleDoc?.plate || "",
          },
        };
      });

      batch.set(assignmentRef, {
        responders: payload,
        timestamp: serverTimestamp(),
        assignedBy: "Admin Panel",
      });

      // Update each user
      selected.forEach((r) => {
        const teamDoc = teamList.find((t) => t.id === teamAssignments[r.id]);

        let vehicleDoc = null;
        if (teamDoc) {
          vehicleDoc = vehicleList.find(
            (v) => v.assignedTeam === teamDoc.teamName
          );
        }

        batch.update(doc(db, "users", r.id), {
          teamId: teamDoc?.id || "",
          teamName: teamDoc?.teamName || "",

          vehicleId: vehicleDoc?.id || "",
          vehicleCode: vehicleDoc?.code || "Unassigned",
          vehiclePlate: vehicleDoc?.plate || "",

          // Remove deprecated fields
          team: deleteField(),
          vehicle: deleteField(),
        });
      });

      await batch.commit();

      setShowSuccessModal(true);
      setShowAssignModal(false);
      setTimeout(() => setShowSuccessModal(false), 2500);
    } catch (error) {
      console.error(error);
      alert("Error saving assignments.");
    }
  };

  // ------------------- UI -------------------
  return (
    <div className={styles.pageWrapper}>
      <AdminHeader />
      <div style={{ position: "absolute", top: 20, right: 30 }}>
        <AlertBellButton />
      </div>
      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Team Assignment</h2>
          <hr className={styles.separator} />

          {/* SEARCH BAR */}
          {/* SEARCH BAR */}
<div className={styles.searchWrapper}>
  <div className={styles.searchBox}>
    <FaSearch className={styles.searchIcon} />
    <input
      className={styles.searchInput}
      type="text"
      placeholder="Search responders..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>

  <button
    className={styles.assignBtn}
    onClick={() => {
      setShowAssignModal(true);
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }}
  >
    Assign Team
  </button>
</div>


          {/* TABLE */}
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Vehicle</th>
              </tr>
            </thead>

            <tbody>
              {filteredResponders.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.teamName || "—"}</td>
                  <td>{r.vehicleCode || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Assign Team</h3>

            <label className={styles.selectAllRow}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              <span>Select All</span>
            </label>

            <div className={styles.tableScroll}>
              <table className={styles.responderTable}>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>Team</th>
                  </tr>
                </thead>

                <tbody>
                  {responders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedResponderIds.has(r.id)}
                          onChange={() => toggleResponder(r.id)}
                        />
                      </td>

                      <td>{r.name}</td>

                      <td>
                        <select
                          className={styles.inputSmall}
                          value={teamAssignments[r.id] || ""}
                          onChange={(e) => updateTeam(r.id, e.target.value)}
                        >
                          <option value="">Select Team</option>
                          {teamList.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.teamName}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.assignBtn} onClick={saveAssignments}>
                Save Assignment
              </button>
              <button className={styles.closeBtn} onClick={() => setShowAssignModal(false)}>
                Cancel
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
            <h3 className={styles.successTitle}>Assignment Saved!</h3>
            <button className={styles.successCloseBtn} onClick={() => setShowSuccessModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
