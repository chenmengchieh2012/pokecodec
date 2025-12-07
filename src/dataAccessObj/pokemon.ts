
export interface PokemonMove {
    id: number;
    name: string;
    type: string;
    power: number | null;
    accuracy: number | null;
    pp: number;
    maxPP: number;
    effect: string;
}

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
    stats: PokemonStats;
    iv: PokemonStats;
    ev: PokemonStats;
    
    // Info
    types: string[];
    gender: string;
    nature: string;
    ability: string;
    height: number;
    weight: number;
    baseExp: number;
    currentExp: number;
    toNextLevelExp: number;
    isShiny: boolean;
    
    // Meta
    originalTrainer: string;
    caughtDate: number;
    caughtBall: string;
    heldItem?: string;

    pokemonMoves: PokemonMove[];
}