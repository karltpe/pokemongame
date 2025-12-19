// src/App.jsx
import React from 'react';
import './App.css';
import bagImg from './assets/my-bag.png';
import shopImg from './assets/my-shop.png';
import { useAuth } from './contexts/AuthContext.jsx';
import { useGame } from './contexts/GameContext.jsx';
import useGameEngine from './hooks/useGameEngine';
import BagModal from './components/BagModal.jsx';
import ShopModal from './components/ShopModal.jsx';
import LevelGrid from './components/LevelGrid.jsx';
import BattleScene from './components/BattleScene.jsx';
import ControlPanel from './components/ControlPanel.jsx';

// 預設頭貼 (防止 src 為空字串報錯)
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/188/188987.png";

function App() {

  const { playerData, loading, loginWithGoogle, logout } = useAuth();
  const {
    isShopOpen,
    setIsShopOpen,
    pokeBalls,
    selectedLetters,
    setSelectedLetters,
    mistakes,
  } = useGame();
  const [isBagOpen, setIsBagOpen] = React.useState(false);
  
  useGameEngine();
  
  const handleLevelToggle = React.useCallback((char) => {
    // 檢查是否在戰鬥中
    if (window.isFighting || window.isRevealed) {
      if (!confirm('戰鬥中切換會重置進度，確定嗎？')) return;
      if (window.resetGame) window.resetGame();
    }
    
    // 先更新 window.selectedLetters（useGameEngine 使用這個）
    if (!window.selectedLetters) {
      window.selectedLetters = new Set();
    }
    
    const wasSelected = window.selectedLetters.has(char);
    if (wasSelected) {
      window.selectedLetters.delete(char);
    } else {
      window.selectedLetters.add(char);
    }
    
    // 觸發更新事件，讓 LevelGrid 重新渲染（先觸發，確保視覺更新）
    window.dispatchEvent(new Event('selectedLettersUpdated'));
    
    // 然後同步更新 React 狀態（創建新的 Set 以觸發重新渲染）
    const newSet = new Set(window.selectedLetters);
    setSelectedLetters(newSet);
    
    // 更新按鈕和訊息
    if (window.updateGameContext) {
      if (newSet.size > 0) {
        window.updateGameContext.setActionButtonText('開始');
        window.updateGameContext.setActionButtonDisabled(false);
        window.updateGameContext.setActionButtonBg('#28a745');
        window.updateGameContext.setMessage(`已選 ${Array.from(newSet).join(',')}，按開始！`);
      } else {
        window.updateGameContext.setActionButtonText('請選關卡');
        window.updateGameContext.setActionButtonDisabled(true);
        window.updateGameContext.setActionButtonBg('#ccc');
        window.updateGameContext.setMessage('準備戰鬥！');
      }
    }
  }, [setSelectedLetters]);

  // JSX 渲染部分
  return (
    <div className="app-container">
        
        {/* Login Overlay */}
        <div id="loginOverlay" className="overlay">
            <div className="login-card">
                <div style={{fontSize: '3em', marginBottom: '10px'}}>⚡</div>
                <h2 style={{margin: '0 0 20px 0', color: '#2a75bb'}}>寶可夢單字大冒險</h2>
                <button id="btnGoogleLogin" className="btn-google-login" onClick={loginWithGoogle} >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="24" height="24" alt="Google" />
                    Google 登入
                </button>
                <p style={{marginTop: '20px', color: '#666', fontSize: '0.85em'}}>
                    登入後紀錄冒險進度
                </p>
            </div>
        </div>

        {/* Splash Screen */}
        <div id="splashScreen" style={{ display: 'none' }}>
            <div className="splash-content" id="splashContent">
                <img 
                    id="splashAvatar" 
                    className="splash-avatar" 
                    src={playerData?.photo || DEFAULT_AVATAR} 
                    alt="User Avatar" 
                />
                <h2 id="splashWelcome">
                    歡迎回來，{playerData?.name || '訓練家'}!
                </h2>
                <p style={{color:'#666', fontSize:'0.9em'}}>冒險準備中...</p>
            </div>
        </div>

        {/* Game Wrapper */}
        <div id="gameWrapper" style={{display: 'none'}}>
            <div className="game-frame" id="gameFrame">
            <div className="top-bar">
                <div className="user-profile">
                    <img 
                        id="userAvatar" 
                        className="user-avatar" 
                        src={playerData?.photo || DEFAULT_AVATAR} 
                        alt="Avatar" 
                    />
                    <div style={{display: 'flex', flexDirection: 'column', lineHeight: '1.2'}}>
                        <span id="userNameDisplay" style={{maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '0.9rem'}}>
                            {playerData?.name || '訓練家'}
                        </span>
                        {/* 這裡可以放等級或稱號 */}
                    </div>
                </div>

                <div className="right-controls" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {/* 金幣區 (維持原樣，微調高度配合) */}
                    <div className="currency-box" style={{
                        display: 'flex', 
                        alignItems: 'center', 
                        background: '#FFF8E1', 
                        padding: '0 12px', 
                        borderRadius: '25px', 
                        border: '2px solid #FFC107',
                        boxShadow: '0 3px 0 #FFA000',
                        height: '48px', // 加高一點
                        marginRight: '5px'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD700" stroke="#F57F17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                            <path d="M12 18V6" />
                        </svg>
                        <span id="ballCount" style={{fontWeight: '900', color: '#EF6C00', fontSize: '1.4rem'}}>{pokeBalls}</span>
                    </div>

                    {/* 商店按鈕 - 改用像素圖片 */}
                    <button 
                        className="btn-icon" 
                        id="btnShop" 
                        title="商店" 
                        style={{
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '0',
                            transition: 'transform 0.1s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsShopOpen(true);
                        }}
                    >
                        <img 
                            src={shopImg}
                            alt="商店" 
                            style={{
                                width: '56px', 
                                height: '56px', 
                                filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.2))',
                                pointerEvents: 'none'
                            }} 
                        />
                    </button>

                    {/* 背包按鈕 - 改用像素圖片 */}
                    <button 
                        className="btn-icon" 
                        id="btnBag" 
                        title="背包" 
                        style={{
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '0',
                            transition: 'transform 0.1s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsBagOpen(true);
                        }}
                    >
                        <img 
                            src={bagImg}
                            alt="背包" 
                            style={{
                                width: '56px', 
                                height: '56px', 
                                filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.2))',
                                pointerEvents: 'none'
                            }} 
                        />
                    </button>
                    
                    {/* 登出按鈕 - 加大並換成門的圖案 */}
                    <button id="btnLogout" title="登出" onClick={logout} style={{
                        background: 'none',
                        border: 'none', 
                        cursor: 'pointer',
                        marginLeft: '5px',
                        padding: '0',
                        opacity: '0.8'
                    }}>
                        <img 
                            src="https://cdn-icons-png.flaticon.com/128/3580/3580175.png" 
                            alt="登出" 
                            style={{width: '45px', height: '45px'}} 
                        />
                    </button>
                </div>
            </div>

                <LevelGrid
                    onLevelToggle={handleLevelToggle}
                    selectedLetters={selectedLetters}
                    mistakes={mistakes}
                />

                <BattleScene />

                <ControlPanel />
            </div>
        </div>

        {/* Shop Modal */}
        <ShopModal
            isOpen={isShopOpen}
            onClose={() => setIsShopOpen(false)}
        />

        {/* Bag Modal */}
        <BagModal
            isOpen={isBagOpen}
            onClose={() => setIsBagOpen(false)}
            pokemonBag={playerData?.pokemonBag || window.playerData?.pokemonBag || []}
        />

    </div>
  );
}

export default App;