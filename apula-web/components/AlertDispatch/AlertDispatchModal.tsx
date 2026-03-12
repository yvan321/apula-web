"use client";

import React, { useEffect, useState } from "react";
import styles from "./alertDispatchModal.module.css";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AlertDispatchModal = () => {
  const [showModal, setShowModal] = useState(false);

  const [dispatchStep, setDispatchStep] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<"alerts" | "backup">("alerts");

  const [alerts, setAlerts] = useState<any[]>([]);
  const [backupRequests, setBackupRequests] = useState<any[]>([]);

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [selectedBackupRequest, setSelectedBackupRequest] = useState<any>(null);

  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(
    new Set(),
  );

  const [teams, setTeams] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [showAlertDetailsModal, setShowAlertDetailsModal] = useState(false);
  const [previewAlert, setPreviewAlert] = useState<any>(null);
  const [previewImageCandidates, setPreviewImageCandidates] = useState<
    string[]
  >([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);

  /* GOOGLE DRIVE IMAGE HELPERS */
  const extractGoogleDriveFileId = (url: string): string | null => {
    const filePathMatch = url.match(/\/file\/d\/([^/]+)/);
    if (filePathMatch?.[1]) return filePathMatch[1];

    const directPathMatch = url.match(/\/d\/([^/]+)/);
    if (directPathMatch?.[1]) return directPathMatch[1];

    const queryMatch = url.match(/[?&]id=([^&]+)/);
    if (queryMatch?.[1]) return queryMatch[1];

    return null;
  };

  const buildImageCandidates = (url: string): string[] => {
    if (!url) return [];

    if (!url.includes("drive.google.com")) {
      return [url];
    }

    const fileId = extractGoogleDriveFileId(url);
    if (!fileId) {
      return [url];
    }

    return [
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
      url,
    ];
  };

  /* OPEN MODAL */
  useEffect(() => {
    const openModal = () => {
      loadAlerts();
      loadBackupRequests();

      setDispatchStep(1);
      setActiveTab("alerts");

      setSelectedAlert(null);
      setSelectedBackupRequest(null);
      setSelectedResponderIds(new Set());

      setShowAlertDetailsModal(false);
      setPreviewAlert(null);
      setPreviewImageCandidates([]);
      setPreviewImageIndex(0);
      setPreviewImageFailed(false);

      setShowModal(true);
    };

    window.addEventListener("open-alert-dispatch", openModal);

    return () => window.removeEventListener("open-alert-dispatch", openModal);
  }, []);

  /* LOAD ALERTS */
  const loadAlerts = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "alerts"),
          where("status", "==", "Pending"),
          orderBy("timestamp", "desc"),
        ),
      );

      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading alerts:", error);
      setNoticeMessage("Failed to load alerts.");
    }
  };

  /* LOAD BACKUP REQUESTS */
  const loadBackupRequests = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "backup_requests"),
          where("status", "==", "Pending"),
          orderBy("timestamp", "desc"),
        ),
      );

      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          let alertData = null;

          if (data.alertId) {
            try {
              const alertDoc = await getDoc(doc(db, "alerts", data.alertId));

              if (alertDoc.exists()) {
                alertData = alertDoc.data();
              }
            } catch (error) {
              console.error("Error reading backup alert:", error);
            }
          }

          return {
            id: d.id,
            ...data,
            alert: alertData,
          };
        }),
      );

      setBackupRequests(list);
    } catch (error) {
      console.error("Error loading backup requests:", error);
      setNoticeMessage("Failed to load backup requests.");
    }
  };

  /* REALTIME RESPONDERS */
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "responder")),
      (snap) => {
        setResponders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Responder realtime error:", error);
      },
    );

    return () => unsub();
  }, []);

  /* LOAD TEAMS + VEHICLES */
  useEffect(() => {
    getDocs(collection(db, "teams"))
      .then((snap) =>
        setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch((error) => console.error("Error loading teams:", error));

    getDocs(collection(db, "vehicles"))
      .then((snap) =>
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch((error) => console.error("Error loading vehicles:", error));
  }, []);

  /* AUTO RESET TEAM + VEHICLE STATUS */
  useEffect(() => {
    if (
      responders.length === 0 ||
      teams.length === 0 ||
      vehicles.length === 0
    ) {
      return;
    }

    teams.forEach((team) => {
      const teamResponders = responders.filter((r) => r.teamId === team.id);
      if (teamResponders.length === 0) return;

      const leader = teamResponders.find((r) => r.id === team.leaderId);
      const leaderResolved = leader && leader.status === "Available";
      const allAvailable = teamResponders.every(
        (r) => r.status === "Available",
      );

      if (!leaderResolved && !allAvailable) return;

      const teamName = team.teamName;
      const vehicle = vehicles.find(
        (v) => v.assignedTeamId === team.id || v.assignedTeam === teamName,
      );

      const batch = writeBatch(db);

      teamResponders.forEach((res) => {
        if (res.status !== "Available") {
          batch.update(doc(db, "users", res.id), { status: "Available" });
        }
      });

      if (team.status !== "Available") {
        batch.update(doc(db, "teams", team.id), { status: "Available" });
      }

      if (vehicle && vehicle.status !== "Available") {
        batch.update(doc(db, "vehicles", vehicle.id), { status: "Available" });
      }

      batch.commit().catch((error) => {
        console.error("Auto reset failed:", error);
      });
    });
  }, [responders, teams, vehicles]);

  /* GROUP TEAMS */
  const groupedList = teams
    .map((team) => {
      const members = responders.filter((r) => r.teamId === team.id);

      if (!members.length) return null;

      const vehicle =
        vehicles.find((v) => v.assignedTeamId === team.id)?.code ||
        vehicles.find((v) => v.assignedTeam === team.teamName)?.code ||
        "Unassigned";

      const statuses = members.map((m) => m.status);

      let status = "Unavailable";
      if (statuses.some((s) => s === "Available")) status = "Available";
      if (statuses.every((s) => s === "Dispatched")) status = "Dispatched";

      return {
        team: team.teamName,
        teamId: team.id,
        vehicle,
        responders: members,
        status,
      };
    })
    .filter(Boolean);

  /* OPEN ALERT DETAILS */
  const openAlertDetails = (alert: any) => {
    setPreviewAlert(alert);

    const candidates = buildImageCandidates(alert?.snapshotUrl || "");
    setPreviewImageCandidates(candidates);
    setPreviewImageIndex(0);
    setPreviewImageFailed(false);

    setShowAlertDetailsModal(true);
  };

  /* SELECT ALERT */
  const handleAlertSelect = (alert: any) => {
    setSelectedAlert(alert);
    setSelectedBackupRequest(null);
    setSelectedResponderIds(new Set());
    setShowAlertDetailsModal(false);
    setDispatchStep(2);
  };

  /* SELECT TEAM */
  const handleDispatchTeam = (group: any) => {
    if (group.status !== "Available") {
      setNoticeMessage("This team is not available for dispatch.");
      return;
    }

    const available = group.responders.filter(
      (r: any) => r.status === "Available",
    );

    if (!available.length) {
      setNoticeMessage("No available responders in this team.");
      return;
    }

    setSelectedResponderIds(new Set(available.map((r: any) => r.id)));
    setDispatchStep(3);
  };

  /* GET DISPATCHER NAME */
  const getDispatcherName = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return "Admin Panel";

    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        return (
          data.name ||
          currentUser.displayName ||
          currentUser.email ||
          "Admin Panel"
        );
      }
    } catch (error) {
      console.error("Error reading dispatcher name:", error);
    }

    return currentUser.displayName || currentUser.email || "Admin Panel";
  };

  /* DISPATCH */
  const dispatchResponders = async () => {
    if (!selectedAlert) {
      setNoticeMessage("No alert selected.");
      return;
    }

    const selected = responders.filter((r) => selectedResponderIds.has(r.id));

    if (!selected.length) {
      setNoticeMessage("No responders selected.");
      return;
    }

    try {
      const batch = writeBatch(db);
      const ref = doc(collection(db, "dispatches"));
      const dispatchedByName = await getDispatcherName();

      const firstResponder = selected[0];

      const team = teams.find((t) => t.id === firstResponder.teamId);
      const teamName = team?.teamName || "Unassigned";
      const teamId = firstResponder.teamId;

      const vehicle =
        vehicles.find((v) => v.assignedTeamId === teamId) ||
        vehicles.find((v) => v.assignedTeam === teamName);

      const isBackup = !!selectedBackupRequest;
      const waveNumber = isBackup
        ? selectedBackupRequest.requestedWaveNumber
        : 1;

      batch.set(ref, {
        alertId: selectedAlert.id,
        alertType: selectedAlert.type,
        alertLocation: selectedAlert.location,
        snapshotUrl: selectedAlert.snapshotUrl || null,

        responders: selected.map((r) => {
          const responderTeamName =
            teams.find((t) => t.id === r.teamId)?.teamName || "Unassigned";

          const responderVehicle =
            vehicles.find((v) => v.assignedTeamId === r.teamId) ||
            vehicles.find((v) => v.assignedTeam === responderTeamName);

          return {
            id: r.id,
            name: r.name,
            email: (r.email || "").toLowerCase(),
            contact: r.contact || "",
            team: responderTeamName,
            teamId: r.teamId,
            vehicle: responderVehicle?.code || "Unassigned",
          };
        }),

        responderEmails: selected.map((r) => (r.email || "").toLowerCase()),

        userReported: selectedAlert.userName,
        userAddress: selectedAlert.userAddress,
        userContact: selectedAlert.userContact || "",
        userEmail: selectedAlert.userEmail || "",

        status: "Dispatched",
        dispatchedBy: dispatchedByName,
        timestamp: serverTimestamp(),

        waveNumber,
        dispatchType: isBackup ? "Backup" : "Primary",
        isBackup,
      });

      selected.forEach((r) => {
        batch.update(doc(db, "users", r.id), { status: "Dispatched" });
      });

      if (team) {
        batch.update(doc(db, "teams", team.id), { status: "Dispatched" });
      }

      if (vehicle) {
        batch.update(doc(db, "vehicles", vehicle.id), { status: "Dispatched" });
      }

      if (isBackup) {
        batch.update(doc(db, "backup_requests", selectedBackupRequest.id), {
          status: "Approved",
          approvedDispatchId: ref.id,
          approvedBy: auth.currentUser?.email || "Admin",
          approvedAt: serverTimestamp(),
        });
      } else {
        batch.update(doc(db, "alerts", selectedAlert.id), {
          status: "Dispatched",
        });
      }

      await batch.commit();

      setShowModal(false);
      setDispatchStep(1);
      setActiveTab("alerts");
      setSelectedAlert(null);
      setSelectedBackupRequest(null);
      setSelectedResponderIds(new Set());
      setShowAlertDetailsModal(false);
      setPreviewAlert(null);
      setPreviewImageCandidates([]);
      setPreviewImageIndex(0);
      setPreviewImageFailed(false);

      loadBackupRequests();
      loadAlerts();
    } catch (err) {
      console.error(err);
      setNoticeMessage("Dispatch failed. Please try again.");
    }
  };

  /* APPROVE BACKUP */
  const approveBackup = async (req: any) => {
    try {
      const alertDoc = await getDoc(doc(db, "alerts", req.alertId));

      if (!alertDoc.exists()) {
        setNoticeMessage("Alert not found.");
        return;
      }

      const alertData = alertDoc.data();

      setSelectedBackupRequest(req);
      setSelectedResponderIds(new Set());

      setSelectedAlert({
        id: req.alertId,
        ...alertData,
      });

      setActiveTab("alerts");
      setDispatchStep(2);

      setNoticeMessage("Select a backup team to dispatch.");
    } catch (err) {
      console.error(err);
      setNoticeMessage("Backup approval failed.");
    }
  };

  if (!showModal) return null;

  const formattedAlertTime = previewAlert?.timestamp?.seconds
    ? new Date(previewAlert.timestamp.seconds * 1000).toLocaleString()
    : "Unknown";

  const previewImageSrc =
    previewImageCandidates[previewImageIndex] ||
    previewAlert?.snapshotUrl ||
    "";

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalWide}>
        <div className={styles.tabs}>
          <div
            className={`${styles.tab} ${
              activeTab === "alerts" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("alerts")}
          >
            <span>Alerts</span>
            {alerts.length > 0 && (
              <span className={styles.tabBadge}>{alerts.length}</span>
            )}
          </div>

          <div
            className={`${styles.tab} ${
              activeTab === "backup" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("backup")}
          >
            <span>Backup</span>
            {backupRequests.length > 0 && (
              <span className={styles.tabBadge}>{backupRequests.length}</span>
            )}
          </div>
        </div>

        <div className={styles.modalTitleBar}>
          <h2 className={styles.pageTitle}>
            {activeTab === "backup"
              ? "Backup Requests"
              : dispatchStep === 1
                ? "Select Alert"
                : dispatchStep === 2
                  ? "Select Team"
                  : "Confirm Responders"}
          </h2>
        </div>

        <div className={styles.divider} />

        <div className={styles.modalBody}>
          {activeTab === "alerts" && dispatchStep === 1 && (
            <table className={styles.alertTable}>
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => openAlertDetails(a)}
                    className={styles.clickableRow}
                  >
                    <td>{a.userName}</td>
                    <td>{a.userContact}</td>
                    <td>{a.userAddress}</td>
                    <td>
                      <button
                        className={styles.dispatchBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlertSelect(a);
                        }}
                        disabled={!a || a.status !== "Pending"}
                      >
                        <span>Dispatch</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "alerts" && dispatchStep === 2 && (
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Vehicle</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th>Action</th>
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
                        className={styles.dispatchBtn}
                        onClick={() => handleDispatchTeam(g)}
                        disabled={g.status !== "Available"}
                      >
                        <span>Dispatch Team</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "alerts" && dispatchStep === 3 && (
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

                    const vehicleCode =
                      vehicles.find(
                        (v) =>
                          v.assignedTeamId === r.teamId ||
                          v.assignedTeam === teamName,
                      )?.code || "Unassigned";

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
          )}

          {activeTab === "backup" && (
            <table className={styles.alertTable}>
              <thead>
                <tr>
                  <th>Requested By</th>
                  <th>Address</th>
                  <th>Wave</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {backupRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No backup requests</td>
                  </tr>
                ) : (
                  backupRequests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.requestedByName}</td>
                      <td>{r.alert?.userAddress || "Unknown"}</td>
                      <td>{r.requestedWaveNumber}</td>
                      <td>{r.reason}</td>
                      <td>
                        <button
                          className={styles.dispatchBtn}
                          onClick={() => approveBackup(r)}
                        >
                          <span>Approve</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.divider} />

        <div className={styles.modalFooter}>
          {activeTab === "alerts" && dispatchStep === 3 ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className={styles.dispatchBtn}
                onClick={dispatchResponders}
              >
                <span>Dispatch Now</span>
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => setShowModal(false)}
              >
                <span>Close</span>
              </button>
            </div>
          ) : (
            <button
              className={styles.closeBtn}
              onClick={() => setShowModal(false)}
            >
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {showAlertDetailsModal && previewAlert && (
        <div
          className={styles.modalViewOverlay}
          onClick={() => setShowAlertDetailsModal(false)}
        >
          <div
            className={styles.modalViewContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalViewTitle}>Alert Details</h3>

            <div className={styles.modalViewBody}>
              <div className={styles.alertImageSection}>
                {!previewAlert.snapshotUrl ? (
                  <div className={styles.noImageBox}>No image available</div>
                ) : previewImageFailed ? (
                  <div className={styles.noImageBox}>
                    Image preview blocked by file permissions
                  </div>
                ) : (
                  <img
                    src={previewImageSrc}
                    alt="Alert"
                    className={styles.alertImage}
                    onLoad={() => setPreviewImageFailed(false)}
                    onError={() => {
                      if (
                        previewImageIndex <
                        previewImageCandidates.length - 1
                      ) {
                        setPreviewImageIndex((prev) => prev + 1);
                      } else {
                        setPreviewImageFailed(true);
                      }
                    }}
                  />
                )}
              </div>

              <div className={styles.modalDetails}>
                <p className={styles.iconRow}>
                  <span>Name: </span>
                  {previewAlert.userName || "N/A"}
                </p>

                <p className={styles.iconRow}>
                  <span>Contact: </span>
                  {previewAlert.userContact || "N/A"}
                </p>

                <p className={styles.iconRow}>
                  <span>Email: </span>
                  {previewAlert.userEmail || "N/A"}
                </p>

                <p className={styles.iconRow}>
                  <span>Address: </span>
                  {previewAlert.userAddress || "N/A"}
                </p>

                <p>
                  <strong>Alert Type:</strong> {previewAlert.type || "Unknown"}
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {previewAlert.location || "Unknown"}
                </p>

                <p>
                  <strong>Status:</strong> {previewAlert.status || "Pending"}
                </p>

                <p>
                  <strong>Alert Received At:</strong>{" "}
                  {previewAlert.timestamp?.seconds
                    ? new Date(
                        previewAlert.timestamp.seconds * 1000,
                      ).toLocaleString()
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className={styles.modalViewActions}>
              <button
                className={styles.dispatchBtn}
                onClick={() => handleAlertSelect(previewAlert)}
                disabled={!previewAlert || previewAlert.status !== "Pending"}
              >
                <span>Dispatch</span>
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => setShowAlertDetailsModal(false)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {noticeMessage && (
        <div className={styles.modalOverlay}>
          <div style={{ textAlign: "center" }} className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Notice</h3>
            <p>{noticeMessage}</p>
            <button
              className={styles.closeBtn}
              onClick={() => setNoticeMessage(null)}
            >
              <span>OK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertDispatchModal;
