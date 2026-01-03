import { ItemDao } from './item';
import { PokemonDao } from './pokemon';
import { PokeDexEntry, PokeDexEntryStatus } from './PokeDex';
import { GameStateData } from './gameStateData';
import { DifficultyLevelConfig, EncounterRecord } from './DifficultyData';

export interface BoxPayload {
    pokemons: PokemonDao[];
    currentBox: number;
    totalBoxLength: number;
}

export interface PokeDexPayload {
    gen: string;
    entries: PokeDexEntry[];
}

export interface DifficultyLevelPayload {
    level: number;
    config: DifficultyLevelConfig;
    maxUnlocked: number;
    ddaEnabled: boolean;
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
    pokemons?: PokemonDao[];
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

export interface UpdateOpponentsInPartyPayload {
    opponentPokemons: PokemonDao[];
}

export interface UpdateDefenderPokemonUidPayload {
    pokemonUid: string;
}
export interface UpdateOpponentPokemonUidPayload {
    pokemonUid: string;
}

export interface EvolvePokemonPayload {
    pokemonUid: string;
    toSpeciesId: number;
}

export interface GoTriggerEncounterPayload {
    triggerType: 'wild' | 'npc';
    ncpName?: string;   // only for npc
}

export interface SetDifficultyLevelPayload {
    level: number;
}

export interface SetDDAEnabledPayload {
    enabled: boolean
}

export interface RecordEncounterPayload {
    record: EncounterRecord;
}

// ==================== Handler Context ====================

export interface HandlerContext {
    postMessage: (message: unknown) => void;
    updateAllViews: () => void;
    updateAchievementsView: () => void;
    isViewVisible?: () => boolean;
}

export interface SetAutoEncounterPayload {
    enabled: boolean;
}

export interface SetDDAEnabledPayload {
    enabled: boolean;
}

export interface SetDeviceLockPayload {
    isLocked: boolean;
    newLockId: number;
}

export interface VerifyTwoFactorPayload {
    token: string;
}

export interface BindCodePayload {
    qrCodeDataUrl: string;
}

export interface UnlockNextLevelPayload {}