"use client";
import React, { createContext, useContext, useState } from "react";
import { Howl } from "howler";

const AlertContext = createContext();
export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isDispatchVisible, setIsDispatchVisible] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [selectedResponders, setSelectedResponders] = useState([]);
  const [screenshotUrl, setScreenshotUrl] = useState("/images/fire_snapshot.jpg");

  // 🧑‍🚒 Replace departments with real responder names
  const respondersList = [
    "LeBron James",
    "Stephen Curry",
    "Dwyane Wade",
    "Kobe Bryant",
    "Kevin Durant",
  ];

  const alarmSound = new Howl({
    src: ["/sounds/fire_alarm.mp3"],
    volume: 0.7,
  });

  const triggerAlert = (message, screenshot = null) => {
    setAlertMessage(message);
    if (screenshot) setScreenshotUrl(screenshot);
    setIsAlertVisible(true);
    alarmSound.play();

    setTimeout(() => {
      setIsAlertVisible(false);
      alarmSound.stop();
    }, 10000);
  };

  const handleViewDetails = () => setIsDetailVisible(true);
  const closeDetails = () => setIsDetailVisible(false);
  const handleDispatch = () => setIsDispatchVisible(true);

  const handleResponderSelect = (responder) => {
    setSelectedResponders((prev) =>
      prev.includes(responder)
        ? prev.filter((r) => r !== responder)
        : [...prev, responder]
    );
  };

  const confirmDispatch = () => {
    if (selectedResponders.length === 0)
      return alert("Please choose responders first!");

    setIsDispatched(true);
    setIsDispatchVisible(false);
    console.log("🚑 Dispatched to:", selectedResponders);
    console.log("🔥 Alert message:", alertMessage);

    // 🔗 Example: Send this data to Firebase or API
    // firebase.firestore().collection("dispatches").add({
    //   responders: selectedResponders,
    //   message: alertMessage,
    //   timestamp: new Date().toISOString(),
    // });

    setTimeout(() => setIsDispatched(false), 3000);
  };

  const cancelDispatch = () => {
    setIsDispatchVisible(false);
    setSelectedResponders([]);
  };

  return (
    <AlertContext.Provider value={{ triggerAlert }}>
      {children}

      {/* 🔥 Alert Popup */}
      {isAlertVisible && (
        <div className="alertPopup">
          <div className="alertContent">
            <h1>🚨 FIRE ALERT DETECTED!</h1>
            <p>{alertMessage}</p>
            <button className="viewButton" onClick={handleViewDetails}>
              View Details
            </button>
          </div>
        </div>
      )}

      {/* 🔍 Details Popup */}
      {isDetailVisible && (
        <div className="detailsPopup">
          <div className="detailsContent">
            <h2>🔥 Fire Alert Details</h2>
            <p>{alertMessage}</p>
            <p>
              <strong>Time:</strong> {new Date().toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong> Fire detected and alarm triggered.
            </p>

            <div className="screenshotContainer">
              <img src={screenshotUrl} alt="Fire Scene Screenshot" />
            </div>

            <button
              className={`dispatchButton ${isDispatched ? "sent" : ""}`}
              onClick={handleDispatch}
              disabled={isDispatched}
            >
              {isDispatched ? "✅ Dispatched!" : "🚨 Dispatch Response"}
            </button>

            <button className="closeButton" onClick={closeDetails}>
              Close
            </button>
          </div>
        </div>
      )}


      {isDispatchVisible && (
        <div className="dispatchPopup">
          <div className="dispatchContent">
            <h2>Choose Active Responders</h2>
            <p>Select which responders to notify for this alert:</p>
            <div className="respondersList">
              {respondersList.map((responder) => (
                <label key={responder} className="responderOption">
                  <input
                    type="checkbox"
                    checked={selectedResponders.includes(responder)}
                    onChange={() => handleResponderSelect(responder)}
                  />
                  {responder}
                </label>
              ))}
            </div>

            <div className="dispatchButtons">
              <button className="confirmButton" onClick={confirmDispatch}>
                Confirm Dispatch
              </button>
              <button className="cancelButton" onClick={cancelDispatch}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💅 Styles */}
      <style jsx>{`
        /* Overlay background */
        .alertPopup,
        .detailsPopup,
        .dispatchPopup {
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
        }

        /* Fire Alert */
        .alertContent {
          background: #ff4d4f;
          color: white;
          padding: 40px 60px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .viewButton {
          margin-top: 20px;
          background: white;
          color: #ff4d4f;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }

        /* Detail Modal */
        .detailsContent,
        .dispatchContent {
          background: white;
          color: #333;
          padding: 30px 40px;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          text-align: left;
          width: 400px;
          max-width: 90%;
          animation: fadeIn 0.3s ease-in-out;
        }

        .screenshotContainer img {
          width: 100%;
          border-radius: 12px;
          border: 2px solid #ff4d4f;
          margin-top: 16px;
        }

        /* Dispatch Button */
        .dispatchButton {
          margin-top: 20px;
          background: #ff4d4f;
          color: white;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: bold;
          width: 100%;
          cursor: pointer;
        }

        .dispatchButton.sent {
          background: #4caf50;
        }

        /* Responders List */
        .respondersList {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .responderOption {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f5f5f5;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .responderOption:hover {
          background: #ffeaea;
        }

        /* Buttons */
        .dispatchButtons {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
        }

        .confirmButton {
          background: #4caf50;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }

        .cancelButton {
          background: #bbb;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }

        .closeButton {
          margin-top: 10px;
          background: #ddd;
          color: #333;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: bold;
          width: 100%;
          cursor: pointer;
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
