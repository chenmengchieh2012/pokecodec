import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { GameState } from '../dataAccessObj/GameState';
import GlobalStateKey from '../utils/GlobalStateKey';
import { MAX_PARTY_SIZE, PokemonDao } from '../dataAccessObj/pokemon';
import { BattleMode, GameStateData } from '../dataAccessObj/gameStateData';
import { EncounterResult } from '../core/EncounterHandler';
import { GlobalMutex } from '../utils/GlobalMutex';
import { TrainerData } from '../dataAccessObj/trainerData';

export class GameStateManager {
    private static instance: GameStateManager;
    // 記憶體快取 (只供讀取與 UI 顯示)
    private gameStateData: GameStateData = {
        battleMode: undefined,
        trainerData: undefined,
        state: GameState.Searching,
        encounterResult: undefined,
        opponentParty: [],
        defenderPokemonUid: undefined,
        opponentPokemonUid: undefined
    };
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

    public getGameStateData(): GameStateData {
        console.log("GameState.getGameState:", this.gameStateData.state);
        console.log("GameState.getEncounterResult:", this.gameStateData.encounterResult);
        return this.gameStateData; // 回傳複製品以防外部修改
    }


    public async updateOpponentsInParty(opponentPartys: PokemonDao[]): Promise<void> {
        await this.performTransaction((data) => {
            if (data.opponentParty) {
                data.opponentParty.map((p, index) => {
                    opponentPartys.forEach(element => {
                        if (p.uid === element.uid) {
                            data.opponentParty![index] = element;
                        }
                    });
                });
            } else {
                data.opponentParty = opponentPartys;
            }
            return data;
        });
    }



    public async updateDefenderPokemonUid(pokemonUid: string | undefined): Promise<void> {
        await this.performTransaction((data) => {
            data.defenderPokemonUid = pokemonUid;
            return data;
        });
    }



    public async updateOpponentPokemonUid(pokemonUid: string | undefined): Promise<void> {
        await this.performTransaction((data) => {
            data.opponentPokemonUid = pokemonUid;
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
            const currentData: GameStateData = storedData ?? {
                battleMode: undefined,
                trainerData: undefined,
                state: GameState.Searching,
                encounterResult: undefined,
                opponentParty: [],
                opponentPokemonUid: undefined,
                defenderPokemonUid: undefined,
            };

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
    public async updateGameState(state: GameState, props: {
        battleMode?: BattleMode,
        trainerData?: TrainerData,
        opponentParty?: PokemonDao[],
        encounterResult?: EncounterResult,
        defenderPokemonUid?: string,
        opponentPokemonUid?: string
    }): Promise<boolean> {
        let success = false;
        const { battleMode, opponentParty, encounterResult, defenderPokemonUid, opponentPokemonUid } = props;
        await this.performTransaction((data) => {
            if (state === GameState.Searching || state === GameState.Caught) {
                data.battleMode = undefined;
                data.encounterResult = undefined!;
            } else if (state === GameState.Battle || state === GameState.WildAppear || state === GameState.TrainerAppear) {
                //if (encounterResult !== undefined) {
                data.encounterResult = encounterResult;
                //}
                //if (battleMode !== undefined) {
                data.battleMode = battleMode;
                //}
            }
            if (opponentParty) {
                data.opponentParty = opponentParty;
            }
            data.defenderPokemonUid = defenderPokemonUid;
            data.opponentPokemonUid = opponentPokemonUid;
            data.state = state;
            return data;
        });
        success = true;

        return success;
    }



    public async clear(): Promise<void> {
        await this.performTransaction(() => {
            return {
                battleMode: undefined,
                trainerData: undefined,
                state: GameState.Searching,
                encounterResult: undefined,
                defenderPokemonUid: undefined,
                opponentParty: [],
                opponentPokemonUid: undefined
            };
        });
    }
}