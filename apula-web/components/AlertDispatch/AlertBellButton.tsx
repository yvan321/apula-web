"use client";

import { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import styles from "./alertBellButton.module.css";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const AlertBellButton = () => {
  const [alertCount, setAlertCount] = useState(0);
  const [backupCount, setBackupCount] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const totalCount = alertCount + backupCount;

  // 🔊 Initialize alarm sound
  useEffect(() => {
    const alarm = new Audio("/sounds/fire_alarm.mp3");
    alarm.loop = true;
    setAudio(alarm);
  }, []);

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

  // 🚒 Real-time listen to pending backup requests
  useEffect(() => {
    const q = query(
      collection(db, "backupRequests"),
      where("status", "==", "Pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      setBackupCount(snap.size);
    });

    return () => unsub();
  }, []);

  // 🔊 Play sound if alerts or backup requests exist
  useEffect(() => {
    if (!audio) return;

    if (totalCount > 0 && !isPlaying) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }

    if (totalCount === 0 && isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  }, [totalCount, audio, isPlaying]);

  const handleClick = () => {
    window.dispatchEvent(new Event("open-alert-dispatch"));
  };

  return (
    <button className={styles.floatingBell} onClick={handleClick}>
      <FaBell className={styles.icon} />

      {/* 🔴 Badge = alerts + backup requests */}
      {totalCount > 0 && (
        <span className={styles.badge}>{totalCount}</span>
      )}
    </button>
  );
};

export default AlertBellButton;