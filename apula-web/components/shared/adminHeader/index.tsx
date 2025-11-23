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
  Send,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

export default function AdminHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Loading...");
  const [initial, setInitial] = useState<string>("?");
  const [role, setRole] = useState<string>("admin"); // default role
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const [unreadCount, setUnreadCount] = useState(0);

  // 🔔 Realtime unread notifications
  useEffect(() => {
    const q = query(collection(db, "alerts"), where("read", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  // 👤 Load user + role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("Guest");
        setInitial("G");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const name = data.name || "User";

          setUserName(name);
          setInitial(name.charAt(0).toUpperCase());
          setRole(data.role || "admin"); // ← get role from Firestore
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
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <Image src="/logo.png" alt="Sidebar Logo" width={150} height={75} />
          <button className={styles.closeSidebar} onClick={toggleSidebar}>
            &times;
          </button>
        </div>

        <nav className={styles.sidebarNav}>

          {/* Dashboard */}
          <a
            href="/dashboard"
            className={`${styles.sidebarLink} ${isActive("/dashboard") ? styles.activeLink : ""}`}
          >
            <LayoutDashboard size={18} className={styles.icon} />
            <span>Dashboard</span>
          </a>

          {/* Notifications with badge */}
          <a
            href="/dashboard/notifications"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/notifications") ? styles.activeLink : ""
            }`}
          >
            <div className={styles.notifWrapper}>
              <Bell size={18} className={styles.icon} />
              <span>Notifications</span>
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </div>
          </a>

          {/* SUPER ADMIN ONLY → Users */}
          {role === "superadmin" && (
            <a
              href="/dashboard/users"
              className={`${styles.sidebarLink} ${isActive("/dashboard/users") ? styles.activeLink : ""}`}
            >
              <Users size={18} className={styles.icon} />
              <span>Users</span>
            </a>
          )}

          {/* Responders */}
          <a
            href="/dashboard/ResponderRequest"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/ResponderRequest") ? styles.activeLink : ""
            }`}
          >
            <UserCheck size={18} className={styles.icon} />
            <span>Responders</span>
          </a>

          {/* Dispatch */}
          <a
            href="/dashboard/dispatch"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/dispatch") ? styles.activeLink : ""
            }`}
          >
            <Send size={18} className={styles.icon} />
            <span>Dispatch</span>
          </a>

          {/* Reports */}
          <a
            href="/dashboard/reports"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/reports") ? styles.activeLink : ""
            }`}
          >
            <FileText size={18} className={styles.icon} />
            <span>Reports</span>
          </a>

          {/* Settings */}
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
          <div className={styles.menuWrapper}>
            <button className={styles.menuButton} onClick={toggleSidebar}>
              &#9776;
            </button>
            {unreadCount > 0 && <span className={styles.menuBadge}>{unreadCount}</span>}
          </div>
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
