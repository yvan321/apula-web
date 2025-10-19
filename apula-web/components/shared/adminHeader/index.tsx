"use client";

import Image from "next/image";
import styles from "./adminheaderstyles.module.css";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Bell,
  FileText,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AdminHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Loading...");
  const [initial, setInitial] = useState<string>("?");
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  // ✅ Load logged-in user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const name = userDoc.data().name || "User";
            setUserName(name);
            setInitial(name.charAt(0).toUpperCase());
          } else {
            const display = user.displayName || "User";
            setUserName(display);
            setInitial(display.charAt(0).toUpperCase());
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUserName("User");
          setInitial("U");
        }
      } else {
        setUserName("Guest");
        setInitial("G");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <Image src="/logo.png" alt="Sidebar Logo" width={150} height={75} />
          <button className={styles.closeSidebar} onClick={toggleSidebar}>
            &times;
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <a
            href="/dashboard"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard") ? styles.activeLink : ""
            }`}
          >
            <LayoutDashboard size={18} className={styles.icon} />
            <span>Dashboard</span>
          </a>

          <a
            href="/dashboard/notifications"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/notifications") ? styles.activeLink : ""
            }`}
          >
            <Bell size={18} className={styles.icon} />
            <span>Notifications</span>
          </a>

          <a
            href="/dashboard/users"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/users") ? styles.activeLink : ""
            }`}
          >
            <Users size={18} className={styles.icon} />
            <span>Users</span>
          </a>

          <a
            href="/dashboard/ResponderRequest"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/ResponderRequest") ? styles.activeLink : ""
            }`}
          >
            <UserCheck size={18} className={styles.icon} />
            <span>Responders</span>
          </a>

          <a
            href="/dashboard/reports"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/reports") ? styles.activeLink : ""
            }`}
          >
            <FileText size={18} className={styles.icon} />
            <span>Reports</span>
          </a>

          <a
            href="/dashboard/analytics"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/analytics") ? styles.activeLink : ""
            }`}
          >
            <BarChart size={18} className={styles.icon} />
            <span>Analytics</span>
          </a>

          <a
            href="/dashboard/settings"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/settings") ? styles.activeLink : ""
            }`}
          >
            <Settings size={18} className={styles.icon} />
            <span>Settings</span>
          </a>
        </nav>

        <button className={styles.logoutLink} onClick={handleLogout}>
          <LogOut size={18} className={styles.icon} />
          Logout
        </button>
      </aside>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoWrapper}>
          <button
            className={styles.menuButton}
            onClick={toggleSidebar}
            aria-label="Toggle Menu"
          >
            &#9776;
          </button>

          <Image src="/logo.png" alt="Logo" width={100} height={50} />
        </div>

        <div className={styles.rightWrapper}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Welcome, {userName}!</span>
            <div className={styles.userIcon}>{initial}</div>
          </div>
        </div>
      </header>
    </>
  );
}
