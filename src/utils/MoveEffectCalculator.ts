import { PokemonAilment, PokemonDao, PokemonStats, PokemonType } from "../dataAccessObj/pokemon";
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

function getStatMultiplier(stage: number): number {
    const maxStage = 6;
    const minStage = -6;
    const clampedStage = Math.max(minStage, Math.min(maxStage, stage));
    
    if (clampedStage >= 0) {
        return (2 + clampedStage) / 2;
    } else {
        return 2 / (2 - clampedStage);
    }
}

export function GetEmptyMoveEffectResult(): MoveEffectResult {
    return {
        damage: 0,
        isCritical: false,
        effectiveness: 1,
        isHit: false,
        isSuccessfulEvade: false,
        isSuccessfulAttack: false,
        attackerStatChanges: undefined,
        defenderStatChanges: undefined,
        flinched: false,
        confused: false,
        ailment: undefined
    };
}

export interface MoveEffectResult {
    damage: number;
    isCritical: boolean;
    effectiveness: number;
    isHit: boolean;
    isSuccessfulEvade?: boolean;
    isSuccessfulAttack?: boolean;
    attackerStatChanges?: PokemonStats;
    defenderStatChanges?: PokemonStats;
    flinched: boolean;
    confused?: boolean;
    ailment: PokemonAilment | undefined;
}

export interface BattlePokemonState {
    effectStats: PokemonStats;
    flinched: boolean;
    confused: boolean;
}

