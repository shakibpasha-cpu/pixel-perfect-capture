
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBo7YtVfVKmZFLcUMPFutrge9b46qSzK3g",
  authDomain: "companiesgenius-pro.firebaseapp.com",
  projectId: "companiesgenius-pro",
  storageBucket: "companiesgenius-pro.firebasestorage.app",
  messagingSenderId: "250613593536",
  appId: "1:250613593536:web:c9d0295029dfc3e7468425"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
