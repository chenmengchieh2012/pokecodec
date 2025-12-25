import * as vscode from 'vscode';
import * as difficultyConfig from '../data/difficultyConfig.json';
import { SequentialExecutor } from '../utils/SequentialExecutor';

import pokemonGen1Data from '../data/pokemonGen1.json';
import { RawPokemonData } from '../dataAccessObj/pokemon';
import { KantoPokemonEncounterData } from '../utils/KantoPokemonCatchRate';
const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;
const modifiersMap = difficultyConfig.modifiers as Record<string, DifficultyModifiers>;
const thresholdsMap = difficultyConfig.thresholds as Record<string, number>;



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

export interface DifficultyModifiers {
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

export class DifficultyManager {
    private static instance: DifficultyManager;
    private context: vscode.ExtensionContext;

    // State Keys
    private readonly KEY_CURRENT_LEVEL = 'difficulty.currentLevel';
    private readonly KEY_MAX_UNLOCKED = 'difficulty.maxUnlockedLevel';
    private readonly KEY_HISTORY = 'difficulty.history';

    // State
    private currentLevel: number = 1;
    private maxUnlockedLevel: number = 1;
    private history: EncounterRecord[] = [];
    private readonly MAX_HISTORY = 100;
    private saveTimer: NodeJS.Timeout | undefined;
    private executor: SequentialExecutor;

    private _onDidRecordEncounter = new vscode.EventEmitter<EncounterRecord>();
    public readonly onDidRecordEncounter = this._onDidRecordEncounter.event;

    // Constants
    public static readonly MAX_LEVEL = 9;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.executor = new SequentialExecutor();
        this.loadState();
    }

    /**
     * 初始化 DifficultyManager 單例
     * @param context VS Code 擴充套件上下文
     */
    public static initialize(context: vscode.ExtensionContext): DifficultyManager {
        if (!DifficultyManager.instance) {
            DifficultyManager.instance = new DifficultyManager(context);
        }
        return DifficultyManager.instance;
    }

    /**
     * 取得 DifficultyManager 單例實體
     * @throws Error 如果尚未呼叫 initialize()
     */
    public static getInstance(): DifficultyManager {
        if (!DifficultyManager.instance) {
            throw new Error("DifficultyManager not initialized. Call initialize() first.");
        }
        return DifficultyManager.instance;
    }

    /**
     * 取得歷史紀錄
     */
    public getHistory(): EncounterRecord[] {
        return this.history;
    }

    /**
     * 從 globalState 載入儲存的狀態
     */
    private loadState() {
        this.currentLevel = this.context.globalState.get<number>(this.KEY_CURRENT_LEVEL, 1);
        this.maxUnlockedLevel = this.context.globalState.get<number>(this.KEY_MAX_UNLOCKED, 1);
        this.history = this.context.globalState.get<EncounterRecord[]>(this.KEY_HISTORY, []);
    }

    /**
     * 將當前狀態儲存至 globalState
     * 使用 Queue 機制確保順序
     */
    private async saveState() {
        this.forceSave();
    }

    /**
     * 強制立即儲存 (用於 Extension 關閉時)
     */
    public async forceSave() {
        await this.executor.execute(async () => {
            await this.context.globalState.update(this.KEY_CURRENT_LEVEL, this.currentLevel);
            await this.context.globalState.update(this.KEY_MAX_UNLOCKED, this.maxUnlockedLevel);
            await this.context.globalState.update(this.KEY_HISTORY, this.history);
        });
    }

    /**
     * 釋放資源並確保資料儲存
     */
    public dispose() {
        this.forceSave();
        this._onDidRecordEncounter.dispose();
    }

    // ==========================================
    // Level Management
    // ==========================================

    /**
     * 取得當前設定的難度等級
     */
    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    /**
     * 取得目前已解鎖的最高難度等級
     */
    public getMaxUnlockedLevel(): number {
        return this.maxUnlockedLevel;
    }

