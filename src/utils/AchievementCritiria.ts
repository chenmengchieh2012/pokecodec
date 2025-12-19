import { UserDao } from '../dataAccessObj/userData';
import { PokeDexEntry, PokeDexEntryStatus } from '../dataAccessObj/PokeDex';
import { PokemonDao } from '../dataAccessObj/pokemon';

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
export interface AchievementStatistics {
    // General
    startTime: number;
    totalPlayTimeSeconds: number;
    daysPlayed: number;
    levelUp: boolean;
    isPartyFull: boolean;
    
    // Coding
    longestSessionMinutes: number;
    lastCodeTime: number; // Hour of day 0-23
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
    battlesEscaped: number;
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
    failedCatches: number;

    // Growth
    evolutionsTriggered: number;
    stonesUsed: number;
    friendshipEvolutions: number;
    movesTaught: number;
    movesForgotten: number;
    natureChanges: number;
    maxLevelReached: number;
    level10: boolean;
    level30: boolean;
    level50: boolean;
    level100: boolean;
    isRattataMaxLevel: boolean;

    // Economy & Items
    money: number;
    moneySpent: number;
    itemsBought: number; 
    maxItemsBoughtAtOnce: number; // "Prepared" - max bought at once
    itemsUsed: number;
    itemsInBag: number;
    uniqueBallsCollected: number;
    potionsUsed: number;
    revivesUsed: number;
    rareCandiesCollected: number;
    giftsReceived: number;
    uselessItemUsed: boolean;

    // Exploration
    forestEncounters: number;
    caveEncounters: number;
    urbanEncounters: number;
    waterEncounters: number;
    missingNoEncountered: boolean;
    stepsWalked: number;

    // Social & Meta
    eggsHatched: number;
    tradesCompleted: number;
    screenshotsTaken: number;
    nicknamesGiven: number;
    pokemonReleased: number;
    gameRestarted: boolean;
    unlockedAchievementsCount: number;
    
