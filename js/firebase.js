// Firebase initialization (CDN modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDM8hFjgHAe0rk8IwHQnebUNbeq9SAp8E8",
  authDomain: "ql-luong-tieu-hoc.firebaseapp.com",
  projectId: "ql-luong-tieu-hoc",
  storageBucket: "ql-luong-tieu-hoc.firebasestorage.app",
  messagingSenderId: "220238803054",
  appId: "1:220238803054:web:76b852ef1b87129569f67f",
  measurementId: "G-DKBE4SX7GL"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

export {
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, where
};
