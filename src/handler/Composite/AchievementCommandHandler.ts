import * as vscode from 'vscode';
import { BiomeDataHandler } from "../../core/BiomeHandler";
import { GetPokeDexPayload, HandlerContext, PokeDexPayload, RecordEncounterPayload, UpdatePokeDexPayload } from "../../dataAccessObj/MessagePayload";
import { MessageType } from "../../dataAccessObj/messageType";
import { AchievementManager } from "../../manager/AchievementManager";
import { BagManager } from "../../manager/bagsManager";
import { DifficultyManager } from "../../manager/DifficultyManager";
import { GameStateManager } from "../../manager/gameStateManager";
import { JoinPokemonManager } from "../../manager/joinPokemonManager";
import { PokemonBoxManager } from "../../manager/pokeBoxManager";
import { PokeDexManager } from "../../manager/pokeDexManager";
import { SessionLockManager } from "../../manager/SessionLockManager";
import { UserDaoManager } from "../../manager/userDaoManager";
import { RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload, RecordItemActionPayload } from "../../utils/AchievementCritiria";

export class AchievementCommandHandler {
    private readonly achievementManager: AchievementManager;
    private readonly difficultyManager: DifficultyManager;
    private readonly pokeDexManager: PokeDexManager;

    private _handlerContext: HandlerContext | null = null;

    constructor(
        achievementManager: AchievementManager,
        difficultyManager: DifficultyManager,
        pokeDexManager: PokeDexManager,
    ) {
        this.achievementManager = achievementManager;
        this.difficultyManager = difficultyManager;
        this.pokeDexManager = pokeDexManager;

    }

    public setHandlerContext(handlerContext: HandlerContext): void {
        this._handlerContext = handlerContext;
    }

    private get handlerContext(): HandlerContext {
        if (!this._handlerContext) {
            throw new Error('HandlerContext not set. Call setHandlerContext first.');
        }
        return this._handlerContext;
    }

    // ==================== Get Achievements Data ====================
    public async handleGetAchievements(): Promise<void> {
        const achievements = this.achievementManager.getStatistics();
        this.handlerContext.postMessage({ type: MessageType.AchievementsData, data: achievements });
    }

    // ==================== Battle Action ====================
    public async handleRecordBattleAction(payload: RecordBattleActionPayload): Promise<void> {
        await this.achievementManager.onBattleAction(payload);
        this.handlerContext.updateAchievementsView();
    }

    // ==================== Battle Finished ====================
    public async handleRecordBattleFinished(payload: RecordBattleFinishedPayload): Promise<void> {
        await this.achievementManager.onBattleFinished(payload);
        this.handlerContext.updateAchievementsView();
    }

    // ==================== Catch in Battle ====================
    public async handleRecordCatchInBattle(payload: RecordBattleCatchPayload): Promise<void> {
        await this.achievementManager.onCatchPokemon(payload);
        this.handlerContext.updateAchievementsView();
    }

    // ==================== Record Encounter ====================
    public async handleRecordEncounter(payload: RecordEncounterPayload): Promise<void> {
        this.difficultyManager.recordEncounter(payload.record);
    }

    // ==================== Item Action ====================
    public async handleRecordItemAction(payload: RecordItemActionPayload): Promise<void> {
        await this.achievementManager.onItemAction(payload);
        this.handlerContext.updateAchievementsView();
    }


        // ==================== Get PokeDex ====================
        public async handleGetPokeDex(payload: GetPokeDexPayload): Promise<void> {
            const dexData = await this.pokeDexManager.getPokeDexEntrys(payload.gen);
            const ret: PokeDexPayload = {
                gen: payload.gen,
                entries: dexData
            };
            this.handlerContext.postMessage({
                type: MessageType.PokeDexData,
                data: ret
            });
        }
    
        // ==================== Get Current PokeDex ====================
        public async handleGetCurrentPokeDex(): Promise<void> {
            const dexData = await this.pokeDexManager.getCurrentPokeDexEntrys();
            const ret: PokeDexPayload = {
                gen: this.pokeDexManager.getCurrentGen(),
                entries: dexData
            };
            this.handlerContext.postMessage({
                type: MessageType.PokeDexData,
                data: ret
            });
        }
    
    
        // ==================== Update PokeDex ====================
        public async handleUpdatePokeDex(payload: UpdatePokeDexPayload): Promise<void> {
            await this.pokeDexManager.updatePokemonStatus(payload.pokemonId, payload.status, payload.gen);
            // After update, send back the updated data
            this.handleGetPokeDex({ gen: payload.gen });
        }
    


}