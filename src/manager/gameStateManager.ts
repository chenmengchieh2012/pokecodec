import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { GameState } from '../dataAccessObj/GameState';
import GlobalStateKey from '../utils/GlobalStateKey';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { GameStateData } from '../dataAccessObj/gameStateData';
import { EncounterResult } from '../core/EncounterHandler';
import { GlobalMutex } from '../utils/GlobalMutex';

export class GameStateManager{
    private static instance: GameStateManager;
    // 記憶體快取 (只供讀取與 UI 顯示)
    private gameStateData: GameStateData = { state: GameState.Searching, encounterResult: undefined, defendPokemon: undefined };
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.GAME_STATE;
    
    private saveQueue: SequentialExecutor;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.saveQueue = new SequentialExecutor(new GlobalMutex(context, 'gamestate.lock'));
        this.reload();
    }

    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            throw new Error("GameStateManager not initialized. Call initialize() first.");
        }
        return GameStateManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): GameStateManager {
        GameStateManager.instance = new GameStateManager(context);
        return GameStateManager.instance;
    }

    public reload() {
        const data = this.context.globalState.get<GameStateData>(this.STORAGE_KEY);
        if (data) {
            this.gameStateData = data;
        }
    }

    public getGameStateData(): GameStateData | undefined {
        console.log("GameState.getGameState:", this.gameStateData.state);
        console.log("GameState.getEncounterResult:", this.gameStateData.encounterResult);
        return this.gameStateData; // 回傳複製品以防外部修改
    }


    public async updateEncounteredPokemon(pokemon: PokemonDao): Promise<void> {
        await this.performTransaction((data) => {
            if (data.encounterResult) {
                data.encounterResult.pokemon = pokemon;
            }
            return data;
        });
    }



    public async updateDefenderPokemon(pokemon: PokemonDao | undefined): Promise<void> {
        await this.performTransaction((data) => {
            data.defendPokemon = pokemon;
            return data;
        });
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (state: GameStateData) => GameStateData): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. 從硬碟讀取最新資料
            const storedData = this.context.globalState.get<GameStateData>(this.STORAGE_KEY);
            // 合併預設值 (防止資料欄位缺失)
            const currentData: GameStateData = storedData ?? { state: GameState.Searching, encounterResult: undefined, defendPokemon: undefined };

            // 2. 執行修改
            const newData = modifier(currentData);

            // 3. 寫回硬碟
            await this.context.globalState.update(this.STORAGE_KEY, newData);

            // 4. 更新記憶體快取
            this.gameStateData = newData;
        });
    }

    /**
     * 更新金錢
     * @returns true 成功, false 失敗
     */
    public async updateGameState(state: GameState, encounterResult?: EncounterResult, defendPokemon?: PokemonDao): Promise<boolean> {
        let success = false;

        await this.performTransaction((data) => {
            if(state === GameState.Searching || state === GameState.Caught){
                data.encounterResult = undefined!;
            } else if (state === GameState.Battle || state === GameState.WildAppear) {
                data.encounterResult = encounterResult;
            }
            data.defendPokemon = defendPokemon;
            data.state = state;
            return data;
        });
        success = true;

        return success;
    }

    public async clear(): Promise<void> {
        await this.performTransaction(() => {
            return { state: GameState.Searching, encounterResult: undefined, defendPokemon: undefined };
        });
    }
}