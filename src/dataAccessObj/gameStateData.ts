import { EncounterResult } from "../core/EncounterHandler";
import { GameState } from "./GameState";
import { PokemonDao } from "./pokemon";

export interface GameStateData {
    state: GameState;
    encounterResult: EncounterResult | undefined;
    defendPokemon: PokemonDao | undefined;
}