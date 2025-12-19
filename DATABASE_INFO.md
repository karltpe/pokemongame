# 目前使用的資料庫說明

> **更新日期**: 2025-12-16  
> **狀態標記**: ✅ 已完成 | ⏳ 部分完成 | ❌ 尚未實作

## 1. PokeAPI (寶可夢資料庫)

### 官方網站
- **主網站**: https://pokeapi.co/
- **文檔**: https://pokeapi.co/docs/v2

### 目前使用的端點

#### 1.1 寶可夢物種資訊 (Pokemon Species)
- **端點**: `https://pokeapi.co/api/v2/pokemon-species/{id}`
- **目前用途**: 
  - ✅ 獲取寶可夢的中文名稱（繁體中文）
  - ✅ 獲取英文名字（用於背包顯示）
  - ✅ 獲取進化鏈資訊（用於詳細視窗）
- **可獲取的資訊**:
  - `id`: 寶可夢 ID
  - `name`: 英文名稱
  - `names[]`: 多語言名稱列表（包含 `zh-Hant` 繁體中文）
  - `is_legendary`: 是否為傳說寶可夢
  - `is_mythical`: 是否為幻之寶可夢
  - `capture_rate`: 捕捉率
  - `base_happiness`: 基礎親密度
  - `growth_rate`: 成長速度
  - `habitat`: 棲息地
  - `flavor_text_entries[]`: 圖鑑描述（多語言）
  - `genera[]`: 分類（多語言，如「鼠寶可夢」）
  - `egg_groups[]`: 蛋群組
  - `evolution_chain`: 進化鏈資訊

#### 1.2 寶可夢詳細資訊 (Pokemon)
- **端點**: `https://pokeapi.co/api/v2/pokemon/{id}`
- **目前用途**:
  - ✅ 獲取屬性（Types）- 用於顯示屬性標籤和邊框顏色
  - ✅ 獲取能力值（Stats）- 用於詳細視窗顯示
  - ✅ 獲取特性（Abilities）- 用於詳細視窗顯示
  - ✅ 獲取招式列表（Moves）- 用於詳細視窗顯示
  - ✅ 獲取身高體重（Height/Weight）- 用於詳細視窗顯示
- **其他可獲取的資訊（尚未使用）**:
  - `stats[]`: 基礎能力值（HP、攻擊、防禦、特攻、特防、速度）
  - `types[]`: 屬性（如：火、水、草等）
  - `abilities[]`: 特性（包括隱藏特性）
  - `moves[]`: 可學習的招式列表
  - `sprites`: 各種圖片
    - `front_default`: 正面普通圖
    - `back_default`: 背面普通圖
    - `front_shiny`: 正面異色圖
    - `back_shiny`: 背面異色圖
    - `other.official-artwork.front_default`: 官方藝術圖（目前使用）
  - `height`: 身高（分米）
  - `weight`: 體重（公克）
  - `base_experience`: 基礎經驗值

### 圖片資源
- **官方藝術圖**: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- **普通正面圖**: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`
- **異色正面圖**: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{id}.png`

---

## 2. 自定義單字資料庫 (GitHub JSON)

### 資料來源
- **URL**: `https://raw.githubusercontent.com/karltpe/MikeEnglishTest/main/word_ad.json`
- **格式**: JSON 陣列

### 目前使用的欄位
根據代碼分析，每個單字物件包含：
- `word`: 英文單字（必填）
- `cn_word`: 中文翻譯（必填）
- `sentence`: 英文例句（選填）
- `KK`: 音標（選填）
- `type`: 詞性（選填，如：n., v., adj. 等）

### 資料結構範例（推測）
```json
[
  {
    "word": "apple",
    "cn_word": "蘋果",
    "sentence": "I like to eat an apple.",
    "KK": "/ˈæpl/",
    "type": "n."
  },
  {
    "word": "run",
    "cn_word": "跑步",
    "sentence": "I run every morning.",
    "KK": "/rʌn/",
    "type": "v."
  }
]
```

---

## 3. 有助於增加遊戲內容的資訊

