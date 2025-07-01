import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBaY5uq9kIEFjfr9cIEYOzTT4TykRdui-c",
  authDomain: "boardgames-cf5a1.firebaseapp.com",
  projectId: "boardgames-cf5a1",
  storageBucket: "boardgames-cf5a1.firebasestorage.app",
  messagingSenderId: "764257197121",
  appId: "1:764257197121:web:b80d24917356f51ab47ac0",
  measurementId: "G-9PS0XW6GQ3",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