    /**
     * 設定當前難度等級
     * @param level 目標等級 (1-9)
     * @returns 是否設定成功
     */
    public async setDifficultyLevel(level: number): Promise<boolean> {
        if (level < 1 || level > DifficultyManager.MAX_LEVEL) {
            console.warn(`[DifficultyManager] Invalid level: ${level}`);
            return false;
        }
        if (level > this.maxUnlockedLevel) {
            console.warn(`[DifficultyManager] Level ${level} is locked. Max unlocked: ${this.maxUnlockedLevel}`);
            return false;
        }
        if (this.currentLevel === level) {
            return true;
        }

        // Reset History when changing difficulty to ensure DDA starts fresh
        // 避免舊難度的表現數據影響新難度的 DDA 判斷
        this.history = [];
        console.log(`[DifficultyManager] Level changed to ${level}. History reset.`);

        this.currentLevel = level;
        await this.saveState();
        return true;
    }

    /**
     * 解鎖下一個難度等級 (通常在擊敗道館館主或四天王後呼叫)
     */
    public async unlockNextLevel(): Promise<void> {
        if (this.maxUnlockedLevel < DifficultyManager.MAX_LEVEL) {
            this.maxUnlockedLevel++;
            // Optional: Auto-upgrade difficulty? Or let user choose?
            // For now, let's just unlock it.
            await this.saveState();
            vscode.window.showInformationMessage(`New Difficulty Level Unlocked: ${this.getLevelConfig(this.maxUnlockedLevel).name}!`);
        }
    }

    /**
     * 取得特定等級的詳細設定配置
     * @param level 難度等級
     */
    public getLevelConfig(level: number): DifficultyLevelConfig {
        const ballIndex = Math.ceil(level / 3) - 1; // 0, 1, 2
        const starIndex = (level - 1) % 3; // 0, 1, 2

        const balls = [DifficultyBall.PokeBall, DifficultyBall.GreatBall, DifficultyBall.UltraBall];
        const stars = [DifficultyStar.One, DifficultyStar.Two, DifficultyStar.Three];

        const ball = balls[ballIndex];
        const star = stars[starIndex];

        return {
            level,
            ball,
            star,
            name: `${this.getBallDisplayName(ball)} ${'★'.repeat(star)}`,
            description: this.getLevelDescription(ball, star)
        };
    }

    /**
     * 取得球種的顯示名稱
     */
    private getBallDisplayName(ball: DifficultyBall): string {
        switch (ball) {
            case DifficultyBall.PokeBall: return 'Poké Ball';
            case DifficultyBall.GreatBall: return 'Great Ball';
            case DifficultyBall.UltraBall: return 'Ultra Ball';
        }
    }

    /**
     * 產生難度等級的描述文字
     */
    private getLevelDescription(ball: DifficultyBall, star: DifficultyStar): string {
        const aiDesc = ball === DifficultyBall.PokeBall ? 'Basic AI' : (ball === DifficultyBall.GreatBall ? 'Standard AI' : 'Advanced AI');
        const intensityDesc = star === DifficultyStar.One ? 'Low' : (star === DifficultyStar.Two ? 'Medium' : 'High');
        return `${aiDesc}, ${intensityDesc} Intensity.`;
    }

    // ==========================================
    // DDA Logic
    // ==========================================

    /**
     * 根據當前難度等級取得基礎 DDA 偏移量
     * (PokeBall: -20, GreatBall: 0, UltraBall: +20)
     */
    private getBaseOffset(): number {
        const config = this.getLevelConfig(this.currentLevel);
        let base = 0;

        // Ball Base
        switch (config.ball) {
            case DifficultyBall.PokeBall: base = -20; break;
            case DifficultyBall.GreatBall: base = 0; break;
            case DifficultyBall.UltraBall: base = +20; break;
        }

        // Star Modifier
        switch (config.star) {
            case DifficultyStar.One: base -= 10; break;
            case DifficultyStar.Two: base += 0; break;
            case DifficultyStar.Three: base += 10; break;
        }

        return base;
    }

