// src/components/BagModal.jsx
import React, { useMemo, useState, useEffect } from 'react';

function groupAndFilterBag(pokemonBag, search, sortOrder) {
  const groupedMap = new Map();

  const bagData = pokemonBag || [];

  bagData.forEach((p) => {
    if (!groupedMap.has(p.speciesId)) {
      groupedMap.set(p.speciesId, { ...p, count: 0 });
    }
    groupedMap.get(p.speciesId).count++;
  });

  let bag = Array.from(groupedMap.values());

  if (search) {
    const lower = search.toLowerCase();
    bag = bag.filter(
      (p) =>
        (p.name && p.name.includes(search)) ||
        (p.word && p.word.toLowerCase().includes(lower)),
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

  const ITEMS_PER_PAGE = 9;

  const { bag, totalCount } = useMemo(
    () => groupAndFilterBag(pokemonBag, search, sortOrder),
    [pokemonBag, search, sortOrder],
  );

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

        <div id="pokedexGrid" className="pokedex-grid">
          {pageItems.map((p) => (
            <div key={p.speciesId} className="poke-card">
              {p.count > 1 && <div className="count-badge">x{p.count}</div>}
              <div className="level-badge">Lv.{p.level || 1}</div>
              <img src={p.img} alt={p.name || '???'} />
              <div className="poke-name">{p.name || '???'}</div>
              <div className="poke-word">{p.word}</div>
            </div>
          ))}
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

        {/* 這顆按鈕暫時先做「關閉」用，截圖功能我們下一小步處理 */}
        <button className="btn-photo" id="btnPhoto" disabled>
          📸 製作戰績卡（下一步改）
        </button>
        <button className="btn-close" id="btnCloseBag" onClick={onClose}>
          關閉
        </button>
      </div>
    </div>
  );
}