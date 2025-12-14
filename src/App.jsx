// src/App.jsx
import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, initializeFirestore } from 'firebase/firestore';
import './App.css';

// --- 1. Firebase 設定與初始化 ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 初始化變數
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // ★ 關鍵修復：強制使用長輪詢 (Long Polling) 解決網路卡頓/防火牆問題
  db = initializeFirestore(app, { experimentalForceLongPolling: true }); 
} catch (e) {
  console.warn("Firebase 初始化警告 (可能是重複呼叫):", e);
}

// 預設頭貼 (防止 src 為空字串報錯)
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/188/188987.png";

function App() {
  const initialized = useRef(false);
  
  // React State: 專門負責 UI 顯示 (名字、頭貼、Loading 狀態)
  const [playerData, setPlayerData] = useState(null);
  
  // 用來判斷是否正在載入資料 (避免畫面閃爍)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 防止 React Strict Mode 執行兩次
    if (initialized.current) return;
    initialized.current = true;

    // --- 遊戲引擎邏輯 (Legacy Logic) ---
    
    // 定義全域變數預設值
    const defaultGameData = { 
        pokeBalls: 0, 
        pokemonBag: [], 
        mistakes: [], 
        level: 1, 
        exp: 0 
    };
    // 初始化 window.playerData，防止未登入時報錯
    window.playerData = { ...defaultGameData };
    
    const GITHUB_JSON_URL = 'https://raw.githubusercontent.com/karltpe/MikeEnglishTest/main/word_ad.json';
    const LEGENDARY_IDS = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 382, 383, 384, 483, 484, 487, 493];
    const getMaxExp = (lvl) => lvl * 100;
    const ITEMS_PER_PAGE = 9;

    // 遊戲內部變數
    let currentBagPage = 1;
    let bagSortOrder = 'newest'; 
    let bagSearchTerm = '';
    let wordList = [], battleQueue = [], currentEnemy = null;
    let currentEnemyImgUrl = '', currentEnemyName = '', currentEnemyId = 0;
    let selectedLetters = new Set();
    let playerMaxHp = 3, playerHp = 3, stageCount = 0;
    let enemyMaxHp = 1, enemyCurrentHp = 1, isBossRound = false;
    let isFighting = false, isRevealed = false;
    let userRef = null;

    // 綁定 DOM 元素 (僅綁定遊戲操作相關，UI顯示交給 React State)
    const el = {
        levelGrid: document.getElementById('levelGrid'),
        enemyHpBar: document.getElementById('enemyHpBar'), enemyHpText: document.getElementById('enemyHpText'), enemyName: document.getElementById('enemyName'),
        playerHpBar: document.getElementById('playerHpBar'), playerHpText: document.getElementById('playerHpText'),
        playerExpBar: document.getElementById('playerExpBar'), playerLevelText: document.getElementById('playerLevelText'),
        enemyImg: document.getElementById('enemyImg'), playerImg: document.getElementById('playerImg'),
        questionBox: document.getElementById('questionBox'), qText: document.getElementById('qText'), qHint: document.getElementById('qHint'),
        input: document.getElementById('userInput'),
        btnAction: document.getElementById('btnAction'), btnRun: document.getElementById('btnRun'),
        btnVoiceWord: document.getElementById('btnVoiceWord'), btnVoiceSent: document.getElementById('btnVoiceSent'),
        msgBox: document.getElementById('msgBox'), scene: document.getElementById('battleScene'),
        gameFrame: document.getElementById('gameFrame'), ballCount: document.getElementById('ballCount'),
        btnShop: document.getElementById('btnShop'), shopModal: document.getElementById('shopModal'),
        btnBuyPotion: document.getElementById('btnBuyPotion'), btnCloseShop: document.getElementById('btnCloseShop'),
        btnBag: document.getElementById('btnBag'), bagModal: document.getElementById('bagModal'),
        pokedexGrid: document.getElementById('pokedexGrid'), emptyBagMsg: document.getElementById('emptyBagMsg'),
        btnPhoto: document.getElementById('btnPhoto'), btnCloseBag: document.getElementById('btnCloseBag'),
        bagContentArea: document.getElementById('bagContentArea'),
        totalCaught: document.getElementById('totalCaught'),
        rateSlider: document.getElementById('rateSlider'),
        bagPagination: document.getElementById('bagPagination'),
        btnPrevPage: document.getElementById('btnPrevPage'),
        btnNextPage: document.getElementById('btnNextPage'),
        pageInput: document.getElementById('pageInput'),
        totalPagesText: document.getElementById('totalPagesText'),
        bagSearch: document.getElementById('bagSearch'),
        btnSort: document.getElementById('btnSort'),
        loginOverlay: document.getElementById('loginOverlay'),
        gameWrapper: document.getElementById('gameWrapper'),
        btnGoogleLogin: document.getElementById('btnGoogleLogin'),
        btnLogout: document.getElementById('btnLogout'),
        splashScreen: document.getElementById('splashScreen'),
    };

    // 音效系統
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(freq, type, duration, vol=0.1) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
    }
    const SFX = {
        attack: () => { playTone(600, 'sawtooth', 0.1); setTimeout(() => playTone(300, 'square', 0.1), 100); },
        hit: () => { playTone(100, 'sawtooth', 0.3); },
        error: () => { playTone(150, 'sawtooth', 0.2); setTimeout(() => playTone(100, 'sawtooth', 0.2), 150); },
        win: () => { playTone(400, 'sine', 0.1); setTimeout(() => playTone(500, 'sine', 0.1), 150); setTimeout(() => playTone(600, 'sine', 0.2), 300); },
        coin: () => { playTone(1000, 'sine', 0.1); setTimeout(() => playTone(1500, 'sine', 0.2), 100); }, 
        heal: () => { playTone(400, 'sine', 0.2); setTimeout(() => playTone(600, 'sine', 0.3), 200); },
        levelup: () => { playTone(300, 'square', 0.1); setTimeout(() => playTone(400, 'square', 0.1), 100); setTimeout(() => playTone(500, 'square', 0.3), 200); },
        camera: () => { playTone(800, 'square', 0.1); },
        type: () => { playTone(800, 'triangle', 0.05, 0.05); },
        start: () => { playTone(300, 'square', 0.1); setTimeout(() => playTone(600, 'square', 0.3), 100); },
        bossStart: () => { playTone(100, 'sawtooth', 0.5); setTimeout(() => playTone(80, 'sawtooth', 0.5), 400); },
        btn: () => { playTone(400, 'sine', 0.1, 0.05); }
    };

    // 輔助函式
    const pokemonNameCache = {};
    async function fetchPokemonName(id) {
        if (pokemonNameCache[id]) return pokemonNameCache[id];
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
            if(!res.ok) return "未知寶可夢";
            const data = await res.json();
            const nameObj = data.names.find(n => n.language.name === 'zh-Hant');
            const name = nameObj ? nameObj.name : data.name;
            pokemonNameCache[id] = name;
            return name;
        } catch(e) { return "神秘怪獸"; }
    }

    function getRandomPokemonId(isBoss) {
        let id;
        // ★ 安全修復：確保 pokemonBag 存在
        const bag = window.playerData.pokemonBag || [];
        const ownedIds = new Set(bag.map(p => p.speciesId));
        
        let foundNew = false;
        for(let i=0; i<15; i++) { 
             if (isBoss) id = LEGENDARY_IDS[Math.floor(Math.random() * LEGENDARY_IDS.length)];
             else do { id = Math.floor(Math.random() * 800) + 1; } while (LEGENDARY_IDS.includes(id));
             if(!ownedIds.has(id)) { foundNew = true; break; }
        }
        if(!foundNew || !id) id = Math.floor(Math.random() * 800) + 1;
        return id;
    }

    function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
    
    function speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            u.rate = parseFloat(el.rateSlider?.value || 1.0); // 安全讀取
            window.speechSynthesis.speak(u);
        }
    }

    // UI 更新函式 (★ 修正：加入防呆機制)
    window.updateUIFromCloud = () => {
        if(el.ballCount) el.ballCount.textContent = window.playerData.pokeBalls;
        renderBag();
        updateStats();
        
        // ★ 安全修復：確保 mistakes 存在
        const mistakes = window.playerData.mistakes || [];
        const mistakeSet = new Set(mistakes.map(m => m.charAt(0).toUpperCase()));
        
        document.querySelectorAll('.lvl-btn').forEach(btn => {
            if (mistakeSet.has(btn.textContent)) btn.classList.add('has-review');
            else btn.classList.remove('has-review');
        });
    };

    function updateStats() {
        const ePct = (enemyCurrentHp / enemyMaxHp) * 100;
        
        // ★ 安全修復：檢查 DOM 是否存在 (防止 Cannot set properties of null)
        if (el.enemyHpBar) el.enemyHpBar.style.width = ePct + "%";
        if (el.enemyHpText) el.enemyHpText.textContent = `${enemyCurrentHp}/${enemyMaxHp}`;
        
        const pPct = (playerHp / playerMaxHp) * 100;
        if (el.playerHpBar) {
            el.playerHpBar.style.width = pPct + "%";
            el.playerHpBar.className = "hp-bar-fill " + (pPct > 50 ? "hp-green" : pPct > 20 ? "hp-yellow" : "hp-red");
        }
        if (el.playerHpText) el.playerHpText.textContent = `${playerHp}/${playerMaxHp}`;
        
        const maxExp = getMaxExp(window.playerData.level);
        const expPct = (window.playerData.exp / maxExp) * 100;
        
        if (el.playerExpBar) el.playerExpBar.style.width = expPct + "%";
        if (el.playerLevelText) el.playerLevelText.textContent = `Lv.${window.playerData.level}`;
        if (el.ballCount) el.ballCount.textContent = window.playerData.pokeBalls;
    }

    function updateShopUI() {
        if (!el.btnBuyPotion) return;
        el.btnBuyPotion.textContent = (playerHp >= playerMaxHp) ? "體力已滿" : "購買 (3球)";
        el.btnBuyPotion.disabled = (playerHp >= playerMaxHp || window.playerData.pokeBalls < 3);
    }

    function renderBag() {
        const groupedMap = new Map();
        
        // ★ 安全修復：防止 pokemonBag 是 undefined 導致 forEach 崩潰
        const bagData = window.playerData.pokemonBag || [];

        bagData.forEach(p => {
            if (!groupedMap.has(p.speciesId)) groupedMap.set(p.speciesId, { ...p, count: 0 });
            groupedMap.get(p.speciesId).count++;
        });
        
        let bag = Array.from(groupedMap.values());
        if (bagSearchTerm) {
            bag = bag.filter(p => (p.name && p.name.includes(bagSearchTerm)) || p.word.toLowerCase().includes(bagSearchTerm.toLowerCase()));
        }

        if (bagSortOrder === 'newest') bag.reverse(); 
        else bag.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        if(el.totalCaught) el.totalCaught.textContent = bagData.length; 
        if(el.pokedexGrid) el.pokedexGrid.innerHTML = '';
        
        if (!el.emptyBagMsg) return;

        if (bag.length === 0) {
            el.emptyBagMsg.style.display = 'block'; 
            if(el.btnPhoto) el.btnPhoto.style.display = 'none'; 
            if(el.bagPagination) el.bagPagination.style.display = 'none';
            el.emptyBagMsg.textContent = bagSearchTerm ? "找不到符合的寶可夢。" : "目前還是空的。";
        } else {
            el.emptyBagMsg.style.display = 'none'; 
            if(el.btnPhoto) el.btnPhoto.style.display = 'block'; 
            if(el.bagPagination) el.bagPagination.style.display = 'flex';
            
            const totalPages = Math.ceil(bag.length / ITEMS_PER_PAGE);
            if (currentBagPage > totalPages) currentBagPage = totalPages;
            if (currentBagPage < 1) currentBagPage = 1;

            if(el.pageInput) { el.pageInput.value = currentBagPage; el.pageInput.max = totalPages; }
            if(el.totalPagesText) el.totalPagesText.textContent = `/ ${totalPages}`;
            if(el.btnPrevPage) el.btnPrevPage.disabled = (currentBagPage === 1); 
            if(el.btnNextPage) el.btnNextPage.disabled = (currentBagPage === totalPages);

            const start = (currentBagPage - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const pageItems = bag.slice(start, end);

            pageItems.forEach(p => {
                const card = document.createElement('div'); card.className = 'poke-card';
                const countBadge = p.count > 1 ? `<div class="count-badge">x${p.count}</div>` : '';
                const levelBadge = `<div class="level-badge">Lv.${p.level || 1}</div>`;
                card.innerHTML = `${countBadge}${levelBadge}<img src="${p.img}"><div class="poke-name">${p.name||'???'}</div><div class="poke-word">${p.word}</div>`;
                if(el.pokedexGrid) el.pokedexGrid.appendChild(card);
            });
        }
    }

    // 雲端存檔
    window.saveCloudData = async (type, payload) => {
        if (!userRef) return;
        try {
            const updateObj = {
                pokeBalls: window.playerData.pokeBalls,
                playerLevel: window.playerData.level,
                playerExp: window.playerData.exp
            };
            if (type === 'catch_pokemon') {
                await updateDoc(userRef, { 
                    ...updateObj,
                    pokemonBag: arrayUnion(payload.pokemon),
                    mistakes: arrayRemove(payload.word)
                });
            } else if (type === 'add_mistake') {
                await updateDoc(userRef, { ...updateObj, mistakes: arrayUnion(payload.word) });
            } else {
                await updateDoc(userRef, updateObj);
            }
        } catch (e) { console.error("存檔失敗", e); }
    };

    // 遊戲核心邏輯 (部分省略細節，邏輯保持不變，僅增強安全性)
    function toggleLevel(char, btn) {
        if(isFighting || isRevealed) {
            if(!confirm("戰鬥中切換會重置進度，確定嗎？")) return;
            resetGame();
        }
        if(selectedLetters.has(char)) { selectedLetters.delete(char); btn.classList.remove('active'); } 
        else { selectedLetters.add(char); btn.classList.add('active'); }
        
        if(selectedLetters.size > 0) {
            if(el.btnAction) {
                el.btnAction.textContent = "開始"; el.btnAction.disabled = false; el.btnAction.style.background = "#28a745";
            }
            if(el.msgBox) el.msgBox.textContent = `已選 ${Array.from(selectedLetters).join(',')}，按開始！`;
        } else {
            if(el.btnAction) {
                el.btnAction.textContent = "請選關卡"; el.btnAction.disabled = true; el.btnAction.style.background = "#ccc";
            }
        }
    }

    function initBattle() {
        const pool = wordList.filter(w => selectedLetters.has(w.word.charAt(0).toUpperCase()));
        if(pool.length === 0) { if(el.msgBox) el.msgBox.textContent = "此關卡沒有怪獸！"; return; }
        
        const mistakeSet = new Set(window.playerData.mistakes || []);
        const reviewWords = pool.filter(w => mistakeSet.has(w.word)); 
        const newWords = pool.filter(w => !mistakeSet.has(w.word));   
        battleQueue = [...shuffle(reviewWords), ...shuffle(newWords)];
        
        SFX.start(); playerHp = playerMaxHp; stageCount = 0; updateStats();
        if(el.btnAction) el.btnAction.style.background = "#ff3333"; 
        nextEnemy();
    }

    async function nextEnemy() {
        if(playerHp <= 0) { gameOver(false); return; }
        if(battleQueue.length === 0) { gameOver(true); return; }

        stageCount++; 
        isBossRound = (stageCount % 5 === 0);
        
        currentEnemyId = getRandomPokemonId(isBossRound);
        currentEnemyImgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${currentEnemyId}.png`;
        
        if(el.enemyName) el.enemyName.textContent = "???";
        currentEnemyName = await fetchPokemonName(currentEnemyId);
        if(el.enemyName) el.enemyName.textContent = isBossRound ? `(魔王) ${currentEnemyName}` : `野生 ${currentEnemyName}`;

        if (isBossRound) {
            enemyMaxHp = Math.floor(Math.random() * 3) + 8; enemyCurrentHp = enemyMaxHp;
            if(el.scene) el.scene.classList.add('boss-bg'); 
            if(el.enemyImg) el.enemyImg.classList.add('boss-size');
            if(el.gameFrame) el.gameFrame.classList.add('boss-mode'); 
            if(el.enemyHpBar) el.enemyHpBar.classList.add('hp-purple');
            SFX.bossStart(); 
            if(el.msgBox) { el.msgBox.textContent = "⚠️ 警告！魔王出現！"; el.msgBox.style.color = "#9c27b0"; }
        } else {
            enemyMaxHp = 1; enemyCurrentHp = 1;
            if(el.scene) el.scene.classList.remove('boss-bg'); 
            if(el.enemyImg) el.enemyImg.classList.remove('boss-size');
            if(el.gameFrame) el.gameFrame.classList.remove('boss-mode'); 
            if(el.enemyHpBar) el.enemyHpBar.classList.remove('hp-purple');
            if(el.msgBox) { el.msgBox.textContent = `遭遇 ${currentEnemyName}！`; el.msgBox.style.color = "#333"; }
        }

        updateStats(); 
        if(el.enemyImg) {
            el.enemyImg.style.backgroundImage = `url('${currentEnemyImgUrl}')`;
            el.enemyImg.style.filter = "none"; 
        }
        if(el.playerImg) el.playerImg.classList.remove('shake');
        loadNextQuestion();
    }

    function loadNextQuestion() {
        if (battleQueue.length === 0) { gameOver(true); return; }
        currentEnemy = battleQueue.shift();
        isFighting = true; isRevealed = false;

        if(el.input) { el.input.value = ""; el.input.disabled = false; el.input.focus(); }
        const len = currentEnemy.word.length; 
        if(el.input) el.input.placeholder = `${"_ ".repeat(len)} (${len})`;

        if(el.btnAction) { el.btnAction.textContent = "攻擊 (Enter)"; el.btnAction.disabled = false; el.btnAction.style.background = "#ff3333"; }
        if(el.btnRun) el.btnRun.disabled = false; 
        if(el.btnVoiceWord) el.btnVoiceWord.disabled = false; 
        if(el.btnVoiceSent) el.btnVoiceSent.disabled = false;
        
        if(el.questionBox) el.questionBox.innerHTML = `<div id="qText" class="q-word"></div><div id="qHint" class="q-hint"></div>`;
        el.qText = document.getElementById('qText'); el.qHint = document.getElementById('qHint');

        const type = currentEnemy.type ? `(${currentEnemy.type})` : "";
        if(el.qText) el.qText.textContent = `${currentEnemy.cn_word} ${type}`;
        
        let maskedSent = "";
        if(currentEnemy.sentence) {
            const reg = new RegExp(currentEnemy.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            maskedSent = currentEnemy.sentence.replace(reg, '____');
        }
        if(el.qHint) el.qHint.textContent = maskedSent;
    }

    function playerAttack() {
        if(!el.input) return;
        const ans = el.input.value.trim().toLowerCase();
        const correct = currentEnemy.word.trim().toLowerCase();

        if(ans === correct) {
            SFX.attack(); 
            if(el.playerImg) {
                el.playerImg.classList.add('attack-anim');
                setTimeout(() => el.playerImg.classList.remove('attack-anim'), 300);
            }
            
            setTimeout(() => {
                SFX.hit(); enemyCurrentHp--; showDamage(1, false); updateStats();
                if(el.enemyImg) {
                    el.enemyImg.style.filter = "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)";
                    setTimeout(() => { if (enemyCurrentHp > 0 && el.enemyImg) el.enemyImg.style.filter = "none"; }, 300);
                }

                if (enemyCurrentHp <= 0) {
                    enemyCurrentHp = 0; 
                    window.playerData.pokeBalls++;
                    
                    const expGain = 20; window.playerData.exp += expGain;
                    if (window.playerData.exp >= getMaxExp(window.playerData.level)) {
                        window.playerData.exp -= getMaxExp(window.playerData.level);
                        window.playerData.level++; playerHp = playerMaxHp; SFX.levelup();
                        if(el.msgBox) el.msgBox.textContent = `🆙 升級！Lv.${window.playerData.level}！`;
                        if(el.playerImg) {
                            el.playerImg.classList.add('levelup-anim');
                            setTimeout(() => el.playerImg.classList.remove('levelup-anim'), 1000);
                        }
                    } else {
                        SFX.coin(); 
                        if(el.msgBox) el.msgBox.textContent = `💥 收服！+1球 +${expGain}XP`;
                    }
                    if(el.msgBox) el.msgBox.style.color = "green"; 
                    if(el.enemyImg) el.enemyImg.style.filter = "brightness(0) opacity(0.5)";

                    const newPokemon = {
                        instanceId: Date.now().toString(36),
                        speciesId: currentEnemyId,
                        img: currentEnemyImgUrl,
                        name: currentEnemyName,
                        level: 1,
                        word: currentEnemy.word,
                        caughtDate: new Date().toISOString()
                    };
                    window.playerData.pokemonBag.push(newPokemon);
                    
                    // 安全移除錯誤清單
                    if(!window.playerData.mistakes) window.playerData.mistakes = [];
                    const mIdx = window.playerData.mistakes.indexOf(currentEnemy.word);
                    if(mIdx > -1) window.playerData.mistakes.splice(mIdx, 1);

                    if(window.saveCloudData) window.saveCloudData('catch_pokemon', { pokemon: newPokemon, word: currentEnemy.word });

                } else {
                    if(el.msgBox) { el.msgBox.textContent = `⚔️ 命中！魔王剩 ${enemyCurrentHp} 血！`; el.msgBox.style.color = "blue"; }
                }
                updateStats(); revealAnswer(true);
            }, 200);
            speak(currentEnemy.word);
        } else {
            SFX.error(); playerHp--; updateStats();
            if(el.playerImg) { el.playerImg.classList.add('shake'); setTimeout(() => el.playerImg.classList.remove('shake'), 500); }
            showDamage(1, true);
            
            if(!window.playerData.mistakes) window.playerData.mistakes = [];
            if(!window.playerData.mistakes.includes(currentEnemy.word)) window.playerData.mistakes.push(currentEnemy.word);
            if(window.saveCloudData) window.saveCloudData('add_mistake', { word: currentEnemy.word });

            if(playerHp <= 0) { setTimeout(() => gameOver(false), 1000); } 
            else { 
                if(el.msgBox) { el.msgBox.textContent = "❌ 攻擊失誤！受到反擊！"; el.msgBox.style.color = "red"; }
                if(el.input) { el.input.value = ""; el.input.focus(); }
            }
        }
    }

    function revealAnswer(isWin) {
        isFighting = false; isRevealed = true;
        if(el.input) el.input.disabled = true; 
        if(el.btnRun) el.btnRun.disabled = true;
        if(el.btnAction) {
            if (enemyCurrentHp > 0) el.btnAction.textContent = "下一題 (戰鬥)";
            else el.btnAction.textContent = "下一隻";
            el.btnAction.style.background = "#2196f3";
        }
        if(el.qText) el.qText.innerHTML = `<span style="color:red; font-size:1.2em;">${currentEnemy.word}</span> <span style="font-size:0.6em; color:#666;">${currentEnemy.KK||''}</span>`;
        if(currentEnemy.sentence && el.qHint) el.qHint.textContent = currentEnemy.sentence;
    }

    function showDamage(amount, isPlayerHurt) {
        const dmg = document.createElement('div'); dmg.className = 'damage-text';
        dmg.textContent = `-${amount}`; dmg.style.color = isPlayerHurt ? 'red' : 'orange';
        if(isPlayerHurt) { dmg.style.left = "40px"; dmg.style.top = "60px"; } 
        else { dmg.style.right = "40px"; dmg.style.bottom = "80px"; }
        if(el.scene) el.scene.appendChild(dmg); setTimeout(() => dmg.remove(), 800);
    }

    function gameOver(isClear) {
        isFighting = false; isRevealed = false;
        if(el.btnAction) { el.btnAction.textContent = "重新挑戰"; el.btnAction.style.background = "#28a745"; el.btnAction.disabled = false; }
        if(el.input) el.input.disabled = true;
        if(el.questionBox) {
            if(isClear) {
                SFX.win();
                el.questionBox.innerHTML = `<div style="font-size: 2em;">🏆</div><div class="game-over-title">恭喜通關！</div><div class="game-over-desc">你是寶可夢大師！</div>`;
                if(el.msgBox) el.msgBox.textContent = "太強了！";
            } else {
                SFX.error();
                el.questionBox.innerHTML = `<div style="font-size: 3em; margin-bottom:5px;">💀</div><div style="color: #2a75bb; font-size: 1.8em; font-weight: bold; margin-bottom: 5px;">眼前一片漆黑...</div><div style="color: #666; font-size: 1em;">訓練家倒下了，請重新挑戰！</div>`;
                if(el.msgBox) el.msgBox.textContent = "戰敗...";
            }
        }
    }

    function resetGame() {
        isFighting = false; isRevealed = false;
        selectedLetters.clear();
        document.querySelectorAll('.lvl-btn.active').forEach(b => b.classList.remove('active'));
        if(el.btnAction) { el.btnAction.textContent = "請選關卡"; el.btnAction.disabled = true; el.btnAction.style.background = "#ccc"; }
        if(el.questionBox) {
            el.questionBox.innerHTML = `<div id="qText" class="q-word">請先選擇上方關卡</div><div id="qHint" class="q-hint"></div>`;
            el.qText = document.getElementById('qText'); el.qHint = document.getElementById('qHint');
        }
        enemyCurrentHp = 100; playerHp = 3; 
        updateStats();
        window.updateUIFromCloud();
    }

    // 觸發 Splash Screen (透過 React State 控制)
    function triggerSplashScreen() {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) {
            splashScreen.style.display = 'flex';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                if (el.gameWrapper) el.gameWrapper.style.display = 'block';
            }, 2500);
        }
    }

    // 事件監聽 (初始化關卡按鈕)
    if (el.levelGrid) {
        const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        el.levelGrid.innerHTML = ''; 
        abc.forEach(char => {
            const b = document.createElement('div');
            b.className = 'lvl-btn'; b.textContent = char;
            b.onclick = () => { SFX.btn(); toggleLevel(char, b); };
            el.levelGrid.appendChild(b);
        });
    }

    // 載入 JSON
    (async () => {
        try {
            if(el.msgBox) el.msgBox.textContent = "正在下載圖鑑...";
            const res = await fetch(GITHUB_JSON_URL + '?t=' + Date.now());
            if(!res.ok) throw new Error("連線失敗");
            wordList = await res.json();
            if(el.msgBox) {
                el.msgBox.textContent = `✅ 共 ${wordList.length} 個單字。請選關卡。`;
                el.msgBox.style.color = "green";
            }
        } catch(e) {
            if(el.msgBox) { el.msgBox.textContent = "❌ 載入失敗"; el.msgBox.style.color = "red"; }
        }
    })();

    // UI 按鈕監聽 (加入存在性檢查)
    if(el.btnShop) el.btnShop.onclick = () => { SFX.btn(); el.shopModal.style.display = 'flex'; updateShopUI(); };
    if(el.btnCloseShop) el.btnCloseShop.onclick = () => { SFX.btn(); el.shopModal.style.display = 'none'; };
    if(el.btnBag) el.btnBag.onclick = () => { SFX.btn(); currentBagPage = 1; bagSearchTerm = ''; if(el.bagSearch) el.bagSearch.value = ''; el.bagModal.style.display = 'flex'; renderBag(); };
    if(el.btnCloseBag) el.btnCloseBag.onclick = () => { SFX.btn(); el.bagModal.style.display = 'none'; };

    if(el.btnBuyPotion) el.btnBuyPotion.onclick = () => {
        if (window.playerData.pokeBalls >= 3 && playerHp < playerMaxHp) {
            window.playerData.pokeBalls -= 3; playerHp++; SFX.heal(); updateStats(); updateShopUI();
            if(window.saveCloudData) window.saveCloudData('ball_use');
            if(el.msgBox) { el.msgBox.textContent = "💖 體力恢復！"; el.msgBox.style.color = "#e91e63"; }
        } else if (playerHp >= playerMaxHp) { alert("體力已經滿了！"); } 
        else { alert("精靈球不夠喔！"); }
    };

    if(el.bagSearch) el.bagSearch.addEventListener('input', (e) => { bagSearchTerm = e.target.value; currentBagPage = 1; renderBag(); });
    if(el.btnSort) el.btnSort.onclick = () => { bagSortOrder = (bagSortOrder === 'newest') ? 'az' : 'newest'; el.btnSort.textContent = (bagSortOrder === 'newest') ? "排序: 最新" : "排序: 名稱"; currentBagPage = 1; renderBag(); };
    if(el.btnPrevPage) el.btnPrevPage.onclick = () => { if(currentBagPage > 1) { currentBagPage--; renderBag(); SFX.btn(); }};
    if(el.btnNextPage) el.btnNextPage.onclick = () => { let bag = window.playerData.pokemonBag || []; const totalPages = Math.ceil(bag.length / ITEMS_PER_PAGE); if(currentBagPage < totalPages) { currentBagPage++; renderBag(); SFX.btn(); }};
    if(el.pageInput) el.pageInput.onchange = () => { let p = parseInt(el.pageInput.value); if(p >= 1) { currentBagPage = p; renderBag(); }};

    if(el.btnPhoto) el.btnPhoto.onclick = () => {
        SFX.camera(); el.btnPhoto.textContent = "📷 處理中...";
        el.btnPhoto.style.visibility = 'hidden'; el.btnCloseBag.style.visibility = 'hidden'; el.bagPagination.style.visibility = 'hidden';
        html2canvas(el.bagContentArea, { useCORS: true, scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
            el.btnPhoto.style.visibility = 'visible'; el.btnCloseBag.style.visibility = 'visible'; el.bagPagination.style.visibility = 'visible';
            el.btnPhoto.textContent = "📸 合影留念";
            const link = document.createElement('a'); link.download = 'my-pokedex.png';
            link.href = canvas.toDataURL(); link.click();
        });
    };

    if(el.btnAction) el.btnAction.onclick = () => {
        SFX.btn();
        if(!isFighting && !isRevealed) initBattle();
        else if(isFighting) playerAttack();
        else if(isRevealed) {
            if (isBossRound && enemyCurrentHp > 0) loadNextQuestion();
            else nextEnemy();
        }
    };

    if(el.btnRun) el.btnRun.onclick = () => {
        if(!isFighting) return;
        SFX.error(); if(el.msgBox) { el.msgBox.textContent = "💨 逃跑成功 (跳過)"; el.msgBox.style.color = "orange"; }
        showDamage(0, true); 
        if(window.saveCloudData) window.saveCloudData('add_mistake', { word: currentEnemy.word });
        if(!window.playerData.mistakes) window.playerData.mistakes = [];
        if(!window.playerData.mistakes.includes(currentEnemy.word)) window.playerData.mistakes.push(currentEnemy.word);
        revealAnswer(false);
    };

    if(el.input) {
        el.input.addEventListener('keyup', (e) => {
            if(e.key === 'Enter' && el.btnAction && !el.btnAction.disabled) el.btnAction.click();
        });
        el.input.addEventListener('input', () => { SFX.type(); });
    }
    
    if(el.btnVoiceWord) el.btnVoiceWord.onclick = () => { if(currentEnemy) speak(currentEnemy.word); };
    if(el.btnVoiceSent) el.btnVoiceSent.onclick = () => { if(currentEnemy && currentEnemy.sentence) speak(currentEnemy.sentence); };

    // --- Firebase Auth & Logic ---
    if (auth && db) {
        if(el.btnGoogleLogin) {
            el.btnGoogleLogin.onclick = () => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(auth, provider).catch((error) => alert("登入失敗: " + error.message));
            };
        }

        if(el.btnLogout) {
            el.btnLogout.onclick = () => {
                if(confirm("確定要登出嗎？")) signOut(auth).then(() => window.location.reload());
            };
        }

        onAuthStateChanged(auth, async (user) => {
            setLoading(false); // 停止載入狀態
            if (user) {
                console.log("【1】登入成功:", user.uid);
                if(el.loginOverlay) el.loginOverlay.style.display = 'none';
        
                try {
                    userRef = doc(db, "users", user.uid);
                    console.log("【2】讀取 Firestore 資料...");
                    
                    const userSnap = await getDoc(userRef); 

                    if (!userSnap.exists()) {
                        console.log("【3-A】新使用者，建立資料...");
                        const newUserData = {
                            name: user.displayName || "訓練家",
                            email: user.email,
                            photo: user.photoURL,
                            isApproved: false,
                            role: "user",
                            ...defaultGameData, // 使用預設遊戲資料
                            createdAt: new Date().toISOString()
                        };
        
                        await setDoc(userRef, newUserData);
                        alert("註冊成功！請等待審核。");
                        await signOut(auth);
                        window.location.reload();
        
                    } else {
                        const data = userSnap.data();
                        console.log("【3-B】舊使用者，資料:", data);

                        if (data.isApproved) {
                            // ★ 修復重點 1：更新 React 狀態 (控制 Splash 與 TopBar)
                            setPlayerData(data);
                            
                            // ★ 修復重點 2：資料合併 (Data Merging)
                            // 確保即使資料庫少了欄位，也會使用預設值，不會崩潰
                            window.playerData = { ...defaultGameData, ...data };
                            
                            // ★ 修復重點 3：安全呼叫 UI 更新
                            window.updateUIFromCloud();

                            triggerSplashScreen();

                        } else {
                            alert("審核未通過");
                            await signOut(auth);
                            window.location.reload();
                        }
                    }
                } catch (error) {
                    console.error("【錯誤】資料讀取失敗:", error);
                    alert("連線失敗，請檢查網路。");
                    if(el.loginOverlay) el.loginOverlay.style.display = 'flex';
                }
            } else {
                console.log("【0】未登入");
                setPlayerData(null); 
                window.playerData = { ...defaultGameData };
                if(el.loginOverlay) el.loginOverlay.style.display = 'flex';
            }
        });
    }

  }, []); // End of useEffect

  // JSX 渲染部分
  return (
    <div className="app-container">
        
        {/* Login Overlay */}
        <div id="loginOverlay" className="overlay">
            <div className="login-card">
                <div style={{fontSize: '3em', marginBottom: '10px'}}>⚡</div>
                <h2 style={{margin: '0 0 20px 0', color: '#2a75bb'}}>寶可夢單字大冒險</h2>
                <button id="btnGoogleLogin" className="btn-google-login">
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
                        <span id="userNameDisplay" style={{maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {playerData?.name || '訓練家'}
                        </span>
                        <button id="btnLogout" style={{background:'none', border:'none', fontSize:'1.2em', cursor:'pointer'}}>🚪</button>
                    </div>
                    <div className="currency-box">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" className="ball-icon" alt="Ball" />
                        x <span id="ballCount">0</span>
                    </div>
                    <div className="menu-btns">
                        <button className="btn-top btn-bag" id="btnBag">🎒</button>
                        <button className="btn-top btn-shop" id="btnShop">🛒</button>
                    </div>
                </div>

                <div className="level-grid" id="levelGrid"></div>

                <div className="battle-scene" id="battleScene">
                    <div className="hp-box enemy-hud">
                        <div className="hp-label"><span id="enemyName">野生怪獸</span> <span id="enemyHpText">100%</span></div>
                        <div className="hp-bar-bg"><div className="hp-bar-fill hp-red" id="enemyHpBar"></div></div>
                    </div>
                    <div className="enemy-pos"><div className="enemy-img" id="enemyImg"></div></div>

                    <div className="hp-box player-hud">
                        <div className="hp-label">
                            <span id="playerName">{playerData?.name || '訓練家'}</span> 
                            <span id="playerLevelText" style={{color:'var(--secondary-color)'}}>Lv.1</span>
                        </div>
                        <div className="hp-bar-bg"><div className="hp-bar-fill hp-green" id="playerHpBar"></div></div>
                        <div style={{width:'100%', height:'4px', background:'#ddd', borderRadius:'2px', marginTop:'2px'}}>
                            <div id="playerExpBar" style={{height:'100%', width:'0%', background:'#00bcd4', transition:'width 0.3s'}}></div>
                        </div>
                    </div>
                    <div className="player-pos"><div className="player-img" id="playerImg"></div></div>
                </div>

                <div className="control-panel">
                    <div className="question-box" id="questionBox">
                        <div id="qText" className="q-word">請先選擇上方關卡</div>
                        <div id="qHint" className="q-hint"></div>
                    </div>

                    <div className="input-area">
                        <input type="text" id="userInput" placeholder="請點此輸入..." disabled autoComplete="off" autoCapitalize="off" />
                    </div>
                    <div className="input-area btn-group">
                        <button className="btn btn-atk" id="btnAction" disabled>攻擊</button>
                        <button className="btn btn-run" id="btnRun" disabled>逃跑</button>
                    </div>

                    <div className="voice-controls">
                        <button className="btn btn-voice" id="btnVoiceWord" disabled>🔊 單字</button>
                        <button className="btn btn-voice" id="btnVoiceSent" disabled>🔊 例句</button>
                        <input type="range" id="rateSlider" min="0.5" max="1.5" step="0.1" defaultValue="1.0" title="語速" style={{width: '70px'}} />
                    </div>
                    
                    <div className="msg-box" id="msgBox">準備戰鬥！</div>
                </div>
            </div>
        </div>

        {/* Shop Modal */}
        <div className="modal-overlay" id="shopModal">
            <div className="modal-content shop-content">
                <h2 style={{margin:'0 0 10px 0', color:'#9c27b0'}}>寶可夢中心商店</h2>
                <div className="shop-item">
                    <div style={{textAlign:'left'}}>
                        <div style={{fontWeight:'bold'}}>💖 全滿藥</div>
                        <div style={{fontSize:'0.8em', color:'#666'}}>回復 1 點生命值</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div className="shop-price">3 球</div>
                        <button className="btn btn-buy" id="btnBuyPotion">購買</button>
                    </div>
                </div>
                <button className="btn-close" id="btnCloseShop">離開</button>
            </div>
        </div>

        {/* Bag Modal */}
        <div className="modal-overlay" id="bagModal">
            <div className="modal-content bag-content" id="bagContentArea">
                <h3 style={{margin:'0 0 5px 0', color:'#ff5722'}}>我的寶可夢背包</h3>
                <div style={{fontSize:'0.9em', color:'#666', marginBottom:'10px'}}>已收服: <span id="totalCaught">0</span> 隻</div>
                
                <div className="bag-tools">
                    <input type="text" id="bagSearch" className="bag-search" placeholder="搜尋寶可夢..." />
                    <button className="btn-sort" id="btnSort">排序: 最新</button>
                </div>

                <div id="pokedexGrid" className="pokedex-grid"></div>
                <p id="emptyBagMsg" style={{color:'#888', display:'none'}}>還沒抓到任何寶可夢。</p>
                
                <div className="pagination-controls" id="bagPagination" style={{display:'none'}}>
                    <button className="btn-page" id="btnPrevPage">❮</button>
                    <input type="number" id="pageInput" className="page-input" defaultValue="1" min="1" />
                    <span id="totalPagesText">/ 1</span>
                    <button className="btn-page" id="btnNextPage">❯</button>
                </div>

                <button className="btn-photo" id="btnPhoto">📸 製作戰績卡</button>
                <button className="btn-close" id="btnCloseBag">關閉</button>
            </div>
        </div>

    </div>
  );
}

export default App;