import * as vscode from 'vscode';

export enum DifficultyBall {
    PokeBall = 'poke_ball',     // Basic (Easy AI)
    GreatBall = 'great_ball',   // Standard (Normal AI)
    UltraBall = 'ultra_ball'    // Competitive (Hard AI)
}

export enum DifficultyStar {
    One = 1,    // Low Intensity
    Two = 2,    // Medium Intensity
    Three = 3   // High Intensity
}

export interface DifficultyLevelConfig {
    level: number;
    ball: DifficultyBall;
    star: DifficultyStar;
    name: string;
    description: string;
}

export interface DifficultyModifiers {
    levelOffset: number;              // -5 to +5 (DDA) + Base Offset
    encounterRateMultiplier: number;  // 0.5 to 2.0
    catchBonus: number;               // 0 to 50
    expMultiplier: number;            // 0.8 to 1.5
    minEncounterRate: number;         // 1-255
    maxEncounterRate: number;         // 1-255

    // AI & Tactics
    aiLevel: number;                  // 0-100
    moveSetQuality: 'basic' | 'balanced' | 'competitive';
}

export interface DifficultyMetrics {
    recentWinRate: number;              // 0.0 - 1.0
    avgRemainingHpPercent: number;      // 0.0 - 1.0
    catchSuccessRate: number;           // 0.0 - 1.0
    faintRate: number;                  // 0.0 - 1.0
    avgEncounterRate: number;           // 1-255
    weightedCatchPerformance: number;   // 0.0 - 1.0
}

export class DifficultyManager {
    private static instance: DifficultyManager;
    private context: vscode.ExtensionContext;

    // State Keys
    private readonly KEY_CURRENT_LEVEL = 'difficulty.currentLevel';
    private readonly KEY_MAX_UNLOCKED = 'difficulty.maxUnlockedLevel';

    // State
    private currentLevel: number = 1;
    private maxUnlockedLevel: number = 1;

