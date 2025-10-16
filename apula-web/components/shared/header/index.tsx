"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import styles from "./headerstyles.module.css";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

     
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }

      // ✅ Detect if page is at top for transparent background
      setIsAtTop(currentScrollY < 50);

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`${styles.header} ${showHeader ? styles.show : styles.hide} ${
        isAtTop ? styles.transparent : styles.solid
      }`}
    >
      <div className={styles.logoWrapper}>
        <Image src="/logo.png" alt="Logo Icon" width={100} height={50} />
      </div>

      <div className={styles.rightWrapper}>
        <div className={styles.authWrapper}>
          <a href="/login" className={styles.authButton}>
            Log In
          </a>
          <span className={styles.divider} />
          <a href="/signup" className={styles.authButton}>
            Sign Up
          </a>
        </div>

        <button className={styles.menuButton} onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <a href="/login" className={styles.mobileLink}>
            Log In
          </a>
          <a href="/signup" className={styles.mobileLink}>
            Sign Up
          </a>
        </div>
      )}
    </header>
  );
}
