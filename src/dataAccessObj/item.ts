export type ItemCategory = 
    | 'Medicine'      // 藥品 (Potion, Revive)
    | 'PokeBalls'     // 精靈球
    | 'Machines'      // 招式學習器 (TM/HM)
    | 'Berries'       // 樹果
    | 'KeyItems'      // 關鍵道具 (Bicycle, Old Rod)
    | 'BattleItems'   // 戰鬥道具 (X Attack)
    | 'HeldItems'     // 攜帶道具 (Leftovers, Choice Scarf)
    | 'Evolution'     // 進化道具 (Fire Stone)
    | 'Treasures'     // 貴重物品 (Nugget)
    | 'Mail';         // 信件

export type ItemPocket = 
    | 'items'         // 一般道具口袋
    | 'medicine'      // 藥品口袋 (有些世代分開)
    | 'balls'         // 精靈球口袋
    | 'tmhm'          // 招式機器口袋
    | 'berries'       // 樹果口袋
    | 'key';          // 關鍵道具口袋

export type StatType = 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed' | 'accuracy' | 'evasion';

export interface ItemEffect {
    // --- 恢復類 ---
    healHp?: number;            // 恢復固定 HP 數值 (例如: Potion = 20)
    healHpPercent?: number;     // 恢復 HP 百分比 (例如: Full Restore = 100)
    healStatus?: string[];      // 解除異常狀態 (例如: ['poison', 'burn'], ['all'] for Full Heal)
    revive?: boolean;           // 是否復活
    reviveHpPercent?: number;   // 復活後 HP 百分比 (Revive = 50, Max Revive = 100)
    restorePp?: number;         // 恢復 PP 數值 (Ether = 10)
    restorePpAll?: boolean;     // 是否恢復所有招式 PP (Max Elixir)

    // --- 捕捉類 ---
    catchRateMultiplier?: number; // 捕捉率倍率 (Ultra Ball = 2.0)
    
    // --- 能力提升類 (戰鬥道具 / 營養飲料) ---
    statBoosts?: {
        stat: StatType;
        stages?: number;        // 戰鬥中提升等級 (X Attack = 2)
        evYield?: number;       // 努力值提升 (Protein = 10)
    }[];

    // --- 教招式類 (TM/HM) ---
    teachMove?: string;        // 教招式 名稱列表

    // --- 進化類 ---
    evolutionCriteria?: {
        type: 'stone' | 'trade' | 'level-up' | 'location';
        targetPokemon?: string[]; // 適用寶可夢 (例如: Eevee)
    };

    // --- 樹果/攜帶道具特殊效果 ---
    triggerCondition?: 'hp-below-half' | 'hp-below-quarter' | 'status-condition' | 'hit-by-super-effective';
    heldEffect?: string; // 描述攜帶效果 (例如: "Boosts Fire-type moves")
}

export interface FlingEffect {
    power: number;      // 投擲威力
    effectId?: string;  // 投擲特殊效果 ID (例如: 'flinch', 'poison')
}

export interface ItemDao {
    // --- 基礎資訊 ---
    id: number;             // PokeAPI ID
    name: string;           // 顯示名稱 (例如: "Super Potion")
    apiName: string;        // API 識別碼 (例如: "super-potion")
    category: ItemCategory; // 詳細分類
    pocket: ItemPocket;     // 背包分類 (UI 顯示用)
    description: string;    // 道具說明文
    
    // --- 經濟 ---
    price: number;          // 購買價格 (0 代表不可購買)
    sellPrice: number;      // 販賣價格 (通常是 price / 2)

    // --- 使用屬性 ---
    isConsumable: boolean;      // 使用後是否消耗
    isUsableInBattle: boolean;  // 是否可在戰鬥中使用
    isUsableOverworld: boolean; // 是否可在地圖上使用
    isHoldable: boolean;        // 是否可被寶可夢攜帶
    
