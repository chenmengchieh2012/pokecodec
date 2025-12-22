import { PokemonDao } from "../../../src/dataAccessObj/pokemon";

// Helper functions defined locally to avoid external utility dependency
const calculateStat = (base: number, iv: number, ev: number, level: number): number => {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
};

const calculateHp = (base: number, iv: number, ev: number, level: number): number => {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
};

const calculateTotalLevelExp = (level: number): number => {
    return Math.floor((4 * Math.pow(level, 3)) / 5);
};

const calculateRequiredExp = (level: number): number => {
    const currentTotal = calculateTotalLevelExp(level);
    const nextTotal = calculateTotalLevelExp(level + 1);
    return nextTotal - currentTotal;
};

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

    // Add EXP to pokemon and handle level ups
    addExperience: (pokemon: PokemonDao, expGained: number): PokemonDao => {
        // Create a deep copy to avoid mutating the original object
        const newPokemon: PokemonDao = JSON.parse(JSON.stringify(pokemon));
        
        newPokemon.currentExp += expGained;

        // Check for level up
        // Assuming currentExp is "Relative EXP since last level"
        // and toNextLevelExp is "Required EXP to reach next level"
        while (newPokemon.currentExp >= newPokemon.toNextLevelExp && newPokemon.level < 100) {
            newPokemon.currentExp -= newPokemon.toNextLevelExp;
            newPokemon.level++;

            // Update toNextLevelExp for the new level
            newPokemon.toNextLevelExp = calculateRequiredExp(newPokemon.level);

            // Recalculate Stats using Standard Formula
            const newHp = calculateHp(newPokemon.baseStats.hp, newPokemon.iv.hp, newPokemon.ev.hp, newPokemon.level);
            

            newPokemon.stats.hp = newHp;
            newPokemon.stats.attack = calculateStat(newPokemon.baseStats.attack, newPokemon.iv.attack, newPokemon.ev.attack, newPokemon.level);
            newPokemon.stats.defense = calculateStat(newPokemon.baseStats.defense, newPokemon.iv.defense, newPokemon.ev.defense, newPokemon.level);
            newPokemon.stats.specialAttack = calculateStat(newPokemon.baseStats.specialAttack, newPokemon.iv.specialAttack, newPokemon.ev.specialAttack, newPokemon.level);
            newPokemon.stats.specialDefense = calculateStat(newPokemon.baseStats.specialDefense, newPokemon.iv.specialDefense, newPokemon.ev.specialDefense, newPokemon.level);
            newPokemon.stats.speed = calculateStat(newPokemon.baseStats.speed, newPokemon.iv.speed, newPokemon.ev.speed, newPokemon.level);

            // Heal HP by the amount increased (standard RPG behavior)
            newPokemon.currentHp = newHp;
            newPokemon.maxHp = newHp;
        }

        // Cap at level 100
        if (newPokemon.level >= 100) {
            newPokemon.currentExp = 0;
            newPokemon.toNextLevelExp = 0;
        }

        return newPokemon;
    }
};
