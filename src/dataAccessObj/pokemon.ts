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
    level: number;
    currentHp: number;
    maxHp: number;
    
    // Stats
    stats: PokemonStats; // Actual stats (calculated)
    iv: PokemonStats;    // Individual Values (0-31)
    ev: PokemonStats;    // Effort Values (0-252)
    
    // Info
    types: PokemonType[];
    gender: string;
    nature: string;      // e.g. "Adamant"
    ability: string;     // Ability name
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
})

export const initialPokemonState: () => PokemonState = () => ({
    action: PokemonStateAction.None,
})

