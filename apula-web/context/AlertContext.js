"use client";
import React, { createContext, useContext, useState } from "react";
import { Howl } from "howler"; // for alarm sound

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const alarmSound = new Howl({
    src: ["/sounds/alarm.mp3"], // 📂 place your alarm.mp3 in /public/sounds/
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
            <h3>🚨 Fire Alert Detected!</h3>
            <p>{alertMessage}</p>
          </div>
        </div>
      )}
      <style jsx>{`
        .alertPopup {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          background: #ff4d4f;
          color: white;
          padding: 16px 20px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.4s ease-out;
        }
        .alertContent h3 {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        .alertContent p {
          margin: 4px 0 0;
          font-size: 15px;
        }
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </AlertContext.Provider>
  );
};
