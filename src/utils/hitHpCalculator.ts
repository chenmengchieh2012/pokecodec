import { PokemonDao, PokemonType } from "../dataAccessObj/pokemon";
import { PokemonMove } from "../dataAccessObj/pokeMove";

// 1. 屬性相剋表 (Type Effectiveness Chart) - Gen 6+ Standard
const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

// 判斷招式類別 (物理/特殊) - 基於 Gen 3 以前的屬性分類
// Physical: Normal, Fighting, Flying, Ground, Rock, Bug, Ghost, Poison, Steel
// Special: Water, Grass, Fire, Ice, Electric, Psychic, Dragon, Dark, Fairy
const PHYSICAL_TYPES = new Set<PokemonType>(['normal', 'fighting', 'flying', 'ground', 'rock', 'bug', 'ghost', 'poison', 'steel']);

function getMoveCategory(type: string): 'physical' | 'special' {
    return PHYSICAL_TYPES.has(type as PokemonType) ? 'physical' : 'special';
}

export interface DamageResult {
    damage: number;
    isCritical: boolean;
    effectiveness: number;
    isHit: boolean;
    isSuccessfulEvade?: boolean;
    isSuccessfulAttack?: boolean;
}

export const HitHpCalculator = {
    // 1. 取得屬性相剋倍率
    getTypeEffectiveness: (moveType: string, targetTypes: string[]): number => {
        let multiplier = 1.0;
        const typeData = TYPE_CHART[moveType as PokemonType];
        
        if (!typeData) return 1.0;

        for (const type of targetTypes) {
            const targetType = type as PokemonType;
            if (typeData[targetType] !== undefined) {
                multiplier *= typeData[targetType]!;
            }
        }
        return multiplier;
    },

    // 2. & 3. 攻擊數值計算 (含 STAB 與屬性加成)
    calculateDamage: (attacker: PokemonDao, defender: PokemonDao, move: PokemonMove): DamageResult => {
        if (!move.power) {
            return { 
                damage: 0, 
                isCritical: false, 
                effectiveness: 1, 
                isHit: true,
            };
        }

        const moveType = move.type;
        const category = getMoveCategory(moveType);
        
        // 決定攻擊與防禦數值
        let attackStat = attacker.stats.attack;
        let defenseStat = defender.stats.defense;

        if (category === 'special') {
            attackStat = attacker.stats.specialAttack;
            defenseStat = defender.stats.specialDefense;
        }

        console.log(`[HitHpCalculator] Calculating damage for move ${move.name} (Type: ${moveType}, Category: ${category})`);
        console.log(`[HitHpCalculator] Attacker: ${attacker.name} - Attack Stat: ${attackStat}`);
        console.log(`[HitHpCalculator] Defender: ${defender.name} - Defense Stat: ${defenseStat}`);

        // 基礎傷害公式: ((2 * Level / 5 + 2) * Power * A / D) / 50 + 2
        const levelFactor = (2 * attacker.level) / 5 + 2;
        let damage = ((levelFactor * move.power * (attackStat / defenseStat)) / 50) + 2;

        console.log(`[HitHpCalculator] Base damage before modifiers: ${damage}`);

        // 3. 攻擊屬性加成 (STAB - Same Type Attack Bonus)
        if (attacker.types.some(t => t === moveType)) {
            damage *= 1.5;
        }

        console.log(`[HitHpCalculator] Damage after STAB (if applicable): ${damage}`);

        // 屬性相剋
        const effectiveness = HitHpCalculator.getTypeEffectiveness(moveType, defender.types);
        damage *= effectiveness;

        console.log(`[HitHpCalculator] Damage after type effectiveness (x${effectiveness}): ${damage}`);

        // 隨機浮動 (0.85 ~ 1.00)
        const randomFactor = (Math.floor(Math.random() * 16) + 85) / 100;
        damage *= randomFactor;

        console.log(`[HitHpCalculator] Damage after random factor (x${randomFactor}): ${damage}`);

        // 爆擊 (Critical Hit) - 簡單機率 1/16
        const isCritical = Math.random() < 0.0625;
        if (isCritical) {
            damage *= 1.5;
        }

        // 是否成功命中
        let isSuccessfulAttack = true;
        if (move.accuracy !== null) {
            isSuccessfulAttack = Math.random()*100 < move.accuracy;
        }

        // 是否成功閃避
        let isSuccessfulEvade = false;
        // 根據公式計算閃避率
        if (defender.stats.speed > attacker.stats.speed) {
            const evadeChance = Math.min((defender.stats.speed - attacker.stats.speed) / defender.stats.speed * 100, 50); // 最多50%閃避率
            isSuccessfulEvade = Math.random()*100 < evadeChance;
        }

        // 最終命中結果
        const isHit = isSuccessfulAttack && !isSuccessfulEvade;
        if (!isHit) {
            console.log(`[HitHpCalculator] The move ${move.name} missed!`);
            return {
                damage: 0,
                isCritical: false,
                effectiveness: 1,
                isHit: false,
                isSuccessfulEvade: isSuccessfulEvade,
                isSuccessfulAttack: isSuccessfulAttack
            };
        }


        console.log(`Damage after critical hit (if applicable): ${damage}`);

        return {
            damage: Math.floor(damage),
            isCritical,
            effectiveness,
            isHit: isHit,
            isSuccessfulEvade: isSuccessfulEvade,
            isSuccessfulAttack: isSuccessfulAttack
        };
    }
};
