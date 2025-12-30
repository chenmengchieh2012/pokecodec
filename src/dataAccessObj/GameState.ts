

export const BattleEventType = {
    RoundFinish: 'RoundFinish',
    MyPokemonFaint: 'MyPokemonFaint',
    WildPokemonCatched: 'WildPokemonCatched',
    Escaped: 'Escaped',
    UnKnownError: 'UnKnownError'
} as const;

export type BattleEventType = typeof BattleEventType[keyof typeof BattleEventType];

export interface BattleEvent {
    type: BattleEventType;
}

export const BattleType = {
    Wild: 'wild',
    Trainer: 'trainer'
} as const;
export type BattleType = typeof BattleType[keyof typeof BattleType];


export const GameState = {
    Searching: 'searching',
    Finished: 'finished',
    TrainerAppear: 'trainer_appear',
    WildAppear: 'wild_appear',
    Battle: 'battle',
    Catching: 'catching',
    Caught: 'caught'
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

