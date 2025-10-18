// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFvUGaaaB6kgkTHTQE6ZnSk1ASz9waQR0",
  authDomain: "apula-36cee.firebaseapp.com",
  projectId: "apula-36cee",
  storageBucket: "apula-36cee.firebasestorage.app",
  messagingSenderId: "1046852358801",
  appId: "1:1046852358801:web:0252de90987b61bab5a530",
  measurementId: "G-0EM3HH485S",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