### 從 PokeAPI 可以獲取的資訊

#### 3.1 屬性系統 (Types) ✅ **已完成**
- **用途**: 
  - ✅ 根據屬性顯示不同顏色/效果（已實作）
  - ⏳ 屬性相剋系統（火 > 草 > 水 > 火）- 尚未實作
  - ⏳ 屬性相關的遊戲機制 - 尚未實作
- **端點**: `GET /api/v2/pokemon/{id}` → `types[]`
- **範例**: `["fire", "flying"]`
- **實作位置**:
  - `BattleScene.jsx`: 顯示敵人屬性標籤和邊框顏色
  - `BagModal.jsx`: 顯示背包中寶可夢的屬性標籤和邊框顏色
  - `useGameEngine.js`: 獲取並保存屬性到資料庫

#### 3.2 能力值系統 (Stats) ✅ **部分完成**
- **用途**:
  - ✅ 在詳細視窗中顯示能力值（已實作）
  - ⏳ 根據能力值設定寶可夢的強度 - 尚未實作
  - ⏳ 不同寶可夢有不同的 HP、攻擊力 - 尚未實作
  - ⏳ 可以設計更複雜的戰鬥系統 - 尚未實作
- **端點**: `GET /api/v2/pokemon/{id}` → `stats[]`
- **包含**: HP, Attack, Defense, Special-Attack, Special-Defense, Speed
- **實作位置**:
  - `PokemonDetailModal.jsx`: 顯示完整能力值資訊

#### 3.3 特性系統 (Abilities) ✅ **部分完成**
- **用途**:
  - ✅ 在詳細視窗中顯示特性（已實作）
  - ⏳ 特殊效果（如：戰鬥中的被動技能）- 尚未實作
  - ⏳ 增加遊戲策略性 - 尚未實作
- **端點**: `GET /api/v2/pokemon/{id}` → `abilities[]`
- **實作位置**:
  - `PokemonDetailModal.jsx`: 顯示特性列表

#### 3.4 招式系統 (Moves) ✅ **部分完成**
- **用途**:
  - ✅ 在詳細視窗中顯示招式列表（前 10 個，含學習等級）（已實作）
  - ⏳ 不同寶可夢有不同的招式 - 尚未在戰鬥中使用
  - ⏳ 可以設計招式學習系統 - 尚未實作
  - ⏳ 增加戰鬥多樣性 - 尚未實作
- **端點**: `GET /api/v2/pokemon/{id}` → `moves[]`
- **實作位置**:
  - `PokemonDetailModal.jsx`: 顯示招式列表和學習等級

#### 3.5 進化系統 (Evolution Chain) ✅ **部分完成**
- **用途**:
  - ✅ 在詳細視窗中顯示進化鏈（已實作）
  - ⏳ 寶可夢進化系統 - 尚未實作
  - ⏳ 收集進化材料或達到條件進化 - 尚未實作
- **端點**: `GET /api/v2/pokemon-species/{id}` → `evolution_chain.url`
- **然後**: `GET {evolution_chain.url}` 獲取進化鏈
- **實作位置**:
  - `PokemonDetailModal.jsx`: 顯示進化鏈路徑

#### 3.6 圖鑑描述 (Flavor Text)
- **用途**:
  - 在背包中顯示寶可夢的圖鑑描述
  - 增加遊戲的沉浸感
- **端點**: `GET /api/v2/pokemon-species/{id}` → `flavor_text_entries[]`

#### 3.7 分類資訊 (Genera)
- **用途**:
  - 顯示「鼠寶可夢」、「火系寶可夢」等分類
  - 增加遊戲資訊豐富度
- **端點**: `GET /api/v2/pokemon-species/{id}` → `genera[]`

#### 3.8 異色寶可夢 (Shiny)
- **用途**:
  - 稀有度系統
  - 特殊獎勵機制
