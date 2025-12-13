import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { GameState } from '../dataAccessObj/GameState';
import GlobalStateKey from '../utils/GlobalStateKey';

export class GameStateManager{
    // 記憶體快取 (只供讀取與 UI 顯示)
    private gameState: GameState| undefined =  undefined;
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.GAME_STATE;
    
    private saveQueue = new SequentialExecutor();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    public reload() {
        const data = this.context.globalState.get<GameState>(this.STORAGE_KEY);
        if (data) {
            this.gameState = data;
        }
    }

    public getGameState(): GameState | undefined {
        console.log("GameState.getGameState:", this.gameState);
        return this.gameState; // 回傳複製品以防外部修改
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (state: GameState) => GameState): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. 從硬碟讀取最新資料
            const storedData = this.context.globalState.get<GameState>(this.STORAGE_KEY);
            // 合併預設值 (防止資料欄位缺失)
            const currentData: GameState = storedData ?? GameState.Searching;

            // 2. 執行修改
            const newData = modifier(currentData);

            // 3. 寫回硬碟
            await this.context.globalState.update(this.STORAGE_KEY, newData);

            // 4. 更新記憶體快取
            this.gameState = newData;
        });
    }

    /**
     * 更新金錢
     * @returns true 成功, false 失敗
     */
    public async updateGameState(state: GameState): Promise<boolean> {
        let success = false;

        await this.performTransaction((data) => {
            success = true;
            return state;
        });

        return success;
    }
}