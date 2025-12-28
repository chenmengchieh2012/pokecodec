import { PokeDexEntry, PokeDexEntryStatus } from '../dataAccessObj/PokeDex';

export interface  RecordBattleCummulativeStats {
    damageTaken: number;
    usedAttackMove: boolean;
    turns: number;
    switches: number;
    usedNotVeryEffectiveOnly: boolean;
    firstStrike: boolean;
    wonWithLowAccuracy?: boolean;
    levelUp: boolean;
}

export const getDefaultBattleCummulativeStats = ():  RecordBattleCummulativeStats => ({
    damageTaken: 0,
    usedAttackMove: false,
    turns: 0,
    switches: 0,
    usedNotVeryEffectiveOnly: false,
    firstStrike: false,
    wonWithLowAccuracy: undefined,
    levelUp: false
});

export interface  RecordBattleFinishedPayload {
    won: boolean;
    myParty: { id: number; level: number; hp: number; types: string[] }[];
    opponent: { level: number; types: string[]; isLegendary: boolean };
    stats:  RecordBattleCummulativeStats
}

export interface RecordBattleActionPayload {
    damageDealt: number;
    damageTaken: number;
    isSuperEffective: boolean;
    isCritical: boolean;
    isOHKO: boolean;
    transformUsed: boolean;
    ppRunOut: boolean;
    leerGlareUsed: boolean;
    switchedTurnOne: boolean;
    moveFailed: boolean;
    hyperBeamUsed: boolean;
    useSameMove: boolean;
}

export interface  RecordBattleCatchPayload {
    pokemon: { id: number; types: string[]; isLegendary: boolean; isShiny: boolean };
    location: { biome: string };
    isCritical: boolean;
    time: number;
}

export interface  RecordCodeActivityPayload {
    sessionMinutes: number;
    hourOfDay: number;
}
export interface  RecordItemActionPayload {
    action: 'buy' | 'use';
    item: { name: string; category: string; price?: number };
    quantity: number;
    isUseless: boolean;
}

export interface RecordEncounterPayload {
    biome: string;
}

export interface RecordEvolvePayload {
    pokemonId: number;
    isFriendship?: boolean;
}

export interface RecordLearnMoveFromMachinePayload {
    moveId: string;
    pokemonId: number;
}

export interface AchievementStatistics {
    // General
    startTime: number;
    totalPlayTimeSeconds: number;
    daysPlayed: number;
    isPartyFull: boolean;
    
    // Coding
    lastCatchTime: number; // Hour of day 0-23
    isCatchTimeNight: boolean;
    isCatchTimeEarlyMorning: boolean;

    // Battle
    battlesWon: number;
    differentTypesInParty: number;
    superEffectiveHits: number;
    notVeryEffectiveWins: number;
    criticalHits: number;
    oneHitKOs: number;
    battlesWonWith1HP: number;
    battlesWonNoDamage: number;
    battlesWonOneType: number;
    battlesWonUnderdog: number; // 5 levels higher
    battlesWonGiantSlayer: number; // 10 levels higher
    battlesWonNoAttack: number;
    damageTakenWithoutFainting: number;
    damageDealt: number;
    battlesWonFirstStrike: number;
    legendaryChallenges: number;
    longBattles: number; // > 20 turns
    switchesInBattle: number; // Max switches in a single battle
    faintedToWater: boolean;
    transformUsed: boolean;
    wonGen1Only: boolean;
    ppRunOut: boolean;
    leerGlareUsed: boolean;
    switchedTurnOne: boolean;
    wonSoloFullParty: boolean;
    useSameMove: boolean;
    sudoCommandUsed: boolean; // OHKO move
    moveFailedCount: number;
    wonWithLowAccuracy: boolean;
    wonWithHyperBeam: boolean;

    // Pokedex & Catching
    pokemonCaught: number;
    criticalCaptures: number;
    flyingTypeCaught: number;
    bugTypeCaught: number;
    grassTypeCaught: number;
    fireTypeCaught: number;
    waterTypeCaught: number;
    electricTypeCaught: number;
    psychicTypeCaught: number;
    fightingTypeCaught: number;
    rockTypeCaught: number;
    ghostTypeCaught: number;
    dragonTypeCaught: number;
    legendaryCaught: number;
    shinyCaught: number;

