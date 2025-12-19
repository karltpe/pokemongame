// src/components/BagModal.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import PokemonDetailModal from './PokemonDetailModal';
import html2canvas from 'html2canvas';

// ★ 新增：屬性顏色和名稱映射（與 BattleScene 一致）
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

// ★ 新增：為舊資料補上 types 屬性的快取
const typesCache = new Map();
// ★ 新增：英文名字快取
const englishNameCache = new Map();

// ★ 新增：傳說寶可夢 ID 列表（與 useGameEngine.js 一致）
const LEGENDARY_IDS = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 382, 383, 384, 483, 484, 487, 493];

// ★ 新增：判斷是否為傳說寶可夢
function isLegendary(speciesId) {
  return LEGENDARY_IDS.includes(speciesId);
}

// ★ 新增：從 PokeAPI 獲取屬性（用於補全舊資料）
async function fetchPokemonTypes(speciesId) {
  if (typesCache.has(speciesId)) {
    return typesCache.get(speciesId);
  }
  
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const types = data.types.map(t => t.type.name);
    typesCache.set(speciesId, types);
    return types;
  } catch (e) {
    console.warn('獲取屬性失敗:', e);
    return [];
  }
}

// ★ 新增：從 PokeAPI 獲取英文名字
async function fetchPokemonEnglishName(speciesId) {
  if (englishNameCache.has(speciesId)) {
    return englishNameCache.get(speciesId);
  }
  
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
    if (!res.ok) return null;
    const data = await res.json();
    // 獲取英文名字（預設名字通常是英文）
    const englishName = data.names.find(n => n.language.name === 'en')?.name || data.name;
    englishNameCache.set(speciesId, englishName);
    return englishName;
  } catch (e) {
    console.warn('獲取英文名字失敗:', e);
    return null;
  }
}

