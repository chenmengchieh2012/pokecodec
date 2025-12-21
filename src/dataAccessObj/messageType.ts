
/** 定義來自 VS Code 的訊息類型 */
export const MessageType = {
    // Data response types
    BagData: 'bagData',
    PartyData: 'partyData',
    BoxData: 'boxData',
    UserData: 'userData',
    PokemonData: 'pokemonData',
    BiomeData: 'biomeData',
    PokeDexData: 'pokeDexData',
    GameState: 'gameState',
    AchievementsData: 'achievementsData',
    
    // Request types (from webview to extension)
    GetUserInfo: 'getUserInfo',
    GetBag: 'getBag',
    GetParty: 'getParty',
    GetBox: 'getBox',
    GetGameState: 'getGameState',
    GetBiome: 'getBiome',
    GetPokeDex: 'getPokeDex',
    GetAchievements: 'getAchievements',
    
    // Action types
    SetGameState: 'setGameState',
    UpdateMoney: 'updateMoney',
    UpdatePokeDex: 'updatePokeDex',
    AddItem: 'addItem',
    RemoveItem: 'removeItem',
    UseItem: 'useItem',
    UseMedicineInBag: 'useMedicineInBag',
    UpdatePartyPokemon: 'updatePartyPokemon',
    AddToParty: 'addToParty',
    RemoveFromParty: 'removeFromParty',
    ReorderBox: 'reorderBox',
    ReorderParty: 'reorderParty',
    DeletePokemon: 'deletePokemon',
    BatchMoveToBox: 'batchMoveToBox',
    Catch: 'catch',
    TriggerEncounter: 'triggerEncounter',
    EvolvePokemon: 'evolvePokemon',
    ResetStorage: 'resetStorage',
    Error: 'error',

    RecordBattleFinished: 'recordBattleFinished',
    RecordBattleAction: 'recordBattleAction',
    RecordBattleCatch: 'recordBattleCatch',

    RecordItemAction: 'recordItemAction',
    SelectStarter: 'selectStarter',
} as const;


export type MessageType = typeof MessageType[keyof typeof MessageType];