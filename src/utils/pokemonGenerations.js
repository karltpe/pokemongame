// src/utils/pokemonGenerations.js
// 寶可夢世代索引 - 定義每個世代的 ID 範圍

/**
 * ★ 當前開放的世代（累積概念）
 * 修改此值即可切換到不同世代
 * 
 * 例如：
 * - CURRENT_GENERATION = 1 → 只開放第 1 代（ID 1-151）
 * - CURRENT_GENERATION = 5 → 開放第 1-5 代（ID 1-649）
 * - CURRENT_GENERATION = 9 → 開放第 1-9 代（ID 1-1025）
 * 
 * 注意：這是累積的，設定為 5 時會包含第 1、2、3、4、5 代的所有寶可夢
 */
export const CURRENT_GENERATION = 1;

/**
 * 寶可夢世代定義
 * 每個世代包含：
 * - minId: 該世代的最小 ID
 * - maxId: 該世代的最大 ID
 * - name: 世代名稱
 */
export const POKEMON_GENERATIONS = {
  1: {
    minId: 1,
    maxId: 151,
    name: '第一世代（關都地區）',
    legendaryIds: [144, 145, 146, 150, 151], // 急凍鳥、閃電鳥、火焰鳥、超夢、夢幻
  },
  2: {
    minId: 152,
    maxId: 251,
    name: '第二世代（城都地區）',
    legendaryIds: [243, 244, 245, 249, 250], // 雷公、炎帝、水君、洛奇亞、鳳王
  },
  3: {
    minId: 252,
    maxId: 386,
    name: '第三世代（豐緣地區）',
    legendaryIds: [382, 383, 384], // 蓋歐卡、固拉多、烈空坐
  },
  4: {
    minId: 387,
    maxId: 493,
    name: '第四世代（神奧地區）',
    legendaryIds: [483, 484, 487], // 帝牙盧卡、帕路奇亞、騎拉帝納
  },
  5: {
    minId: 494,
    maxId: 649,
    name: '第五世代（合眾地區）',
    legendaryIds: [],
  },
  6: {
    minId: 650,
    maxId: 721,
    name: '第六世代（卡洛斯地區）',
    legendaryIds: [],
  },
  7: {
    minId: 722,
    maxId: 809,
    name: '第七世代（阿羅拉地區）',
    legendaryIds: [],
  },
  8: {
    minId: 810,
    maxId: 905,
    name: '第八世代（伽勒爾地區）',
    legendaryIds: [],
  },
  9: {
    minId: 906,
    maxId: 1025,
    name: '第九世代（帕底亞地區）',
    legendaryIds: [1001, 1002, 1003, 1004, 1008, 1009, 1017, 1018, 1019, 1020, 1024, 1025], // 四災獸、封面神獸、DLC神獸等
  },
};

/**
 * 根據 ID 判斷寶可夢屬於哪個世代
 * @param {number} pokemonId - 寶可夢 ID
 * @returns {number|null} - 世代編號，如果不在任何世代範圍內則返回 null
 */
export function getGenerationByPokemonId(pokemonId) {
  for (const [gen, data] of Object.entries(POKEMON_GENERATIONS)) {
    if (pokemonId >= data.minId && pokemonId <= data.maxId) {
      return parseInt(gen);
    }
  }
  return null;
}

/**
 * 檢查寶可夢 ID 是否屬於指定世代
 * @param {number} pokemonId - 寶可夢 ID
 * @param {number} generation - 世代編號
 * @returns {boolean}
 */
export function isPokemonInGeneration(pokemonId, generation) {
  const genData = POKEMON_GENERATIONS[generation];
  if (!genData) return false;
  return pokemonId >= genData.minId && pokemonId <= genData.maxId;
}

/**
 * 獲取指定世代的所有 ID 範圍
 * @param {number} generation - 世代編號
 * @returns {{minId: number, maxId: number}|null}
 */
export function getGenerationRange(generation) {
  const genData = POKEMON_GENERATIONS[generation];
  if (!genData) return null;
  return {
    minId: genData.minId,
    maxId: genData.maxId,
  };
}

