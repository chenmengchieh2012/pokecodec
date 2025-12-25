import { randomUUID } from "crypto";
import * as vscode from 'vscode';
import * as path from 'path';
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonDao, PokemonStats, PokemonType, RawPokemonData } from "../dataAccessObj/pokemon";
import { PokemonMove, pokemonMoveInit } from "../dataAccessObj/pokeMove";
import { ExperienceCalculator } from "../utils/ExperienceCalculator";
import * as pokemonGen1Data from "../data/pokemonGen1.json";
import * as pokemonMovesData from "../data/pokemonMoves.json";
import { DifficultyManager } from "../manager/DifficultyManager";

// Define the type for our local data structure


const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;


const moveDataMap = pokemonMovesData as unknown as Record<string, PokemonMove>;

const EXTENSION_TO_LANG_MAP: { [key: string]: string } = {
    '.ts': 'TypeScript',
    '.js': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.bat': 'Batch',
    '.ps1': 'PowerShell',
    '.jsx': 'React (JS)',
    '.tsx': 'React (TS)',
    '.vue': 'Vue',
    '.dart': 'Dart',
    '.lua': 'Lua',
    '.r': 'R',
    '.pl': 'Perl',
    '.scala': 'Scala',
};

function determineCodingContext(filePath?: string) {
    let caughtRepo = 'Unknown';
    let favoriteLanguage = 'Unknown';

    if (filePath) {
        // Determine Repo Name
        const uri = vscode.Uri.file(filePath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            caughtRepo = workspaceFolder.name;
        }

        // Determine Language
        const ext = path.extname(filePath).toLowerCase();
        favoriteLanguage = EXTENSION_TO_LANG_MAP[ext] || ext.replace('.', '').toUpperCase() || 'Unknown';
    } else {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            caughtRepo = vscode.workspace.workspaceFolders[0].name;
        }
    }

    if (favoriteLanguage === 'Unknown') {
        // Get unique languages from the map values
        const languages = Array.from(new Set(Object.values(EXTENSION_TO_LANG_MAP)));
        favoriteLanguage = languages[Math.floor(Math.random() * languages.length)];
    }

    return { caughtRepo, favoriteLanguage };
}

