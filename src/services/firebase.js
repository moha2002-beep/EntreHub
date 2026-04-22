import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD6vPmYDyV31fVJcFuunf4zQRLW-GMuqAw",
  authDomain: "entrehub-d4b98.firebaseapp.com",
  projectId: "entrehub-d4b98",
  storageBucket: "entrehub-d4b98.firebasestorage.app",
  messagingSenderId: "105985969589",
  appId: "1:105985969589:web:f0508b13a85980ac0a5dfc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
