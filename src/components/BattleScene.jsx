// src/components/BattleScene.jsx
import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

export default function BattleScene() {
  const {
    playerHp,
    playerMaxHp,
    playerLevel,
    playerExp,
    enemyCurrentHp,
    enemyMaxHp,
    enemyName,
    enemyImgUrl,
    isBossRound,
  } = useGame();
  const { playerData } = useAuth();

  const getMaxExp = (lvl) => lvl * 100;
  const maxExp = getMaxExp(playerLevel);
  const expPct = maxExp > 0 ? (playerExp / maxExp) * 100 : 0;
  
  // ★ 修正：確保百分比計算正確，並限制在 0-100 之間
  const playerHpPct = playerMaxHp > 0 
    ? Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100)) 
    : 0;
  const enemyHpPct = enemyMaxHp > 0 
    ? Math.max(0, Math.min(100, (enemyCurrentHp / enemyMaxHp) * 100)) 
    : 0;

  // ★ 修正：顏色邏輯 - 確保百分比正確時顯示對應顏色
  // > 50%: 綠色, 20-50%: 黃色, < 20%: 紅色
  const hpBarColor = playerHpPct > 50 
    ? 'hp-green' 
    : playerHpPct > 20 
      ? 'hp-yellow' 
      : 'hp-red';
  
  // 調試信息（已註釋）
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('血條狀態:', {
  //     playerHp,
  //     playerMaxHp,
  //     playerHpPct: playerHpPct.toFixed(2) + '%',
  //     hpBarColor,
  //   });
  // }

  return (
    <div className="battle-scene" id="battleScene">
      {/* 敵人 HUD */}
      <div className="hp-box enemy-hud">
        <div className="hp-label">
          <span id="enemyName">{enemyName}</span>{' '}
          <span id="enemyHpText">
            {enemyCurrentHp}/{enemyMaxHp}
          </span>
        </div>
        <div className="hp-bar-bg">
          <div
            className={`hp-bar-fill ${isBossRound ? 'hp-purple' : 'hp-red'}`}
            id="enemyHpBar"
            style={{ width: `${enemyHpPct}%` }}
          />
        </div>
      </div>
      <div className="enemy-pos">
        <div
          className="enemy-img"
          id="enemyImg"
          style={{
            backgroundImage: enemyImgUrl ? `url('${enemyImgUrl}')` : 'none',
            filter: enemyCurrentHp <= 0 ? 'brightness(0) opacity(0.5)' : 'none',
          }}
        />
      </div>

      {/* 玩家 HUD */}
      <div className="hp-box player-hud">
        <div className="hp-label">
          <span id="playerName">{playerData?.name || '訓練家'}</span>{' '}
          <span id="playerLevelText" style={{ color: 'var(--secondary-color)' }}>
            Lv.{playerLevel}
          </span>
        </div>
        <div className="hp-bar-bg">
          <div
            className={`hp-bar-fill ${hpBarColor}`}
            id="playerHpBar"
            style={{ width: `${playerHpPct}%` }}
          />
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            background: '#ddd',
            borderRadius: '2px',
            marginTop: '2px',
          }}
        >
          <div
            id="playerExpBar"
            style={{
              height: '100%',
              width: `${expPct}%`,
              background: '#00bcd4',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
      <div className="player-pos">
        <div className="player-img" id="playerImg" />
      </div>
    </div>
  );
}