    // Bosses
    bossesDefeated: number;
    eliteFourDefeated: number;
    championDefeated: boolean;
    
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
    1: (ctx) => checkBoolean(true),
    // 2. First Encounter
    2: (ctx) => checkBoolean(ctx.statistics.battlesWon > 0 || ctx.statistics.battlesEscaped > 0), // Simplified,
    // 3. Gotcha!
    3: (ctx) => checkThreshold(ctx.statistics.pokemonCaught, 1),
    // 4. Battle Ready
    4: (ctx) => checkThreshold(ctx.statistics.battlesWon, 1),
    // 5. Level Up!
    5: (ctx) => checkBoolean(ctx.statistics.levelUp), // Assuming start at 5,
    // 6. Evolution Time
    6: (ctx) => checkThreshold(ctx.statistics.evolutionsTriggered, 1),
    // 7. Shopping Spree
    7: (ctx) => checkThreshold(ctx.statistics.moneySpent, 1), // Any amount,
    // 8. Healer
    8: (ctx) => checkThreshold(ctx.statistics.itemsUsed, 1),
    // 9. Full Party
    9: (ctx) => checkBoolean(ctx.statistics.isPartyFull),
    // 10. Night Owl
    10: (ctx) => checkBoolean(ctx.statistics.isCatchTimeNight),
    // 11. Early Bird
    11: (ctx) => checkBoolean(ctx.statistics.isCatchTimeEarlyMorning),
    // 12. Sniper
    12: (ctx) => checkThreshold(ctx.statistics.criticalCaptures, 1),
    // 13. Pokedex Rookie
    13: (ctx) => checkPokedexCount(ctx.pokedex, 10),
    // 14. Pokedex Explorer
    14: (ctx) => checkPokedexCount(ctx.pokedex, 30),
    // 15. Pokedex Pro
    15: (ctx) => checkPokedexCount(ctx.pokedex, 50),
    // 16. Pokedex Master
    16: (ctx) => checkPokedexCount(ctx.pokedex, 100),
    // 17. Kanto Champion
    17: (ctx) => checkPokedexCount(ctx.pokedex, 151),
    // 18. Bird Watcher
    18: (ctx) => checkThreshold(ctx.statistics.flyingTypeCaught, 10),
    // 19. Bug Catcher
    19: (ctx) => checkThreshold(ctx.statistics.bugTypeCaught, 10),
    // 20. Gardener
    20: (ctx) => checkThreshold(ctx.statistics.grassTypeCaught, 10),
    // 21. Pyromaniac
    21: (ctx) => checkThreshold(ctx.statistics.fireTypeCaught, 10),
    // 22. Swimmer
    22: (ctx) => checkThreshold(ctx.statistics.waterTypeCaught, 10),
    // 23. Electrician
    23: (ctx) => checkThreshold(ctx.statistics.electricTypeCaught, 10),
    // 24. Psychic
    24: (ctx) => checkThreshold(ctx.statistics.psychicTypeCaught, 10),
    // 25. Black Belt
    25: (ctx) => checkThreshold(ctx.statistics.fightingTypeCaught, 10),
    // 26. Rock Climber
    26: (ctx) => checkThreshold(ctx.statistics.rockTypeCaught, 10),
    // 27. Spooky
    27: (ctx) => checkThreshold(ctx.statistics.ghostTypeCaught, 10),
    // 28. Dragon Tamer
    28: (ctx) => checkThreshold(ctx.statistics.dragonTypeCaught, 5),
    // 29. Legendary Hunter
    29: (ctx) => checkThreshold(ctx.statistics.legendaryCaught, 1),
    // 30. Shiny Hunter
    30: (ctx) => checkThreshold(ctx.statistics.shinyCaught, 1),
    // 31. Battle Novice
    31: (ctx) => checkThreshold(ctx.statistics.battlesWon, 10),
    // 32. Battle Veteran
    32: (ctx) => checkThreshold(ctx.statistics.battlesWon, 50),
    // 33. Battle Legend
    33: (ctx) => checkThreshold(ctx.statistics.battlesWon, 100),
    // 34. Super Effective
    34: (ctx) => checkThreshold(ctx.statistics.superEffectiveHits, 1),
    // 35. Not Very Effective
    35: (ctx) => checkThreshold(ctx.statistics.notVeryEffectiveWins, 1),
    // 36. Critical Hit
    36: (ctx) => checkThreshold(ctx.statistics.criticalHits, 1),
    // 37. One Hit Wonder
    37: (ctx) => checkThreshold(ctx.statistics.oneHitKOs, 1),
    // 38. Close Call
    38: (ctx) => checkThreshold(ctx.statistics.battlesWonWith1HP, 1),
    // 39. Flawless Victory
    39: (ctx) => checkThreshold(ctx.statistics.battlesWonNoDamage, 1),
    // 40. Type Expert
    40: (ctx) => checkThreshold(ctx.statistics.battlesWonOneType, 1),
    // 41. Underdog
    41: (ctx) => checkThreshold(ctx.statistics.battlesWonUnderdog, 1),
    // 42. Giant Slayer
    42: (ctx) => checkThreshold(ctx.statistics.battlesWonGiantSlayer, 1),
    // 43. Training Day
    43: (ctx) => checkBoolean(ctx.statistics.level10),
    // 44. Getting Stronger
    44: (ctx) => checkBoolean(ctx.statistics.level30),
    // 45. Powerhouse
    45: (ctx) => checkBoolean(ctx.statistics.level50),
    // 46. Max Potential
    46: (ctx) => checkBoolean(ctx.statistics.level100),
    // 47. Evolution Master
    47: (ctx) => checkThreshold(ctx.statistics.evolutionsTriggered, 10),
    // 48. Stone Age
    48: (ctx) => checkThreshold(ctx.statistics.stonesUsed, 1),
    // 49. Friendship Goals
    49: (ctx) => checkThreshold(ctx.statistics.friendshipEvolutions, 1),
    // 50. Penny Pincher
    50: (ctx) => checkThreshold(ctx.statistics.money, 5000),
    // 51. Big Spender
    51: (ctx) => checkThreshold(ctx.statistics.moneySpent, 10000),
    // 52. Millionaire
    52: (ctx) => checkThreshold(ctx.statistics.money, 1000000),
    // 53. Prepared
    53: (ctx) => checkThreshold(ctx.statistics.maxItemsBoughtAtOnce, 10),
    // 54. Stocked Up
    54: (ctx) => checkThreshold(ctx.statistics.itemsInBag, 50),
    // 55. Code Reviewer
    55: (ctx) => checkThreshold(ctx.statistics.nicknamesGiven, 5),
    // 56. Potion Master
    56: (ctx) => checkThreshold(ctx.statistics.potionsUsed, 50),
    // 57. Revival
    57: (ctx) => checkThreshold(ctx.statistics.revivesUsed, 1),
    // 58. Ball Collector
    58: (ctx) => checkThreshold(ctx.statistics.uniqueBallsCollected, 4), // Poke, Great, Ultra, Master (Gen 1),
    // 59. Forest Ranger
    59: (ctx) => checkThreshold(ctx.statistics.forestEncounters, 50),
    // 60. Cave Explorer
    60: (ctx) => checkThreshold(ctx.statistics.caveEncounters, 50),
    // 61. Urban Legend
    61: (ctx) => checkThreshold(ctx.statistics.urbanEncounters, 50),
    // 62. Sea Captain
    62: (ctx) => checkThreshold(ctx.statistics.waterEncounters, 50),
    // 63. Glitch in the Matrix
    63: (ctx) => checkBoolean(ctx.statistics.missingNoEncountered),
    // 64. Day Care
    64: (ctx) => checkThreshold(ctx.statistics.stepsWalked, 10000),
    // 65. Egg Hatcher
    65: (ctx) => checkThreshold(ctx.statistics.eggsHatched, 1),
    // 66. Social Butterfly
    66: (ctx) => checkThreshold(ctx.statistics.tradesCompleted, 1),
    // 67. Gym Leader
    67: (ctx) => checkThreshold(ctx.statistics.bossesDefeated, 1),
    // 68. Elite Four
    68: (ctx) => checkThreshold(ctx.statistics.eliteFourDefeated, 4),
    // 69. Champion
    69: (ctx) => checkBoolean(ctx.statistics.championDefeated),
    // 70. Collector
    70: (ctx) => checkThreshold(ctx.statistics.rareCandiesCollected, 10),
    // 71. Photographer
    71: (ctx) => checkThreshold(ctx.statistics.screenshotsTaken, 1),
    // 72. Nickname Rater
    72: (ctx) => checkThreshold(ctx.statistics.nicknamesGiven, 1),
    // 73. Move Tutor
    73: (ctx) => checkThreshold(ctx.statistics.movesTaught, 1),
    // 74. Move Deleter
    74: (ctx) => checkThreshold(ctx.statistics.movesForgotten, 1),
    // 75. Strategist
    75: (ctx) => checkThreshold(ctx.statistics.battlesWonNoAttack, 1),
    // 76. Tank
    76: (ctx) => checkThreshold(ctx.statistics.damageTakenWithoutFainting, 1000),
    // 77. Glass Cannon
    77: (ctx) => checkThreshold(ctx.statistics.damageDealt, 1000),
    // 78. Speedster
    78: (ctx) => checkThreshold(ctx.statistics.battlesWonFirstStrike, 1), // Simplified,
    // 79. Escape Artist
    79: (ctx) => checkThreshold(ctx.statistics.battlesEscaped, 10),
    // 80. Brave Heart
    80: (ctx) => checkThreshold(ctx.statistics.legendaryChallenges, 1),
    // 81. Completionist
    81: (ctx) => checkThreshold(ctx.statistics.unlockedAchievementsCount, 50),
    // 82. Perfectionist
    82: (ctx) => checkThreshold(ctx.statistics.unlockedAchievementsCount, 109),
    // 83. Syntax Error
    83: (ctx) => checkThreshold(ctx.statistics.moveFailedCount, 1),
    // 84. Infinite Loop
    84: (ctx) => checkThreshold(ctx.statistics.longBattles, 1),
    // 85. Refactoring
    85: (ctx) => checkThreshold(ctx.statistics.natureChanges, 1),
    // 86. Full Stack
    86: (ctx) => checkThreshold(ctx.statistics.differentTypesInParty, 6),
    // 87. Merge Conflict
    87: (ctx) => checkThreshold(ctx.statistics.switchesInBattle, 5),
    // 88. Pull Request
    88: (ctx) => checkThreshold(ctx.statistics.giftsReceived, 1),
    // 89. Deploy to Prod
    89: (ctx) => checkThreshold(ctx.statistics.pokemonReleased, 1),
    // 90. It Works on My Machine
    90: (ctx) => checkBoolean(ctx.statistics.wonWithLowAccuracy),
    // 91. Spaghetti Code
    91: (ctx) => checkPokemonCaught(ctx.pokedex, 114), // Tangela,
    // 92. Rubber Duck
    92: (ctx) => checkPokemonCaught(ctx.pokedex, 54), // Psyduck,
    // 93. 404 Not Found
    93: (ctx) => checkThreshold(ctx.statistics.failedCatches, 10),
    // 94. Blue Screen of Death
    94: (ctx) => checkBoolean(ctx.statistics.faintedToWater),
    // 95. Ctrl+C Ctrl+V
    95: (ctx) => checkBoolean(ctx.statistics.transformUsed),
    // 96. Legacy System
    96: (ctx) => checkBoolean(ctx.statistics.wonGen1Only),
    // 97. Technical Debt
    97: (ctx) => checkBoolean(ctx.statistics.wonWithHyperBeam),
    // 98. Memory Leak
    98: (ctx) => checkBoolean(ctx.statistics.ppRunOut),
    // 99. Garbage Collector
    99: (ctx) => checkPokemonCaughtByName(ctx.pokedex, [88, 89]), // Grimer, Muk,
    // 100. Sudo Command
    100: (ctx) => checkBoolean(ctx.statistics.sudoCommandUsed),
    // 101. Git Blame
    101: (ctx) => checkBoolean(ctx.statistics.leerGlareUsed),
    // 102. Bug fix
    102: (ctx) => checkThreshold(ctx.statistics.bugTypeCaught, 100),
    // 103. Canary Deployment
    103: (ctx) => checkBoolean(ctx.statistics.switchedTurnOne),
    // 104. Top Percentage
    104: (ctx) => checkBoolean(ctx.statistics.isRattataMaxLevel), // Rattata,
    // 105. God Object
    105: (ctx) => checkBoolean(ctx.statistics.wonSoloFullParty),
    // 106. The Cake is a Lie
    106: (ctx) => checkBoolean(ctx.statistics.uselessItemUsed),
    // 107. Race Condition
    107: (ctx) => checkBoolean(ctx.statistics.useSameMove),
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
            startTime: Date.now(),
            totalPlayTimeSeconds: 0,
            daysPlayed: 0,
            longestSessionMinutes: 0,
            lastCodeTime: 0,
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
            battlesEscaped: 0,
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
            failedCatches: 0,
            evolutionsTriggered: 0,
            stonesUsed: 0,
            friendshipEvolutions: 0,
            movesTaught: 0,
            movesForgotten: 0,
            natureChanges: 0,
            maxLevelReached: 0,
            level10: false,
            level30: false,
            level50: false,
            level100: false,
            isRattataMaxLevel: false,
            money: 0,
            moneySpent: 0,
            itemsBought: 0,
            maxItemsBoughtAtOnce: 0,
            itemsUsed: 0,
            itemsInBag: 0,
            uniqueBallsCollected: 0,
            potionsUsed: 0,
            revivesUsed: 0,
            rareCandiesCollected: 0,
            giftsReceived: 0,
            uselessItemUsed: false,
            forestEncounters: 0,
            caveEncounters: 0,
            urbanEncounters: 0,
            waterEncounters: 0,
            missingNoEncountered: false,
            stepsWalked: 0,
            eggsHatched: 0,
            tradesCompleted: 0,
            screenshotsTaken: 0,
            nicknamesGiven: 0,
            pokemonReleased: 0,
            gameRestarted: false,
            unlockedAchievementsCount: 0,
            bossesDefeated: 0,
            eliteFourDefeated: 0,
            championDefeated: false,
            levelUp: false,
            isPartyFull: false,
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
        const allTypes = myParty.flatMap(p => p.types);
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
        if (maxLevel >= 10) this.update({ key: 'level10', operation: 'set', value: true });
        if (maxLevel >= 30) this.update({ key: 'level30', operation: 'set', value: true });
        if (maxLevel >= 50) this.update({ key: 'level50', operation: 'set', value: true });
        if (maxLevel >= 100) this.update({ key: 'level100', operation: 'set', value: true });

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

