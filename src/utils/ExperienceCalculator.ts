import { PokemonDao, PokemonStats } from "../dataAccessObj/pokemon";

export interface LevelUpResult {
    leveledUp: boolean;
    levelDiff: number;
    oldStats: PokemonStats;
    newStats: PokemonStats;
    learnedMoves: string[]; // Placeholder for future move learning logic
}

export const ExperienceCalculator = {
    // Calculate EXP gained from defeating a pokemon
    // Formula: (BaseExp * Level) / 7 * (1.5 if Trainer) * (1 if Wild)
    calculateExpGain: (loser: PokemonDao, isWild: boolean = true): number => {
        const a = isWild ? 1 : 1.5;
        const b = loser.baseExp;
        const L = loser.level;
        // Gen 1-4 simplified formula
        return Math.floor((a * b * L) / 7);
    },

    // Calculate Total EXP for a given level
    // Using "Fast" growth rate: 4n^3 / 5
    calculateTotalLevelExp: (level: number): number => {
        return Math.floor(4 * Math.pow(level, 3) / 5);
    },

    // Calculate EXP required for next level
    calculateRequiredExp: (level: number): number => {
        const currentTotal = ExperienceCalculator.calculateTotalLevelExp(level);
        const nextTotal = ExperienceCalculator.calculateTotalLevelExp(level + 1);
        return nextTotal - currentTotal;
    },

    calculateStat: (base: number, iv: number, ev: number, level: number): number => {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    },

    calculateHp: (base: number, iv: number, ev: number, level: number): number => {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    },

    // Add EXP to pokemon and handle level ups
    addExperience: (pokemon: PokemonDao, expGained: number): LevelUpResult => {
        const oldStats = { ...pokemon.stats };
        let levelDiff = 0;
        
        pokemon.currentExp += expGained;

        // Check for level up
        // Assuming currentExp is "Relative EXP since last level"
        // and toNextLevelExp is "Required EXP to reach next level"
        while (pokemon.currentExp >= pokemon.toNextLevelExp && pokemon.level < 100) {
            pokemon.currentExp -= pokemon.toNextLevelExp;
            pokemon.level++;
            levelDiff++;

            // Update toNextLevelExp for the new level
            pokemon.toNextLevelExp = ExperienceCalculator.calculateRequiredExp(pokemon.level);

            // Recalculate Stats using Standard Formula
            // Stat = floor( ( (2 * Base + IV + EV/4) * Level ) / 100 ) + 5
            // HP = floor( ( (2 * Base + IV + EV/4) * Level ) / 100 ) + Level + 10
            
            const newHp = ExperienceCalculator.calculateHp(pokemon.baseStats.hp, pokemon.iv.hp, pokemon.ev.hp, pokemon.level);
            const hpDiff = newHp - pokemon.stats.hp;

            pokemon.stats.hp = newHp;
            pokemon.stats.attack = ExperienceCalculator.calculateStat(pokemon.baseStats.attack, pokemon.iv.attack, pokemon.ev.attack, pokemon.level);
            pokemon.stats.defense = ExperienceCalculator.calculateStat(pokemon.baseStats.defense, pokemon.iv.defense, pokemon.ev.defense, pokemon.level);
            pokemon.stats.specialAttack = ExperienceCalculator.calculateStat(pokemon.baseStats.specialAttack, pokemon.iv.specialAttack, pokemon.ev.specialAttack, pokemon.level);
            pokemon.stats.specialDefense = ExperienceCalculator.calculateStat(pokemon.baseStats.specialDefense, pokemon.iv.specialDefense, pokemon.ev.specialDefense, pokemon.level);
            pokemon.stats.speed = ExperienceCalculator.calculateStat(pokemon.baseStats.speed, pokemon.iv.speed, pokemon.ev.speed, pokemon.level);

            // Heal HP by the amount increased (standard RPG behavior)
            pokemon.currentHp += hpDiff;
            pokemon.maxHp = newHp;
        }

        // Cap at level 100
        if (pokemon.level >= 100) {
            pokemon.currentExp = 0;
            pokemon.toNextLevelExp = 0;
        }

        return {
            leveledUp: levelDiff > 0,
            levelDiff,
            oldStats,
            newStats: { ...pokemon.stats },
            learnedMoves: [] // TODO: Implement move learning
        };
    }
};
