import type { PokemonMove } from "./pokeMove";

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


export const defaultPokemon: PokemonDao = {
    uid: 'player-pikachu',
    id: 25,
    name: 'PIKACHU',
    level: 5,
    currentHp: 0,
    maxHp: 20,
    stats: { hp: 20, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    iv: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['electric'],
    gender: 'Male',
    nature: 'Hardy',
    ability: 'Static',
    height: 4,
    weight: 60,
    baseExp: 112,
    currentExp: 0,
    toNextLevelExp: 100,
    isShiny: false,
    originalTrainer: 'Player',
    caughtDate: Date.now(),
    caughtBall: 'Poke Ball',
    pokemonMoves: [
        {
            id: 1,
            name: 'THUNDER SHOCK',
            power: 40,
            type: 'Electric',
            accuracy: 100,
            pp: 30,
            maxPP: 30,
            effect: ''
        }
    ]
};