    // Growth
    evolutionsTriggered: number;
    stonesUsed: number;
    friendshipEvolutions: number;
    movesTaught: number;
    maxLevelReached: number;
    level10: boolean;
    level30: boolean;
    level50: boolean;
    level100: boolean;
    isRattataMaxLevel: boolean;

    // Economy & Items
    moneySpent: number;
    maxItemsBoughtAtOnce: number; // "Prepared" - max bought at once
    itemsUsed: number;
    potionsUsed: number;
    revivesUsed: number;
    uselessItemUsed: boolean;

    // Exploration
    forestEncounters: number;
    caveEncounters: number;
    urbanEncounters: number;
    waterEncounters: number;
    
    gameRestarted: boolean;
}

export interface AchievementContext {
    pokedex: PokeDexEntry[];
    statistics: AchievementStatistics;
}

export type AchievementCheckResult = {
    isUnlocked: boolean;
    progress: string;
};

const checkThreshold = (current: number, target: number, unit: string = '') => ({
    isUnlocked: current >= target,
    progress: `${Math.min(current, target)}/${target}${unit}`
});

const checkBoolean = (value: boolean) => ({
    isUnlocked: value,
    progress: value ? 'Completed' : 'Incomplete'
});

const checkPokedexCount = (entries: PokeDexEntry[], count: number) => {
    const caught = entries.filter(e => e.status === PokeDexEntryStatus.Caught).length;
    return checkThreshold(caught, count);
};

const checkPokemonCaught = (entries: PokeDexEntry[], pokemonId: number) => {
    const isCaught = entries.some(e => e.id === pokemonId && e.status === PokeDexEntryStatus.Caught);
    return {
        isUnlocked: isCaught,
        progress: isCaught ? 'Caught' : 'Not Caught'
    };
};

const checkPokemonCaughtByName = (entries: PokeDexEntry[], pokemonIds: number[]) => {
    const isCaught = entries.some(e => pokemonIds.includes(e.id) && e.status === PokeDexEntryStatus.Caught);
    return {
        isUnlocked: isCaught,
        progress: isCaught ? 'Caught' : 'Not Caught'
    };
};

