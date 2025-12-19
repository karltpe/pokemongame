// src/components/ControlPanel.jsx
import React, { useRef, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';

export default function ControlPanel() {
  const {
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
    message,
    messageColor,
    currentEnemy,
    setInputValue,
  } = useGame();

  const inputRef = useRef(null);

  // 當輸入框啟用時自動聚焦
  useEffect(() => {
    if (!isInputDisabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputDisabled]);

  const handleInputKeyUp = (e) => {
    if (e.key === 'Enter' && !actionButtonDisabled && window.el?.btnAction) {
      window.el.btnAction.click();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // ★ 修正：確保打字音效正常觸發
    if (window.SFX?.type) {
      window.SFX.type();
    }
  };

  const handleVoiceWord = () => {
    // console.log('🔊 單字按鈕點擊', { 
    //   hasCurrentEnemy: !!currentEnemy, 
    //   word: currentEnemy?.word,
    //   hasSpeak: !!window.speak 
    // });
    if (currentEnemy?.word && window.speak) {
      window.speak(currentEnemy.word);
    } else {
      // console.warn('❌ 無法播放語音:', { 
      //   hasCurrentEnemy: !!currentEnemy, 
      //   word: currentEnemy?.word,
      //   hasSpeak: !!window.speak 
      // });
    }
  };

  const handleVoiceSent = () => {
    // console.log('🔊 例句按鈕點擊', { 
    //   hasCurrentEnemy: !!currentEnemy, 
    //   sentence: currentEnemy?.sentence,
    //   hasSpeak: !!window.speak 
    // });
    if (currentEnemy?.sentence && window.speak) {
      window.speak(currentEnemy.sentence);
    } else {
      // console.warn('❌ 無法播放語音:', { 
      //   hasCurrentEnemy: !!currentEnemy, 
      //   sentence: currentEnemy?.sentence,
      //   hasSpeak: !!window.speak 
      // });
    }
  };

  return (
    <div className="control-panel">
      {/* 題目區域 */}
      <div className="question-box" id="questionBox">
        <div 
          id="qText" 
          className="q-word"
          dangerouslySetInnerHTML={{ __html: questionText }}
        />
        <div id="qHint" className="q-hint">
          {questionHint}
        </div>
      </div>

      {/* 輸入區域 */}
      <div className="input-area">
        <input
          ref={inputRef}
          type="text"
          id="userInput"
          placeholder={inputPlaceholder}
          disabled={isInputDisabled}
          autoComplete="off"
          autoCapitalize="off"
          value={inputValue}
          onChange={handleInputChange}
          onKeyUp={handleInputKeyUp}
        />
      </div>

      {/* 按鈕組 */}
      <div className="input-area btn-group">
        <button
          className="btn btn-atk"
          id="btnAction"
          disabled={actionButtonDisabled}
          style={{ 
            background: actionButtonBg || '#ccc',
            color: actionButtonDisabled ? '#999' : '#fff',
            cursor: actionButtonDisabled ? 'not-allowed' : 'pointer',
            minWidth: '100px',
            padding: '8px 16px',
            fontSize: '1em',
            fontWeight: 'bold',
            opacity: actionButtonDisabled ? 0.6 : 1,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 即使 disabled，也記錄點擊事件（用於調試）
            // console.log('【按鈕點擊】', {
            //   actionButtonDisabled,
            //   actionButtonText,
            //   isFighting: window.isFighting,
            //   isRevealed: window.isRevealed,
            //   hasInitBattle: !!window.initBattle,
            // });
            
            if (actionButtonDisabled) {
              // console.log('❌ 按鈕已禁用，忽略點擊');
              return;
            }
            
            // 觸發音效
            if (window.SFX?.btn) window.SFX.btn();
            
            // 直接調用邏輯函數（不依賴 DOM click 事件）
            // 因為 React 渲染的元素可能沒有正確綁定 onclick
            // console.log('🔧 直接調用邏輯函數');
            
            try {
              if (window.initBattle && !window.isFighting && !window.isRevealed) {
                // console.log('✅ 調用 initBattle');
                window.initBattle();
              } else if (window.playerAttack && window.isFighting) {
                // console.log('✅ 調用 playerAttack');
                window.playerAttack();
              } else if (window.isRevealed) {
                // console.log('✅ 調用 nextEnemy 或 loadNextQuestion');
                if (window.isBossRound && window.enemyCurrentHp > 0 && window.loadNextQuestion) {
                  window.loadNextQuestion();
                } else if (window.nextEnemy) {
                  window.nextEnemy();
                }
              } else {
                // console.log('❌ 沒有匹配的動作，當前狀態:', {
                //   hasInitBattle: !!window.initBattle,
                //   isFighting: window.isFighting,
                //   isRevealed: window.isRevealed,
                //   selectedLettersSize: window.selectedLetters?.size || 0,
                // });
              }
            } catch (err) {
              // console.error('❌ 調用遊戲函數失敗:', err);
            }
          }}
        >
          {actionButtonText || '請選關卡'}
        </button>
        <button 
          className="btn btn-run" 
          id="btnRun" 
          disabled={runButtonDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (runButtonDisabled) return;
            
            // 觸發音效
            if (window.SFX?.error) window.SFX.error();
            
            // 調用逃跑函數
            if (window.runAway) {
              window.runAway();
            }
          }}
        >
          逃跑
        </button>
      </div>

      {/* 語音控制 */}
      <div className="voice-controls">
        <button
          className="btn btn-voice"
          id="btnVoiceWord"
          disabled={voiceButtonsDisabled}
          onClick={handleVoiceWord}
        >
          🔊 單字
        </button>
        <button
          className="btn btn-voice"
          id="btnVoiceSent"
          disabled={voiceButtonsDisabled}
          onClick={handleVoiceSent}
        >
          🔊 例句
        </button>
        <input
          type="range"
          id="rateSlider"
          min="0.5"
          max="1.5"
          step="0.1"
          defaultValue="1.0"
          title="語速"
          style={{ width: '70px' }}
        />
      </div>

      {/* 訊息框 */}
      <div className="msg-box" id="msgBox" style={{ color: messageColor }}>
        {message}
      </div>
    </div>
  );
}
