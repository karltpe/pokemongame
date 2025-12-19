// src/components/ShopModal.jsx
import React from 'react';
import { useGame } from '../contexts/GameContext';

export default function ShopModal({ isOpen, onClose }) {
  const { pokeBalls, playerHp, playerMaxHp, buyPotion } = useGame();

  if (!isOpen) return null;

  const canBuy = pokeBalls >= 3 && playerHp < playerMaxHp;
  const isFullHp = playerHp >= playerMaxHp;

  return (
    <div
      className="modal-overlay"
      id="shopModal"
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
        if (e.target.id === 'shopModal') {
          onClose();
        }
      }}
    >
      <div
        className="modal-content shop-content"
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '20px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 5px 30px rgba(0,0,0,0.3)',
          border: '4px solid #9c27b0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 10px 0', color: '#9c27b0' }}>寶可夢中心商店</h2>
        <div className="shop-item">
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold' }}>💖 全滿藥</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>回復 1 點生命值</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="shop-price">3 枚金幣</div>
            <button
              className="btn btn-buy"
              onClick={() => {
                if (buyPotion()) {
                  // buyPotion 內部已經處理了音效和訊息
                }
              }}
              disabled={!canBuy}
              style={{
                opacity: canBuy ? 1 : 0.5,
                cursor: canBuy ? 'pointer' : 'not-allowed',
              }}
            >
              {isFullHp ? '體力已滿' : '購買 (3枚金幣)'}
            </button>
          </div>
        </div>
        <button className="btn-close" onClick={onClose}>
          離開
        </button>
      </div>
    </div>
  );
}