- **圖片**: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{id}.png`

#### 3.9 身高體重 ✅ **已完成**
- **用途**:
  - ✅ 在詳細視窗中顯示身高體重（已實作）
  - ✅ 增加真實感（已實作）
- **端點**: `GET /api/v2/pokemon/{id}` → `height`, `weight`
- **實作位置**:
  - `PokemonDetailModal.jsx`: 顯示身高（公尺）和體重（公斤）

#### 3.10 捕捉率 (Capture Rate)
- **用途**:
  - 不同寶可夢有不同的捕捉難度
  - 可以設計更複雜的捕捉機制
- **端點**: `GET /api/v2/pokemon-species/{id}` → `capture_rate`

---

## 4. 建議的遊戲內容擴展方向

### 4.1 屬性系統 ✅ **部分完成**
- ✅ 根據寶可夢屬性顯示不同顏色邊框（已實作）
- ⏳ 屬性相剋影響傷害計算（尚未實作）
- ⏳ 屬性相關的關卡分類（尚未實作）

### 4.2 能力值系統 ✅ **部分完成**
- ✅ 在詳細視窗中顯示能力值（已實作）
- ⏳ 不同寶可夢有不同的基礎 HP（尚未實作）
- ⏳ 根據能力值設定戰鬥難度（尚未實作）
- ⏳ 能力值成長系統（尚未實作）

### 4.3 進化系統 ✅ **部分完成**
- ✅ 在詳細視窗中顯示進化鏈（已實作）
- ⏳ 收集足夠的經驗值或材料進化（尚未實作）
- ⏳ 進化後能力值提升（尚未實作）
- ⏳ 進化動畫效果（尚未實作）

### 4.4 圖鑑系統 ✅ **部分完成**
- ✅ 顯示寶可夢的詳細資訊（能力值、特性、招式、進化鏈、身高體重等）（已實作）
- ⏳ 圖鑑描述（Flavor Text）（尚未實作）
- ⏳ 分類資訊（Genera）（尚未實作）
- ⏳ 完成圖鑑的成就系統（尚未實作）

### 4.5 稀有度系統 ✅ **部分完成**
- ✅ 傳說寶可夢特殊視覺效果（金色背景、邊框、標記）（已實作）
- ⏳ 傳說/幻之寶可夢更難遇到（尚未實作）
- ⏳ 異色寶可夢稀有度（尚未實作）
- ⏳ 根據稀有度給予不同獎勵（尚未實作）

### 4.6 招式系統 ✅ **部分完成**
- ✅ 在詳細視窗中顯示招式列表和學習等級（已實作）
- ⏳ 不同寶可夢可以學習不同招式（尚未在戰鬥中使用）
- ⏳ 招式有不同的效果（傷害、狀態等）（尚未實作）

---

## 5. API 使用限制

- **無需 API Key**（免費使用）
- **有速率限制**（建議使用快取）
- **目前已有快取機制**（`pokemonNameCache`）

---

## 6. 範例 API 調用

### 獲取皮卡丘的詳細資訊
```javascript
const response = await fetch('https://pokeapi.co/api/v2/pokemon/25');
const data = await response.json();

// 獲取屬性
const types = data.types.map(t => t.type.name); // ["electric"]

// 獲取能力值
const stats = {};
data.stats.forEach(stat => {
  stats[stat.stat.name] = stat.base_stat;
});
// { hp: 35, attack: 55, defense: 40, ... }

