"use client";

import Image from "next/image";
import styles from "./page.module.css";
import {
  Flame,
  Camera,
  Bell,
  Cpu,
  Thermometer,
  Cloud,
  Eye,
} from "lucide-react";
import Header from "../components/shared/header";

export default function Home() {
  // 🔥 Feature Cards for Apula
  const cards = [
    {
      icon: <Flame size={48} className={styles.icon} />,
      title: "AI Fire Detection",
      desc: "Detects smoke and fire in real-time using CNN-based image processing models trained on CCTV footage.",
    },
    {
      icon: <Thermometer size={48} className={styles.icon} />,
      title: "Thermal Monitoring",
      desc: "Integrates thermal sensors to measure heat intensity and detect fire-prone areas early.",
    },
    {
      icon: <Camera size={48} className={styles.icon} />,
      title: "CCTV Integration",
      desc: "Utilizes live CCTV feeds for visual analysis and detection through deep learning algorithms.",
    },
    {
      icon: <Bell size={48} className={styles.icon} />,
      title: "Real-time Alerts",
      desc: "Sends instant alerts to users and responders through the mobile app for faster action.",
    },
  ];

  // ⚙️ System Steps
  const steps = [
    {
      number: "1",
      title: "Capture Data",
      desc: "Sensors and CCTV continuously capture live environmental and visual data.",
    },
    {
      number: "2",
      title: "Analyze via CNN",
      desc: "YOLO-based CNN model detects smoke, flame, or abnormal heat signatures in real-time.",
    },
    {
      number: "3",
      title: "Trigger Alerts",
      desc: "Once fire indicators are detected, notifications are sent instantly to users and the fire department.",
    },
    {
      number: "4",
      title: "Monitor & Review",
      desc: "Users can view live feeds, incident logs, and system reports through the Apula dashboard or mobile app.",
    },
  ];

  return (
    <div>
      <Header/>
      <div className={`${styles.parallaxSection} ${styles.parallax1}`}>
        <div className={styles.overlay}>
          <div className={styles.content}>
            <div className={styles.logoContainer}>
              <Image
                src="/logo.png"
                alt="Apula Logo"
                width={350}
                height={180}
                priority
              />
            </div>
            <h2 className={styles.tagline}>PREVENTION STARTS WITH DETECTION</h2>
          </div>
        </div>
      </div>

      {/* System Features */}
      <div className={styles.contentSection}>
        <h1 data-aos="fade-up">System Features</h1>
        <div data-aos="slide-right" className={styles.features}>
          {cards.map((card, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.iconWrapper}>{card.icon}</div>
              <h3 className={styles.title}>{card.title}</h3>
              <p className={styles.description}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About / Parallax Section */}
      <div className={`${styles.parallaxSection} ${styles.parallax2}`}>
        <p data-aos="fade-up" className={styles.text2}>
          SMART. SECURE. RELIABLE.
        </p>
        <p className={styles.text3}>
          Powered by CNN-based vision and IoT sensors, Apula monitors live data
          streams to instantly detect fire, smoke, or heat anomalies and trigger
          real-time alerts for rapid response.
        </p>
      </div>

      {/* How It Works Section */}
      <section className={styles.contentSection}>
        <h1 data-aos="fade-up">How It Works</h1>
        <div data-aos="slide-left" className={styles.steps}>
          {steps.map((step, index) => (
            <div key={index} className={styles.step}>
              <div className={styles.circle}>{step.number}</div>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.description}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={`${styles.parallaxSection} ${styles.parallax3}`}>
        <div data-aos="fade-in" className={styles.logo}>
          <Image src="/logo.png" alt="Logo Icon" width={350} height={180} />
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footerCopyright}>
        <p>
          © 2025 <span className={styles.highlighted}>APULA</span>. All
          Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
