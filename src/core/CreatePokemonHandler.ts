import { randomUUID } from "crypto";
import * as vscode from 'vscode';
import * as path from 'path';
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonDao, PokemonStats, PokemonType } from "../dataAccessObj/pokemon";
import { PokemonMove } from "../dataAccessObj/pokeMove";
import { ExperienceCalculator } from "../utils/ExperienceCalculator";
import * as pokemonGen1Data from "../data/pokemonGen1.json";
import * as pokemonMovesData from "../data/pokemonMoves.json";

// Define the type for our local data structure
interface LocalPokemonData {
    id: number;
    name: string;
    types: string[];
    stats: { [key: string]: number };
    abilities: string[];
    height: number;
    weight: number;
    base_experience: number;
    gender_rate: number;
    moves: {
        name: string;
        learn_method: string;
        level_learned_at: number;
    }[];
    species: {
        capture_rate: number;
        base_happiness: number;
        growth_rate: string;
        flavor_text: string;
        genus: string;
        evolution_chain_url: string;
    };
}

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, LocalPokemonData>;

interface LocalMoveData {
    id: number;
    name: string;
    type: string;
    power: number | null;
    accuracy: number | null;
    pp: number;
    maxPP: number;
    effect: string;
}

const moveDataMap = pokemonMovesData as unknown as Record<string, LocalMoveData>;

const EXTENSION_TO_LANG_MAP: {[key: string]: string} = {
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
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

export const PokemonFactory = {
    createWildPokemonInstance: async (pokemonEncounterData: PokeEncounterData, filePath?: string): Promise<PokemonDao> => {
        // 從資料庫取得寶可夢基本資料
        const finalPokemonId = pokemonEncounterData.id;
        const depth = pokemonEncounterData.minDepth;

        // Use local data instead of fetch
        const pokemonData = pokemonDataMap[String(finalPokemonId)];
        
        if (!pokemonData) {
            throw new Error(`Pokemon data not found for ID: ${finalPokemonId}`);
        }

        // 根據深度調整等級 (Gaussian distribution)
        const baseLevel = 5 + depth * 2;
        // Standard deviation of 3 gives some variety
        const randomLevel = Math.round(gaussianRandom(baseLevel, 3));
        // Clamp between 1 and 100
        const level = Math.max(1, Math.min(100, randomLevel));
        
        // Nature
        const natures = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
        const nature = natures[Math.floor(Math.random() * natures.length)];


        // Ability
        const abilities = pokemonData.abilities;
        const randomAbility = abilities.length > 0 
            ? abilities[Math.floor(Math.random() * abilities.length)]
            : 'Unknown';
        const ability = randomAbility.charAt(0).toUpperCase() + randomAbility.slice(1);

        
        const iv: PokemonStats = {
            hp: Math.floor(Math.random() * 32),
            attack: Math.floor(Math.random() * 32),
            defense: Math.floor(Math.random() * 32),
            specialAttack: Math.floor(Math.random() * 32),
            specialDefense: Math.floor(Math.random() * 32),
            speed: Math.floor(Math.random() * 32),
        };

        const ev : PokemonStats = {
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
            if (moveDetails) {
                return {
                    id: moveDetails.id,
                    name: moveDetails.name.toUpperCase(),
                    type: moveDetails.type.toLowerCase(),
                    power: moveDetails.power,
                    accuracy: moveDetails.accuracy,
                    pp: moveDetails.pp,
                    maxPP: moveDetails.maxPP,
                    effect: moveDetails.effect
                };
            }
            return null;
        }).filter((move): move is PokemonMove => move !== null);

        const gender = (pokemonData.gender_rate === -1) ? 'Genderless' :
            (Math.random() * 8 < pokemonData.gender_rate) ? 'Female' : 'Male';

        // 生成隨機 height, weight
        const height = pokemonData.height; // 以 dm 為單位
        const weight = pokemonData.weight; // 以 hg 為單位

        const isShiny = Math.random() < 0.5;

        const { caughtRepo, favoriteLanguage } = determineCodingContext(filePath);
        
        // 建立寶可夢實例
        const pokemonInstance: PokemonDao = {
            uid: randomUUID(),
            id: finalPokemonId,
            name: pokemonData.name.toUpperCase(),
            currentHp: baseState.hp, 
            maxHp: baseState.hp,

            stats: baseState,
            baseStats: baseStats,
            iv: iv,
            ev: ev,

            types: pokemonData.types as PokemonType[],
            gender: gender,
            nature: nature,
            ability: ability,
            height: height,
            weight: weight,
            baseExp: pokemonData.base_experience,
            currentExp: 0, // Initial relative experience is 0
            toNextLevelExp: ExperienceCalculator.calculateRequiredExp(level),
            isShiny: isShiny,

            originalTrainer: 'Wild',
            caughtDate: Date.now(),
            caughtBall: 'None',
            level: level,

            pokemonMoves: allMoves.slice(0, 4), // 只選前四招
            
            codingStats: {
                caughtRepo: caughtRepo,
                favoriteLanguage: favoriteLanguage,
                linesOfCode: 0,
                bugsFixed: 0,
                commits: 0,
                coffeeConsumed: 0
            }
        };

        return pokemonInstance;
    }
};