    /**
     * DDA 核心邏輯
     * 計算最終難度指數 (Difficulty Index)
     * 結合玩家表現指標與當前難度等級的基礎偏移
     * @param metrics 玩家表現指標
     * @returns 0-100 的難度指數
     */
    public calculateDifficultyIndex(metrics: DifficultyMetrics): number {
        // 1. Calculate Raw Performance Score (0-100)
        // 0 = Struggling (Too Hard), 100 = Breezing (Too Easy)

        const winScore = metrics.recentWinRate * 25;
        const hpScore = metrics.avgRemainingHpPercent * 20;
        const survivalScore = (1 - metrics.faintRate) * 15;
        const weightedCatchScore = metrics.weightedCatchPerformance * 25;

        // Luck Compensation: If encountering bad mons (high rate), score drops -> system makes it easier/better
        // If encountering good mons (low rate), score rises -> system makes it harder
        const luckScore = (1 - metrics.avgEncounterRate / 255) * 15;

        // Shiny Bonus: Encountering a shiny is extremely lucky.
        // If the player has encountered shinies recently, increase the score to push towards Flow/Boredom.
        // This prevents "farming" shinies in Anxiety zone.
        const shinyBonus = metrics.recentShinyCount * 10;

        // [核心評分邏輯]
        // rawIndex 代表玩家目前的「游刃有餘」程度 (基礎 0-100，加上異色加成後可能超過 100)
        // 超過 100 的部分可以用來抵銷低難度的負向偏移 (Base Offset)，確保幸運玩家能被推向高難度
        // - 戰鬥表現 (60%): 勝率(25) + 血量(20) + 存活(15)
        // - 捕獲技術 (25%): 考慮球種與目標難度的加權分數
        // - 運氣補償 (15%): 運氣差時給予補償分，避免玩家因單純運氣不好而感到挫折
        // - 異色加成: 遭遇異色寶可夢視為極大運氣，會顯著提升分數
        const rawIndex = winScore + hpScore + survivalScore + weightedCatchScore + luckScore + shinyBonus;

        // 2. Apply Base Offset from Difficulty Level
        // 困難模式 (UltraBall) 給予正向偏移 (+20)，讓分數更容易進入 Boredom Zone (太簡單)，
        // 進而觸發系統的「增強難度」機制 (Level +2, Catch Rate -15%)。
        // 反之，簡單模式給予負向偏移，觸發「降低難度」機制。
        //
        // [數值設定邏輯]
        // 假設普通玩家表現為 50 分 (Flow Zone):
        // - 簡單模式 (-30): 50 - 30 = 20 -> Anxiety Zone (<30) -> 系統主動降低難度
        // - 困難模式 (+30): 50 + 30 = 80 -> Boredom Zone (>70) -> 系統主動提高難度
        // 這樣的幅度確保了選擇不同難度的玩家能被強制推移到對應的 DDA 區間。
        const baseOffset = this.getBaseOffset();

        // 3. Clamp result
        return Math.min(100, Math.max(0, rawIndex + baseOffset));
    }

