import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAt9vtBVggTyY0fIyIRYB33QqXPOcvMjoE",
  authDomain: "infinity-ai-e26ac.firebaseapp.com",
  projectId: "infinity-ai-e26ac",
  storageBucket: "infinity-ai-e26ac.firebasestorage.app",
  messagingSenderId: "267652675822",
  appId: "1:267652675822:web:8213521b2475564e0f1bff",
  measurementId: "G-QRLCCDRN2E"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
