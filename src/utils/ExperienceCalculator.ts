import { PokemonDao, RawPokemonData } from "../dataAccessObj/pokemon";
import pokemonGen1Data from "../data/pokemonGen1.json";
import pokemonMoveData from "../data/pokemonMoves.json";
import { pokemonMoveInit } from "../dataAccessObj/pokeMove";

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;
const moveDataMap = pokemonMoveData as unknown as Record<string, any>;


export const ExperienceCalculator = {



    // Helper functions defined locally to avoid external utility dependency
    calculateStat: (base: number, iv: number, ev: number, level: number): number => {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    },

    calculateHp: (base: number, iv: number, ev: number, level: number): number => {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    },

    calculateTotalLevelExp: (level: number): number => {
        return Math.floor((4 * Math.pow(level, 3)) / 5);
    },

    calculateRequiredExp: (level: number): number => {
        const currentTotal = ExperienceCalculator.calculateTotalLevelExp(level);
        const nextTotal = ExperienceCalculator.calculateTotalLevelExp(level + 1);
        return nextTotal - currentTotal;
    },
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
        let newPokemon: PokemonDao = JSON.parse(JSON.stringify(pokemon));

        newPokemon.currentExp += (expGained + 10000);

        // Check for level up
        // Assuming currentExp is "Relative EXP since last level"
        // and toNextLevelExp is "Required EXP to reach next level"
        while (newPokemon.currentExp >= newPokemon.toNextLevelExp && newPokemon.level < 100) {
            newPokemon.currentExp -= newPokemon.toNextLevelExp;
            newPokemon.level++;

            // Update toNextLevelExp for the new level
            newPokemon.toNextLevelExp = ExperienceCalculator.calculateRequiredExp(newPokemon.level);

            // Recalculate Stats using Standard Formula
            const newHp = ExperienceCalculator.calculateHp(newPokemon.baseStats.hp, newPokemon.iv.hp, newPokemon.ev.hp, newPokemon.level);
            const hpDiff = newHp - newPokemon.stats.hp;

            newPokemon.stats.hp = newHp;
            newPokemon.stats.attack = ExperienceCalculator.calculateStat(newPokemon.baseStats.attack, newPokemon.iv.attack, newPokemon.ev.attack, newPokemon.level);
            newPokemon.stats.defense = ExperienceCalculator.calculateStat(newPokemon.baseStats.defense, newPokemon.iv.defense, newPokemon.ev.defense, newPokemon.level);
            newPokemon.stats.specialAttack = ExperienceCalculator.calculateStat(newPokemon.baseStats.specialAttack, newPokemon.iv.specialAttack, newPokemon.ev.specialAttack, newPokemon.level);
            newPokemon.stats.specialDefense = ExperienceCalculator.calculateStat(newPokemon.baseStats.specialDefense, newPokemon.iv.specialDefense, newPokemon.ev.specialDefense, newPokemon.level);
            newPokemon.stats.speed = ExperienceCalculator.calculateStat(newPokemon.baseStats.speed, newPokemon.iv.speed, newPokemon.ev.speed, newPokemon.level);

            // Heal HP by the amount increased (standard RPG behavior)
            newPokemon.currentHp += hpDiff;
            newPokemon.maxHp = newHp;

            // Ensure move is learned if applicable
            newPokemon = ExperienceCalculator.moveInsert(newPokemon);
        }
        // Cap at level 100
        if (newPokemon.level >= 100) {
            newPokemon.currentExp = 0;
            newPokemon.toNextLevelExp = 0;
        }

        return newPokemon;
    },

    moveInsert: (pokemon: PokemonDao): PokemonDao => {
        // Ensure move is learned if applicable
        const newPokemon: PokemonDao = JSON.parse(JSON.stringify(pokemon));
        if (newPokemon.pokemonMoves.length < 4) {
            const levelUpMoves = pokemonDataMap[newPokemon.id].moves.filter((moveEntry) => {
                if (moveEntry.level_learned_at <= newPokemon.level && moveEntry.learn_method === 'level-up') {
                    return true;
                }
            });
            const newlevelUpMoves = levelUpMoves.map((moveEntry) => newPokemon.pokemonMoves.map(m => m.name).includes(moveEntry.name) ? null : moveEntry).filter(m => m !== null);
            if (newlevelUpMoves.length > 0) {
                const moveToLearn = newlevelUpMoves[0];
                const moveDetails = moveDataMap[moveToLearn.name];
                const newMove = pokemonMoveInit(moveDetails);
                if (moveDetails && newPokemon.pokemonMoves.length < 4) {
                    newPokemon.pokemonMoves.push(newMove);
                }
            }

        }
        return newPokemon;
    }
};
