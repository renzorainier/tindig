import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBXelHuUMw4JTIzEkz9Xu1PwTHWf2iweaQ",
  authDomain: "posetracking-14466.firebaseapp.com",
  projectId: "posetracking-14466",
  storageBucket: "posetracking-14466.firebasestorage.app",
  messagingSenderId: "289418519483",
  appId: "1:289418519483:web:8fa29d50fc4c0cea3a1a9e",
  measurementId: "G-NZTY1LJFVL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
