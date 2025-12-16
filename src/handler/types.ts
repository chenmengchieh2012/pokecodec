import { GameState } from '../dataAccessObj/GameState';
import { ItemDao } from '../dataAccessObj/item';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { PokemonStatus } from '../dataAccessObj/PokeDex';

// ==================== Payload Types ====================

export interface GetPokeDexPayload {
    gen: string;
}

export interface UpdatePokeDexPayload {
    gen: string;
    pokemonId: number;
    status: PokemonStatus;
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

export interface SetGameStatePayload {
    gameState: GameState;
}

// ==================== Handler Context ====================

export interface HandlerContext {
    postMessage: (message: unknown) => void;
    updateAllViews: () => void;
}