/**
 * 獲取從第 1 代到指定世代的所有 ID 範圍（累積範圍）
 * @param {number} maxGeneration - 最大世代編號
 * @returns {{minId: number, maxId: number}|null}
 */
export function getCumulativeGenerationRange(maxGeneration) {
  const firstGen = POKEMON_GENERATIONS[1];
  const maxGen = POKEMON_GENERATIONS[maxGeneration];
  if (!firstGen || !maxGen) return null;
  return {
    minId: firstGen.minId, // 從第 1 代開始
    maxId: maxGen.maxId,   // 到當前世代結束
  };
}

/**
 * 獲取指定世代的神獸 ID 列表
 * @param {number} generation - 世代編號
 * @returns {number[]}
 */
export function getLegendaryIdsByGeneration(generation) {
  const genData = POKEMON_GENERATIONS[generation];
  if (!genData) return [];
  return genData.legendaryIds || [];
}

/**
 * 獲取從第 1 代到指定世代的所有神獸 ID 列表（累積列表）
 * @param {number} maxGeneration - 最大世代編號
 * @returns {number[]}
 */
export function getCumulativeLegendaryIds(maxGeneration) {
  const allLegendaryIds = [];
  for (let gen = 1; gen <= maxGeneration; gen++) {
    const genData = POKEMON_GENERATIONS[gen];
    if (genData && genData.legendaryIds) {
      allLegendaryIds.push(...genData.legendaryIds);
    }
  }
  return allLegendaryIds;
}

/**
 * 檢查寶可夢 ID 是否在從第 1 代到指定世代的累積範圍內
 * @param {number} pokemonId - 寶可夢 ID
 * @param {number} maxGeneration - 最大世代編號
 * @returns {boolean}
 */
export function isPokemonInCumulativeGeneration(pokemonId, maxGeneration) {
  const cumulativeRange = getCumulativeGenerationRange(maxGeneration);
  if (!cumulativeRange) return false;
  return pokemonId >= cumulativeRange.minId && pokemonId <= cumulativeRange.maxId;
}

/**
 * 過濾進化鏈，只保留從第 1 代到指定世代內的寶可夢（累積概念）
 * @param {Object} evolutionChain - PokeAPI 的進化鏈資料
 * @param {number} maxGeneration - 最大允許的世代（例如：5 表示允許第 1-5 代）
 * @returns {Object|null} - 過濾後的進化鏈，如果全部被過濾則返回 null
 */
export function filterEvolutionChainByGeneration(evolutionChain, maxGeneration) {
  if (!evolutionChain || !evolutionChain.chain) return null;

  // 從 PokeAPI 的 URL 中提取寶可夢 ID
  // URL 格式：https://pokeapi.co/api/v2/pokemon-species/{id}/
  function extractIdFromUrl(url) {
    const match = url.match(/pokemon-species\/(\d+)\//);
    return match ? parseInt(match[1]) : null;
  }

  // 遞迴過濾進化鏈
  function filterChain(chain) {
    if (!chain) return null;

    const pokemonId = extractIdFromUrl(chain.species?.url);
    // ★ 修正：使用累積世代檢查（從第 1 代到 maxGeneration）
    const isAllowed = pokemonId && isPokemonInCumulativeGeneration(pokemonId, maxGeneration);

    // 如果當前寶可夢不在允許的世代內，直接返回 null（不顯示）
    if (!isAllowed) {
      return null;
    }

    // 過濾進化分支：只保留在允許世代內的進化
    const filteredEvolvesTo = (chain.evolves_to || [])
      .map(filterChain)
      .filter(Boolean); // 移除 null

    // 返回過濾後的鏈（只包含允許世代內的進化）
    return {
      ...chain,
      evolves_to: filteredEvolvesTo,
    };
  }

  const filtered = filterChain(evolutionChain.chain);
  if (!filtered) return null;

  return {
    ...evolutionChain,
    chain: filtered,
  };
}

