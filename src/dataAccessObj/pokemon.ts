import { PokeDex__GEN1 } from "./PokeDex";
import { PokemonMove } from "./pokeMove";

export type PokemonType = 
    | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' 
    | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' 
    | 'bug' | 'rock' | 'ghost' | 'dragon' | 'steel' | 'fairy' 
    | 'dark'; // 補上惡系，這是 PokeAPI 的標準 18 屬性
export interface PokemonStats {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
}

export interface PokemonDao {
    uid: string;
    id: number;
    name: string;
    nickname?: string;
    level: number;
    currentHp: number;
    maxHp: number;
    
    // Stats
    stats: PokemonStats; // Actual stats (calculated)
    baseStats: PokemonStats; // Base stats (Species specific)
    iv: PokemonStats;    // Individual Values (0-31)
    ev: PokemonStats;    // Effort Values (0-252)
    
    // Info
    types: PokemonType[];
    gender: string;
    nature: string;      // e.g. "Adamant"
    ability: string;     // Ability name
    isHiddenAbility?: boolean; // Is the ability hidden?
    height: number;
    weight: number;
    baseExp: number;
    currentExp: number;
    toNextLevelExp: number;
    isShiny: boolean;
    
    // Meta
    originalTrainer: string;
    caughtDate: number;  // Timestamp
    caughtBall: string;  // e.g. "Poke Ball"
    heldItem?: string;

    pokemonMoves: PokemonMove[];
    
    // Coding Stats
    codingStats?: CodingStats;
}

export interface CodingStats {
    caughtRepo: string;
    favoriteLanguage: string;
    linesOfCode: number;
    bugsFixed: number;
    commits: number;
    coffeeConsumed: number;
}

export interface PokemonState {
    action: PokemonStateAction;
}

export const PokemonStateAction = {
    None: 'None',
    Catching: 'Catching',
    Caught: 'Caught',
    Fainted: 'Fainted',
    Escaped: 'Escaped'
} as const

export type PokemonStateAction = typeof PokemonStateAction[keyof typeof PokemonStateAction];

export const initPokemonDao: () => PokemonDao = () => ({
    uid: '',
    id: 0,
    name: '',
    level: 0,
    currentHp: 0,
    maxHp: 0,
    stats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    baseStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    iv: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: [],
    gender: '',
    nature: '',
    ability: '',
    height: 0,
    weight: 0,
    baseExp: 0,
    currentExp: 0,
    toNextLevelExp: 0,
    isShiny: false,
    originalTrainer: '',
    caughtDate: 0,
    caughtBall: '',
    pokemonMoves: [],

});

export const initialPokemonState: () => PokemonState = () => ({
    action: PokemonStateAction.None,
})

export const getGenById = (id: number): string|undefined => {
    if (id <= 151) {
        return PokeDex__GEN1;
    }
    return undefined;
    // if (id <= 251) return 'GEN 2';
    // if (id <= 386) return 'GEN 3';
    // if (id <= 493) return 'GEN 4';
    // if (id <= 649) return 'GEN 5';
    // if (id <= 721) return 'GEN 6';
    // if (id <= 809) return 'GEN 7';
    // if (id <= 905) return 'GEN 8';
    // return 'GEN 9';
};

export interface RawPokemonData {
    id: number;
    name: string;
    types: string[];
    stats: { [key: string]: number };
    abilities: { name: string, isHidden: boolean }[];
    height: number;
    weight: number;
    base_experience: number;
    gender_rate: number;
    moves: {
        name: string;
        learn_method: string;
        level_learned_at: number;
    }[];
    evolutions?: {
        id: number;
        name: string;
        min_level: number | null;
        trigger: EvolutionTrigger;
        item: string | null;
        known_move: string | null;
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

export const EvolutionTrigger = {
    LevelUp: 'level-up',
    UseItem: 'use-item',
    Trade: 'trade',
    Shed: 'shed',
} as const;

export type EvolutionTrigger = typeof EvolutionTrigger[keyof typeof EvolutionTrigger];