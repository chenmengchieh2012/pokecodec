import { BIOME_GROUPS, KantoPokemonEncounterData, TOXIC_POOL_POKEMONIDS } from "../utils/KantoPokemonCatchRate";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonDao } from "../dataAccessObj/pokemon";
import { BiomeData, BiomeType } from "../dataAccessObj/BiomeData";
import { PokemonFactory } from "./CreatePokemonHandler";

export interface EncounterResult {
    biomeType: BiomeType;
    depth: number;
    pokemon?: PokemonDao
}

export interface EncounterHandlerMethods {
    calculateEncounter: (filePath: string, playingTime: number) => Promise<EncounterResult | undefined>;
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
    function pickWeightedPokemon(candidates: PokeEncounterData[], playingTime: number): PokeEncounterData | null {
        if (candidates.length === 0) return null;

        // 1. 計算總權重 (Total Weight)
        // 遊玩時間越久，增加遇到稀有寶可夢的機率
        // 透過加入一個固定的「幸運權重」，對於原本權重低 (稀有) 的寶可夢來說，相對提升幅度會比常見寶可夢大
        // 例如：加 10 點權重。稀有 (10->20, 翻倍)，常見 (100->110, 僅增 10%)
        const maxBonusWeight = 10;
        const progress = Math.min(1, playingTime / (90 * 24 * 60 * 60 * 1000)); // 90天滿
        const bonusWeight = maxBonusWeight * progress;

        const boostedCandidates = candidates.map(p => ({
            ...p,
            encounterRate: p.encounterRate + bonusWeight
        }));
        const boostedTotalWeight = boostedCandidates.reduce((sum, p) => sum + p.encounterRate, 0);

        // 2. 取隨機數
        let random = Math.random() * boostedTotalWeight;

        // 3. 找出落在區間內的寶可夢
        for (const pokemon of candidates) {
            if (random < pokemon.encounterRate) {
                return pokemon;
            }
            random -= pokemon.encounterRate;
        }
        return candidates[0]; // Fallback
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
            biomeType: biomeType,
            pokemonTypes: depth < 6 ? BIOME_GROUPS[biomeType] : []
        };
    }

    async function calculateEncounter(filePath: string, playingTime: number): Promise<EncounterResult | undefined> {
        // 1. 解析路徑與深度
        // 去除 workspace root 等前綴，確保路徑相對乾淨
        // 深度計算 (假設 src/index.ts 深度為 2)
        const { depth, fileName, folderPath } = getfilePattern(filePath);

        console.log(`[探索] 路徑: ${folderPath} | 檔名: ${fileName} | 深度: ${depth}`);

        let candidatePool: PokeEncounterData[] = [];
        const { pokemonTypes: pokemonTypes, biomeType } = getBiome(filePath);

        // 2. 判斷深度區域 (黃金區間邏輯)
        if (depth >= 6) {
            // === TOXIC ZONE (深淵) ===
            candidatePool = KantoPokemonEncounterData.filter(p => TOXIC_POOL_POKEMONIDS.includes(p.pokemonId));

        } else {
            // === NORMAL / GOLD ZONE ===
            // B. 篩選候選名單
            candidatePool = KantoPokemonEncounterData.filter(p => {
                // 規則 1: 屬性必須符合當前生態系
                const typeMatch = p.type.some(t => pokemonTypes.includes(t));

                // 規則 2: 寶可夢的最小深度 <= 當前深度
                // (防止在深度 1 遇到噴火龍，但深度 5 可以遇到綠毛蟲)
                const depthMatch = p.minDepth <= depth;

                // 規則 3: 如果是黃金區間 (3-5)，稍微過濾掉太爛的怪 (可選)
                // 這裡我們不做強制過濾，讓 Catch Rate 去處理 (波波還是很容易遇到)

                return typeMatch && depthMatch;
            });
        }

        // 3. 進行加權抽取
        const encounterResult = pickWeightedPokemon(candidatePool, playingTime);
        if (encounterResult === null) {
            return undefined;
        }


        const newPokemon = await PokemonFactory.createWildPokemonInstance(encounterResult as PokeEncounterData, playingTime, filePath);

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
