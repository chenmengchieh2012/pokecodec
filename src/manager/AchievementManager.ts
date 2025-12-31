import * as vscode from 'vscode';
import { AchievementAnalyzer, AchievementStatistics, RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload, RecordItemActionPayload, RecordEncounterPayload, RecordEvolvePayload, RecordLearnMoveFromMachinePayload } from '../utils/AchievementCritiria';
import GlobalStateKey from '../utils/GlobalStateKey';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { GlobalMutex } from '../utils/GlobalMutex';


export class AchievementManager {
    private static instance: AchievementManager;
    private context: vscode.ExtensionContext;
    // Map<GenID, PokeDexData>
    private achievementStatistics: AchievementStatistics = AchievementAnalyzer.getDefaultStatistics();
    private readonly STORAGE_KEY = GlobalStateKey.ACHIEVEMENT;
    private saveQueue: SequentialExecutor;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.saveQueue = new SequentialExecutor(new GlobalMutex(context, 'achievement.lock'));
        this._loadFromDisk();
    }

    public static getInstance(): AchievementManager {
        if (!AchievementManager.instance) {
            throw new Error("AchievementManager not initialized. Call initialize() first.");
        }
        return AchievementManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): AchievementManager {
        AchievementManager.instance = new AchievementManager(context);
        const statistics = AchievementManager.instance.getStatistics();

        // 如果是第一次安裝 (undefined) 或是讀取到空陣列 (預設值)，則初始化資料
        if (!statistics) {
            AchievementManager.instance.clear();
        }
        return AchievementManager.instance;
    }

    private _loadFromDisk() {
        this.achievementStatistics = this.context.globalState.get<AchievementStatistics>(this.STORAGE_KEY, AchievementAnalyzer.getDefaultStatistics());
    }

    public async reload() {
        await this.saveQueue.execute(async () => {
            this._loadFromDisk();
        });
    }

    public getStatistics(): AchievementStatistics {
        return this.achievementStatistics;
    }

    public async onEvolve(payload: RecordEvolvePayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onEvolve(payload);
            return analyzer.getStatistics();
        });
    }

    public async onLearnMoveFromMachine(_: RecordLearnMoveFromMachinePayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onLearnMoveFromMachine();
            return analyzer.getStatistics();
        });
    }

    private async performTransaction(modifier: (statistic: AchievementStatistics) => AchievementStatistics): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read
            const key = this.STORAGE_KEY;
            const storedData = this.context.globalState.get<AchievementStatistics>(key, AchievementAnalyzer.getDefaultStatistics());

            // 2. Modify
            const newData = modifier(storedData);
            // 3. Write
            await this.context.globalState.update(key, newData);

            // 4. Update Cache
            this.achievementStatistics = newData;
        });
    }


    public async onBattleFinished(payload: RecordBattleFinishedPayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onBattleFinished({
                ...payload
            });
            return analyzer.getStatistics();
        });
    }

    public async onCatchPokemon(payload: RecordBattleCatchPayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onCatch(payload);
            return analyzer.getStatistics();
        });
    }

    public async onBattleAction(payload: RecordBattleActionPayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onBattleAction({
                ...payload
            });
            return analyzer.getStatistics();
        });
    }

    public async onItemAction(payload: RecordItemActionPayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onItemAction({
                ...payload
            });
            console.log("AchievementManager: onItemAction updated statistics:", analyzer.getStatistics());
            console.log("AchievementManager: onItemAction payload:", payload);
            return analyzer.getStatistics();
        });
    }

    public async onEncounter(payload: RecordEncounterPayload): Promise<void> {
        await this.performTransaction((stats) => {
            const analyzer = new AchievementAnalyzer(stats);
            analyzer.onEncounter({
                ...payload
            });
            return analyzer.getStatistics();
        });
    }

    public async clear(): Promise<void> {
        await this.context.globalState.update(this.STORAGE_KEY, AchievementAnalyzer.getDefaultStatistics());
        this.achievementStatistics = AchievementAnalyzer.getDefaultStatistics();
    }

    public async checkDbEmpty(): Promise<boolean> {
        const data = this.context.globalState.get<AchievementStatistics>(this.STORAGE_KEY);
        return data === undefined;
    }


}