// 獲取特性
const abilities = data.abilities.map(a => a.ability.name);
// ["static", "lightning-rod"]
```

---

## 7. 功能實作進度總結

### ✅ 已完成的功能

1. **屬性系統（Types）**
   - ✅ 從 PokeAPI 獲取屬性資訊
   - ✅ 在戰鬥場景中顯示屬性標籤和邊框顏色
   - ✅ 在背包中顯示屬性標籤和邊框顏色
   - ✅ 保存屬性到資料庫

2. **詳細資訊視窗（PokemonDetailModal）**
   - ✅ 點擊卡片顯示詳細資訊
   - ✅ 顯示能力值（Stats）
   - ✅ 顯示特性（Abilities）
   - ✅ 顯示招式列表（Moves，前 10 個，含學習等級）
   - ✅ 顯示進化鏈（Evolution Chain）
   - ✅ 顯示身高體重（Height/Weight）

3. **英文名字顯示**
   - ✅ 背包中顯示寶可夢的英文名字（取代原本的英文單字）

4. **傳說寶可夢特殊效果**
   - ✅ 金色漸層背景
   - ✅ 金色邊框和閃光動畫
   - ✅ 特殊標記（⭐ 星星、👑 皇冠）

### ⏳ 部分完成的功能

1. **屬性系統**
   - ⏳ 屬性相剋系統（尚未實作）
   - ⏳ 屬性相關的遊戲機制（尚未實作）

2. **能力值系統**
   - ⏳ 根據能力值設定戰鬥難度（尚未實作）
   - ⏳ 不同寶可夢有不同的基礎 HP（尚未實作）

3. **招式系統**
   - ⏳ 在戰鬥中使用不同招式（尚未實作）
   - ⏳ 招式效果系統（尚未實作）

4. **進化系統**
   - ⏳ 實際的進化功能（尚未實作）

### ❌ 尚未實作的功能

1. **圖鑑描述（Flavor Text）**
2. **分類資訊（Genera）**
3. **異色寶可夢（Shiny）**
4. **捕捉率（Capture Rate）**
5. **屬性相剋系統**
6. **能力值影響戰鬥系統**
7. **招式學習和使用系統**
8. **進化功能**
9. **圖鑑成就系統**

---

## 8. 新增的組件和功能

### 新增的 React 組件

1. **`PokemonDetailModal.jsx`**
   - 寶可夢詳細資訊彈跳視窗
   - 顯示完整的寶可夢資料

### 新增的函數和功能

1. **`fetchPokemonData()`** (在 `useGameEngine.js`)
   - 從 PokeAPI 獲取完整的寶可夢資料（包含屬性、能力值等）

2. **`fetchPokemonTypes()`** (在 `BagModal.jsx`)
   - 為舊資料補全屬性資訊

3. **`fetchPokemonEnglishName()`** (在 `BagModal.jsx`)
   - 獲取寶可夢的英文名字

4. **`isLegendary()`** (在 `BagModal.jsx`)
   - 判斷是否為傳說寶可夢

### 更新的組件

1. **`BattleScene.jsx`**
   - 新增屬性標籤顯示
   - 新增屬性邊框顏色

2. **`BagModal.jsx`**
   - 新增屬性標籤和邊框顏色
   - 新增英文名字顯示
   - 新增傳說寶可夢特殊效果
   - 新增點擊卡片打開詳細視窗功能

3. **`GameContext.jsx`**
   - 新增 `enemyTypes` 狀態

4. **`useGameEngine.js`**
   - 新增 `fetchPokemonData()` 函數
   - 新增 `currentEnemyTypes` 變數
   - 更新 `nextEnemy()` 獲取屬性資訊
   - 更新收服邏輯保存屬性資訊

---

## 9. 玩家對戰系統（PvP）計畫 ❌ **尚未實作**

### 9.1 技術方案分析

#### 方案 1：Firestore 即時監聽 ⭐ **推薦方案**
- **技術**: Firebase Firestore `onSnapshot`
- **優點**:
  - ✅ 使用現有 Firebase，無需額外服務
  - ✅ 實作簡單，快速上線
  - ✅ 免費額度通常足夠
  - ✅ 即時性良好（100-500ms 延遲）
- **缺點**:
  - ⚠️ 需要處理併發與狀態同步
  - ⚠️ 延遲略高於 WebSocket（但回合制可接受）
- **實作複雜度**: ⭐⭐ (簡單)

#### 方案 2：Firebase Realtime Database
- **技術**: Firebase Realtime Database（WebSocket 底層）
- **優點**:
  - ✅ 即時性更好（WebSocket）
  - ✅ 適合頻繁更新
- **缺點**:
  - ⚠️ 需要新增 Realtime Database（與 Firestore 分開）
  - ⚠️ 查詢能力較弱
- **實作複雜度**: ⭐⭐⭐ (中等)

#### 方案 3：Firebase Cloud Functions + Firestore
- **技術**: Cloud Functions 作為遊戲邏輯服務器
- **優點**:
  - ✅ 服務器端驗證，防止作弊
  - ✅ 可處理複雜邏輯
- **缺點**:
  - ⚠️ 需要設置 Cloud Functions
  - ⚠️ 可能有冷啟動延遲
  - ⚠️ 需要付費（免費額度有限）
- **實作複雜度**: ⭐⭐⭐⭐ (複雜)

#### 方案 4：WebSocket 服務器（Socket.io）
- **技術**: 自建 WebSocket 服務器（Node.js + Socket.io）
- **優點**:
  - ✅ 即時性最佳
  - ✅ 可完全控制邏輯
- **缺點**:
  - ⚠️ 需要維護服務器
  - ⚠️ 需要額外成本（VPS/雲服務）
  - ⚠️ 實作複雜度最高
- **實作複雜度**: ⭐⭐⭐⭐⭐ (非常複雜)

### 9.2 推薦方案：方案 1（Firestore 即時監聽）

**選擇理由**:
1. 使用現有 Firebase，無需額外服務
2. 實作簡單，快速上線
3. 免費額度通常足夠
4. 延遲可接受（回合制對戰）

### 9.3 Firestore 資料結構設計

#### Collection: `battles`
```javascript
// Document ID: battleId (自動生成)
{
  // 玩家資訊
  player1: {
    uid: "user1_uid",
    name: "玩家A",
    photo: "avatar_url",
    pokemon: {
      speciesId: 25,
      name: "皮卡丘",
      level: 10,
      hp: 100,
      maxHp: 100,
      types: ["electric"],
      stats: {
        hp: 35,
        attack: 55,
        defense: 40,
        // ...
      }
    },
    ready: false,
    lastAction: null,
    lastActionTime: null
  },
  player2: {
    uid: "user2_uid",
    name: "玩家B",
    photo: "avatar_url",
    pokemon: {
      speciesId: 4,
      name: "小火龍",
      level: 10,
      hp: 100,
      maxHp: 100,
      types: ["fire"],
      stats: {
        hp: 39,
        attack: 52,
        defense: 43,
        // ...
      }
    },
    ready: false,
    lastAction: null,
    lastActionTime: null
  },
  
  // 對戰狀態
  currentTurn: "player1", // 當前回合玩家
  status: "waiting" | "active" | "finished",
  winner: null, // "player1" | "player2" | "draw"
  turnNumber: 1,
  
  // 行動記錄
  moves: [
    {
      player: "player1",
      action: "attack" | "defend" | "switch",
      word: "pikachu", // 輸入的單字
      correct: true, // 是否正確
      damage: 20,
      timestamp: "2025-12-16T10:00:00Z"
    }
  ],
  
  // 元數據
  createdAt: timestamp,
  updatedAt: timestamp,
  roomCode: "ABC123" // 房間代碼（可選，用於快速加入）
}
```

### 9.4 核心功能模組（待實作）

#### 需要新增的組件：
1. **`BattleLobby.jsx`** ❌
   - 對戰大廳
   - 創建房間 / 加入房間
   - 房間列表顯示

2. **`BattleRoom.jsx`** ❌
   - 對戰房間
   - 選擇出戰寶可夢
   - 等待對手準備

3. **`PvPBattleScene.jsx`** ❌
   - PvP 對戰場景
   - 顯示雙方寶可夢和 HP
   - 顯示當前回合玩家

4. **`usePvPBattle.js`** ❌
   - PvP 對戰邏輯 Hook
   - Firestore 即時監聽
   - 行動處理和傷害計算

### 9.5 對戰流程設計

```
1. 玩家 A 創建房間
   ↓
