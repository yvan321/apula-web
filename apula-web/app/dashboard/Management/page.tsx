"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/shared/adminHeader";
import styles from "./tnv.module.css";
import { FaUsers, FaTruck } from "react-icons/fa";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

export default function TeamVehiclePage() {
  const [activeTab, setActiveTab] = useState<"teams" | "vehicles">("teams");

  const [teams, setTeams] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [responders, setResponders] = useState<any[]>([]);

  // Add modals
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Add inputs
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");

  const [vehicleCode, setVehicleCode] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleTeam, setVehicleTeam] = useState("");

  // Edit modals
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  // ------------------------------------------
  // Helpers
  // ------------------------------------------
  const normalizeStatus = (raw: any) => {
    if (!raw) return "";
    const low = String(raw).toLowerCase();
    if (low === "active") return "Available";
    if (low === "available" || low === "dispatched" || low === "unavailable")
      return raw;
    // fallback
    return raw;
  };

  // ------------------------------------------
  // Load Teams (normalize status)
  // ------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teams"), (snap) => {
      setTeams(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ...data,
            status: normalizeStatus(data.status || "Available"),
          };
        })
      );
    });
    return () => unsub();
  }, []);

  // ------------------------------------------
  // Load Vehicles (normalize status)
  // ------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vehicles"), (snap) => {
      setVehicles(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ...data,
            status: normalizeStatus(data.status || "Available"),
          };
        })
      );
    });
    return () => unsub();
  }, []);

  // ------------------------------------------
  // Load Responders (for leader dropdown & member counts)
  // ------------------------------------------
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "responder"));
    const unsub = onSnapshot(q, (snap) => {
      setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ------------------------------------------
  // Create team (defaults to Available)
  // ------------------------------------------
  const createTeam = async () => {
    if (!newTeamName.trim()) return alert("Please enter team name");
    if (!selectedLeader) return alert("Please select a leader");

    try {
      await addDoc(collection(db, "teams"), {
        teamName: newTeamName.trim(),
        leaderId: selectedLeader,
        leaderName:
          (responders.find((r) => r.id === selectedLeader) || {}).name || "",
        members: [],
        status: "Available",
        createdAt: serverTimestamp(),
      });
      setNewTeamName("");
      setSelectedLeader("");
      setShowAddTeamModal(false);
    } catch (err) {
      console.error(err);
      alert("Error creating team");
    }
  };

  // ------------------------------------------
  // Create vehicle
  // ------------------------------------------
  const createVehicle = async () => {
    if (!vehicleCode.trim()) return alert("Enter vehicle code");
    if (!vehiclePlate.trim()) return alert("Enter plate number");
    if (!vehicleTeam.trim()) return alert("Select assigned team");

    try {
      // store assignedTeamName for easy queries/display
      const teamDoc = teams.find((t) => t.id === vehicleTeam);
      await addDoc(collection(db, "vehicles"), {
        code: vehicleCode.trim(),
        plate: vehiclePlate.trim(),
        assignedTeamId: vehicleTeam,
        assignedTeam: teamDoc ? teamDoc.teamName : "",
        status: "Available",
        createdAt: serverTimestamp(),
      });

      setVehicleCode("");
      setVehiclePlate("");
      setVehicleTeam("");
      setShowAddVehicleModal(false);
    } catch (err) {
      console.error(err);
      alert("Error adding vehicle");
    }
  };

  // ------------------------------------------
  // Open Edit Team modal
  // ------------------------------------------
  const openEditTeam = (team: any) => {
    setEditingTeam({
      id: team.id,
      teamName: team.teamName || "",
      leaderId: team.leaderId || team.leader || "",
      status: normalizeStatus(team.status || "Available"),
    });
    setShowAddTeamModal(false);
  };

  // Save edited team
  const saveEditTeam = async () => {
    if (!editingTeam) return;
    if (!editingTeam.teamName.trim()) return alert("Team name required");

    try {
      const teamRef = doc(db, "teams", editingTeam.id);
      await updateDoc(teamRef, {
        teamName: editingTeam.teamName.trim(),
        leaderId: editingTeam.leaderId || "",
        leaderName:
          (responders.find((r) => r.id === editingTeam.leaderId) || {}).name ||
          "",
        status: editingTeam.status || "Available",
      });
      setEditingTeam(null);
    } catch (err) {
      console.error(err);
      alert("Error updating team");
    }
  };

  // Delete team
  const deleteTeam = async (teamId: string) => {
    if (!confirm("Delete this team? This will remove team assignments from users.")) return;
    try {
      // find users assigned to this team (by teamId)
      const q = query(collection(db, "users"), where("teamId", "==", teamId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);

      // clear user team fields
      snap.docs.forEach((d) => {
        const uref = doc(db, "users", d.id);
        batch.update(uref, {
          teamId: "",
          teamName: "",
        });
      });

      // delete team doc
      const tref = doc(db, "teams", teamId);
      batch.delete(tref);

      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Error deleting team");
    }
  };

  // ------------------------------------------
  // Open Edit Vehicle modal
  // ------------------------------------------
  const openEditVehicle = (v: any) => {
    setEditingVehicle({
      id: v.id,
      code: v.code || "",
      plate: v.plate || "",
      assignedTeamId: v.assignedTeamId || v.assignedTeamId || "",
      // keep assignedTeamName for display, but we'll set assignedTeamId & assignedTeamName on save
      status: normalizeStatus(v.status || "Available"),
    });
    setShowAddVehicleModal(false);
  };

  // Save edited vehicle
  const saveEditVehicle = async () => {
    if (!editingVehicle) return;
    if (!editingVehicle.code.trim()) return alert("Vehicle code required");

    try {
      const vehicleRef = doc(db, "vehicles", editingVehicle.id);
      const teamDoc = teams.find((t) => t.id === editingVehicle.assignedTeamId);

      await updateDoc(vehicleRef, {
        code: editingVehicle.code.trim(),
        plate: editingVehicle.plate?.trim() || "",
        assignedTeamId: editingVehicle.assignedTeamId || "",
        assignedTeam: teamDoc ? teamDoc.teamName : "",
        status: editingVehicle.status || "Available",
      });

      setEditingVehicle(null);
    } catch (err) {
      console.error(err);
      alert("Error updating vehicle");
    }
  };

  // Delete vehicle
  const deleteVehicle = async (vehicleId: string) => {
    if (!confirm("Delete this vehicle? This will remove vehicle assignment from users.")) return;
    try {
      // find users assigned to this vehicle (by vehicleId)
      const q = query(collection(db, "users"), where("vehicleId", "==", vehicleId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);

      // clear user vehicle fields
      snap.docs.forEach((d) => {
        const uref = doc(db, "users", d.id);
        batch.update(uref, {
          vehicleId: "",
          vehicleCode: "",
          vehiclePlate: "",
        });
      });

      // delete vehicle doc
      const vref = doc(db, "vehicles", vehicleId);
      batch.delete(vref);

      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Error deleting vehicle");
    }
  };

  // ------------------------------------------
  // Render
  // ------------------------------------------
  return (
    <div className={styles.pageWrapper}>
      <AdminHeader />
          <AlertBellButton />
    
      <AlertDispatchModal />

      <div className={styles.container}>
        <div className={styles.contentSection}>
          <h2 className={styles.pageTitle}>Team & Vehicle Management</h2>
          <hr className={styles.separator} />

          {/* TABS */}
          <div className={styles.tabContainer} style={{ display: "flex", gap: 8 }}>
            <button
              className={`${styles.tabBtn} ${activeTab === "teams" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("teams")}
            >
              <FaUsers /> Teams
            </button>

            <button
              className={`${styles.tabBtn} ${activeTab === "vehicles" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("vehicles")}
            >
              <FaTruck /> Vehicles
            </button>
          </div>

          {/* TEAMS */}
          {activeTab === "teams" && (
            <>
              <div className={styles.headerRow} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className={styles.subTitle}>Teams</h3>
                <div>
                  <button className={styles.addBtn} onClick={() => { setShowAddTeamModal(true); setEditingTeam(null); }}>
                    + Add Team
                  </button>
                </div>
              </div>

              <table className={styles.dataTable} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Members</th>
                    <th>Leader</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {teams.map((team) => {
                    const memberCount = responders.filter((r) => r.teamId === team.id).length;

                    return (
                      <tr key={team.id}>
                        <td>{team.teamName}</td>
                        <td>{memberCount}</td>
                        <td>{team.leaderName || team.leader || "—"}</td>

                        {/* STATUS */}
                        <td>
                          <span
                            className={
                              team.status === "Dispatched"
                                ? styles.statusDispatched
                                : team.status === "Unavailable"
                                ? styles.statusUnavailable
                                : styles.statusAvailable
                            }
                          >
                            {team.status}
                          </span>
                        </td>

                        <td>
                          <button
                            onClick={() => openEditTeam(team)}
                            style={{ marginRight: 8, padding: "6px 10px", borderRadius: 6, border: "none", background: "#f0ad4e", color: "#fff", cursor: "pointer" }}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteTeam(team.id)}
                            style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#dc3545", color: "#fff", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* VEHICLES */}
          {activeTab === "vehicles" && (
            <>
              <div className={styles.headerRow} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className={styles.subTitle}>Vehicles</h3>
                <div>
                  <button className={styles.addBtn} onClick={() => { setShowAddVehicleModal(true); setEditingVehicle(null); }}>
                    + Add Vehicle
                  </button>
                </div>
              </div>

              <table className={styles.dataTable} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Vehicle Code</th>
                    <th>Plate Number</th>
                    <th>Team Assigned</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td>{v.code}</td>
                      <td>{v.plate}</td>
                      <td>{v.assignedTeam || (teams.find((t) => t.id === v.assignedTeamId)?.teamName || "—")}</td>

                      <td>
                        <span
                          className={
                            v.status === "Dispatched"
                              ? styles.statusDispatched
                              : v.status === "Unavailable"
                              ? styles.statusUnavailable
                              : styles.statusAvailable
                          }
                        >
                          {v.status}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={() => openEditVehicle(v)}
                          style={{ marginRight: 8, padding: "6px 10px", borderRadius: 6, border: "none", background: "#f0ad4e", color: "#fff", cursor: "pointer" }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteVehicle(v.id)}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#dc3545", color: "#fff", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* ADD TEAM MODAL */}
      {showAddTeamModal && !editingTeam && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Add Team</h3>

            <label className={styles.label}>Team Name</label>
            <input className={styles.input} type="text" placeholder="Enter team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />

            <label className={styles.label}>Team Leader</label>
            <select className={styles.input} value={selectedLeader} onChange={(e) => setSelectedLeader(e.target.value)}>
              <option value="">Select Leader</option>
              {responders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={createTeam}>
                Create Team
              </button>
              <button className={styles.closeBtn} onClick={() => setShowAddTeamModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Edit Team</h3>

            <label className={styles.label}>Team Name</label>
            <input
              className={styles.input}
              type="text"
              value={editingTeam.teamName}
              onChange={(e) => setEditingTeam((s: any) => ({ ...s, teamName: e.target.value }))}
            />

            <label className={styles.label}>Team Leader</label>
            <select className={styles.input} value={editingTeam.leaderId} onChange={(e) => setEditingTeam((s: any) => ({ ...s, leaderId: e.target.value }))}>
              <option value="">Select Leader</option>
              {responders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <label className={styles.label}>Status</label>
            <select className={styles.input} value={editingTeam.status} onChange={(e) => setEditingTeam((s: any) => ({ ...s, status: e.target.value }))}>
              <option value="Available">Available</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Unavailable">Unavailable</option>
            </select>

            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={saveEditTeam}>
                Save Changes
              </button>
              <button className={styles.closeBtn} onClick={() => setEditingTeam(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD VEHICLE MODAL */}
      {showAddVehicleModal && !editingVehicle && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Add Vehicle</h3>

            <label className={styles.label}>Vehicle Code</label>
            <input className={styles.input} type="text" placeholder="Enter vehicle code" value={vehicleCode} onChange={(e) => setVehicleCode(e.target.value)} />

            <label className={styles.label}>Plate Number</label>
            <input className={styles.input} type="text" placeholder="Enter plate number" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />

            <label className={styles.label}>Team Assigned</label>
            <select className={styles.input} value={vehicleTeam} onChange={(e) => setVehicleTeam(e.target.value)}>
              <option value="">Select Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>

            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={createVehicle}>
                Add Vehicle
              </button>
              <button className={styles.closeBtn} onClick={() => setShowAddVehicleModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {editingVehicle && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Edit Vehicle</h3>

            <label className={styles.label}>Vehicle Code</label>
            <input className={styles.input} type="text" value={editingVehicle.code} onChange={(e) => setEditingVehicle((s: any) => ({ ...s, code: e.target.value }))} />

            <label className={styles.label}>Plate Number</label>
            <input className={styles.input} type="text" value={editingVehicle.plate} onChange={(e) => setEditingVehicle((s: any) => ({ ...s, plate: e.target.value }))} />

            <label className={styles.label}>Assign to Team</label>
            <select className={styles.input} value={editingVehicle.assignedTeamId} onChange={(e) => setEditingVehicle((s: any) => ({ ...s, assignedTeamId: e.target.value }))}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>

            <label className={styles.label}>Status</label>
            <select className={styles.input} value={editingVehicle.status} onChange={(e) => setEditingVehicle((s: any) => ({ ...s, status: e.target.value }))}>
              <option value="Available">Available</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Unavailable">Unavailable</option>
            </select>

            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={saveEditVehicle}>
                Save Changes
              </button>
              <button className={styles.closeBtn} onClick={() => setEditingVehicle(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
