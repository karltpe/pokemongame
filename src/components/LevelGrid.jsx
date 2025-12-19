// src/components/LevelGrid.jsx
import React, { useState, useEffect, useMemo } from 'react';

export default function LevelGrid({ onLevelToggle, selectedLetters, mistakes }) {
  const [letters, setLetters] = useState([]);

  useEffect(() => {
    // 初始化 A-Z 按鈕
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    setLetters(abc);
  }, []);

  const mistakeSet = new Set((mistakes || []).map((m) => m.charAt(0).toUpperCase()));
  
  // 監聽 window.selectedLetters 的變化（透過自訂事件）
  const [updateTrigger, setUpdateTrigger] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleUpdate = () => {
      setUpdateTrigger((prev) => prev + 1);
    };
    window.addEventListener('selectedLettersUpdated', handleUpdate);
    return () => {
      window.removeEventListener('selectedLettersUpdated', handleUpdate);
    };
  }, []);
  
  // 確保 selectedLetters 是 Set 類型，並從 window.selectedLetters 同步
  // 使用 updateTrigger 作為依賴，確保當事件觸發時重新計算
  const selectedSet = useMemo(() => {
    // 優先使用 window.selectedLetters（這是真實來源）
    if (typeof window !== 'undefined' && window.selectedLetters instanceof Set) {
      return window.selectedLetters;
    }
    // 其次使用 props 傳入的
    if (selectedLetters instanceof Set) {
      return selectedLetters;
    }
    if (Array.isArray(selectedLetters)) {
      return new Set(selectedLetters);
    }
    return new Set();
  }, [selectedLetters, updateTrigger]);

  return (
    <div className="level-grid" id="levelGrid">
      {letters.map((char) => {
        const isActive = selectedSet.has(char);
        const hasReview = mistakeSet.has(char);
        
        return (
          <div
            key={char}
            className={`lvl-btn ${isActive ? 'active' : ''} ${hasReview ? 'has-review' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onLevelToggle) {
                onLevelToggle(char);
              }
              // 同時觸發音效
              if (window.SFX?.btn) window.SFX.btn();
            }}
            style={{
              cursor: 'pointer',
              backgroundColor: isActive ? 'var(--primary-color)' : '#fff',
              color: isActive ? '#333' : 'var(--secondary-color)',
              borderColor: isActive ? '#333' : 'var(--secondary-color)',
              fontWeight: isActive ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {char}
          </div>
        );
      })}
    </div>
  );
}
