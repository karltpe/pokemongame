// src/hooks/useGameEngine.js
import { useEffect, useRef } from 'react';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { 
    POKEMON_GENERATIONS, 
    getGenerationRange, 
    getLegendaryIdsByGeneration,
    getCumulativeGenerationRange,
    getCumulativeLegendaryIds,
    isPokemonInGeneration,
    CURRENT_GENERATION as GEN_CONFIG
} from '../utils/pokemonGenerations';

export default function useGameEngine() {
    const initialized = useRef(false);

    useEffect(() => {
        // 防止 React Strict Mode 執行兩次
        if (initialized.current) return;
        initialized.current = true;

        // --- 遊戲引擎邏輯 (Legacy Logic) ---
        
        // ★ 新增：世代控管設定（從 pokemonGenerations.js 讀取配置）
        // 注意：CURRENT_GENERATION = 5 表示開放第 1-5 代的所有寶可夢（累積）
        const CURRENT_GENERATION = GEN_CONFIG;
        const genRange = getCumulativeGenerationRange(CURRENT_GENERATION); // 從第 1 代到當前世代
        const LEGENDARY_IDS = getCumulativeLegendaryIds(CURRENT_GENERATION); // 從第 1 代到當前世代的所有神獸
        
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
        const getMaxExp = (lvl) => lvl * 100;

        // 遊戲內部變數
        let wordList = [], battleQueue = [], currentEnemy = null;
        let currentEnemyImgUrl = '', currentEnemyName = '', currentEnemyId = 0;
        let currentEnemyTypes = []; // ★ 新增：當前敵人的屬性
        // 創建 selectedLetters，並暴露到 window 供 React 使用
        let selectedLetters = new Set();
        let playerMaxHp = 3, playerHp = 3, stageCount = 0;
        let enemyMaxHp = 1, enemyCurrentHp = 1, isBossRound = false;
        let isFighting = false, isRevealed = false;
        
        // 暴露變數到 window，讓 React 組件可以訪問
        window.selectedLetters = selectedLetters;
        window.isFighting = isFighting;
        window.isRevealed = isRevealed;
        window.isBossRound = isBossRound;
        window.enemyCurrentHp = enemyCurrentHp;

        // 綁定 DOM 元素 (僅綁定遊戲操作相關，UI顯示交給 React State)
        // 使用延遲綁定，因為 React 組件可能還沒渲染完成
        const getEl = () => ({
            levelGrid: document.getElementById('levelGrid'),
            enemyHpBar: document.getElementById('enemyHpBar'), 
            enemyHpText: document.getElementById('enemyHpText'), 
            enemyName: document.getElementById('enemyName'),
            playerHpBar: document.getElementById('playerHpBar'), 
            playerHpText: document.getElementById('playerHpText'),
            playerExpBar: document.getElementById('playerExpBar'), 
            playerLevelText: document.getElementById('playerLevelText'),
            enemyImg: document.getElementById('enemyImg'), 
            playerImg: document.getElementById('playerImg'),
            questionBox: document.getElementById('questionBox'), 
            qText: document.getElementById('qText'), 
            qHint: document.getElementById('qHint'),
            input: document.getElementById('userInput'),
            btnAction: document.getElementById('btnAction'), 
            btnRun: document.getElementById('btnRun'),
            btnVoiceWord: document.getElementById('btnVoiceWord'), 
            btnVoiceSent: document.getElementById('btnVoiceSent'),
            msgBox: document.getElementById('msgBox'), 
            scene: document.getElementById('battleScene'),
            gameFrame: document.getElementById('gameFrame'), 
            ballCount: document.getElementById('ballCount'),
            btnShop: document.getElementById('btnShop'), 
            shopModal: document.getElementById('shopModal'),
            btnBuyPotion: document.getElementById('btnBuyPotion'), 
            btnCloseShop: document.getElementById('btnCloseShop'),
            rateSlider: document.getElementById('rateSlider'),
            loginOverlay: document.getElementById('loginOverlay'),
            gameWrapper: document.getElementById('gameWrapper'),
            btnGoogleLogin: document.getElementById('btnGoogleLogin'),
            btnLogout: document.getElementById('btnLogout'),
            splashScreen: document.getElementById('splashScreen'),
        });
        
        const el = getEl();
        // 暴露到 window，讓其他地方也能訪問
        window.el = el;
        
        // 定期更新 el（因為 React 組件可能會重新渲染）
        const updateEl = () => {
            const newEl = getEl();
            Object.keys(newEl).forEach(key => {
                el[key] = newEl[key];
            });
        };
        
        // 延遲啟動 interval，確保 React 組件已經渲染
        const elUpdateInterval = setTimeout(() => {
            const intervalId = setInterval(updateEl, 500);
            window.elUpdateIntervalId = intervalId;
        }, 1000);

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
        
        // ★ 修正：立即暴露 SFX 到 window，讓 React 組件可以調用
        window.SFX = SFX;

        // 輔助函式
        const pokemonNameCache = {};
        const pokemonDataCache = {}; // ★ 新增：快取完整的寶可夢資料（包含屬性）
        
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
        
        // ★ 新增：獲取寶可夢的完整資料（包含屬性）
        async function fetchPokemonData(id) {
            if (pokemonDataCache[id]) return pokemonDataCache[id];
            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                if(!res.ok) return null;
                const data = await res.json();
                
                // 提取屬性
                const types = data.types.map(t => t.type.name);
                
                // 提取能力值
                const stats = {};
                data.stats.forEach(stat => {
                    stats[stat.stat.name] = stat.base_stat;
                });
                
                const pokemonData = {
                    id: data.id,
                    types: types,
                    stats: stats,
                    height: data.height,
                    weight: data.weight,
                };
                
                pokemonDataCache[id] = pokemonData;
                return pokemonData;
            } catch(e) { 
                console.warn('獲取寶可夢資料失敗:', e);
                return null; 
            }
        }

        function getRandomPokemonId(isBoss) {
            let id;
            // ★ 安全修復：確保 pokemonBag 存在
            const bag = window.playerData.pokemonBag || [];
            const ownedIds = new Set(bag.map(p => p.speciesId));
            
            // ★ 修正：世代限制 - 允許從第 1 代到當前世代的所有 ID 範圍（累積）
            const minId = genRange.minId; // 第 1 代的最小 ID (1)
            const maxId = genRange.maxId; // 當前世代的最大 ID
            
            let foundNew = false;
            for(let i=0; i<15; i++) { 
                if (isBoss) {
                    // 魔王：從第 1 代到當前世代的所有神獸中隨機選擇
                    if (LEGENDARY_IDS.length > 0) {
                        id = LEGENDARY_IDS[Math.floor(Math.random() * LEGENDARY_IDS.length)];
                    } else {
                        // 如果沒有神獸，從累積範圍內隨機選擇
                        id = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
                    }
                } else {
                    // 一般敵人：從第 1 代到當前世代的累積範圍內隨機選擇，排除神獸
                    do { 
                        id = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
                    } while (LEGENDARY_IDS.includes(id));
                }
                if(!ownedIds.has(id)) { foundNew = true; break; }
            }
            // 如果找不到新的，從累積範圍內隨機選擇一個
            if(!foundNew || !id) {
                id = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
            }
            return id;
        }

        function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
        
        function speak(text) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.lang = 'en-US';
                // 安全讀取 rateSlider（可能是 React 渲染的元素）
                const rateSlider = el.rateSlider || document.getElementById('rateSlider');
                u.rate = parseFloat(rateSlider?.value || 1.0);
                window.speechSynthesis.speak(u);
            }
        }

        // UI 更新函式 (★ 清理：移除所有 DOM 操作，React 組件已處理)
        window.updateUIFromCloud = () => {
            // ★ 清理：移除備份的 DOM 更新，React 組件已處理所有 UI 顯示
            // LevelGrid 已經通過 props 接收 mistakes，會自動更新 has-review 類
            updateStats();
        };

        function updateStats() {
            // ★ 修正：使用局部變數 playerHp 作為唯一數據源（戰鬥相關）
            // 不再從 React 狀態讀取，避免覆蓋扣血操作
            // 局部變數 → React 狀態（單向同步）
            
            // 確保 playerHp 不會小於 0
            if(playerHp < 0) playerHp = 0;
            
            // ★ 修正：同步更新 window 變數（讓 ControlPanel 可以正確判斷魔王狀態）
            window.enemyCurrentHp = enemyCurrentHp;
            window.isBossRound = isBossRound;
            
            // 更新 React 狀態（從局部變數同步）
            // ★ 清理：移除備份的 DOM 更新，React 組件（BattleScene、ControlPanel）已處理所有 UI 顯示
            if(window.updateGameContext) {
                window.updateGameContext.setPlayerHp(playerHp);
                window.updateGameContext.setPlayerMaxHp(playerMaxHp);
                window.updateGameContext.setEnemyCurrentHp(enemyCurrentHp);
                window.updateGameContext.setEnemyMaxHp(enemyMaxHp);
                window.updateGameContext.setIsBossRound(isBossRound);
                if(window.playerData) {
                    window.updateGameContext.setPlayerLevel(window.playerData.level);
                    window.updateGameContext.setPlayerExp(window.playerData.exp);
                    window.updateGameContext.setPokeBalls(window.playerData.pokeBalls);
                }
            }
        }

        // ★ 清理：updateShopUI 函數已不再需要（ShopModal 已 React 化，狀態由 GameContext 管理）
        // function updateShopUI() { ... } - 已移除

        // 雲端存檔
        window.saveCloudData = async (type, payload) => {
            const userRef = window.userRef;
            if (!userRef) return;
            try {
                const updateObj = {
                    pokeBalls: window.playerData.pokeBalls,
                    level: window.playerData.level,  // ★ 修正：使用 level 而不是 playerLevel（與 Firestore 欄位一致）
                    exp: window.playerData.exp       // ★ 修正：使用 exp 而不是 playerExp（與 Firestore 欄位一致）
                };
                if (type === 'catch_pokemon') {
                    await updateDoc(userRef, { 
                        ...updateObj,
                        pokemonBag: arrayUnion(payload.pokemon),
                        mistakes: arrayRemove(payload.word)
                    });
                } else if (type === 'add_mistake') {
                    await updateDoc(userRef, { ...updateObj, mistakes: arrayUnion(payload.word) });
                } else if (type === 'level_up') {
                    // ★ 新增：專門處理升級的保存
                    await updateDoc(userRef, updateObj);
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
            
            // ★ 清理：toggleLevel 函數已不再使用（LevelGrid 已 React 化）
            // 關卡選擇邏輯現在由 App.jsx 的 handleLevelToggle 處理
        }

        function initBattle() {
            // 使用 window.selectedLetters（可能來自 React 狀態）
            const lettersToUse = window.selectedLetters || selectedLetters;
            const pool = wordList.filter(w => lettersToUse.has(w.word.charAt(0).toUpperCase()));
            if(pool.length === 0) { 
                // ★ 清理：通過 React 狀態更新，移除備份的 DOM 操作
                if(window.updateGameContext) {
                    window.updateGameContext.setMessage("此關卡沒有怪獸！");
                    window.updateGameContext.setMessageColor("red");
                }
                return; 
            }
            
            const mistakeSet = new Set(window.playerData.mistakes || []);
            const reviewWords = pool.filter(w => mistakeSet.has(w.word)); 
            const newWords = pool.filter(w => !mistakeSet.has(w.word));   
            battleQueue = [...shuffle(reviewWords), ...shuffle(newWords)];
            
            SFX.start(); 
            playerHp = playerMaxHp; 
            stageCount = 0; 
            updateStats();
            
            // ★ 清理：通過 React 狀態更新，移除備份的 DOM 操作
            if(window.updateGameContext) {
                window.updateGameContext.setActionButtonBg("#ff3333");
            }
            
            nextEnemy();
        }
        
        async function nextEnemy() {
            if(playerHp <= 0) { gameOver(false); return; }
            if(battleQueue.length === 0) { gameOver(true); return; }

            stageCount++; 
            isBossRound = (stageCount % 5 === 0);
            
            currentEnemyId = getRandomPokemonId(isBossRound);
            currentEnemyImgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${currentEnemyId}.png`;
            
            // ★ 清理：移除備份的 DOM 更新，React 組件（BattleScene）已處理
            currentEnemyName = await fetchPokemonName(currentEnemyId);
            const displayName = isBossRound ? `(魔王) ${currentEnemyName}` : `野生 ${currentEnemyName}`;
            
            // ★ 新增：獲取寶可夢屬性資訊
            const pokemonData = await fetchPokemonData(currentEnemyId);
            const enemyTypes = pokemonData ? pokemonData.types : [];
            currentEnemyTypes = enemyTypes; // 保存到變數，供收服時使用

            if (isBossRound) {
                enemyMaxHp = Math.floor(Math.random() * 3) + 8; enemyCurrentHp = enemyMaxHp;
                window.isBossRound = true;
                window.enemyCurrentHp = enemyCurrentHp;
                if(el.scene) el.scene.classList.add('boss-bg'); 
                if(el.enemyImg) el.enemyImg.classList.add('boss-size');
                if(el.gameFrame) el.gameFrame.classList.add('boss-mode'); 
                if(el.enemyHpBar) el.enemyHpBar.classList.add('hp-purple');
                SFX.bossStart(); 
                // ★ 清理：通過 React 狀態更新，移除備份的 DOM 操作
                if(window.updateGameContext) {
                    window.updateGameContext.setMessage("⚠️ 警告！魔王出現！");
                    window.updateGameContext.setMessageColor("#9c27b0");
                }
            } else {
                enemyMaxHp = 1; enemyCurrentHp = 1;
                window.isBossRound = false;
                window.enemyCurrentHp = enemyCurrentHp;
                if(el.scene) el.scene.classList.remove('boss-bg'); 
                if(el.enemyImg) el.enemyImg.classList.remove('boss-size');
                if(el.gameFrame) el.gameFrame.classList.remove('boss-mode'); 
                if(el.enemyHpBar) el.enemyHpBar.classList.remove('hp-purple');
                // ★ 清理：通過 React 狀態更新，移除備份的 DOM 操作
                if(window.updateGameContext) {
                    window.updateGameContext.setMessage(`遭遇 ${currentEnemyName}！`);
                    window.updateGameContext.setMessageColor("#333");
                }
            }
            
            // 更新 React 狀態
            if(window.updateGameContext) {
                window.updateGameContext.setEnemyName(displayName);
                window.updateGameContext.setEnemyImgUrl(currentEnemyImgUrl);
                window.updateGameContext.setEnemyTypes(enemyTypes); // ★ 新增：更新屬性
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
            window.isFighting = true; window.isRevealed = false;

            const len = currentEnemy.word.length;
            const placeholder = `${"_ ".repeat(len)} (${len})`;
            
            // 更新 React 狀態
            if(window.updateGameContext) {
                window.updateGameContext.setInputValue("");
                window.updateGameContext.setIsInputDisabled(false);
                window.updateGameContext.setInputPlaceholder(placeholder);
                window.updateGameContext.setActionButtonText("攻擊 (Enter)");
                window.updateGameContext.setActionButtonDisabled(false);
                window.updateGameContext.setActionButtonBg("#ff3333");
                window.updateGameContext.setRunButtonDisabled(false);
                window.updateGameContext.setVoiceButtonsDisabled(false);
                window.updateGameContext.setCurrentEnemy(currentEnemy);
                
                const type = currentEnemy.type ? `(${currentEnemy.type})` : "";
                window.updateGameContext.setQuestionText(`${currentEnemy.cn_word} ${type}`);
                
                let maskedSent = "";
                if(currentEnemy.sentence) {
                    const reg = new RegExp(currentEnemy.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    maskedSent = currentEnemy.sentence.replace(reg, '____');
                }
                window.updateGameContext.setQuestionHint(maskedSent);
            }
            
            // ★ 清理：移除備份的 DOM 更新，React 組件（ControlPanel）已處理所有 UI 顯示
            // 只保留必要的 DOM 操作（如 focus）
            if(el.input) { 
                el.input.focus(); // 保留 focus，因為 React 的 autoFocus 可能不夠即時
            }
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
                    SFX.hit(); enemyCurrentHp--; 
                    window.enemyCurrentHp = enemyCurrentHp; // ★ 修正：同步更新 window.enemyCurrentHp
                    showDamage(1, false); updateStats();
                    if(el.enemyImg) {
                        el.enemyImg.style.filter = "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)";
                        setTimeout(() => { if (enemyCurrentHp > 0 && el.enemyImg) el.enemyImg.style.filter = "none"; }, 300);
                    }

                    if (enemyCurrentHp <= 0) {
                        enemyCurrentHp = 0;
                        window.enemyCurrentHp = 0; // ★ 修正：同步更新 window.enemyCurrentHp 
                        window.playerData.pokeBalls++;
                        
                        const expGain = 20; window.playerData.exp += expGain;
                        
                        // ★ 修正：更新 React 狀態（無論是否升級）
                        if(window.updateGameContext) {
                            window.updateGameContext.setPlayerExp(window.playerData.exp);
                        }
                        
                        if (window.playerData.exp >= getMaxExp(window.playerData.level)) {
                            window.playerData.exp -= getMaxExp(window.playerData.level);
                            window.playerData.level++; 
                            playerHp = playerMaxHp; 
                            SFX.levelup();
                            
                            // ★ 修正：升級後立即更新 React 狀態和 UI
                            if(window.updateGameContext) {
                                window.updateGameContext.setPlayerLevel(window.playerData.level);
                                window.updateGameContext.setPlayerExp(window.playerData.exp);
                            }
                            updateStats(); // 更新 UI 顯示
                            
                            // ★ 清理：通過 React 狀態更新訊息，移除備份的 DOM 操作
                            if(window.updateGameContext) {
                                window.updateGameContext.setMessage(`🆙 升級！Lv.${window.playerData.level}！`);
                                window.updateGameContext.setMessageColor("green");
                            }
                            
                            // 保留動畫效果（視覺反饋）
                            if(el.playerImg) {
                                el.playerImg.classList.add('levelup-anim');
                                setTimeout(() => el.playerImg.classList.remove('levelup-anim'), 1000);
                            }
                            
                            // ★ 修正：升級後立即保存到 Firestore
                            if(window.saveCloudData) {
                                window.saveCloudData('level_up');
                            }
                        } else {
                            SFX.coin(); 
                            // ★ 清理：通過 React 狀態更新訊息，移除備份的 DOM 操作
                            if(window.updateGameContext) {
                                window.updateGameContext.setMessage(`💥 收服！+1球 +${expGain}XP`);
                                window.updateGameContext.setMessageColor("green");
                            }
                            // ★ 修正：即使沒有升級，也要更新 UI 顯示經驗值
                            updateStats();
                        } 
                        if(el.enemyImg) el.enemyImg.style.filter = "brightness(0) opacity(0.5)";

                        const newPokemon = {
                            instanceId: Date.now().toString(36),
                            speciesId: currentEnemyId,
                            img: currentEnemyImgUrl,
                            name: currentEnemyName,
                            level: 1,
                            word: currentEnemy.word,
                            types: currentEnemyTypes, // ★ 新增：保存屬性資訊
                            caughtDate: new Date().toISOString()
                        };
                        window.playerData.pokemonBag.push(newPokemon);
                        
                        // 安全移除錯誤清單
                        if(!window.playerData.mistakes) window.playerData.mistakes = [];
                        const mIdx = window.playerData.mistakes.indexOf(currentEnemy.word);
                        if(mIdx > -1) window.playerData.mistakes.splice(mIdx, 1);

                        if(window.saveCloudData) window.saveCloudData('catch_pokemon', { pokemon: newPokemon, word: currentEnemy.word });

                    } else {
                        // ★ 清理：通過 React 狀態更新訊息，移除備份的 DOM 操作
                        if(window.updateGameContext) {
                            window.updateGameContext.setMessage(`⚔️ 命中！魔王剩 ${enemyCurrentHp} 血！`);
                            window.updateGameContext.setMessageColor("blue");
                        }
                    }
                    updateStats(); revealAnswer(true);
                }, 200);
                speak(currentEnemy.word);
            } else {
                SFX.error(); 
                // ★ 修正：直接操作局部變數 playerHp（不再從 React 狀態讀取）
                playerHp--; 
                
                // 確保 playerHp 不會小於 0
                if(playerHp < 0) playerHp = 0;
                
                // 更新狀態（局部變數 → React 狀態）
                updateStats();
                
                if(el.playerImg) { el.playerImg.classList.add('shake'); setTimeout(() => el.playerImg.classList.remove('shake'), 500); }
                showDamage(1, true);
                
                if(!window.playerData.mistakes) window.playerData.mistakes = [];
                if(!window.playerData.mistakes.includes(currentEnemy.word)) window.playerData.mistakes.push(currentEnemy.word);
                if(window.saveCloudData) window.saveCloudData('add_mistake', { word: currentEnemy.word });

                // ★ 修正：檢查死亡（使用局部變數）
                if(playerHp <= 0) { 
                    setTimeout(() => gameOver(false), 1000); 
                } else { 
                    // ★ 清理：通過 React 狀態更新訊息，移除備份的 DOM 操作
                    if(window.updateGameContext) {
                        window.updateGameContext.setMessage("❌ 攻擊失誤！受到反擊！");
                        window.updateGameContext.setMessageColor("red");
                        window.updateGameContext.setInputValue("");
                    }
                    // 保留 focus（用戶體驗）
                    if(el.input) { el.input.focus(); }
                }
            }
        }

        function revealAnswer(isWin) {
            isFighting = false; isRevealed = true;
            window.isFighting = false; window.isRevealed = true;
            
            // ★ 清理：通過 React 狀態更新 UI，移除直接 DOM 操作
            if(window.updateGameContext) {
                window.updateGameContext.setIsInputDisabled(true);
                window.updateGameContext.setRunButtonDisabled(true);
                if (enemyCurrentHp > 0) {
                    window.updateGameContext.setActionButtonText("下一題 (戰鬥)");
                } else {
                    window.updateGameContext.setActionButtonText("下一隻");
                }
                window.updateGameContext.setActionButtonBg("#2196f3");
                window.updateGameContext.setActionButtonDisabled(false);
                
                // 更新問題顯示（顯示答案）
                const answerHtml = `<span style="color:red; font-size:1.2em;">${currentEnemy.word}</span> <span style="font-size:0.6em; color:#666;">${currentEnemy.KK||''}</span>`;
                window.updateGameContext.setQuestionText(answerHtml);
                if(currentEnemy.sentence) {
                    window.updateGameContext.setQuestionHint(currentEnemy.sentence);
                }
            }
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
            window.isFighting = false; window.isRevealed = false;
            
            // ★ 清理：通過 React 狀態更新 UI，移除備份的 DOM 操作
            if(window.updateGameContext) {
                window.updateGameContext.setActionButtonText("重新挑戰");
                window.updateGameContext.setActionButtonBg("#28a745");
                window.updateGameContext.setActionButtonDisabled(false);
                window.updateGameContext.setIsInputDisabled(true);
                
                if(isClear) {
                    SFX.win();
                    const gameOverHtml = `<div style="font-size: 2em;">🏆</div><div class="game-over-title">恭喜通關！</div><div class="game-over-desc">你是寶可夢大師！</div>`;
                    window.updateGameContext.setQuestionText(gameOverHtml);
                    window.updateGameContext.setMessage("太強了！");
                    window.updateGameContext.setMessageColor("green");
                } else {
                    SFX.error();
                    const gameOverHtml = `<div style="font-size: 3em; margin-bottom:5px;">💀</div><div style="color: #2a75bb; font-size: 1.8em; font-weight: bold; margin-bottom: 5px;">眼前一片漆黑...</div><div style="color: #666; font-size: 1em;">訓練家倒下了，請重新挑戰！</div>`;
                    window.updateGameContext.setQuestionText(gameOverHtml);
                    window.updateGameContext.setMessage("戰敗...");
                    window.updateGameContext.setMessageColor("red");
                }
            }
        }

        function resetGame() {
            isFighting = false; 
            isRevealed = false;
            window.isFighting = false;
            window.isRevealed = false;
            
            // 清空選中的關卡（同時更新 React 狀態）
            selectedLetters.clear();
            if(window.selectedLetters) window.selectedLetters.clear();
            if(window.updateGameContext) {
                window.updateGameContext.setSelectedLetters(new Set());
            }
            
            // ★ 清理：通過 React 狀態更新 UI，移除備份的 DOM 操作
            if(window.updateGameContext) {
                window.updateGameContext.setActionButtonText("請選關卡");
                window.updateGameContext.setActionButtonDisabled(true);
                window.updateGameContext.setActionButtonBg("#ccc");
                window.updateGameContext.setQuestionText("請先選擇上方關卡");
                window.updateGameContext.setQuestionHint("");
            }
            
            enemyCurrentHp = 100; 
            playerHp = 3; 
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
        // 讓外部（AuthContext）可以觸發
        window.triggerSplashScreen = triggerSplashScreen;

        // 事件監聽 (初始化關卡按鈕)
        // 注意：現在關卡按鈕由 React LevelGrid 組件渲染，這裡不再需要動態創建
        // 但保留這個區塊以防需要，實際按鈕已經在 LevelGrid.jsx 中渲染

        // 載入 JSON
        (async () => {
            try {
                // ★ 清理：通過 React 狀態更新，移除備份的 DOM 操作
                if(window.updateGameContext) {
                    window.updateGameContext.setMessage("正在下載圖鑑...");
                    window.updateGameContext.setMessageColor("#333");
                }
                const res = await fetch(GITHUB_JSON_URL + '?t=' + Date.now());
                if(!res.ok) throw new Error("連線失敗");
                wordList = await res.json();
                if(window.updateGameContext) {
                    window.updateGameContext.setMessage(`✅ 共 ${wordList.length} 個單字。請選關卡。`);
                    window.updateGameContext.setMessageColor("green");
                }
            } catch(e) {
                if(window.updateGameContext) {
                    window.updateGameContext.setMessage("❌ 載入失敗");
                    window.updateGameContext.setMessageColor("red");
                }
            }
        })();

        // ★ 清理：移除所有 DOM 事件監聽器，因為 React 組件已經處理了所有按鈕點擊
        // 商店、戰鬥、語音按鈕現在都由 React 組件（ShopModal、ControlPanel）處理
        // 輸入框的事件也由 ControlPanel 處理（包括打字音效）
        // SFX 已在上面暴露到 window

        // 逃跑函數
        function runAway() {
            if(!isFighting) return;
            SFX.error(); 
            showDamage(0, true); 
            if(window.saveCloudData) window.saveCloudData('add_mistake', { word: currentEnemy.word });
            if(!window.playerData.mistakes) window.playerData.mistakes = [];
            if(!window.playerData.mistakes.includes(currentEnemy.word)) window.playerData.mistakes.push(currentEnemy.word);
            
            // ★ 修正：通過 React 狀態更新訊息
            if(window.updateGameContext) {
                window.updateGameContext.setMessage("💨 逃跑成功 (跳過)");
                window.updateGameContext.setMessageColor("orange");
            }
            
            revealAnswer(false);
        }
        
        // 暴露函數到 window
        window.initBattle = initBattle;
        window.resetGame = resetGame;
        window.playerAttack = playerAttack;
        window.nextEnemy = nextEnemy;
        window.loadNextQuestion = loadNextQuestion;
        window.speak = speak;
        window.runAway = runAway; // ★ 修正：暴露逃跑函數
        
        // ★ 暴露同步函數，讓 buyPotion 可以同步更新局部變數
        window.syncPlayerHp = (newHp, newMaxHp) => {
            if(typeof newHp === 'number' && newHp >= 0) {
                playerHp = newHp;
            }
            if(typeof newMaxHp === 'number' && newMaxHp > 0) {
                playerMaxHp = newMaxHp;
            }
            // 同步後更新狀態
            updateStats();
        };
        
        // 清理 interval
        return () => {
            if (window.elUpdateIntervalId) {
                clearInterval(window.elUpdateIntervalId);
            }
            if (elUpdateInterval) {
                clearTimeout(elUpdateInterval);
            }
        };

    }, []); // End of useEffect
}
