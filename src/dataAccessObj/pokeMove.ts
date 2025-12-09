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