    // Constants
    public static readonly MAX_LEVEL = 9;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadState();
    }

    public static initialize(context: vscode.ExtensionContext): DifficultyManager {
        if (!DifficultyManager.instance) {
            DifficultyManager.instance = new DifficultyManager(context);
        }
        return DifficultyManager.instance;
    }

    public static getInstance(): DifficultyManager {
        if (!DifficultyManager.instance) {
            throw new Error("DifficultyManager not initialized. Call initialize() first.");
        }
        return DifficultyManager.instance;
    }

    private loadState() {
        this.currentLevel = this.context.globalState.get<number>(this.KEY_CURRENT_LEVEL, 1);
        this.maxUnlockedLevel = this.context.globalState.get<number>(this.KEY_MAX_UNLOCKED, 1);
    }

    private async saveState() {
        await this.context.globalState.update(this.KEY_CURRENT_LEVEL, this.currentLevel);
        await this.context.globalState.update(this.KEY_MAX_UNLOCKED, this.maxUnlockedLevel);
    }

    // ==========================================
    // Level Management
    // ==========================================

    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    public getMaxUnlockedLevel(): number {
        return this.maxUnlockedLevel;
    }

    public async setDifficultyLevel(level: number): Promise<boolean> {
        if (level < 1 || level > DifficultyManager.MAX_LEVEL) {
            console.warn(`[DifficultyManager] Invalid level: ${level}`);
            return false;
        }
        if (level > this.maxUnlockedLevel) {
            console.warn(`[DifficultyManager] Level ${level} is locked. Max unlocked: ${this.maxUnlockedLevel}`);
            return false;
        }
        this.currentLevel = level;
        await this.saveState();
        return true;
    }

    /**
     * Call this when a Gym Leader / Elite Four is defeated
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

    private getBallDisplayName(ball: DifficultyBall): string {
        switch (ball) {
            case DifficultyBall.PokeBall: return 'Poké Ball';
            case DifficultyBall.GreatBall: return 'Great Ball';
            case DifficultyBall.UltraBall: return 'Ultra Ball';
        }
    }

    private getLevelDescription(ball: DifficultyBall, star: DifficultyStar): string {
        const aiDesc = ball === DifficultyBall.PokeBall ? 'Basic AI' : (ball === DifficultyBall.GreatBall ? 'Standard AI' : 'Advanced AI');
        const intensityDesc = star === DifficultyStar.One ? 'Low' : (star === DifficultyStar.Two ? 'Medium' : 'High');
        return `${aiDesc}, ${intensityDesc} Intensity.`;
    }

    // ==========================================
    // DDA Logic
    // ==========================================

    /**
     * Get the base offset for DDA based on current difficulty level
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

    public getEnemyAILevel(): number {
        const config = this.getLevelConfig(this.currentLevel);
        switch (config.ball) {
            case DifficultyBall.PokeBall: return 20;
            case DifficultyBall.GreatBall: return 60;
            case DifficultyBall.UltraBall: return 95;
        }
    }

    public getMoveSetQuality(): 'basic' | 'balanced' | 'competitive' {
        const config = this.getLevelConfig(this.currentLevel);
        switch (config.ball) {
            case DifficultyBall.PokeBall: return 'basic';
            case DifficultyBall.GreatBall: return 'balanced';
            case DifficultyBall.UltraBall: return 'competitive';
        }
    }

    /**
     * Calculate the final difficulty index based on player metrics and current level settings
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

        const rawIndex = winScore + hpScore + survivalScore + weightedCatchScore + luckScore;

        // 2. Apply Base Offset from Difficulty Level
        const baseOffset = this.getBaseOffset();

        // 3. Clamp result
        return Math.min(100, Math.max(0, rawIndex + baseOffset));
    }

    /**
     * Get active modifiers based on current metrics (or default if no metrics provided)
     */
    public getModifiers(metrics?: DifficultyMetrics): DifficultyModifiers {
        // Default metrics if none provided (assume balanced state)
        const currentMetrics = metrics || {
            recentWinRate: 0.5,
            avgRemainingHpPercent: 0.5,
            catchSuccessRate: 0.5,
            faintRate: 0.1,
            avgEncounterRate: 150,
            weightedCatchPerformance: 0.5
        };

        const difficultyIndex = this.calculateDifficultyIndex(currentMetrics);

        // Thresholds
        const ANXIETY_ZONE = 30;
        const FLOW_LOWER = 40;
        const FLOW_UPPER = 60;
        const BOREDOM_ZONE = 70;

        let modifiers: Partial<DifficultyModifiers> = {};

        if (difficultyIndex < ANXIETY_ZONE) {
            // Anxiety Zone (Too Hard) -> Make it easier
            modifiers = {
                levelOffset: -3,
                encounterRateMultiplier: 2.0, // More common mons
                catchBonus: 30,
                expMultiplier: 1.3,
                minEncounterRate: 100,
                maxEncounterRate: 255
            };
        } else if (difficultyIndex < FLOW_LOWER) {
            // Approaching Anxiety -> Slightly easier
            modifiers = {
                levelOffset: -1,
                encounterRateMultiplier: 1.5,
                catchBonus: 15,
                expMultiplier: 1.15,
                minEncounterRate: 50,
                maxEncounterRate: 255
            };
        } else if (difficultyIndex <= FLOW_UPPER) {
            // Flow Zone -> Standard
            modifiers = {
                levelOffset: 0,
                encounterRateMultiplier: 1.0,
                catchBonus: 0,
                expMultiplier: 1.0,
                minEncounterRate: 1,
                maxEncounterRate: 255
            };
        } else if (difficultyIndex < BOREDOM_ZONE) {
            // Approaching Boredom -> Slightly harder
            modifiers = {
                levelOffset: 1,
                encounterRateMultiplier: 0.8,
                catchBonus: -10,
                expMultiplier: 0.95,
                minEncounterRate: 1,
                maxEncounterRate: 180
            };
        } else {
            // Boredom Zone (Too Easy) -> Make it harder
            modifiers = {
                levelOffset: 3,
                encounterRateMultiplier: 0.5, // More rare mons
                catchBonus: -25,
                expMultiplier: 0.85,
                minEncounterRate: 1,
                maxEncounterRate: 100
            };
        }

        return {
            levelOffset: modifiers.levelOffset!,
            encounterRateMultiplier: modifiers.encounterRateMultiplier!,
            catchBonus: modifiers.catchBonus!,
            expMultiplier: modifiers.expMultiplier!,
            minEncounterRate: modifiers.minEncounterRate!,
            maxEncounterRate: modifiers.maxEncounterRate!,
            aiLevel: this.getEnemyAILevel(),
            moveSetQuality: this.getMoveSetQuality()
        };
    }
}