export const achievementCriteria: Record<string, (context: AchievementContext) => AchievementCheckResult> = {
    // 1. Hello World
    1: (_ctx) => checkBoolean(true),

    // 2. Gotcha!
    2: (ctx) => checkThreshold(ctx.statistics.pokemonCaught, 1),
    // 3. Battle Ready
    3: (ctx) => checkThreshold(ctx.statistics.battlesWon, 1),
    // 4. Evolution Time
    4: (ctx) => checkThreshold(ctx.statistics.evolutionsTriggered, 1),
    // 5. Shopping Spree
    5: (ctx) => checkThreshold(ctx.statistics.moneySpent, 1), // Any amount,
    // 6. Healer
    6: (ctx) => checkThreshold(ctx.statistics.itemsUsed, 1),
    // 7. Full Party
    7: (ctx) => checkBoolean(ctx.statistics.isPartyFull),
    // 8. Night Owl
    8: (ctx) => checkBoolean(ctx.statistics.isCatchTimeNight),
    // 9. Early Bird
    9: (ctx) => checkBoolean(ctx.statistics.isCatchTimeEarlyMorning),
    // 10. Sniper
    10: (ctx) => checkThreshold(ctx.statistics.criticalCaptures, 1),
    // 11. Pokedex Rookie
    11: (ctx) => checkPokedexCount(ctx.pokedex, 10),
    // 12. Pokedex Explorer
    12: (ctx) => checkPokedexCount(ctx.pokedex, 30),
    // 13. Pokedex Pro
    13: (ctx) => checkPokedexCount(ctx.pokedex, 50),
    // 14. Pokedex Master
    14: (ctx) => checkPokedexCount(ctx.pokedex, 100),
    // 15. Kanto Champion
    15: (ctx) => checkPokedexCount(ctx.pokedex, 151),
    // 16. Bird Watcher
    16: (ctx) => checkThreshold(ctx.statistics.flyingTypeCaught, 10),
    // 17. Bug Catcher
    17: (ctx) => checkThreshold(ctx.statistics.bugTypeCaught, 10),
    // 18. Gardener
    18: (ctx) => checkThreshold(ctx.statistics.grassTypeCaught, 10),
    // 19. Pyromaniac
    19: (ctx) => checkThreshold(ctx.statistics.fireTypeCaught, 10),
    // 20. Swimmer
    20: (ctx) => checkThreshold(ctx.statistics.waterTypeCaught, 10),
    // 21. Electrician
    21: (ctx) => checkThreshold(ctx.statistics.electricTypeCaught, 10),
    // 22. Psychic
    22: (ctx) => checkThreshold(ctx.statistics.psychicTypeCaught, 10),
    // 23. Black Belt
    23: (ctx) => checkThreshold(ctx.statistics.fightingTypeCaught, 10),
    // 24. Rock Climber
    24: (ctx) => checkThreshold(ctx.statistics.rockTypeCaught, 10),
    // 25. Spooky
    25: (ctx) => checkThreshold(ctx.statistics.ghostTypeCaught, 10),
    // 26. Dragon Tamer
    26: (ctx) => checkThreshold(ctx.statistics.dragonTypeCaught, 5),
    // 27. Legendary Hunter
    27: (ctx) => checkThreshold(ctx.statistics.legendaryCaught, 1),
    // 28. Shiny Hunter
    28: (ctx) => checkThreshold(ctx.statistics.shinyCaught, 1),
    // 29. Battle Novice
    29: (ctx) => checkThreshold(ctx.statistics.battlesWon, 10),
    // 30. Battle Veteran
    30: (ctx) => checkThreshold(ctx.statistics.battlesWon, 50),
    // 31. Battle Legend
    31: (ctx) => checkThreshold(ctx.statistics.battlesWon, 100),
    // 32. Super Effective
    32: (ctx) => checkThreshold(ctx.statistics.superEffectiveHits, 1),
    // 33. Not Very Effective
    33: (ctx) => checkThreshold(ctx.statistics.notVeryEffectiveWins, 1),
    // 34. Critical Hit
    34: (ctx) => checkThreshold(ctx.statistics.criticalHits, 1),
    // 35. One Hit Wonder
    35: (ctx) => checkThreshold(ctx.statistics.oneHitKOs, 1),
    // 36. Close Call
    36: (ctx) => checkThreshold(ctx.statistics.battlesWonWith1HP, 1),
    // 37. Flawless Victory
    37: (ctx) => checkThreshold(ctx.statistics.battlesWonNoDamage, 1),
    // 38. Type Expert
    38: (ctx) => checkThreshold(ctx.statistics.battlesWonOneType, 1),
    // 39. Underdog
    39: (ctx) => checkThreshold(ctx.statistics.battlesWonUnderdog, 1),
    // 40. Giant Slayer
    40: (ctx) => checkThreshold(ctx.statistics.battlesWonGiantSlayer, 1),
    // 41. Training Day
    41: (ctx) => checkBoolean(ctx.statistics.level10),
    // 42. Getting Stronger
    42: (ctx) => checkBoolean(ctx.statistics.level30),
    // 43. Powerhouse
    43: (ctx) => checkBoolean(ctx.statistics.level50),
    // 44. Max Potential
    44: (ctx) => checkBoolean(ctx.statistics.level100),
    // 45. Evolution Master
    45: (ctx) => checkThreshold(ctx.statistics.evolutionsTriggered, 10),
    // 46. Stone Age
    46: (ctx) => checkThreshold(ctx.statistics.stonesUsed, 1),
    // 47. Friendship Goals
    47: (ctx) => checkThreshold(ctx.statistics.friendshipEvolutions, 1),
    // 48. Big Spender
    48: (ctx) => checkThreshold(ctx.statistics.moneySpent, 10000),
    // 49. Prepared
    49: (ctx) => checkThreshold(ctx.statistics.maxItemsBoughtAtOnce, 10),
    // 50. Potion Master
    50: (ctx) => checkThreshold(ctx.statistics.potionsUsed, 50),
    // 51. Revival
    51: (ctx) => checkThreshold(ctx.statistics.revivesUsed, 1),
    // 52. Forest Ranger
    52: (ctx) => checkThreshold(ctx.statistics.forestEncounters, 50),
    // 53. Cave Explorer
    53: (ctx) => checkThreshold(ctx.statistics.caveEncounters, 50),
    // 54. Urban Legend
    54: (ctx) => checkThreshold(ctx.statistics.urbanEncounters, 50),
    // 55. Sea Captain
    55: (ctx) => checkThreshold(ctx.statistics.waterEncounters, 50),
    // 56. Move Tutor
    56: (ctx) => checkThreshold(ctx.statistics.movesTaught, 1),
    // 57. Strategist
    57: (ctx) => checkThreshold(ctx.statistics.battlesWonNoAttack, 1),
    // 58. Tank
    58: (ctx) => checkThreshold(ctx.statistics.damageTakenWithoutFainting, 1000),
    // 59. Glass Cannon
    59: (ctx) => checkThreshold(ctx.statistics.damageDealt, 1000),
    // 60. Speedster
    60: (ctx) => checkThreshold(ctx.statistics.battlesWonFirstStrike, 1), // Simplified,
    // 61. Brave Heart
    61: (ctx) => checkThreshold(ctx.statistics.legendaryChallenges, 1),
    // 62. Syntax Error
    62: (ctx) => checkThreshold(ctx.statistics.moveFailedCount, 1),
    // 63. Infinite Loop
    63: (ctx) => checkThreshold(ctx.statistics.longBattles, 1),
    // 64. Full Stack
    64: (ctx) => checkThreshold(ctx.statistics.differentTypesInParty, 6),
    // 65. Merge Conflict
    65: (ctx) => checkThreshold(ctx.statistics.switchesInBattle, 5),
    // 66. It Works on My Machine
    66: (ctx) => checkBoolean(ctx.statistics.wonWithLowAccuracy),
    // 67. Spaghetti Code
    67: (ctx) => checkPokemonCaught(ctx.pokedex, 114), // Tangela,
    // 68. Rubber Duck
    68: (ctx) => checkPokemonCaught(ctx.pokedex, 54), // Psyduck,
    // 69. Blue Screen of Death
    69: (ctx) => checkBoolean(ctx.statistics.faintedToWater),
    // 70. Ctrl+C Ctrl+V
    70: (ctx) => checkBoolean(ctx.statistics.transformUsed),
    // 71. Legacy System
    71: (ctx) => checkBoolean(ctx.statistics.wonGen1Only),
    // 72. Technical Debt
    72: (ctx) => checkBoolean(ctx.statistics.wonWithHyperBeam),
    // 73. Memory Leak
    73: (ctx) => checkBoolean(ctx.statistics.ppRunOut),
    // 74. Garbage Collector
    74: (ctx) => checkPokemonCaughtByName(ctx.pokedex, [88, 89]), // Grimer, Muk,
    // 75. Sudo Command
    75: (ctx) => checkBoolean(ctx.statistics.sudoCommandUsed),
    // 76. Git Blame
    76: (ctx) => checkBoolean(ctx.statistics.leerGlareUsed),
    // 77. Bug fix
    77: (ctx) => checkThreshold(ctx.statistics.bugTypeCaught, 100),
    // 78. Canary Deployment
    78: (ctx) => checkBoolean(ctx.statistics.switchedTurnOne),
    // 79. Top Percentage
    79: (ctx) => checkBoolean(ctx.statistics.isRattataMaxLevel), // Rattata,
    // 80. God Object
    80: (ctx) => checkBoolean(ctx.statistics.wonSoloFullParty),
    // 81. The Cake is a Lie
    81: (ctx) => checkBoolean(ctx.statistics.uselessItemUsed),
    // 82. Race Condition
    82: (ctx) => checkBoolean(ctx.statistics.useSameMove),
};