function groupAndFilterBag(pokemonBag, search, sortOrder) {
  const groupedMap = new Map();

  const bagData = pokemonBag || [];

  bagData.forEach((p) => {
    if (!groupedMap.has(p.speciesId)) {
      // ★ 修正：如果沒有 types，先設為空陣列（稍後會補上）
      const pokemon = { ...p, count: 0 };
      if (!pokemon.types || !Array.isArray(pokemon.types) || pokemon.types.length === 0) {
        pokemon.types = null; // 標記需要補全
      }
      groupedMap.set(p.speciesId, pokemon);
    }
    groupedMap.get(p.speciesId).count++;
  });

  let bag = Array.from(groupedMap.values());

  if (search) {
    const lower = search.toLowerCase();
    bag = bag.filter(
      (p) =>
        (p.name && p.name.includes(search)),
    );
  }

  if (sortOrder === 'newest') {
    bag.sort((a, b) => new Date(a.caughtDate) - new Date(b.caughtDate));
    bag.reverse();
  } else {
    bag.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return { bag, totalCount: bagData.length };
}

export default function BagModal({ isOpen, onClose, pokemonBag }) {
  // 調試用
  useEffect(() => {
    // console.log('BagModal isOpen:', isOpen, 'pokemonBag length:', pokemonBag?.length || 0);
  }, [isOpen, pokemonBag]);

  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [typesMap, setTypesMap] = useState(new Map()); // ★ 新增：儲存補全的屬性資料
  const [englishNamesMap, setEnglishNamesMap] = useState(new Map()); // ★ 新增：儲存英文名字
  const [selectedPokemon, setSelectedPokemon] = useState(null); // ★ 新增：選中的寶可夢（用於詳細視窗）
  const [isCapturing, setIsCapturing] = useState(false); // ★ 新增：拍照狀態
  const gridRef = useRef(null); // ★ 新增：用於拍照的 ref

  const ITEMS_PER_PAGE = 9;

  const { bag, totalCount } = useMemo(
    () => groupAndFilterBag(pokemonBag, search, sortOrder),
    [pokemonBag, search, sortOrder],
  );

  // ★ 新增：為缺少 types 的寶可夢補上屬性
  useEffect(() => {
    if (!isOpen || bag.length === 0) return;
    
    const missingTypes = bag.filter(p => p.types === null && p.speciesId);
    if (missingTypes.length === 0) return;
    
    // 批量獲取缺少的屬性
    Promise.all(
      missingTypes.map(async (p) => {
        const types = await fetchPokemonTypes(p.speciesId);
        return { speciesId: p.speciesId, types };
      })
    ).then((results) => {
      const newTypesMap = new Map(typesMap);
      results.forEach(({ speciesId, types }) => {
        if (types.length > 0) {
          newTypesMap.set(speciesId, types);
        }
      });
      if (newTypesMap.size > 0) {
        setTypesMap(newTypesMap);
      }
    });
  }, [isOpen, bag]); // ★ 修正：移除 typesMap 依賴，避免無限循環

  // ★ 新增：為所有寶可夢獲取英文名字
  useEffect(() => {
    if (!isOpen || bag.length === 0) return;
    
    // 獲取所有需要英文名字的寶可夢
    const needEnglishNames = bag.filter(p => p.speciesId && !englishNamesMap.has(p.speciesId));
    if (needEnglishNames.length === 0) return;
    
    // 批量獲取英文名字
    Promise.all(
      needEnglishNames.map(async (p) => {
        const englishName = await fetchPokemonEnglishName(p.speciesId);
        return { speciesId: p.speciesId, englishName };
      })
    ).then((results) => {
      const newEnglishNamesMap = new Map(englishNamesMap);
      results.forEach(({ speciesId, englishName }) => {
        if (englishName) {
          newEnglishNamesMap.set(speciesId, englishName);
        }
      });
      if (newEnglishNamesMap.size > 0) {
        setEnglishNamesMap(newEnglishNamesMap);
      }
    });
  }, [isOpen, bag]); // ★ 修正：移除 englishNamesMap 依賴，避免無限循環

  const totalPages = Math.max(1, Math.ceil(bag.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = bag.slice(start, end);

  const handleChangePageInput = (e) => {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value) || value < 1) return;
    setPage(value);
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === 'newest' ? 'az' : 'newest'));
    setPage(1);
  };

  // ★ 新增：拍照當前頁面功能
  const handleCapturePage = async () => {
    if (!gridRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高解析度
        logging: false,
        useCORS: true,
      });
      
      // 轉換為圖片並下載
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const fileName = `我的寶可夢背包_第${safePage}頁_${new Date().getTime()}.png`;
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

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      id="bagModal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(5px)',
      }}
      onClick={(e) => {
        // 點擊背景關閉 modal
        if (e.target.id === 'bagModal') {
          onClose();
        }
      }}
    >
      <div 
        className="modal-content bag-content" 
        id="bagContentArea"
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '20px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflow: 'auto',
          boxShadow: '0 5px 30px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 5px 0', color: '#ff5722' }}>我的寶可夢背包</h3>
        <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
          已收服: <span id="totalCaught">{totalCount}</span> 隻
        </div>

        <div className="bag-tools">
          <input
            type="text"
            id="bagSearch"
            className="bag-search"
            placeholder="搜尋寶可夢..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button className="btn-sort" id="btnSort" onClick={handleToggleSort}>
            排序: {sortOrder === 'newest' ? '最新' : '名稱'}
          </button>
        </div>

        <div id="pokedexGrid" className="pokedex-grid" ref={gridRef}>
          {pageItems.map((p) => {
            // ★ 修正：優先使用補全的 types，否則使用原有的
            const displayTypes = typesMap.get(p.speciesId) || p.types || [];
            const primaryType = displayTypes[0];
            
            const isLegendaryPokemon = isLegendary(p.speciesId);
            
            return (
              <div 
                key={p.speciesId} 
                className="poke-card" 
                style={{ 
                  cursor: 'pointer', 
                  position: 'relative',
                  // ★ 新增：傳說寶可夢特殊背景效果
                  background: isLegendaryPokemon 
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)'
                    : undefined,
                  borderRadius: isLegendaryPokemon ? '12px' : undefined,
                  padding: isLegendaryPokemon ? '4px' : undefined,
                  boxShadow: isLegendaryPokemon 
                    ? '0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)'
                    : undefined,
                  border: isLegendaryPokemon 
                    ? '2px solid #FFD700'
                    : undefined,
                  animation: isLegendaryPokemon 
                    ? 'legendaryGlow 3s ease-in-out infinite'
                    : undefined,
                  overflow: 'hidden', // 確保內容不會超出邊界
                }}
                onClick={(e) => {
                  e.stopPropagation(); // ★ 修正：阻止事件冒泡
                  setSelectedPokemon(p); // ★ 新增：點擊打開詳細視窗
                }}
              >
                {/* ★ 新增：內層容器，確保內容有白色背景（傳說寶可夢時） */}
                <div style={{
                  background: isLegendaryPokemon ? '#fff' : 'transparent',
                  borderRadius: isLegendaryPokemon ? '8px' : '0',
                  padding: isLegendaryPokemon ? '4px' : '0',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  {p.count > 1 && (
                    <div className="count-badge" style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: isLegendaryPokemon ? '#FFD700' : undefined,
                      color: isLegendaryPokemon ? '#000' : undefined,
                      fontWeight: isLegendaryPokemon ? 'bold' : undefined,
                      boxShadow: isLegendaryPokemon ? '0 0 10px rgba(255, 215, 0, 0.8)' : undefined,
                      zIndex: 15, // ★ 修正：確保數量徽章在閃光圖標之上
                    }}>
                      x{p.count}
                    </div>
                  )}
                  <div className="level-badge" style={{
                    background: isLegendaryPokemon ? '#FFD700' : undefined,
                    color: isLegendaryPokemon ? '#000' : undefined,
                    fontWeight: isLegendaryPokemon ? 'bold' : undefined,
                    boxShadow: isLegendaryPokemon ? '0 0 10px rgba(255, 215, 0, 0.8)' : undefined,
                  }}>
                    {isLegendaryPokemon && '⭐ '}Lv.{p.level || 1}
                  </div>
                  <img 
                    src={p.img} 
                    alt={p.name || '???'} 
                    style={{
                      // ★ 修正：根據屬性顯示邊框顏色，傳說寶可夢使用金色邊框
                      border: isLegendaryPokemon
                        ? '3px solid #FFD700'
                        : primaryType 
                          ? `2px solid ${TYPE_COLORS[primaryType] || '#999'}` 
                          : '2px solid #333',
                      borderRadius: '8px',
                      pointerEvents: 'none', // ★ 修正：讓點擊事件穿透到父元素
                      filter: isLegendaryPokemon ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' : 'none',
                    }}
                  />
                  <div 
                    className="poke-name" 
                    style={{ 
                      pointerEvents: 'none',
                      fontWeight: isLegendaryPokemon ? 'bold' : 'normal',
                      color: isLegendaryPokemon ? '#8B4513' : undefined,
                      textShadow: isLegendaryPokemon ? '0 0 5px rgba(255, 215, 0, 0.8)' : undefined,
                    }}
                  >
                    {isLegendaryPokemon && '👑 '}{p.name || '???'}
                  </div>
                  {/* ★ 修正：顯示屬性標籤 */}
                  {displayTypes.length > 0 && (
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2px', pointerEvents: 'none' }}>
                      {displayTypes.map((type, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.65em',
                            padding: '1px 5px',
                            borderRadius: '8px',
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
                  <div className="poke-word" style={{ pointerEvents: 'none', fontStyle: 'italic', color: '#666' }}>
                    {englishNamesMap.get(p.speciesId) || 'Loading...'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {bag.length === 0 && (
          <p id="emptyBagMsg" style={{ color: '#888' }}>
            {search ? '找不到符合的寶可夢。' : '目前還是空的。'}
          </p>
        )}

        {bag.length > 0 && (
          <div className="pagination-controls" id="bagPagination">
            <button
              className="btn-page"
              id="btnPrevPage"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              ❮
            </button>
            <input
              type="number"
              id="pageInput"
              className="page-input"
              value={safePage}
              min="1"
              max={totalPages}
              onChange={handleChangePageInput}
            />
            <span id="totalPagesText">/ {totalPages}</span>
            <button
              className="btn-page"
              id="btnNextPage"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              ❯
            </button>
          </div>
        )}

        {/* ★ 新增：拍照當前頁面功能 */}
        <button 
          className="btn-photo" 
          id="btnPhoto" 
          onClick={handleCapturePage}
          disabled={isCapturing || bag.length === 0}
          style={{
            opacity: isCapturing ? 0.6 : 1,
            cursor: isCapturing ? 'not-allowed' : 'pointer',
          }}
        >
          {isCapturing ? '⏳ 處理中...' : '📸 拍下當前頁面'}
        </button>
        <button className="btn-close" id="btnCloseBag" onClick={onClose}>
          關閉
        </button>
      </div>

      {/* ★ 新增：詳細資訊彈跳視窗 */}
      {selectedPokemon && (
        <PokemonDetailModal
          isOpen={!!selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
          pokemon={selectedPokemon}
        />
      )}
    </div>
  );
}