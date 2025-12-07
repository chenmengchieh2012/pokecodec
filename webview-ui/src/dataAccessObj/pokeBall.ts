export interface PokeBallDao {
    id: number;
    type: PokeBallType;
    catchRateModifier: number;
}

const PokeBallType = {
    Pokeball: 'Pokeball',
    Greatball: 'Greatball',
    Ultraball: 'Ultraball',
    Masterball: 'Masterball',
    SafariBall: 'SafariBall',
    NetBall: 'NetBall',
    DiveBall: 'DiveBall',
    NestBall: 'NestBall',
    RepeatBall: 'RepeatBall',
    TimerBall: 'TimerBall',
    LuxuryBall: 'LuxuryBall',
    PremierBall: 'PremierBall'
} as const;

export type PokeBallType = typeof PokeBallType[keyof typeof PokeBallType];