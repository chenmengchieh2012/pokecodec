export type StatName = 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed' | 'accuracy' | 'evasion';

export interface StatChange {
    change: number;
    stat: StatName;
}

export const pokemonMoveInit = (move: PokemonMove): PokemonMove => {
    return {
        ...move,
        maxPP: move.pp,
    }
}

export interface PokemonMove {
    id: number;
    name: string;
    type: string;
    power: number | null;
    accuracy: number | null;
    pp: number;
    priority: number;
    maxPP: number;
    effect: string;
    meta?: {
        ailment: string;
        ailment_chance: number;
        crit_rate: number;
        drain: number;
        flinch_chance: number;
        healing: number;
        stat_chance: number;
    } | null;
    stat_changes?: StatChange[];
    target?: string;
}


export interface PokemonMoveDAO {
    move: {
        name: string;
        url: string;
    };
    version_group_details: {
        level_learned_at: number;
        move_learn_method: {
        name: string;
        url: string;
        };
        order: number | null;
        version_group: {
        name: string;
        url: string;
        };
    }[];
}