export const MoveEffectCalculator = {
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
    calculateEffect: (attacker: PokemonDao, attackerBuffs: BattlePokemonState, defender: PokemonDao, defenderBuffs: BattlePokemonState, move: PokemonMove): MoveEffectResult => {
        

        const moveType = move.type;
        const category = getMoveCategory(moveType);
        
        // 決定攻擊與防禦數值
        let attackStat = attacker.stats.attack;
        let defenseStat = defender.stats.defense;
        
        // Apply buffs
        let attackStage = attackerBuffs.effectStats.attack;
        let defenseStage = defenderBuffs.effectStats.defense;

        if (category === 'special') {
            attackStat = attacker.stats.specialAttack;
            defenseStat = defender.stats.specialDefense;
            
            attackStage = attackerBuffs.effectStats.specialAttack;
            defenseStage = defenderBuffs.effectStats.specialDefense;
        }
        
        attackStat = Math.floor(attackStat * getStatMultiplier(attackStage));
        defenseStat = Math.floor(defenseStat * getStatMultiplier(defenseStage));

        console.log(`[HitHpCalculator] Calculating damage for move ${move.name} (Type: ${moveType}, Category: ${category})`);
        console.log(`[HitHpCalculator] Attacker: ${attacker.name} - Attack Stat: ${attackStat} (Stage: ${attackStage})`);
        console.log(`[HitHpCalculator] Defender: ${defender.name} - Defense Stat: ${defenseStat} (Stage: ${defenseStage})`);

        // 基礎傷害公式: ((2 * Level / 5 + 2) * Power * A / D) / 50 + 2
        const levelFactor = (2 * attacker.level) / 5 + 2;
        let damage = 0;
        if (move.power !== null) {
            damage = ((levelFactor * move.power * (attackStat / defenseStat)) / 50) + 2;
        }

        console.log(`[HitHpCalculator] Base damage before modifiers: ${damage}`);

        // 3. 攻擊屬性加成 (STAB - Same Type Attack Bonus)
        if (attacker.types.some(t => t === moveType)) {
            damage *= 1.5;
        }

        console.log(`[MoveEffectCalculator] Damage after STAB (if applicable): ${damage}`);

        // 屬性相剋
        const effectiveness = MoveEffectCalculator.getTypeEffectiveness(moveType, defender.types);
        damage *= effectiveness;

        console.log(`[MoveEffectCalculator] Damage after type effectiveness (x${effectiveness}): ${damage}`);

        // 隨機浮動 (0.85 ~ 1.00)
        const randomFactor = (Math.floor(Math.random() * 16) + 85) / 100;
        damage *= randomFactor;

        console.log(`[MoveEffectCalculator] Damage after random factor (x${randomFactor}): ${damage}`);

        // 爆擊 (Critical Hit)
        let critRate = 0.0625; // Default 1/16
        if (move.meta && move.meta.crit_rate > 0) {
            // Crit stages: 0=4.17%, 1=12.5%, 2=50%, 3+=100%
            if (move.meta.crit_rate === 1) critRate = 0.125;
            else if (move.meta.crit_rate === 2) critRate = 0.5;
            else if (move.meta.crit_rate >= 3) critRate = 1.0;
        }
        
        const isCritical = Math.random() < critRate;
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
        
        // 計算附加效果 (Status Ailments & Flinch)
        let ailment: PokemonAilment | undefined = undefined;

        // MARK: 測試一下 flinched
        let flinched = false;
        let confused = false;
        const attackerStatChanges: PokemonStats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
        const defenderStatChanges: PokemonStats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

        if (isHit && move.meta) {
            // 1. Ailment (Status Condition)
            if (move.meta.ailment !== 'none' && move.meta.ailment_chance > 0) {
                const chance = move.meta.ailment_chance === 0 ? 100 : move.meta.ailment_chance; // 0 usually means 100% if ailment is set, but let's follow chance if > 0
                if (Math.random() * 100 < chance) {
                    // Map API ailment names to PokemonAilment type
                    const ailmentMap: Record<string, PokemonAilment> = {
                        'paralysis': 'paralysis',
                        'burn': 'burn',
                        'freeze': 'freeze',
                        'poison': 'poison',
                        'sleep': 'sleep',
                        'confusion': 'healthy' // Confusion is volatile, not in main status yet
                    };
                    if (ailmentMap[move.meta.ailment]) {
                        ailment = ailmentMap[move.meta.ailment];
                    }
                    if (move.meta.ailment === 'confusion') {
                        confused = true;
                    }
                }
            }

            // 2. Flinch
            if (move.meta.flinch_chance > 0) {
                if (Math.random() * 100 < move.meta.flinch_chance) {
                    flinched = true;
                }
            }
            
            // 3. Stat Changes
            if (move.stat_changes && move.stat_changes.length > 0) {
                const chance = move.meta.stat_chance === 0 ? 100 : move.meta.stat_chance;
                if (Math.random() * 100 < chance) {
                    // Determine target for stat changes
                    // Default to defender (selected-pokemon) unless target is 'user'
                    const targetStats = (move.target === 'user') ? attackerStatChanges : defenderStatChanges;

                    move.stat_changes.forEach(sc => {
                        // Map API stat names to PokemonStats keys
                        // Note: accuracy and evasion are not in PokemonStats yet, ignoring for now
                        if (sc.stat === 'attack') targetStats.attack += sc.change;
                        else if (sc.stat === 'defense') targetStats.defense += sc.change;
                        else if (sc.stat === 'special-attack') targetStats.specialAttack += sc.change;
                        else if (sc.stat === 'special-defense') targetStats.specialDefense += sc.change;
                        else if (sc.stat === 'speed') targetStats.speed += sc.change;
                    });
                }
            }
        }


        if (!isHit) {
            console.log(`[HitHpCalculator] The move ${move.name} missed!`);
            return {
                damage: 0,
                isCritical: false,
                effectiveness: 1,
                isHit: false,
                isSuccessfulEvade: isSuccessfulEvade,
                isSuccessfulAttack: isSuccessfulAttack,
                attackerStatChanges: attackerStatChanges,
                defenderStatChanges: defenderStatChanges,
                flinched: false,
                confused: false,
                ailment: undefined
            };
        }


        console.log(`Damage after critical hit (if applicable): ${damage}`);

        return {
            damage: Math.floor(damage),
            isCritical,
            effectiveness,
            isHit: isHit,
            isSuccessfulEvade: isSuccessfulEvade,
            isSuccessfulAttack: isSuccessfulAttack,
            attackerStatChanges: attackerStatChanges,
            defenderStatChanges: defenderStatChanges,
            flinched: flinched,
            confused: confused,
            ailment: ailment
        };
    }
};