    public onCodingActivity(data:  RecordCodeActivityPayload) {
        if (data.sessionMinutes) {
            this.update({ key: 'longestSessionMinutes', operation: 'max', value: data.sessionMinutes });
        }
        if (data.hourOfDay !== undefined) {
            this.update({ key: 'lastCodeTime', operation: 'set', value: data.hourOfDay });
        }
    }

    public onItemAction(data:  RecordItemActionPayload) {
        const qty = data.quantity || 1;
        if (data.action === 'buy') {
            if (data.item.price) {
                const cost = data.item.price * qty;
                this.update({ key: 'moneySpent', operation: 'add', value: cost });
                // Assuming money is deducted elsewhere, but we can track it if we had the current balance passed in.
                // Since we don't have current balance in payload, we can't update 'money' accurately here 
                // unless we change the payload or assume we start with some amount and deduct.
                // However, 'money' usually refers to current balance. 
                // If the achievement is "Have X money", we need to know the balance.
                // If the achievement is "Spend X money", 'moneySpent' is enough.
                // ID 50 "Penny Pincher" checks 'money' >= 5000.
                // ID 52 "Millionaire" checks 'money' >= 1000000.
                // We need a way to update 'money'.
            }
            this.update({ key: 'itemsBought', operation: 'add', value: qty });
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
        }
    }

    public onMoneyUpdate(amount: number) {
        this.update({ key: 'money', operation: 'set', value: amount });
    }
}

