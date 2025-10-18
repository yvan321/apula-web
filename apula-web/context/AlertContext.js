"use client";
import React, { createContext, useContext, useState } from "react";
import { Howl } from "howler"; // for alarm sound

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const alarmSound = new Howl({
    src: ["/sounds/fire_alarm.mp3"], // 📂 place your alarm.mp3 in /public/sounds/
    volume: 0.7,
  });

  const triggerAlert = (message) => {
    setAlertMessage(message);
    setIsAlertVisible(true);
    alarmSound.play();

    // Auto hide after 10s
    setTimeout(() => {
      setIsAlertVisible(false);
      alarmSound.stop();
    }, 10000);
  };

  return (
    <AlertContext.Provider value={{ triggerAlert }}>
      {children}

      {isAlertVisible && (
        <div className="alertPopup">
          <div className="alertContent">
            <h1>🚨 FIRE ALERT DETECTED!</h1>
            <p>{alertMessage}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .alertPopup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-in-out;
        }

        .alertContent {
          background: #ff4d4f;
          color: white;
          padding: 40px 60px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          animation: popIn 0.4s ease-in-out;
          max-width: 90%;
        }

        .alertContent h1 {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .alertContent p {
          margin-top: 16px;
          font-size: 1.2rem;
          font-weight: 500;
        }

        @keyframes popIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </AlertContext.Provider>
  );
};