    // --- 功能效果 ---
    effect?: ItemEffect;        // 具體效果數值
    fling?: FlingEffect;        // 投擲招式 (Fling) 的效果

    // --- 視覺 ---
    spriteUrl: string;          // 圖片連結

    // --- 庫存 (如果是實例化物件) ---
    totalSize: number;              // 擁有數量
}

// --- PokeAPI Response Interfaces (Partial) ---
export interface PokeApiItem {
    id: number;
    name: string;
    cost: number;
    sprites: {
        default: string;
    };
    names: {
        name: string;
        language: { name: string };
    }[];
    flavor_text_entries: {
        text: string;
        language: { name: string };
        version_group: { name: string };
    }[];
    attributes: {
        name: string;
    }[];
    category: {
        name: string;
    };
    fling_power?: number;
    fling_effect?: {
        name: string;
    };
}

// --- Adapter Function ---
export const adaptPokeApiItem = (data: PokeApiItem, totalSize: number = 1): ItemDao => {
    // 1. Basic Fields
    const item: ItemDao = {
        id: data.id,
        apiName: data.name,
        name: data.names.find(n => n.language.name === 'en')?.name || data.name,
        price: data.cost,
        sellPrice: Math.floor(data.cost / 2),
        spriteUrl: data.sprites.default,
        totalSize: totalSize,
        
        // 2. Description (Find first English entry, clean up newlines)
        description: data.flavor_text_entries.find(f => f.language.name === 'en')?.text.replace(/[\n\f]/g, ' ') || '',

        // 3. Attributes
        isConsumable: data.attributes.some(a => a.name === 'consumable'),
        isUsableInBattle: data.attributes.some(a => a.name === 'usable-in-battle'),
        isUsableOverworld: data.attributes.some(a => a.name === 'usable-overworld'),
        isHoldable: data.attributes.some(a => a.name === 'holdable'),

        // 4. Category & Pocket Mapping
        ...mapCategoryAndPocket(data.category.name),

        // 5. Fling
        fling: data.fling_power ? {
            power: data.fling_power,
            effectId: data.fling_effect?.name
        } : undefined,

        // 6. Effects (Manual Mapping required as API doesn't provide numbers)
        effect: getHardcodedItemEffect(data.name)
    };

    return item;
};

// --- Helper: Map PokeAPI Category to our ItemCategory & ItemPocket ---
const mapCategoryAndPocket = (apiCategory: string): { category: ItemCategory, pocket: ItemPocket } => {
    switch (apiCategory) {
        // Medicine
        case 'healing':
        case 'status-cures':
        case 'revival':
        case 'pp-recovery':
        case 'vitamins':
            return { category: 'Medicine', pocket: 'medicine' };
        
        // Balls
        case 'standard-balls':
        case 'special-balls':
        case 'apricorn-balls':
            return { category: 'PokeBalls', pocket: 'balls' };

        // Machines
        case 'all-machines':
            return { category: 'Machines', pocket: 'tmhm' };

        // Berries
        case 'berries':
        case 'mulch':
            return { category: 'Berries', pocket: 'berries' };

        // Battle Items
        case 'stat-boosts':
        case 'flutes':
            return { category: 'BattleItems', pocket: 'items' };

        // Key Items
        case 'key-items':
        case 'plot-advancement':
        case 'gameplay':
            return { category: 'KeyItems', pocket: 'key' };

        // Held Items
        case 'held-items':
        case 'choice':
        case 'effort-training':
        case 'bad-held-items':
        case 'training':
        case 'species-specific':
        case 'type-enhancement':
            return { category: 'HeldItems', pocket: 'items' };

        // Evolution
        case 'evolution':
            return { category: 'Evolution', pocket: 'items' };

        // Treasures
        case 'loot':
        case 'collectibles':
        case 'dex-completion':
            return { category: 'Treasures', pocket: 'items' };

        default:
            return { category: 'Treasures', pocket: 'items' };
    }
};

