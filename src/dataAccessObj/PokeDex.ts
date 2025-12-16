export enum PokemonStatus {
    Unknown = 'Unknown',
    Seen = 'Seen',
    Caught = 'Caught'
}

export interface PokeDexEntry {
    id: number;
    status: PokemonStatus;
}

export type PokeDexData = Record<string, PokeDexEntry>;