    /**
     * Flow Theory 核心邏輯
     * 
     * 取得當前生效的難度修正值 (Modifiers)
     * 根據 Flow Theory (心流理論) 動態調整遊戲參數
     * @param metrics (可選) 玩家表現指標，若未提供則使用預設值
     */
    public getModifiers(metrics?: DifficultyMetrics): DifficultyModifiers {
        // 若紀錄太少 (小於 10 筆)，不啟動 DDA，直接回傳標準難度 (Flow)
        if (!metrics && this.history.length < 10) {
            const flow = modifiersMap.flow;
            return flow;
        }

        // Default metrics if none provided (assume balanced state)
        const currentMetrics = metrics || {
            recentWinRate: this.getRecentWinRate(),
            avgRemainingHpPercent: this.getAvgRemainingHpPercent(),
            catchSuccessRate: this.getCatchSuccessRate(),
            faintRate: this.getFaintRate(),
            avgEncounterRate: this.getAvgEncounterRate(),
            weightedCatchPerformance: this.getWeightedCatchPerformance(),
            recentShinyCount: this.getRecentShinyCount()
        };

        const difficultyIndex = this.calculateDifficultyIndex(currentMetrics);

        // Thresholds

        let modifiers: Partial<DifficultyModifiers> = {};

        if (difficultyIndex < thresholdsMap.anxietyZone) {
            // Anxiety Zone (Too Hard) -> Make it easier
            modifiers = modifiersMap.anxiety;
        } else if (difficultyIndex < thresholdsMap.flowLower) {
            // Approaching Anxiety -> Slightly easier
            modifiers = modifiersMap.approachingAnxiety;
        } else if (difficultyIndex <= thresholdsMap.flowUpper) {
            // Flow Zone -> Standard
            modifiers = modifiersMap.flow;
        } else if (difficultyIndex < thresholdsMap.boredomZone) {
            // Approaching Boredom -> Slightly harder
            modifiers = modifiersMap.approachingBoredom;
        } else {
            // Boredom Zone (Too Easy) -> Make it harder
            modifiers = modifiersMap.boredom;
        }

        return {
            levelOffset: modifiers.levelOffset!, // OK
            catchBonusPercent: modifiers.catchBonusPercent!, // Fix mapping from JSON (catchBonus) to Interface (catchBonusPercent)
            expMultiplier: modifiers.expMultiplier!, // OK
            minEncounterRate: modifiers.minEncounterRate!, //OK
            maxEncounterRate: modifiers.maxEncounterRate!, //OK
            shinyRateMultiplier: modifiers.shinyRateMultiplier || 1.0, // Default to 1.0 if missing
        };
    }

    // ==========================================
    // Encounter History & Analysis
    // ==========================================

