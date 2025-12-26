

export enum DifficultyBall {
    /** 基礎難度：AI 較簡單，戰術單純 */
    PokeBall = 'poke_ball',
    /** 標準難度：AI 懂得屬性相剋 */
    GreatBall = 'great_ball',
    /** 困難難度：AI 會預判、集火、使用戰術 */
    UltraBall = 'ultra_ball'
}

export enum DifficultyStar {
    /** 低強度：數值較低，容錯率高 */
    One = 1,
    /** 中強度：標準數值 */
    Two = 2,
    /** 高強度：數值較高，挑戰性強 */
    Three = 3
}

export interface DifficultyLevelConfig {
    /** 難度等級 (1-9) */
    level: number;
    /** 球種設定 (決定 AI 智能與戰術深度) */
    ball: DifficultyBall;
    /** 星級設定 (決定數值強度與 DDA 基準偏移) */
    star: DifficultyStar;
    /** 顯示名稱 (例如: "Great Ball ★★") */
    name: string;
    /** 詳細描述 */
    description: string;
}
export const ModifierType = {
    ANXIETY: 'anxiety',
    APPROACHING_ANXIETY: 'approachingAnxiety',
    FLOW: 'flow',
    APPROACHING_BOREDOM: 'approachingBoredom',
    BOREDOM: 'boredom'
} as const;
export type ModifierType = typeof ModifierType[keyof typeof ModifierType];

export interface DifficultyModifiers {
    modifierType: ModifierType;
    /** 
     * 等級偏移量 (-5 到 +5)
     * 正值代表敵人等級較高，負值代表較低
     */
    levelOffset: number;

    /** 
     * 捕獲率加成 (-25% 到 +30%)
     * 直接加在最終捕獲率上
     */
    catchBonusPercent: number;

    /** 
     * 經驗值倍率 (0.8 到 1.5)
     * 難度低時給予較多經驗值幫助成長
     */
    expMultiplier: number;

    /** 
     * 最低遭遇率門檻 (1-255)
     * 只會遇到 encounterRate >= 此值的寶可夢
     * 值越大代表只會遇到越常見的怪 (降低難度)
     */
    minEncounterRate: number;

    /** 
     * 最高遭遇率門檻 (1-255)
     * 只會遇到 encounterRate <= 此值的寶可夢
     * 值越小代表只會遇到越稀有的怪 (提高難度)
     */
    maxEncounterRate: number;

    /**
     * 異色機率倍率 (1.0 - 4.0)
     * 難度越低 (Anxiety)，倍率越高，作為安慰獎勵
     */
    shinyRateMultiplier: number;
}

export interface EncounterRecord {
    /** 遭遇的寶可夢 ID (Species ID) */
    pokemonId: number;
    /** 遭遇的寶可夢名稱 */
    pokemonName: string;
    /** 
     * 基礎捕獲率 (Base Catch Rate, 3-255)
     * 代表該寶可夢種類的原始捕獲難度，不包含球種或狀態修正
     * 3 = 傳說 (極難), 255 = 波波 (極易)
     */
    pokemonCatchRate: number;
    /** 
     * 遭遇稀有度 (1-255)
     * 1 = 極稀有, 255 = 極常見
     */
    pokemonEncounterRate: number;
    /** 是否嘗試捕獲 */
    wasAttempted: boolean;
    /** 是否成功捕獲 */
    wasCaught: boolean;
    /** 使用球數 */
    catchAttempts: number;
    /** 戰鬥結果 */
    battleResult: 'win' | 'lose' | 'flee';
    /** 戰鬥後剩餘 HP 百分比 (0.0 - 1.0) */
    remainingHpPercent: number;
    /** 玩家寶可夢是否瀕死 */
    playerFainted: boolean;
    /** 是否為異色寶可夢 */
    isShiny: boolean;
}

export interface CatchSkillAnalysis {
    legendary: { successRate: number; sampleSize: number };
    rare: { successRate: number; sampleSize: number };
    uncommon: { successRate: number; sampleSize: number };
    common: { successRate: number; sampleSize: number };
}

export interface DifficultyMetrics {
    /** 最近勝率 (0.0 - 1.0) */
    recentWinRate: number;
    /** 平均戰鬥後剩餘 HP% (0.0 - 1.0) */
    avgRemainingHpPercent: number;
    /** 總體捕獲成功率 (0.0 - 1.0) */
    catchSuccessRate: number;
    /** 寶可夢瀕死率 (0.0 - 1.0) */
    faintRate: number;
    /** 
     * 平均遭遇率 (1-255)
     * 用於評估運氣：一直遇到常見怪 (數值高) 代表運氣差/體驗單調
     */
    avgEncounterRate: number;
    /** 
     * 加權捕獲表現 (0.0 - 1.0)
     * 考慮捕獲難度的技術指標
     */
    weightedCatchPerformance: number;
    /** 近期遭遇異色寶可夢數量 */
    recentShinyCount: number;
}