2. 生成房間 ID，寫入 Firestore (status: "waiting")
   ↓
3. 玩家 B 輸入房間 ID 加入
   ↓
4. 雙方選擇出戰寶可夢（從 pokemonBag 中選擇）
   ↓
5. 雙方都 ready → 開始對戰 (status: "active")
   ↓
6. 輪流行動（輸入英文單字）
   - 當前回合玩家輸入單字
   - 驗證是否正確
   - 計算傷害
   - 更新 HP
   ↓
7. 切換回合 (currentTurn 切換)
   ↓
8. 判斷勝負（HP <= 0）
   ↓
9. 結束對戰 (status: "finished")
   ↓
10. 結算獎勵（經驗值、金幣等）
```

### 9.6 需要討論和決定的問題

#### 9.6.1 對戰模式
- [ ] **回合制**（輪流行動）- 推薦
- [ ] **即時制**（同時行動，比速度）
- [ ] **其他模式**

#### 9.6.2 傷害計算系統
- [ ] **簡單模式**: 固定傷害（如：正確 +20，錯誤 -10）
- [ ] **屬性相剋**: 加入屬性相剋系統（火 > 草 > 水 > 火）
- [ ] **能力值系統**: 使用寶可夢實際能力值計算傷害
- [ ] **隨機因素**: 加入隨機暴擊、閃避等機制

#### 9.6.3 匹配系統
- [ ] **房間 ID 匹配**: 玩家輸入房間代碼加入
- [ ] **隨機匹配**: 自動匹配在線玩家
- [ ] **好友對戰**: 從好友列表選擇對手
- [ ] **等級匹配**: 根據玩家等級匹配

#### 9.6.4 獎勵系統
- [ ] **勝利獎勵**: 經驗值、金幣、道具
- [ ] **失敗懲罰**: 是否扣除經驗值/金幣
- [ ] **連勝獎勵**: 連續勝利額外獎勵
- [ ] **每日對戰限制**: 是否限制每日對戰次數

#### 9.6.5 斷線處理
- [ ] **超時判定**: 玩家超時未行動自動判定失敗
- [ ] **重連機制**: 斷線後重新連接恢復對戰
- [ ] **觀戰模式**: 其他玩家可以觀看對戰

#### 9.6.6 其他功能
- [ ] **對戰記錄**: 保存對戰歷史
- [ ] **排行榜**: 對戰勝率、連勝記錄
- [ ] **對戰回放**: 可以回放對戰過程
- [ ] **聊天系統**: 對戰中文字聊天

### 9.7 實作優先順序建議

#### Phase 1: 基礎對戰系統 ⭐⭐⭐
1. Firestore 資料結構設計
2. `BattleLobby.jsx` - 創建/加入房間
3. `BattleRoom.jsx` - 選擇寶可夢
4. `PvPBattleScene.jsx` - 基本對戰場景
5. `usePvPBattle.js` - 基礎對戰邏輯
6. 簡單傷害計算（固定傷害）

#### Phase 2: 進階功能 ⭐⭐
1. 屬性相剋系統
2. 能力值影響傷害
3. 對戰記錄
4. 斷線處理

#### Phase 3: 優化功能 ⭐
1. 隨機匹配
2. 排行榜
3. 對戰回放
4. 聊天系統

### 9.8 技術細節

#### Firestore 即時監聽範例
```javascript
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// 監聽對戰狀態
const battleRef = doc(db, 'battles', battleId);
const unsubscribe = onSnapshot(battleRef, (snapshot) => {
  const battleData = snapshot.data();
  // 更新本地狀態
  setBattleState(battleData);
});

// 發送行動
await updateDoc(battleRef, {
  [`player1.lastAction`]: {
    action: 'attack',
    word: 'pikachu',
    correct: true,
    damage: 20,
    timestamp: new Date().toISOString()
  },
  currentTurn: 'player2',
  updatedAt: new Date().toISOString()
});
```

### 9.9 相關檔案位置

- **資料結構**: `src/utils/battleSchema.js` (待創建)
- **對戰邏輯**: `src/hooks/usePvPBattle.js` (待創建)
- **大廳組件**: `src/components/BattleLobby.jsx` (待創建)
- **房間組件**: `src/components/BattleRoom.jsx` (待創建)
- **對戰場景**: `src/components/PvPBattleScene.jsx` (待創建)
- **傷害計算**: `src/utils/battleCalculator.js` (待創建)

