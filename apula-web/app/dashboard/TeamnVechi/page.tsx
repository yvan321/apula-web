"use client";

import React, { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AlertBellButton from "@/components/AlertDispatch/AlertBellButton";
import AlertDispatchModal from "@/components/AlertDispatch/AlertDispatchModal";

const DispatchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [responders, setResponders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showResponderModal, setShowResponderModal] = useState(false);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // TEAM + VEHICLE STATES
  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
  const [vehicleAssignments, setVehicleAssignments] = useState<Record<string, string>>({});

  const [teamList, setTeamList] = useState<string[]>([
    "Alpha Team",
    "Bravo Team",
    "Charlie Team",
  ]);

  const [vehicleList, setVehicleList] = useState<string[]>([
    "Firetruck 1",
    "Firetruck 2",
    "Rescue Vehicle",
  ]);

  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newTeam, setNewTeam] = useState("");
  const [newVehicle, setNewVehicle] = useState("");

  // REAL-TIME RESPONDERS
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // FILTER SEARCH
  const filteredResponders = responders.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term)
    );
  });

  // CHECKBOX TOGGLE
  const toggleResponder = (id: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // SELECT ALL
  const toggleSelectAll = () => {
    if (!selectAll) {
      setSelectedResponderIds(new Set(responders.map((r) => r.id)));
      setSelectAll(true);
    } else {
      setSelectedResponderIds(new Set());
      setSelectAll(false);
    }
  };

  // UPDATE TEAM & VEHICLE
  const updateTeam = (id: string, value: string) => {
    if (value === "add_new") {
      setShowAddTeamModal(true);
      return;
    }
    setTeamAssignments((prev) => ({ ...prev, [id]: value }));
  };

  const updateVehicle = (id: string, value: string) => {
    if (value === "add_new") {
      setShowAddVehicleModal(true);
      return;
    }
    setVehicleAssignments((prev) => ({ ...prev, [id]: value }));
  };

  // ADD NEW TEAM
  const addTeam = () => {
    if (!newTeam.trim()) return;
    setTeamList([...teamList, newTeam]);
    setNewTeam("");
    setShowAddTeamModal(false);
  };

  // ADD NEW VEHICLE
  const addVehicle = () => {
    if (!newVehicle.trim()) return;
    setVehicleList([...vehicleList, newVehicle]);
    setNewVehicle("");
    setShowAddVehicleModal(false);
  };

  // SAVE ASSIGNMENT
  const dispatchResponders = async () => {
    if (selectedResponderIds.size === 0) {
      window.alert("Please select at least one responder.");
      return;
    }

    try {
      const batch = writeBatch(db);

      const respondersList = responders.filter((r) =>
        selectedResponderIds.has(r.id)
      );

      const dispatchRef = doc(collection(db, "dispatches"));

      batch.set(dispatchRef, {
        alertId: "manual",
        alertType: "Manual Assignment",
        alertLocation: "N/A",
        responders: respondersList.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email.toLowerCase(),
          contact: r.contact || "",
          team: teamAssignments[r.id] || "Unassigned",
          vehicle: vehicleAssignments[r.id] || "Unassigned",
        })),
        status: "Assigned",
        timestamp: serverTimestamp(),
        dispatchedBy: "Admin Panel",
      });

      // APPLY TEAM/VEHICLE TO USER DOCUMENTS
      respondersList.forEach((r) =>
        batch.update(doc(db, "users", r.id), {
          team: teamAssignments[r.id] || "",
          vehicle: vehicleAssignments[r.id] || "",
        })
      );

      // COMMIT
      await batch.commit();

      setShowSuccessModal(true);
      setShowResponderModal(false);
      setTimeout(() => setShowSuccessModal(false), 2500);

    } catch (err) {
      console.error(err);
      window.alert("Error saving assignment.");
    }
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
          <h2 className={styles.pageTitle}>Team & Vehicle Assignment</h2>
          <hr className={styles.separator} />

          {/* SEARCH + BUTTON */}
          <div className={styles.searchWrapper}>
            <div style={{ position: "relative", width: "100%" }}>
              <FaSearch className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search responders…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className={styles.assignBtn}
              onClick={() => {
                setShowResponderModal(true);
                setSelectedResponderIds(new Set());
                setSelectAll(false);
              }}
            >
              Assign Team / Vehicle
            </button>
          </div>

          {/* MAIN LIST TABLE */}
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredResponders.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL SELECT */}
      {showResponderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResponderModal(false)}>
          <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Assign Team & Vehicle</h3>

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
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Team</th>
                    <th>Vehicle</th>
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
                      <td>{r.email}</td>
                      <td>{r.contact || "—"}</td>
                      <td>{r.status}</td>

                      <td>
                        <select
                          value={teamAssignments[r.id] || ""}
                          onChange={(e) => updateTeam(r.id, e.target.value)}
                          className={styles.inputSmall}
                        >
                          <option value="">Select Team</option>
                          {teamList.map((team) => (
                            <option key={team} value={team}>
                              {team}
                            </option>
                          ))}
                          <option value="add_new">➕ Add New Team</option>
                        </select>
                      </td>

                      <td>
                        <select
                          value={vehicleAssignments[r.id] || ""}
                          onChange={(e) => updateVehicle(r.id, e.target.value)}
                          className={styles.inputSmall}
                        >
                          <option value="">Select Vehicle</option>
                          {vehicleList.map((veh) => (
                            <option key={veh} value={veh}>
                              {veh}
                            </option>
                          ))}
                          <option value="add_new">➕ Add New Vehicle</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.assignBtn} onClick={dispatchResponders}>
                Save Assignment
              </button>

              <button className={styles.closeBtn} onClick={() => setShowResponderModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW TEAM */}
      {showAddTeamModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalSmall}>
            <h3>Add New Team</h3>
            <input
              className={styles.inputSmall}
              type="text"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              placeholder="Enter team name"
            />
            <button className={styles.assignBtn} onClick={addTeam}>
              Add Team
            </button>
            <button className={styles.closeBtn} onClick={() => setShowAddTeamModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ADD NEW VEHICLE */}
      {showAddVehicleModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalSmall}>
            <h3>Add New Vehicle</h3>
            <input
              className={styles.inputSmall}
              type="text"
              value={newVehicle}
              onChange={(e) => setNewVehicle(e.target.value)}
              placeholder="Enter vehicle name"
            />
            <button className={styles.assignBtn} onClick={addVehicle}>
              Add Vehicle
            </button>
            <button className={styles.closeBtn} onClick={() => setShowAddVehicleModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✔</div>
            <h3 className={styles.successTitle}>Assignment Saved!</h3>
            <button
              className={styles.successCloseBtn}
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DispatchPage;
