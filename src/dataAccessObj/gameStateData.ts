import { GameState } from "./GameState";
import { PokemonDao } from "./pokemon";

export interface GameStateData {
    state: GameState;
    encounteredPokemon: PokemonDao | undefined;
    defendPokemon: PokemonDao | undefined;
}