// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// 跟遊戲預設值對齊
const defaultGameData = {
  pokeBalls: 0,
  pokemonBag: [],
  mistakes: [],
  level: 1,
  exp: 0,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // Firebase 原始使用者
  const [playerData, setPlayerData] = useState(null); // Firestore users 文件內容
  const [loading, setLoading] = useState(true);

  // 封裝 Google 登入
  const loginWithGoogle = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert('登入失敗: ' + error.message);
    }
  };

  // 封裝登出
  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      alert('登出失敗: ' + error.message);
    }
  };

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // 未登入
        console.log('【0】未登入');
        setUser(null);
        setPlayerData(null);
        // 顯示登入畫面
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) {
            loginOverlay.style.display = 'flex';
        }
        
        // 遊戲端還是需要一份預設資料
        window.playerData = { ...defaultGameData };
        setLoading(false);
        return;
      }

      // 已登入
      console.log('【1】登入成功:', fbUser.uid);
      setUser(fbUser);

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        // 暫存到 window，讓 App.jsx 內的 saveCloudData 可用
        window.userRef = userRef;

        console.log('【2】讀取 Firestore 資料...');
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.log('【3-A】新使用者，建立資料...');
          const newUserData = {
            name: fbUser.displayName || '訓練家',
            email: fbUser.email,
            photo: fbUser.photoURL,
            isApproved: false,
            role: 'user',
            ...defaultGameData,
            createdAt: new Date().toISOString(),
          };

          await setDoc(userRef, newUserData);
          alert('註冊成功！請等待審核。');
          await signOut(auth);
          window.location.reload();
          return;
        }

        const data = userSnap.data();
        console.log('【3-B】舊使用者，資料:', data);

        if (!data.isApproved) {
          alert('審核未通過');
          await signOut(auth);
          window.location.reload();
          return;
        }

        // 通過審核的正常流程
        setPlayerData(data);

        // 合併預設值，避免缺欄位
        window.playerData = { ...defaultGameData, ...data };

        // 遊戲引擎若已經定義了 updateUIFromCloud，就幫它刷新一次
        if (typeof window.updateUIFromCloud === 'function') {
        window.updateUIFromCloud();
        }

        // 隱藏登入畫面
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) {
        loginOverlay.style.display = 'none';
        }

        // 觸發 Splash ➜ 再顯示 gameWrapper
        if (typeof window.triggerSplashScreen === 'function') {
        window.triggerSplashScreen();
        }

        setLoading(false);
      } catch (error) {
        console.error('【錯誤】資料讀取失敗:', error);
        alert('連線失敗，請檢查網路。');
        setPlayerData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    playerData,
    loading,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必須在 AuthProvider 裡面使用');
  }
  return ctx;
}