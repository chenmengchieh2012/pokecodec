
/** 定義來自 VS Code 的訊息類型 */
export const MessageType = {
    // Data response types
    BagData: 'bagData',
    PartyData: 'partyData',
    OpponentPartyData: 'opponentPartyData',
    BoxData: 'boxData',
    UserData: 'userData',
    PokemonData: 'pokemonData',
    BiomeData: 'biomeData',
    PokeDexData: 'pokeDexData',
    GameStateData: 'gameStateData',
    EncounteredPokemon: 'encounteredPokemon',
    AchievementsData: 'achievementsData',
    TriggerEncounter: 'triggerEncounter',

    // Request types (from webview to extension)
    GetUserInfo: 'getUserInfo',
    GetBag: 'getBag',
    GetParty: 'getParty',
    GetBox: 'getBox',
    GetGameStateData: 'getGameStateData',
    GetEncounteredPokemon: 'getEncounteredPokemon',
    GetBiome: 'getBiome',
    GetPokeDex: 'getPokeDex',
    GetAchievements: 'getAchievements',

    // Action types
    SetGameStateData: 'setGameStateData',
    UpdateOpponentInParty: 'updateOpponentInParty',
    UpdateDefenderPokemonUid: 'updateDefenderPokemonUid',
    UpdateOpponentPokemonUid: 'updateOpponentPokemonUid',
    SetAutoEncounter: 'setAutoEncounter',
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
    GoTriggerEncounter: 'goTriggerEncounter',
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