function gaussianRandom(mean: number, stdev: number): number {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

export const PokemonFactory = {
    createWildPokemonInstance: async (pokemonEncounterData: PokeEncounterData, filePath?: string, fixLevel?: number, difficultyManager?: DifficultyManager): Promise<PokemonDao> => {
        // 從資料庫取得寶可夢基本資料
        const finalPokemonId = pokemonEncounterData.pokemonId;
        const depth = pokemonEncounterData.minDepth;

        // Use local data instead of fetch
        const pokemonData = pokemonDataMap[String(finalPokemonId)];

        if (!pokemonData) {
            throw new Error(`Pokemon data not found for ID: ${finalPokemonId}`);
        }

        // Level Scaling Logic
        let level = 5; // Default fallback

        if (fixLevel) {
            level = fixLevel;
        } else {
            // 1. Get Difficulty Manager


            // 2. Get Base Level from Difficulty Level (1-9)
            // Level 1 -> 5, Level 9 -> 85
            const difficultyLevel = difficultyManager?.getCurrentLevel() ?? 1;
            const baseDifficultyLevel = (difficultyLevel - 1) * 10 + 1;

            // 3. Get DDA Offset
            const modifiers = difficultyManager?.getModifiers() ?? { levelOffset: 0 };
            const levelOffset = modifiers.levelOffset;

            // 4. Calculate Base Level (Difficulty Base + Offset)
            const baseLevel = baseDifficultyLevel + levelOffset;

            // 5. Add Variance (Gaussian with stdev 3)
            const randomLevel = Math.round(gaussianRandom(baseLevel, 3));

            // 6. Clamp between 1 and 100
            level = Math.min(100, Math.max(1, randomLevel));

            console.log(`[CreatePokemonHandler] Level Calc: DiffLv=${difficultyLevel}, BaseDiffLv=${baseDifficultyLevel}, Offset=${levelOffset}, BaseLv=${baseLevel}, RandLv=${randomLevel}, Final=${level}`);
        }

        // Nature
        const natures = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
        const nature = natures[Math.floor(Math.random() * natures.length)];


        // Ability
        const abilities = pokemonData.abilities;
        const randomAbilityObj = abilities.length > 0
            ? abilities[Math.floor(Math.random() * abilities.length)]
            : { name: 'Unknown', isHidden: false };

        const abilityName = randomAbilityObj.name;

        const iv: PokemonStats = {
            hp: Math.floor(Math.random() * 32),
            attack: Math.floor(Math.random() * 32),
            defense: Math.floor(Math.random() * 32),
            specialAttack: Math.floor(Math.random() * 32),
            specialDefense: Math.floor(Math.random() * 32),
            speed: Math.floor(Math.random() * 32),
        };

        const ev: PokemonStats = {
            hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
        };

        const baseState: PokemonStats = {
            hp: 0,
            attack: 0,
            defense: 0,
            specialAttack: 0,
            specialDefense: 0,
            speed: 0,
        };

        // Basic IVs
        // Map local stats object to baseState
        const statMap: Record<string, number> = pokemonData.stats;

        const baseStats: PokemonStats = {
            hp: statMap['hp'] || 0,
            attack: statMap['attack'] || 0,
            defense: statMap['defense'] || 0,
            specialAttack: statMap['special-attack'] || 0,
            specialDefense: statMap['special-defense'] || 0,
            speed: statMap['speed'] || 0
        };

        // Standard Stat Formula
        // HP = floor( ( (2 * Base + IV + EV/4) * Level ) / 100 ) + Level + 10
        // Other = floor( ( (2 * Base + IV + EV/4) * Level ) / 100 ) + 5

        if (statMap['hp']) {
            baseState.hp = ExperienceCalculator.calculateHp(baseStats.hp, iv.hp, ev.hp, level);
        }
        if (statMap['speed']) {
            baseState.speed = ExperienceCalculator.calculateStat(baseStats.speed, iv.speed, ev.speed, level);
        }
        if (statMap['attack']) {
            baseState.attack = ExperienceCalculator.calculateStat(baseStats.attack, iv.attack, ev.attack, level);
        }
        if (statMap['defense']) {
            baseState.defense = ExperienceCalculator.calculateStat(baseStats.defense, iv.defense, ev.defense, level);
        }
        if (statMap['special-attack']) {
            baseState.specialAttack = ExperienceCalculator.calculateStat(baseStats.specialAttack, iv.specialAttack, ev.specialAttack, level);
        }
        if (statMap['special-defense']) {
            baseState.specialDefense = ExperienceCalculator.calculateStat(baseStats.specialDefense, iv.specialDefense, ev.specialDefense, level);
        }

        const allMoves: PokemonMove[] = pokemonData.moves.map((moveInfo) => {
            const moveDetails = moveDataMap[moveInfo.name];
            if (moveDetails !== undefined && moveInfo.level_learned_at <= level && moveInfo.learn_method === 'level-up') {
                return moveDetails as PokemonMove;
            }
            return null;
        }).filter((move): move is PokemonMove => move !== null);

        const gender = (pokemonData.gender_rate === -1) ? 'Genderless' :
            (Math.random() * 8 < pokemonData.gender_rate) ? 'Female' : 'Male';

        // 生成隨機 height, weight
        const height = Math.round(gaussianRandom(pokemonData.height, 3)); // 以 dm 為單位
        const weight = Math.round(gaussianRandom(pokemonData.weight, 3)); // 以 hg 為單位

        // Shiny Calculation with DDA
        const baseShinyRate = 1 / 512; // 不使用標準，因為遭遇太久了
        const shinyMultiplier = difficultyManager?.getModifiers().shinyRateMultiplier || 1.0;
        const finalShinyRate = baseShinyRate * shinyMultiplier;
        const isShiny = Math.random() < finalShinyRate;

        if (isShiny) {
            console.log(`[CreatePokemonHandler] ✨ SHINY POKEMON GENERATED! Rate: 1/${Math.round(1 / finalShinyRate)} (Base: 1/4096, Mult: x${shinyMultiplier})`);
        }

        const { caughtRepo, favoriteLanguage } = determineCodingContext(filePath);

        const ailment = 'healthy';

        // 隨機選四個技能
        const moveIndicator = allMoves.length <= 4 ? allMoves.length : 4;
        const ramdomFourMoveIndex = new Set<number>();
        while (ramdomFourMoveIndex.size < moveIndicator) {
            const randIndex = Math.floor(Math.random() * allMoves.length);
            ramdomFourMoveIndex.add(randIndex);
        }

        const myMoves = Array.from(ramdomFourMoveIndex).map(index => pokemonMoveInit(allMoves[index]));

        // 建立寶可夢實例
        const pokemonInstance: PokemonDao = {
            uid: randomUUID(),
            id: finalPokemonId,
            name: pokemonData.name,
            currentHp: baseState.hp,
            maxHp: baseState.hp,

            stats: baseState,
            baseStats: baseStats,
            iv: iv,
            ev: ev,

            types: pokemonData.types as PokemonType[],
            gender: gender,
            nature: nature,
            ability: abilityName,
            isHiddenAbility: randomAbilityObj.isHidden,
            height: height,
            weight: weight,
            baseExp: pokemonData.base_experience,
            currentExp: 0, // Initial relative experience is 0
            toNextLevelExp: ExperienceCalculator.calculateRequiredExp(level),
            isShiny: isShiny,

            originalTrainer: 'Wild',
            caughtDate: Date.now(),
            caughtBall: '',
            level: level,

            pokemonMoves: myMoves, // 只選前四招
            ailment: ailment,

            codingStats: {
                caughtRepo: caughtRepo,
                favoriteLanguage: favoriteLanguage,
                linesOfCode: 0,
                bugsFixed: 0,
                commits: 0,
                coffeeConsumed: 0
            },

            isLegendary: pokemonData.species.is_legendary,
            isMythical: pokemonData.species.is_mythical
        };

        return pokemonInstance;
    },

    checkCanEvolve: (pokemon: PokemonDao): { canEvolve: boolean, newId?: number } => {
        const pokemonData = pokemonDataMap[String(pokemon.id)];
        if (!pokemonData || !pokemonData.evolutions) {
            return { canEvolve: false };
        }

        // Find level-up evolution
        const levelUpEvo = pokemonData.evolutions.find(evo =>
            evo.trigger === 'level-up' &&
            evo.min_level !== null &&
            pokemon.level >= evo.min_level
        );

        if (levelUpEvo) {
            return { canEvolve: true, newId: levelUpEvo.id };
        }

        return { canEvolve: false };
    },

    evolvePokemon: (pokemon: PokemonDao, targetId: number): PokemonDao => {
        const targetData = pokemonDataMap[String(targetId)];
        if (!targetData) {
            throw new Error(`Target Pokemon data not found for ID: ${targetId}`);
        }

        if (pokemon.ailment === 'fainted') {
            throw new Error(`Cannot evolve a fainted Pokemon.`);
        }

        // Update Base Stats
        const statMap = targetData.stats;
        const baseStats: PokemonStats = {
            hp: statMap['hp'] || 0,
            attack: statMap['attack'] || 0,
            defense: statMap['defense'] || 0,
            specialAttack: statMap['special-attack'] || 0,
            specialDefense: statMap['special-defense'] || 0,
            speed: statMap['speed'] || 0
        };

        // Recalculate Stats
        const newStats: PokemonStats = {
            hp: ExperienceCalculator.calculateHp(baseStats.hp, pokemon.iv.hp, pokemon.ev.hp, pokemon.level),
            attack: ExperienceCalculator.calculateStat(baseStats.attack, pokemon.iv.attack, pokemon.ev.attack, pokemon.level),
            defense: ExperienceCalculator.calculateStat(baseStats.defense, pokemon.iv.defense, pokemon.ev.defense, pokemon.level),
            specialAttack: ExperienceCalculator.calculateStat(baseStats.specialAttack, pokemon.iv.specialAttack, pokemon.ev.specialAttack, pokemon.level),
            specialDefense: ExperienceCalculator.calculateStat(baseStats.specialDefense, pokemon.iv.specialDefense, pokemon.ev.specialDefense, pokemon.level),
            speed: ExperienceCalculator.calculateStat(baseStats.speed, pokemon.iv.speed, pokemon.ev.speed, pokemon.level),
        };

        // Update Ability (Preserve Hidden Ability status if possible)
        const isHidden = pokemon.isHiddenAbility || false;
        let newAbilityObj = targetData.abilities.find(a => a.isHidden === isHidden);

        // Fallback: If target doesn't have matching hidden/normal type, pick the first one
        if (!newAbilityObj) {
            newAbilityObj = targetData.abilities.length > 0 ? targetData.abilities[0] : { name: 'Unknown', isHidden: false };
        }

        const newAbilityName = newAbilityObj.name;

        // Update other fields
        let newPokemon: PokemonDao = {
            ...pokemon,
            id: targetId,
            name: targetData.name,
            types: targetData.types as PokemonType[],
            baseStats: baseStats,
            stats: newStats,
            maxHp: newStats.hp,
            currentHp: newStats.hp,
            height: targetData.height,
            weight: targetData.weight,
            baseExp: targetData.base_experience,
            ability: newAbilityName,
            ailment: 'healthy',
            isHiddenAbility: newAbilityObj.isHidden,
        };

        newPokemon = ExperienceCalculator.moveInsert(newPokemon);

        return newPokemon;
    }
};