import { BIOME_GROUPS, KantoPokemonEncounterData, TOXIC_POOL_POKEMONIDS } from "../utils/KantoPokemonCatchRate";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonDao, RawPokemonData } from "../dataAccessObj/pokemon";
import { BiomeData, BiomeType } from "../dataAccessObj/BiomeData";
import { PokemonFactory } from "./CreatePokemonHandler";
import { DifficultyManager } from "../manager/DifficultyManager";
import * as pokemonGen1Data from "../data/pokemonGen1.json";

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;
const MAX_DEPTH = 6;
export interface EncounterResult {
    biomeType: BiomeType;
    depth: number;
    pokemon?: PokemonDao
}

export interface EncounterHandlerMethods {
    calculateEncounter: (difficultyManager: DifficultyManager, filePath: string, playingTime: number) => Promise<EncounterResult | undefined>;
    getBiome: (filePath: string) => BiomeData;
}

export const EncounterHandler = (pathResolver?: (path: string) => string): EncounterHandlerMethods => {

    // String -> Hash Number
    function getHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    // 加權隨機抽取 (Weighted Random Selection)
    // 核心邏輯：EncounterRate 越高，被選中的區間越大
    function pickWeightedPokemon(candidates: PokeEncounterData[], playingTime: number, difficultyManager: DifficultyManager): PokeEncounterData | null {
        if (candidates.length === 0) return null;

        let pool = candidates;

        // DDA: Filter by recommended range
        // 使用 DifficultyManager 推薦的遭遇率區間來篩選寶可夢
        // 這會根據玩家近期的表現 (勝率、捕獲率等) 動態調整遇到的寶可夢稀有度
        if (difficultyManager) {
            const { min, max } = difficultyManager.recommendNextEncounterRange();
            const filtered = candidates.filter(p => p.encounterRate >= min && p.encounterRate <= max);
            console.log(`[EncounterHandler] DDA Filter: Range=[${min}, ${max}], Before=${candidates.length}, After=${filtered.length}`);
            if (filtered.length > 0) {
                pool = filtered;
            }
        }

        // 1. 計算總權重 (Total Weight)
        // 遊玩時間越久，增加遇到稀有寶可夢的機率
        // 透過加入一個固定的「幸運權重」，對於原本權重低 (稀有) 的寶可夢來說，相對提升幅度會比常見寶可夢大
        // 
        // [數學原理]
        // 假設 Bonus = 10
        // - 稀有怪 (原本 10): 10 + 10 = 20 (數值翻倍，機率顯著提升)
        // - 常見怪 (原本 90): 90 + 10 = 100 (僅增加 11%，機率相對下降)
        // 
        // 結論：加固定數值會「拉平」機率分佈，讓稀有怪相對更容易被選中。
        const maxBonusWeight = 10;
        const progress = Math.min(1, playingTime / (90 * 24 * 60 * 60 * 1000)); // 90天滿
        const bonusWeight = maxBonusWeight * progress;

        const boostedCandidates = pool.map(p => ({
            ...p,
            encounterRate: p.encounterRate + bonusWeight
        }));
        const boostedTotalWeight = boostedCandidates.reduce((sum, p) => sum + p.encounterRate, 0);

        console.log(`[EncounterHandler] Weighted Pick: PoolSize=${pool.length}, BonusWeight=${bonusWeight.toFixed(2)}, TotalWeight=${boostedTotalWeight.toFixed(2)}`);

        // 2. 取隨機數
        let random = Math.random() * boostedTotalWeight;

        // 3. 找出落在區間內的寶可夢
        for (const pokemon of boostedCandidates) {
            if (random < pokemon.encounterRate) {
                return pokemon;
            }
            random -= pokemon.encounterRate;
        }
        return boostedCandidates[0]; // Fallback
    }


    function getfilePattern(filePath: string): { depth: number; fileName: string, folderPath: string } {
        const resolvedPath = pathResolver ? pathResolver(filePath) : filePath;
        const normalizedPath = resolvedPath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        const fileName = parts.pop() || '';
        const folderPath = parts.join('/');

        // src/index.ts -> parts=['src'] -> depth=2
        return { depth: parts.length + 1, fileName, folderPath }
    }

    function getBiome(filePath: string): BiomeData {
        const { depth, folderPath } = getfilePattern(filePath);
        console.log(`[Biome Detection] Path: ${folderPath} | Depth: ${depth}`);
        const folderHash = getHash(folderPath);
        console.log(`[Biome Detection] Folder Hash: ${folderHash}`);

        // 取得所有可用的 Biome Key (排除 None)
        const availableBiomes = Object.keys(BIOME_GROUPS) as BiomeType[];
        console.log(`[Biome Detection] Available Biomes: ${availableBiomes.join(", ")}`);

        // 根據 Hash 決定 Index
        var index = folderHash % availableBiomes.length;

        // 取得對應的 BiomeType
        var biomeType = availableBiomes[index];

        console.log(`[Biome Detection] Biome Type: ${biomeType}`);
        return {
            biomeType: depth < MAX_DEPTH ? biomeType : BiomeType.ToxicWaste,
            pokemonTypes: depth < MAX_DEPTH ? BIOME_GROUPS[biomeType] : []
        };
    }

    async function calculateEncounter(difficultyManager: DifficultyManager,filePath: string, playingTime: number): Promise<EncounterResult | undefined> {
        // 1. 解析路徑與深度
        // 去除 workspace root 等前綴，確保路徑相對乾淨
        // 深度計算 (假設 src/index.ts 深度為 2)
        const { depth, fileName, folderPath } = getfilePattern(filePath);

        console.log(`[探索] 路徑: ${folderPath} | 檔名: ${fileName} | 深度: ${depth}`);

        let candidatePool: PokeEncounterData[] = [];
        const { pokemonTypes: biomePokemonTypes, biomeType } = getBiome(filePath);

        // 2. 判斷深度區域 (黃金區間邏輯)
        if (depth >= MAX_DEPTH) {
            // === TOXIC ZONE (深淵) ===
            candidatePool = KantoPokemonEncounterData.filter(p => TOXIC_POOL_POKEMONIDS.includes(p.pokemonId));

        } else {
            // === NORMAL / GOLD ZONE ===
            // B. 篩選候選名單
            candidatePool = KantoPokemonEncounterData.filter(p => {
                // 規則 1: 屬性必須符合當前生態系
                const pokemonData = pokemonDataMap[String(p.pokemonId)];
                const pTypes = pokemonData ? pokemonData.types : [];
                const typeMatch = pTypes.some(t => biomePokemonTypes.includes(t as any));

                // 規則 2: 寶可夢的最小深度 <= 當前深度
                // (防止在深度 1 遇到噴火龍，但深度 5 可以遇到綠毛蟲)
                const depthMatch = p.minDepth <= depth;

                // 規則 3: 如果是黃金區間 (3-5)，稍微過濾掉太爛的怪 (可選)
                // 這裡我們不做強制過濾，讓 Catch Rate 去處理 (波波還是很容易遇到)

                return typeMatch && depthMatch;
            });
        }

        // 3. 進行加權抽取
        const encounterResult = pickWeightedPokemon(candidatePool, playingTime, difficultyManager);
        if (encounterResult === null) {
            return undefined;
        }


        const newPokemon = await PokemonFactory.createWildPokemonInstance(encounterResult as PokeEncounterData,difficultyManager, filePath, undefined);

        console.log(`[Encounter] Depth: ${depth} | Biome: ${biomeType} | Candidates: ${candidatePool.length}`);

        return {
            biomeType: biomeType,
            depth: depth,
            pokemon: newPokemon
        };
    }

    return {
        calculateEncounter,
        getBiome,

    };
};