export type StatUpdateOperation = 'add' | 'set' | 'max' | 'increment';

export interface StatUpdatePayload {
    key: keyof AchievementStatistics;
    value?: number | boolean;
    operation: StatUpdateOperation;
}

export class AchievementAnalyzer {
    private stats: AchievementStatistics;

    constructor(stats: AchievementStatistics) {
        this.stats = stats;
    }

    public getStatistics(): AchievementStatistics {
        return this.stats;
    }
    

    public update(payload: StatUpdatePayload): AchievementStatistics {
        const { key, value, operation } = payload;
        const currentValue = this.stats[key];

        switch (operation) {
            case 'add':
                if (typeof value === 'number') {
                    const current = typeof currentValue === 'number' ? currentValue : 0;
                    (this.stats[key] as number) = current + value;
                }
                break;
            case 'increment':
                {
                    const current = typeof currentValue === 'number' ? currentValue : 0;
                    (this.stats[key] as number) = current + 1;
                }
                break;
            case 'set':
                if (value !== undefined) {
                    (this.stats[key] as any) = value;
                }
                break;
            case 'max':
                if (typeof value === 'number') {
                    const current = typeof currentValue === 'number' ? currentValue : 0;
                    (this.stats[key] as number) = Math.max(current, value);
                }
                break;
        }
        return this.stats;
    }