// --- Helper: Hardcoded Effects for Common Items ---
const getHardcodedItemEffect = (apiName: string): ItemEffect | undefined => {
    const effects: Record<string, ItemEffect> = {
        // HP Recovery
        'potion': { healHp: 20 },
        'super-potion': { healHp: 50 },
        'hyper-potion': { healHp: 200 },
        'max-potion': { healHpPercent: 100 },
        'full-restore': { healHpPercent: 100, healStatus: ['all'] },
        'fresh-water': { healHp: 50 },
        'soda-pop': { healHp: 60 },
        'lemonade': { healHp: 80 },
        'moomoo-milk': { healHp: 100 },

        // Status Cures
        'antidote': { healStatus: ['poison'] },
        'burn-heal': { healStatus: ['burn'] },
        'ice-heal': { healStatus: ['freeze'] },
        'awakening': { healStatus: ['sleep'] },
        'paralyze-heal': { healStatus: ['paralysis'] },
        'full-heal': { healStatus: ['all'] },
        'lava-cookie': { healStatus: ['all'] },

        // Revive
        'revive': { revive: true, reviveHpPercent: 50 },
        'max-revive': { revive: true, reviveHpPercent: 100 },

        // PP Recovery
        'ether': { restorePp: 10 }, // Restores 10 PP to all moves
        'max-ether': { restorePp: 10 }, // Restores 10 PP to all moves
        'elixir': { restorePp: 10 }, // Restores 10 PP to all moves
        'max-elixir': { restorePpAll: true }, // Restores all PP to all moves

        // Balls (Catch Rate Multipliers are complex, simplified here)
        'poke-ball': { catchRateMultiplier: 1.0 },
        'great-ball': { catchRateMultiplier: 1.5 },
        'ultra-ball': { catchRateMultiplier: 2.0 },
        'master-ball': { catchRateMultiplier: 255 }, // Guaranteed

        // Battle Items
        'x-attack': { statBoosts: [{ stat: 'attack', stages: 2 }] },
        'x-defense': { statBoosts: [{ stat: 'defense', stages: 2 }] },
        'x-speed': { statBoosts: [{ stat: 'speed', stages: 2 }] },
        'x-sp-atk': { statBoosts: [{ stat: 'special-attack', stages: 2 }] },
        'x-sp-def': { statBoosts: [{ stat: 'special-defense', stages: 2 }] },
        'x-accuracy': { statBoosts: [{ stat: 'accuracy', stages: 2 }] },
        'dire-hit': { statBoosts: [] }, // Crit rate +2
        'guard-spec': { statBoosts: [] }, // Prevent stat reduction

        // Vitamins (EVs)
        'hp-up': { statBoosts: [{ stat: 'hp', evYield: 10 }] },
        'protein': { statBoosts: [{ stat: 'attack', evYield: 10 }] },
        'iron': { statBoosts: [{ stat: 'defense', evYield: 10 }] },
        'calcium': { statBoosts: [{ stat: 'special-attack', evYield: 10 }] },
        'zinc': { statBoosts: [{ stat: 'special-defense', evYield: 10 }] },
        'carbos': { statBoosts: [{ stat: 'speed', evYield: 10 }] },
        
        // Evolution Stones
        'fire-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['vulpix', 'growlithe', 'eevee', 'pansear'] } },
        'water-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['poliwhirl', 'shellder', 'staryu', 'eevee', 'lombre', 'panpour'] } },
        'thunder-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['pikachu', 'eevee', 'eelektrik'] } },
        'leaf-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['gloom', 'weepinbell', 'exeggcute', 'nuzleaf', 'pansage'] } },
        'moon-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['nidorina', 'nidorino', 'clefairy', 'jigglypuff', 'skitty', 'munna'] } },
        'sun-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['gloom', 'sunkern', 'cottonee', 'petilil', 'helioptile'] } },
    };

    return effects[apiName];
};
