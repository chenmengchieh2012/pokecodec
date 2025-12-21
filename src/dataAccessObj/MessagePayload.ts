import { GameState } from './GameState';
import { ItemDao } from './item';
import { PokemonDao } from './pokemon';
import { PokeDexEntry, PokeDexEntryStatus } from './PokeDex';
import { GameStateData } from './gameStateData';

export interface BoxPayload {
    pokemons: PokemonDao[];
    currentBox: number;
    totalBoxLength: number;
}

export interface PokeDexPayload{
    gen: string;
    entries: PokeDexEntry[];
}

// ==================== Payload Types ====================

export interface GetPokeDexPayload {
    gen: string;
}

export interface UpdatePokeDexPayload {
    gen: string;
    pokemonId: number;
    status: PokeDexEntryStatus;
}

export interface CatchPayload {
    text: string;
    pokemon?: PokemonDao;
}

export interface DeletePokemonPayload {
    pokemonUids: string[];
}

export interface ReorderBoxPayload {
    pokemonUids: string[];
}

export interface ReorderPartyPayload {
    pokemonUids: string[];
}

export interface BatchMoveToBoxPayload {
    pokemonUids: string[];
    targetBoxIndex: number;
}

export interface AddToPartyPayload {
    pokemonUid: string;
}

export interface RemoveFromPartyPayload {
    uid: string;
}

export interface UpdatePartyPokemonPayload {
    pokemon: PokemonDao;
}

export interface UseMedicineInBagPayload {
    itemId?: string;
    item?: ItemDao;
    pokemonUid?: string;
    moveId?: number;
}

export interface UseItemPayload {
    itemId?: string;
    item?: ItemDao;
    count?: number;
}

export interface AddItemPayload {
    item: ItemDao;
    count?: number;
}

export interface RemoveItemPayload {
    itemId?: string;
    item?: ItemDao;
    count?: number;
}

export interface UpdateMoneyPayload {
    amount: number;
}

export interface SetGameStateDataPayload {
    gameStateData: GameStateData;
}

export interface UpdateEncounteredPokemonPayload {
    pokemon: PokemonDao | undefined;
}

export interface UpdateDefenderPokemonPayload {
    pokemon: PokemonDao | undefined;
}

export interface EvolvePokemonPayload {
    pokemonUid: string;
    toSpeciesId: number;
}

// ==================== Handler Context ====================

export interface HandlerContext {
    postMessage: (message: unknown) => void;
    updateAllViews: () => void;
    updateAchievementsView: () => void;
}

export interface SetAutoEncounterPayload {
    enabled: boolean;
}