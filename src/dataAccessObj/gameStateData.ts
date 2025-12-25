import { EncounterResult } from "../core/EncounterHandler";
import { GameState } from "./GameState";
import { PokemonDao } from "./pokemon";

export const BattleMode = {
    Wild: "wild",
    Trainer: "trainer",
} as const;

export type BattleMode = typeof BattleMode[keyof typeof BattleMode];
export interface GameStateData {
    battleMode: BattleMode | undefined;
    state: GameState;
    encounterResult: EncounterResult | undefined;
    opponentParty: PokemonDao[];
    defenderPokemonUid: string | undefined;
    opponentPokemonUid: string | undefined;
}