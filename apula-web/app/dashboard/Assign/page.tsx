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
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

export default function AssignPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [vehicleList, setVehicleList] = useState<any[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>(
    {}
  );

  // ---------------- LOAD DATA ----------------
  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) =>
        setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) =>
      setTeamList(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubVehicles = onSnapshot(collection(db, "vehicles"), (snap) =>
      setVehicleList(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubUsers();
      unsubTeams();
      unsubVehicles();
    };
  }, []);

  // ---------------- HELPERS ----------------
  const filteredResponders = responders.filter((r) =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeaderTeam = (responderId: string) =>
    teamList.find((t) => t.leaderId === responderId);

  const getLeaderVehicle = (teamId?: string) =>
    vehicleList.find((v) => v.assignedTeamId === teamId);

  const isLeader = (id: string) =>
    teamList.some((t) => t.leaderId === id);

  const toggleResponder = (id: string) => {
    // leaders cannot be reassigned
    if (isLeader(id)) return;
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!selectAll) {
      const nonLeaders = responders
        .filter((r) => !isLeader(r.id))
        .map((r) => r.id);
      setSelectedResponderIds(new Set(nonLeaders));
      setSelectAll(true);
    } else {
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }
  };

  const updateTeam = (responderId: string, teamId: string) => {
    if (isLeader(responderId)) return;
    setTeamAssignments((prev) => ({ ...prev, [responderId]: teamId }));
  };

  // ---------------- SAVE ASSIGNMENTS ----------------
  const saveAssignments = async () => {
    if (selectedResponderIds.size === 0) {
      return alert("Select responders");
    }

    // Only non-leaders are processed
    const selected = responders.filter(
      (r) => selectedResponderIds.has(r.id) && !isLeader(r.id)
    );

    if (selected.length === 0) {
      alert("No valid responders selected.");
      return;
    }

    // Build mutable copies of team members so we can update them
    const teamMembersMap: Record<string, any[]> = {};
    const changedTeamIds = new Set<string>();

    teamList.forEach((t) => {
      teamMembersMap[t.id] = (t.members || []).map((m: any) => ({ ...m }));
    });

    // Collect user updates separately
    const userUpdates: Record<
      string,
      {
        teamId: string;
        teamName: string;
        vehicleId: string;
        vehicleCode: string;
        vehiclePlate: string;
      }
    > = {};

    selected.forEach((r) => {
      const oldTeamId: string = r.teamId || "";
      const newTeamId: string = teamAssignments[r.id] || "";

      // Old and new team references
      const oldTeam = oldTeamId
        ? teamList.find((t) => t.id === oldTeamId)
        : null;
      const newTeam = newTeamId
        ? teamList.find((t) => t.id === newTeamId)
        : null;

      // Remove from old team members
      if (oldTeam && teamMembersMap[oldTeam.id]) {
        teamMembersMap[oldTeam.id] = teamMembersMap[oldTeam.id].filter(
          (m) => m.id !== r.id
        );
        changedTeamIds.add(oldTeam.id);
      }

      // Add to new team members
      if (newTeam) {
        const list = teamMembersMap[newTeam.id] || [];
        if (!list.some((m: any) => m.id === r.id)) {
          list.push({
            id: r.id,
            name: r.name,
            status: r.status || "Available",
            teamName: newTeam.teamName,
          });
        }
        teamMembersMap[newTeam.id] = list;
        changedTeamIds.add(newTeam.id);
      }

      // Find vehicle for new team (if any)
      const vehicle = newTeam
        ? vehicleList.find((v) => v.assignedTeamId === newTeam.id)
        : null;

      userUpdates[r.id] = {
        teamId: newTeam?.id || "",
        teamName: newTeam?.teamName || "",
        vehicleId: vehicle?.id || "",
        vehicleCode: vehicle?.code || "",
        vehiclePlate: vehicle?.plate || "",
      };
    });

    const batch = writeBatch(db);

    // Apply team member updates (one write per team)
    changedTeamIds.forEach((teamId) => {
      const members = teamMembersMap[teamId] || [];
      batch.update(doc(db, "teams", teamId), { members });
    });

    // Apply user updates
    Object.entries(userUpdates).forEach(([userId, fields]) => {
      batch.update(doc(db, "users", userId), fields);
    });

    await batch.commit();

    setShowAssignModal(false);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
  };

  // ---------------- UI ----------------
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

          <div className={styles.searchWrapper}>
            <FaSearch />
            <input
              className={styles.searchInput}
              placeholder="Search responders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className={styles.assignBtn}
              onClick={() => setShowAssignModal(true)}
            >
              Assign Team
            </button>
          </div>

          {/* MAIN TABLE */}
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Vehicle</th>
              </tr>
            </thead>
            <tbody>
              {filteredResponders.map((r) => {
                const leaderTeam = getLeaderTeam(r.id);
                const leaderVehicle = getLeaderVehicle(leaderTeam?.id);

                const displayTeam = leaderTeam
                  ? leaderTeam.teamName
                  : r.teamName || "Unassigned";

                const displayVehicle = leaderVehicle
                  ? leaderVehicle.code
                  : r.vehicleCode || "Unassigned";

                return (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      {leaderTeam && (
                        <span style={{ color: "#c0392b", marginLeft: 8 }}>
                          (Leader)
                        </span>
                      )}
                    </td>
                    <td>{displayTeam}</td>
                    <td>{displayVehicle}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalWide}>
            <h3>Assign Team</h3>

            <label>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={toggleSelectAll}
              />
              {" "}Select All (except leaders)
            </label>

            <table className={styles.responderTable}>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Name</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {responders.map((r) => {
                  const leader = isLeader(r.id);
                  return (
                    <tr key={r.id} style={{ opacity: leader ? 0.5 : 1 }}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={leader}
                          checked={selectedResponderIds.has(r.id)}
                          onChange={() => toggleResponder(r.id)}
                        />
                      </td>
                      <td>
                        {r.name} {leader && "(Leader)"}
                      </td>
                      <td>
                        <select
                          disabled={leader}
                          value={teamAssignments[r.id] || ""}
                          onChange={(e) =>
                            updateTeam(r.id, e.target.value)
                          }
                        >
                          <option value="">Unassigned</option>
                          {teamList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.teamName}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button className={styles.assignBtn} onClick={saveAssignments}>
              Save Assignment
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>✔ Assignment Updated</div>
        </div>
      )}
    </div>
  );
}