    /**
     * 記錄一次遭遇事件
     * @param record 遭遇紀錄物件
     */
    public recordEncounter(record: EncounterRecord): void {
        record.pokemonCatchRate = pokemonDataMap[record.pokemonId].species.capture_rate;
        record.pokemonEncounterRate = KantoPokemonEncounterData.find(p => p.pokemonId === record.pokemonId)?.encounterRate || 255;
        this.history.push(record);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift(); // Remove oldest
        }
        this.saveState();
        this._onDidRecordEncounter.fire(record);
    }

    /**
     * 取得最近的遭遇紀錄
     * @param n 取得筆數 (預設由設定檔決定)
     */
    public getRecentEncounters(n: number = difficultyConfig.settings.defaultSampleSize): EncounterRecord[] {
        return this.history.slice(-n);
    }

    /**
     * 計算平均遭遇率 (Average Encounter Rate)
     * 用於評估玩家近期的運氣 (數值越低代表運氣越好，遇到越稀有的怪)
     * @param n 參考最近幾筆紀錄
     */
    public getAvgEncounterRate(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n);
        if (recent.length === 0) { return 100; } // Default medium

        return recent.reduce((sum, e) => sum + e.pokemonEncounterRate, 0) / recent.length;
    }

    /**
     * 計算近期遭遇異色寶可夢數量
     * @param n 參考最近幾筆紀錄
     */
    public getRecentShinyCount(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n);
        // 只計算「已捕獲」的異色寶可夢
        // 避免玩家看到異色卻沒抓到 (心情已經很差了)，結果下一場難度還變高 (雙重懲罰)
        return recent.filter(e => e.isShiny && e.wasCaught).length;
    }

    /**
     * 計算加權捕獲表現 (Weighted Catch Performance)
     * 綜合考量捕獲成功率與目標難度 (捕獲神獸成功權重極高，捕獲波波失敗權重極低)
     * @param n 參考最近幾筆紀錄
     */
    public getWeightedCatchPerformance(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n).filter(e => e.wasAttempted);
        if (recent.length === 0) { return 0.5; }

        let totalWeight = 0;
        let weightedSuccess = 0;

        for (const encounter of recent) {
            // Difficulty Weight: Lower catchRate = Higher value
            const difficultyWeight = 255 / encounter.pokemonCatchRate;

            // Attempt Penalty: More balls used = Lower score
            const attemptPenalty = Math.max(0.5, 1 - (encounter.catchAttempts - 1) * 0.1);

            totalWeight += difficultyWeight;
            if (encounter.wasCaught) {
                weightedSuccess += difficultyWeight * attemptPenalty;
            }
        }

        return weightedSuccess / totalWeight;
    }

    /**
     * 計算近期勝率
     * @param n 參考最近幾筆紀錄
     */
    public getRecentWinRate(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n).filter(e => e.battleResult !== 'flee');
        if (recent.length === 0) { return 0.5; }

        const wins = recent.filter(e => e.battleResult === 'win').length;
        return wins / recent.length;
    }

    /**
     * 計算平均剩餘 HP 百分比
     * @param n 參考最近幾筆紀錄
     */
    public getAvgRemainingHpPercent(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n).filter(e => e.remainingHpPercent !== undefined);
        if (recent.length === 0) { return 0.5; }

        return recent.reduce((sum, e) => sum + (e.remainingHpPercent || 0), 0) / recent.length;
    }

    /**
     * 計算近期捕獲成功率
     * @param n 參考最近幾筆紀錄
     */
    public getCatchSuccessRate(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n).filter(e => e.wasAttempted);
        if (recent.length === 0) { return 0.5; }

        const caught = recent.filter(e => e.wasCaught).length;
        return caught / recent.length;
    }

    /**
     * 計算近期瀕死率
     * @param n 參考最近幾筆紀錄
     */
    public getFaintRate(n: number = difficultyConfig.settings.defaultSampleSize): number {
        const recent = this.getRecentEncounters(n).filter(e => e.playerFainted !== undefined);
        if (recent.length === 0) { return 0.1; } // Default low

        const faints = recent.filter(e => e.playerFainted).length;
        return faints / recent.length;
    }

    /**
     * 取得特定捕獲率區間的實際捕獲率
     */
    public getCatchRateByTier(minRate: number, maxRate: number): number {
        const filtered = this.history.filter(
            e => e.wasAttempted &&
                e.pokemonCatchRate >= minRate &&
                e.pokemonCatchRate <= maxRate
        );
        if (filtered.length === 0) { return 0.5; }

        const caught = filtered.filter(e => e.wasCaught).length;
        return caught / filtered.length;
    }

    /**
     * 給 UI 呈現近期的捕獲率呈現
     * 分析各個稀有度層級的捕獲技巧
     * (Legendary, Rare, Uncommon, Common)
     */
    public analyzeCatchSkillByTier(): CatchSkillAnalysis {
        return {
            legendary: {  // catchRate 3-25
                successRate: this.getCatchRateByTier(3, 25),
                sampleSize: this.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 3 && e.pokemonCatchRate <= 25).length,
            },
            rare: {  // catchRate 26-75
                successRate: this.getCatchRateByTier(26, 75),
                sampleSize: this.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 26 && e.pokemonCatchRate <= 75).length,
            },
            uncommon: {  // catchRate 76-150
                successRate: this.getCatchRateByTier(76, 150),
                sampleSize: this.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 76 && e.pokemonCatchRate <= 150).length,
            },
            common: {  // catchRate 151-255
                successRate: this.getCatchRateByTier(151, 255),
                sampleSize: this.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 151 && e.pokemonCatchRate <= 255).length,
            },
        };
    }

    /**
     * 推薦下一次遭遇的稀有度區間
     * 根據 DDA 計算結果，回傳建議的 min/max encounter rate
     */
    public recommendNextEncounterRange(): { min: number; max: number } {

        const modifiers = this.getModifiers();
        return {
            min: modifiers.minEncounterRate,
            max: modifiers.maxEncounterRate,
        };
    }

    public clear(): void {
        this.history = [];
        this.saveState();
    }
}