    public static getDefaultStatistics(): AchievementStatistics {
        return {
    startTime: 0,
    totalPlayTimeSeconds: 0,
    daysPlayed: 0,
    isPartyFull: false,
    lastCatchTime: 0,
    isCatchTimeNight: false,
    isCatchTimeEarlyMorning: false,
    battlesWon: 0,
    differentTypesInParty: 0,
    superEffectiveHits: 0,
    notVeryEffectiveWins: 0,
    criticalHits: 0,
    oneHitKOs: 0,
    battlesWonWith1HP: 0,
    battlesWonNoDamage: 0,
    battlesWonOneType: 0,
    battlesWonUnderdog: 0,
    battlesWonGiantSlayer: 0,
    battlesWonNoAttack: 0,
    damageTakenWithoutFainting: 0,
    damageDealt: 0,
    battlesWonFirstStrike: 0,
    legendaryChallenges: 0,
    longBattles: 0,
    switchesInBattle: 0,
    faintedToWater: false,
    transformUsed: false,
    wonGen1Only: false,
    ppRunOut: false,
    leerGlareUsed: false,
    switchedTurnOne: false,
    wonSoloFullParty: false,
    useSameMove: false,
    sudoCommandUsed: false,
    moveFailedCount: 0,
    wonWithLowAccuracy: false,
    wonWithHyperBeam: false,
    pokemonCaught: 0,
    criticalCaptures: 0,
    flyingTypeCaught: 0,
    bugTypeCaught: 0,
    grassTypeCaught: 0,
    fireTypeCaught: 0,
    waterTypeCaught: 0,
    electricTypeCaught: 0,
    psychicTypeCaught: 0,
    fightingTypeCaught: 0,
    rockTypeCaught: 0,
    ghostTypeCaught: 0,
    dragonTypeCaught: 0,
    legendaryCaught: 0,
    shinyCaught: 0,
    evolutionsTriggered: 0,
    stonesUsed: 0,
    friendshipEvolutions: 0,
    movesTaught: 0,
    maxLevelReached: 0,
    level10: false,
    level30: false,
    level50: false,
    level100: false,
    isRattataMaxLevel: false,
    moneySpent: 0,
    maxItemsBoughtAtOnce: 0,
    itemsUsed: 0,
    potionsUsed: 0,
    revivesUsed: 0,
    uselessItemUsed: false,
    forestEncounters: 0,
    caveEncounters: 0,
    urbanEncounters: 0,
    waterEncounters: 0,
    gameRestarted: false,
};
    }

    // ==========================================
    // Event Handlers
    // ==========================================

    public onBattleFinished(data:  RecordBattleFinishedPayload) {
        const { won, myParty, opponent, stats } = data;

        // Common updates
        this.update({ key: 'switchesInBattle', operation: 'max', value: stats.switches });
        if (stats.turns > 20) {
            this.update({ key: 'longBattles', operation: 'increment' });
        }
        if (opponent.isLegendary) {
            this.update({ key: 'legendaryChallenges', operation: 'increment' });
        }

        if (!won) {
            if (opponent.types.includes('water')) {
                this.update({ key: 'faintedToWater', operation: 'set', value: true });
            }
            return;
        }

        // Win conditions
        this.update({ key: 'battlesWon', operation: 'increment' });

        if (stats.wonWithLowAccuracy) {
            this.update({ key: 'wonWithLowAccuracy', operation: 'set', value: true });
        }

        if (myParty.some(p => p.hp === 1)) {
            this.update({ key: 'battlesWonWith1HP', operation: 'increment' });
        }

        if (stats.damageTaken === 0) {
            this.update({ key: 'battlesWonNoDamage', operation: 'increment' });
        }

        // Check if all party members share at least one type
        const commonType = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'steel', 'fairy'].find(type => 
            myParty.every(p => p.types.includes(type))
        );
        if (commonType) {
            this.update({ key: 'battlesWonOneType', operation: 'increment' });
        }

