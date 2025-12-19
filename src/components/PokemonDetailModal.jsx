// src/components/PokemonDetailModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { filterEvolutionChainByGeneration, CURRENT_GENERATION } from '../utils/pokemonGenerations';

// 屬性顏色和名稱映射（與 BattleScene、BagModal 一致）
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

// 能力值中文名稱
const STAT_NAMES = {
  hp: 'HP',
  attack: '攻擊',
  defense: '防禦',
  'special-attack': '特攻',
  'special-defense': '特防',
  speed: '速度',
};

export default function PokemonDetailModal({ isOpen, onClose, pokemon }) {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cardRef = useRef(null); // ★ 新增：用於拍照的 ref

  useEffect(() => {
    if (!isOpen || !pokemon) {
      setDetailData(null);
      return;
    }

    // 獲取詳細資訊
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.speciesId}`);
        if (!res.ok) throw new Error('無法獲取寶可夢資料');
        
        const data = await res.json();
        
        // 獲取進化鏈
        let evolutionChain = null;
        try {
          const speciesRes = await fetch(data.species.url);
          if (speciesRes.ok) {
            const speciesData = await speciesRes.json();
            const chainRes = await fetch(speciesData.evolution_chain.url);
            if (chainRes.ok) {
              const rawChain = await chainRes.json();
              // ★ 新增：過濾進化鏈，只保留當前開放世代的寶可夢
              evolutionChain = filterEvolutionChainByGeneration(rawChain, CURRENT_GENERATION);
            }
          }
        } catch (e) {
          console.warn('獲取進化鏈失敗:', e);
        }

        // 獲取招式（前 10 個）
        const moves = data.moves.slice(0, 10).map(m => ({
          name: m.move.name,
          level: m.version_group_details[0]?.level_learned_at || 0,
        }));

        setDetailData({
          types: data.types.map(t => t.type.name),
          stats: data.stats.reduce((acc, stat) => {
            acc[stat.stat.name] = stat.base_stat;
            return acc;
          }, {}),
          height: data.height / 10, // 轉換為公尺
          weight: data.weight / 10, // 轉換為公斤
          abilities: data.abilities.map(a => a.ability.name),
          moves: moves,
          evolutionChain: evolutionChain,
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, pokemon]);

  // ★ 新增：拍照功能
  const handleCapture = async () => {
    if (!cardRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高解析度
        logging: false,
        useCORS: true,
      });
      
      // 轉換為圖片並下載
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const fileName = `${pokemon.name || 'Pokemon'}_戰績卡_${new Date().getTime()}.png`;
      link.download = fileName;
      link.href = imgData;
      link.click();
    } catch (e) {
      console.error('拍照失敗:', e);
      alert('拍照失敗，請稍後再試');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen || !pokemon) return null;

  const displayTypes = detailData?.types || pokemon.types || [];
  const primaryType = displayTypes[0];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 20000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(5px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* ★ 修正：將按鈕移到視窗外側（右邊） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div
          ref={cardRef} // ★ 新增：綁定 ref 用於拍照
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            ×
          </button>

        {/* 標題區域 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#ff5722' }}>
            {pokemon.name || '???'}
          </h2>
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            Lv.{pokemon.level || 1} | {pokemon.word || 'N/A'}
          </div>
        </div>

        {/* 圖片 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img
            src={pokemon.img}
            alt={pokemon.name}
            style={{
              width: '200px',
              height: '200px',
              objectFit: 'contain',
              border: primaryType
                ? `4px solid ${TYPE_COLORS[primaryType] || '#999'}`
                : '4px solid #333',
              borderRadius: '12px',
              boxShadow: primaryType
                ? `0 0 20px ${TYPE_COLORS[primaryType] || '#999'}40`
                : 'none',
            }}
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            載入中...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#f44336' }}>
            錯誤: {error}
          </div>
        )}

        {detailData && !loading && (
          <>
            {/* 屬性 */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                屬性
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {displayTypes.map((type, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.9em',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      background: TYPE_COLORS[type] || '#999',
                      color: '#fff',
                      fontWeight: 'bold',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {TYPE_NAMES[type] || type}
                  </span>
                ))}
              </div>
            </div>

            {/* 能力值 */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                能力值
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.entries(detailData.stats).map(([statName, value]) => (
                  <div
                    key={statName}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: '#f5f5f5',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>
                      {STAT_NAMES[statName] || statName}:
                    </span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 基本資訊 */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                基本資訊
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '6px 12px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <strong>身高:</strong> {detailData.height}m
                </div>
                <div style={{ padding: '6px 12px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <strong>體重:</strong> {detailData.weight}kg
                </div>
              </div>
            </div>

            {/* 特性 */}
            {detailData.abilities.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                  特性
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detailData.abilities.map((ability, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        background: '#e3f2fd',
                        borderRadius: '8px',
                        fontSize: '0.9em',
                      }}
                    >
                      {ability}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 招式 */}
            {detailData.moves.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                  招式（前 10 個）
                </h3>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                >
                  {detailData.moves.map((move, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        marginBottom: '4px',
                        background: 'white',
                        borderRadius: '4px',
                      }}
                    >
                      <span>{move.name}</span>
                      {move.level > 0 && (
                        <span style={{ color: '#666', fontSize: '0.9em' }}>
                          Lv.{move.level}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 進化鏈 */}
            {detailData.evolutionChain && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                  進化鏈
                </h3>
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                  {(() => {
                    const chain = [];
                    let current = detailData.evolutionChain.chain;
                    while (current) {
                      chain.push(current.species.name);
                      current = current.evolves_to?.[0];
                    }
                    return chain.join(' → ');
                  })()}
                </div>
              </div>
            )}
          </>
        )}

          {/* 收服資訊 */}
          {pokemon.caughtDate && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                <strong>收服日期:</strong>{' '}
                {new Date(pokemon.caughtDate).toLocaleDateString('zh-TW')}
              </div>
            </div>
          )}
        </div>

        {/* ★ 修正：拍照按鈕移到視窗外側（右邊） */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignSelf: 'flex-start',
            marginTop: '12px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCapture}
            disabled={isCapturing || loading}
            style={{
              background: isCapturing ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              cursor: isCapturing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {isCapturing ? '⏳ 處理中...' : '📸 製作戰績卡'}
          </button>
        </div>
      </div>
    </div>
  );
}

