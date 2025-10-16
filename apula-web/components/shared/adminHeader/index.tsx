"use client";

import Image from "next/image";
import styles from "./adminheaderstyles.module.css";
import { useState } from "react";
import { usePathname } from "next/navigation"; // ✅ Add this
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react";

export default function AdminHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const userName = "Neil";
  const firstInitial = userName.charAt(0);

  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  const handleLogout = () => {
    
    window.location.href = "/login";
  };

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
            href="/dashboard/users"
            className={`${styles.sidebarLink} ${
              isActive("/dashboard/users") ? styles.activeLink : ""
            }`}
          >
            <Users size={18} className={styles.icon} />
            <span>Users</span>
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
            href="/analytics"
            className={`${styles.sidebarLink} ${
              isActive("/analytics") ? styles.activeLink : ""
            }`}
          >
            <BarChart size={18} className={styles.icon} />
            <span>Analytics</span>
          </a>

          <a
            href="/settings"
            className={`${styles.sidebarLink} ${
              isActive("/settings") ? styles.activeLink : ""
            }`}
          >
            <Settings size={18} className={styles.icon} />
            <span>Settings</span>
          </a>
        </nav>

        <button className={styles.logoutLink}>
          <LogOut size={18} className={styles.icon} onClick={handleLogout}/>
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
            <span className={styles.userName}>Welcome, Admin!</span>
            <div className={styles.userIcon}>{firstInitial}</div>
          </div>
        </div>
      </header>
    </>
  );
}
