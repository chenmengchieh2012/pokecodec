

export const BattleEventType = {
    Start: 'Start',
    RoundFinish: 'RoundFinish',
    AllMyPokemonFainted: 'AllMyPokemonFainted',
    MyPokemonFaint: 'MyPokemonFaint',
    WildPokemonFaint: 'WildPokemonFaint',
    WildPokemonCatched: 'WildPokemonCatched',
    Escaped: 'Escaped'
} as const;

export type BattleEventType = typeof BattleEventType[keyof typeof BattleEventType];

export type BattleState = 'finish' | 'ongoing';

export interface BattleEvent {
    type: BattleEventType;
    state: BattleState;
}

export const BattleType = {
    Wild: 'wild',
    Trainer: 'trainer'
} as const;
export type BattleType = typeof BattleType[keyof typeof BattleType];


export const GameState = {
  Searching: 'searching',
  WildAppear: 'wild_appear',
  Battle: 'battle',
  Catching: 'catching',
  Caught: 'caught'
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