        const activePokemon = myParty.find(p => p.hp > 0) || myParty[0];
        const levelDiff = opponent.level - activePokemon.level;
        if (levelDiff >= 5) {
            this.update({ key: 'battlesWonUnderdog', operation: 'increment' });
        }
        if (levelDiff >= 10) {
            this.update({ key: 'battlesWonGiantSlayer', operation: 'increment' });
        }

        if (!stats.usedAttackMove) {
            this.update({ key: 'battlesWonNoAttack', operation: 'increment' });
        }

        if (stats.firstStrike) {
            this.update({ key: 'battlesWonFirstStrike', operation: 'increment' });
        }

        if (stats.usedNotVeryEffectiveOnly) {
            this.update({ key: 'notVeryEffectiveWins', operation: 'increment' });
        }

        // Gen 1 Only (ID 1-151)
        if (myParty.every(p => p.id >= 1 && p.id <= 151)) {
            this.update({ key: 'wonGen1Only', operation: 'set', value: true });
        }

        // Solo Full Party
        if (myParty.length === 6 && myParty.filter(p => p.hp > 0).length === 6 && stats.switches === 0) {
             // This logic assumes "Solo" means didn't switch and others didn't faint? 
             // Or maybe "Only used one pokemon". If switches == 0 and no one else took damage/fainted.
             // Simplified: If full party and switches == 0.
             this.update({ key: 'wonSoloFullParty', operation: 'set', value: true });
        }

        // Full Party
        if (myParty.length === 6) {
            this.update({ key: 'isPartyFull', operation: 'set', value: true });
        }

        // Full Stack (Different Types)
        const uniqueTypes = new Set(myParty.flatMap(p => p.types));
        this.update({ key: 'differentTypesInParty', operation: 'max', value: uniqueTypes.size });

        // Level Milestones
        const maxLevel = Math.max(...myParty.map(p => p.level));
        this.update({ key: 'maxLevelReached', operation: 'max', value: maxLevel });
        if (maxLevel >= 10) {
            this.update({ key: 'level10', operation: 'set', value: true });
        }
        if (maxLevel >= 30) {
            this.update({ key: 'level30', operation: 'set', value: true });
        }
        if (maxLevel >= 50) {
            this.update({ key: 'level50', operation: 'set', value: true });
        }
        if (maxLevel >= 100) {
            this.update({ key: 'level100', operation: 'set', value: true });
        }

