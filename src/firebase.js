// src/firebase.js
import { initializeApp } from "firebase/app";
// 如果你有用 auth 或 firestore，也要 import 進來
import { getAuth } from "firebase/auth"; 
// import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  // 如果你的舊 config 還有 storageBucket 等等，也要加進來，記得都要用 VITE_ 變數
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // 匯出 auth 讓其他檔案用
// export const db = getFirestore(app);

console.log("Firebase 初始化成功！"); // 測試用，之後可以刪掉

export default app;