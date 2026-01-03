import { PokemonDao, PokemonStats } from './pokemon';

export interface TransferMove {
    name: string;
    pp: number;
    maxPP: number;
}

export interface TransferPokemon extends Omit<PokemonDao, 'stats' | 'pokemonMoves'> {
    stats: Partial<PokemonStats>;
    pokemonMoves: TransferMove[];
}

export interface BindSetupPayload {
    type: 'bindSetup';
    secret: string;
    transferPokemons: TransferPokemon[];
    lockId: number;
    timestamp: number;
}

export interface BindPartyPayload {
    type: 'party';
    secret: string;
    transferPokemons: TransferPokemon[];
    lockId: number;
    timestamp: number;
}

export interface BindBoxPayload {
    type: 'box';
    secret: string;
    transferPokemons: TransferPokemon[];
    lockId: number;
    timestamp: number;
}

export type BindPayload = BindSetupPayload | BindPartyPayload | BindBoxPayload;