        // Top Percentage (Rattata Level 100)
        const rattataMax = myParty.some(p => p.id === 19 && p.level === 100);
        if (rattataMax) {
            this.update({ key: 'isRattataMaxLevel', operation: 'set', value: true });
        }
    }

    public onBattleAction(data:  RecordBattleActionPayload) {
        if (data.damageDealt) {
            this.update({ key: 'damageDealt', operation: 'add', value: data.damageDealt });
        }
        if (data.damageTaken) {
            this.update({ key: 'damageTakenWithoutFainting', operation: 'add', value: data.damageTaken });
        }
        if (data.isSuperEffective) {
            this.update({ key: 'superEffectiveHits', operation: 'increment' });
        }
        if (data.isCritical) {
            this.update({ key: 'criticalHits', operation: 'increment' });
        }
        if (data.isOHKO) {
            this.update({ key: 'oneHitKOs', operation: 'increment' });
            this.update({ key: 'sudoCommandUsed', operation: 'set', value: true });
        }
        if (data.transformUsed) {
            this.update({ key: 'transformUsed', operation: 'set', value: true });
        }
        if (data.ppRunOut) {
            this.update({ key: 'ppRunOut', operation: 'set', value: true });
        }
        if (data.leerGlareUsed) {
            this.update({ key: 'leerGlareUsed', operation: 'set', value: true });
        }
        if (data.switchedTurnOne) {
            this.update({ key: 'switchedTurnOne', operation: 'set', value: true });
        }
        if (data.moveFailed) {
            this.update({ key: 'moveFailedCount', operation: 'increment' });
        }
        if (data.hyperBeamUsed) {
            this.update({ key: 'wonWithHyperBeam', operation: 'set', value: true });
        }
        if (data.useSameMove) {
            this.update({ key: 'useSameMove', operation: 'set', value: true });
        }

    }

    public onCatch(data:  RecordBattleCatchPayload) {
        this.update({ key: 'pokemonCaught', operation: 'increment' });
        
        if (data.pokemon.isLegendary) {
            this.update({ key: 'legendaryCaught', operation: 'increment' });
        }
        if (data.pokemon.isShiny) {
            this.update({ key: 'shinyCaught', operation: 'increment' });
        }
        if (data.isCritical) {
            this.update({ key: 'criticalCaptures', operation: 'increment' });
        }
        if (data.time !== undefined) {
            this.update({ key: 'lastCatchTime', operation: 'set', value: data.time });
            // Night: 18:00 - 03:59
            if (data.time >= 18 || data.time < 4) {
                this.update({ key: 'isCatchTimeNight', operation: 'set', value: true });
            }
            // Early Morning: 04:00 - 09:59
            if (data.time >= 4 && data.time < 10) {
                this.update({ key: 'isCatchTimeEarlyMorning', operation: 'set', value: true });
            }
        }
        
        // Type checks
        data.pokemon.types.forEach(type => {
            const key = `${type}TypeCaught` as keyof AchievementStatistics;
            if (key in this.stats) {
                this.update({ key, operation: 'increment' });
            }
        });

        // Removed method checks as only 'ball' is supported currently
        // Removed isDark check as it's not implemented
    }

    public onItemAction(data: RecordItemActionPayload) {
        const qty = data.quantity || 1;
        if (data.action === 'buy') {
            if (data.item.price) {
                const cost = data.item.price * qty;
                this.update({ key: 'moneySpent', operation: 'add', value: cost });
            }
            this.update({ key: 'maxItemsBoughtAtOnce', operation: 'max', value: qty });
        } else if (data.action === 'use') {
            this.update({ key: 'itemsUsed', operation: 'add', value: qty });
            if (data.item.category === 'potion') {
                this.update({ key: 'potionsUsed', operation: 'add', value: qty });
            }
            if (data.item.category === 'revive') {
                this.update({ key: 'revivesUsed', operation: 'add', value: qty });
            }
            if (data.item.category === 'stone') {
                this.update({ key: 'stonesUsed', operation: 'add', value: qty });
            }
            if (data.isUseless) {
                this.update({ key: 'uselessItemUsed', operation: 'set', value: true });
            }
        }
    }

    public onEncounter(data: RecordEncounterPayload) {
        // BiomeType.Grassland
        if (data.biome === 'Grassland') {
            this.update({ key: 'forestEncounters', operation: 'increment' });
        } 
        // BiomeType.MountainCave
        else if (data.biome === 'Mountain/Cave') {
            this.update({ key: 'caveEncounters', operation: 'increment' });
        } 
        // BiomeType.UrbanPowerPlant
        else if (data.biome === 'Urban/Power Plant') {
            this.update({ key: 'urbanEncounters', operation: 'increment' });
        } 
        // BiomeType.WaterBeach
        else if (data.biome === 'Water/Beach') {
            this.update({ key: 'waterEncounters', operation: 'increment' });
        }
    }

    public onEvolve(data: RecordEvolvePayload) {
        this.update({ key: 'evolutionsTriggered', operation: 'increment' });
        if (data.isFriendship) {
            this.update({ key: 'friendshipEvolutions', operation: 'increment' });
        }
    }

    public onLearnMoveFromMachine(data: RecordLearnMoveFromMachinePayload) {
        this.update({ key: 'movesTaught', operation: 'increment' });
    }
}

