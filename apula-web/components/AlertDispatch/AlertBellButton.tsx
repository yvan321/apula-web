"use client";

import { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import styles from "./alertBellButton.module.css";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const AlertBellButton = () => {
  const [alertCount, setAlertCount] = useState(0);

  // 🔥 Real-time listen to pending alerts
  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("status", "==", "Pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      setAlertCount(snap.size);
    });

    return () => unsub();
  }, []);

  const handleClick = () => {
    window.dispatchEvent(new Event("open-alert-dispatch"));
  };

  return (
    <button className={styles.floatingBell} onClick={handleClick}>
      <FaBell className={styles.icon} />

      {/* 🔴 Badge */}
      {alertCount > 0 && (
        <span className={styles.badge}>{alertCount}</span>
      )}
    </button>
  );
};

export default AlertBellButton;
