
/** 定義來自 VS Code 的訊息類型 */
export const MessageType = {
    // Data response types
    BagData: 'bagData',
    PartyData: 'partyData',
    BoxData: 'boxData',
    UserData: 'userData',
    PokemonData: 'pokemonData',
    GameState: 'gameState',
    
    // Request types (from webview to extension)
    GetUserInfo: 'getUserInfo',
    GetBag: 'getBag',
    GetParty: 'getParty',
    GetBox: 'getBox',
    GetGameState: 'getGameState',
    
    // Action types
    SetGameState: 'setGameState',
    UpdateMoney: 'updateMoney',
    AddItem: 'addItem',
    RemoveItem: 'removeItem',
    UseItem: 'useItem',
    UseMedicineInBag: 'useMedicineInBag',
    UpdatePartyPokemon: 'updatePartyPokemon',
    AddToParty: 'addToParty',
    RemoveFromParty: 'removeFromParty',
    ReorderBox: 'reorderBox',
    DeletePokemon: 'deletePokemon',
    Catch: 'catch',
    TriggerEncounter: 'triggerEncounter',
    UpdateBiome: 'updateBiome',
    ResetStorage: 'resetStorage',
    Error: 'error',
} as const;


export type MessageType = typeof MessageType[keyof typeof MessageType];