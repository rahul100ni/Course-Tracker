import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAhwiPXc4qaHo1KbkoMa3UoSz0yv4-4I5Y",
  authDomain: "course-tracker-afba7.firebaseapp.com",
  projectId: "course-tracker-afba7",
  storageBucket: "course-tracker-afba7.firebasestorage.app",
  messagingSenderId: "931185435139",
  appId: "1:931185435139:web:5460a128d76d643fc8e436",
  measurementId: "G-CQ6CZ3JM04"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
