// src/components/BattleScene.jsx
import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

// ★ 新增：屬性顏色映射
const TYPE_COLORS = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

// ★ 新增：屬性中文名稱映射
const TYPE_NAMES = {
  normal: '一般',
  fire: '火',
  water: '水',
  electric: '電',
  grass: '草',
  ice: '冰',
  fighting: '格鬥',
  poison: '毒',
  ground: '地面',
  flying: '飛行',
  psychic: '超能力',
  bug: '蟲',
  rock: '岩石',
  ghost: '幽靈',
  dragon: '龍',
  dark: '惡',
  steel: '鋼',
  fairy: '妖精',
};

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
    enemyTypes,
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
        {/* ★ 新增：屬性標籤 */}
        {enemyTypes && enemyTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
            {enemyTypes.map((type, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.7em',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: TYPE_COLORS[type] || '#999',
                  color: '#fff',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.3)',
                }}
              >
                {TYPE_NAMES[type] || type}
              </span>
            ))}
          </div>
        )}
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
            // ★ 新增：根據主要屬性顯示邊框顏色
            border: enemyTypes && enemyTypes.length > 0 
              ? `3px solid ${TYPE_COLORS[enemyTypes[0]] || '#999'}` 
              : '3px solid #333',
            borderRadius: '10px',
            boxShadow: enemyTypes && enemyTypes.length > 0
              ? `0 0 10px ${TYPE_COLORS[enemyTypes[0]] || '#999'}40`
              : 'none',
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
