// src/contexts/GameContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  // 遊戲狀態
  const [pokeBalls, setPokeBalls] = useState(0);
  const [playerHp, setPlayerHp] = useState(3);
  const [playerMaxHp, setPlayerMaxHp] = useState(3);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerExp, setPlayerExp] = useState(0);
  
  // 戰鬥狀態
  const [enemyCurrentHp, setEnemyCurrentHp] = useState(1);
  const [enemyMaxHp, setEnemyMaxHp] = useState(1);
  const [enemyName, setEnemyName] = useState('野生怪獸');
  const [enemyImgUrl, setEnemyImgUrl] = useState('');
  const [isBossRound, setIsBossRound] = useState(false);
  
  // UI 狀態
  const [message, setMessage] = useState('準備戰鬥！');
  const [messageColor, setMessageColor] = useState('#333');
  const [isShopOpen, setIsShopOpen] = useState(false);
  
  // 戰鬥 UI 狀態
  const [questionText, setQuestionText] = useState('請先選擇上方關卡');
  const [questionHint, setQuestionHint] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [inputPlaceholder, setInputPlaceholder] = useState('請點此輸入...');
  const [isInputDisabled, setIsInputDisabled] = useState(true);
  
  // 按鈕狀態
  const [actionButtonText, setActionButtonText] = useState('請選關卡');
  const [actionButtonDisabled, setActionButtonDisabled] = useState(true);
  const [actionButtonBg, setActionButtonBg] = useState('#ccc');
  const [runButtonDisabled, setRunButtonDisabled] = useState(true);
  const [voiceButtonsDisabled, setVoiceButtonsDisabled] = useState(true);
  
  // 確保按鈕文字有預設值（防止空白）
  useEffect(() => {
    if (!actionButtonText) {
      setActionButtonText('請選關卡');
    }
  }, [actionButtonText]);
  
  // 關卡選擇 - 使用 useRef 來保持 Set 的穩定引用
  const selectedLettersRef = useRef(new Set());
  const [selectedLetters, setSelectedLetters] = useState(() => {
    // 初始化時從 window.selectedLetters 獲取（如果存在）
    if (typeof window !== 'undefined' && window.selectedLetters instanceof Set) {
      selectedLettersRef.current = window.selectedLetters;
      return window.selectedLetters;
    }
    return selectedLettersRef.current;
  });
  
  // 包裝 setSelectedLetters 以同時更新 ref
  const updateSelectedLetters = useCallback((newSet) => {
    selectedLettersRef.current = newSet;
    setSelectedLetters(newSet);
    // 同步到 window
    if (typeof window !== 'undefined') {
      window.selectedLetters = newSet;
    }
  }, []);
  
  // 初始化時同步 window.selectedLetters
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.selectedLetters) {
      window.selectedLetters = selectedLettersRef.current;
    }
  }, []);
  
  // 當前敵人資訊（用於語音）
  const [currentEnemy, setCurrentEnemy] = useState(null);
  
  // Mistakes（錯誤單字列表）
  const [mistakes, setMistakes] = useState([]);

  // 從 window.playerData 同步資料
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const syncData = () => {
      if (window.playerData) {
        setPokeBalls(window.playerData.pokeBalls || 0);
        setPlayerLevel(window.playerData.level || 1);
        setPlayerExp(window.playerData.exp || 0);
        setMistakes(window.playerData.mistakes || []);
      }
    };

    syncData();
    
    // 監聽 window.playerData 的變化（透過自訂事件）
    const handleDataUpdate = () => syncData();
    window.addEventListener('playerDataUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('playerDataUpdated', handleDataUpdate);
    };
  }, [setMistakes]);
  
  // 暴露更新函數到 window，讓 useGameEngine 可以調用
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.updateGameContext = {
      setPokeBalls,
      setPlayerHp,
      setPlayerMaxHp,
      setPlayerLevel,
      setPlayerExp,
      setEnemyCurrentHp,
      setEnemyMaxHp,
      setEnemyName,
      setEnemyImgUrl,
      setIsBossRound,
      setMessage,
      setMessageColor,
      setQuestionText,
      setQuestionHint,
      setInputValue,
      setInputPlaceholder,
      setIsInputDisabled,
      setActionButtonText,
      setActionButtonDisabled,
      setActionButtonBg,
      setRunButtonDisabled,
      setVoiceButtonsDisabled,
      setSelectedLetters,
      setCurrentEnemy,
      setMistakes,
    };
    
    // 暴露獲取當前狀態的函數，讓 useGameEngine 可以同步讀取
    window.getGameState = () => ({
      playerHp,
      playerMaxHp,
      playerLevel,
      playerExp,
      pokeBalls,
      enemyCurrentHp,
      enemyMaxHp,
      enemyName,
      enemyImgUrl,
      isBossRound,
    });
    
    return () => {
      delete window.updateGameContext;
      delete window.getGameState;
    };
  }, [
    setPokeBalls,
    setPlayerHp,
    setPlayerMaxHp,
    setPlayerLevel,
    setPlayerExp,
    setEnemyCurrentHp,
    setEnemyMaxHp,
    setEnemyName,
    setEnemyImgUrl,
    setIsBossRound,
    setMessage,
    setMessageColor,
    setQuestionText,
    setQuestionHint,
    setInputValue,
    setInputPlaceholder,
    setIsInputDisabled,
    setActionButtonText,
    setActionButtonDisabled,
    setActionButtonBg,
    setRunButtonDisabled,
    setVoiceButtonsDisabled,
    setSelectedLetters,
    setCurrentEnemy,
    setMistakes,
    playerHp,
    playerMaxHp,
    playerLevel,
    playerExp,
    pokeBalls,
    enemyCurrentHp,
    enemyMaxHp,
    enemyName,
    enemyImgUrl,
    isBossRound,
  ]);

  // 更新 window.playerData 的輔助函數
  const updatePlayerData = (updates) => {
    if (typeof window !== 'undefined' && window.playerData) {
      Object.assign(window.playerData, updates);
      window.dispatchEvent(new Event('playerDataUpdated'));
    }
  };

  // 購買藥水
  const buyPotion = () => {
    if (pokeBalls >= 3 && playerHp < playerMaxHp) {
      const newPokeBalls = pokeBalls - 3;
      const newPlayerHp = Math.min(playerHp + 1, playerMaxHp);
      
      setPokeBalls(newPokeBalls);
      setPlayerHp(newPlayerHp);
      updatePlayerData({ pokeBalls: newPokeBalls });
      
      // ★ 修正：同步更新 useGameEngine 中的局部變數 playerHp
      // 這樣戰鬥中扣血時能使用正確的血量值
      if (typeof window !== 'undefined' && window.syncPlayerHp) {
        window.syncPlayerHp(newPlayerHp, playerMaxHp);
      }
      
      if (typeof window !== 'undefined' && window.saveCloudData) {
        window.saveCloudData('ball_use');
      }
      
      setMessage('💖 體力恢復！');
      setMessageColor('#e91e63');
      
      if (typeof window !== 'undefined' && window.SFX?.heal) window.SFX.heal();
      
      return true;
    } else if (playerHp >= playerMaxHp) {
      alert('體力已經滿了！');
      return false;
    } else {
      alert('金幣不夠喔！');
      return false;
    }
  };

  const value = {
    // 狀態
    pokeBalls,
    playerHp,
    playerMaxHp,
    playerLevel,
    playerExp,
    enemyCurrentHp,
    enemyMaxHp,
    enemyName,
    enemyImgUrl,
    isBossRound,
    message,
    messageColor,
    isShopOpen,
    
    // UI 狀態
    questionText,
    questionHint,
    inputValue,
    inputPlaceholder,
    isInputDisabled,
    actionButtonText,
    actionButtonDisabled,
    actionButtonBg,
    runButtonDisabled,
    voiceButtonsDisabled,
    selectedLetters,
    currentEnemy,
    mistakes,
    
    // Setters
    setPokeBalls,
    setPlayerHp,
    setPlayerMaxHp,
    setPlayerLevel,
    setPlayerExp,
    setEnemyCurrentHp,
    setEnemyMaxHp,
    setEnemyName,
    setEnemyImgUrl,
    setIsBossRound,
    setMessage,
    setMessageColor,
    setIsShopOpen,
    
    // UI Setters
    setQuestionText,
    setQuestionHint,
    setInputValue,
    setInputPlaceholder,
    setIsInputDisabled,
    setActionButtonText,
    setActionButtonDisabled,
    setActionButtonBg,
    setRunButtonDisabled,
    setVoiceButtonsDisabled,
    setSelectedLetters: updateSelectedLetters,
    setCurrentEnemy,
    setMistakes,
    
    // Actions
    buyPotion,
    updatePlayerData,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame 必須在 GameProvider 裡面使用');
  }
  return ctx;
}
