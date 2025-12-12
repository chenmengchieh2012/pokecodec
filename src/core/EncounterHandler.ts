import { BIOME_GROUPS, KantoPokemonEncounterData, TOXIC_POOL_IDS } from "../utils/KantoPokemonCatchRate";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonType } from "../dataAccessObj/pokemon";

export interface EncounterResult {
    depth: number;
    pokemon: PokeEncounterData | null;
    debugInfo?: {
        biomeTypes: PokemonType[] | "TOXIC";
        candidateCount: number;
    };
}

export interface EncounterHandlerMethods {
    calculateEncounter: (filePath: string) => EncounterResult;
    getBiome: (filePath: string) => {index: number, types: PokemonType[]};
}

export const EncounterHandler = (): EncounterHandlerMethods =>{

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
    // 核心邏輯：CatchRate 越高，被選中的區間越大
    function pickWeightedPokemon(candidates: PokeEncounterData[]): PokeEncounterData | null {
        if (candidates.length === 0) return null;

        // 1. 計算總權重 (Total Weight)
        const totalWeight = candidates.reduce((sum, p) => sum + p.catchRate, 0);

        // 2. 取隨機數
        let random = Math.random() * totalWeight;

        // 3. 找出落在區間內的寶可夢
        for (const pokemon of candidates) {
            if (random < pokemon.catchRate) {
                return pokemon;
            }
            random -= pokemon.catchRate;
        }
        return candidates[0]; // Fallback
    }


    function getfilePattern(filePath: string): { depth: number; fileName: string , folderPath: string} {
        const normalizedPath = filePath.replace(/\\/g, '/'); 
        const parts = normalizedPath.split('/');
        const fileName = parts.pop() || '';
        const folderPath = parts.join('/');
        parts.pop(); // 移除檔名
        return { depth: parts.length, fileName, folderPath }
    }

    function getBiome(filePath: string): {index: number, types: PokemonType[]} {
        const { depth, folderPath } = getfilePattern(filePath);
        const folderHash = getHash(folderPath);
        const index = folderHash % BIOME_GROUPS.length;
        return {index: index, types: depth < 6 ? BIOME_GROUPS[folderHash % BIOME_GROUPS.length] : [] };
    }

    function calculateEncounter(filePath: string): EncounterResult {
        // 1. 解析路徑與深度
        // 去除 workspace root 等前綴，確保路徑相對乾淨
        // 深度計算 (假設 src/index.ts 深度為 2)
        const { depth, fileName, folderPath } = getfilePattern(filePath);

        console.log(`[探索] 路徑: ${folderPath} | 檔名: ${fileName} | 深度: ${depth}`);

        let candidatePool: PokeEncounterData[] = [];
        const {types: biomeTypes} = getBiome(filePath);

        // 2. 判斷深度區域 (黃金區間邏輯)
        if (depth >= 6) {
            // === TOXIC ZONE (深淵) ===
            candidatePool = KantoPokemonEncounterData.filter(p => TOXIC_POOL_IDS.includes(p.id));
            
        } else {
            // === NORMAL / GOLD ZONE ===
            // B. 篩選候選名單
            candidatePool = KantoPokemonEncounterData.filter(p => {
                // 規則 1: 屬性必須符合當前生態系
                const typeMatch = p.type.some(t => biomeTypes.includes(t));
                
                // 規則 2: 寶可夢的最小深度 <= 當前深度
                // (防止在深度 1 遇到噴火龍，但深度 5 可以遇到綠毛蟲)
                const depthMatch = p.minDepth <= depth;

                // 規則 3: 如果是黃金區間 (3-5)，稍微過濾掉太爛的怪 (可選)
                // 這裡我們不做強制過濾，讓 Catch Rate 去處理 (波波還是很容易遇到)
                
                return typeMatch && depthMatch;
            });
        }

        // 3. 進行加權抽取
        const result = pickWeightedPokemon(candidatePool);

        if (!result) {
            return {
                pokemon: null,
                depth: depth,
                debugInfo: {
                    biomeTypes: biomeTypes,
                    candidateCount: candidatePool.length
                }
            };
        }

        return {
            depth: depth,
            pokemon: result,
            debugInfo: {
                biomeTypes: biomeTypes,
                candidateCount: candidatePool.length
            }
        };
    }
    return {
        calculateEncounter,
        getBiome,
        
    };
}
