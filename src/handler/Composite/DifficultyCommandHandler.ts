import * as vscode from 'vscode';
import { BiomeDataHandler } from "../../core/BiomeHandler";
import { DifficultyLevelPayload, HandlerContext, SetDDAEnabledPayload, SetDifficultyLevelPayload } from "../../dataAccessObj/MessagePayload";
import { AchievementManager } from "../../manager/AchievementManager";
import { BagManager } from "../../manager/bagsManager";
import { DifficultyManager } from "../../manager/DifficultyManager";
import { GameStateManager } from "../../manager/gameStateManager";
import { JoinPokemonManager } from "../../manager/joinPokemonManager";
import { PokemonBoxManager } from "../../manager/pokeBoxManager";
import { PokeDexManager } from "../../manager/pokeDexManager";
import { SessionLockManager } from "../../manager/SessionLockManager";
import { UserDaoManager } from "../../manager/userDaoManager";
import { BattleCommandHandler } from "./BattleCommandHandler";
import { ItemCommandHandler } from "./ItemCommandHandler";
import { PokemonCommandHandler } from "./PokemonCommandHandler";
import { MessageType } from '../../dataAccessObj/messageType';

export class DifficultyCommandHandler {
    private readonly difficultyManager: DifficultyManager;


    private _handlerContext: HandlerContext | null = null;

    constructor(
        difficultyManager: DifficultyManager,
    ) {
        this.difficultyManager = difficultyManager;

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


    // ==================== Difficulty ====================
    public async handleGetDifficultyModifiers(): Promise<void> {
        const modifiers = this.difficultyManager.getModifiers();
        this.handlerContext.postMessage({
            type: MessageType.DifficultyModifiersData,
            data: modifiers
        });
    }


    public async handleGetDifficultyLevel(): Promise<void> {
        const level = this.difficultyManager.getCurrentLevel();
        const config = this.difficultyManager.getLevelConfig(level);
        const data: DifficultyLevelPayload = {
            level,
            config,
            maxUnlocked: this.difficultyManager.getMaxUnlockedLevel(),
            ddaEnabled: this.difficultyManager.isDDAEnabled()
        };
        this.handlerContext.postMessage({
            type: MessageType.DifficultyLevelData,
            data: data
        });
    }

    public async handleSetDifficultyLevel(payload: SetDifficultyLevelPayload): Promise<void> {
        const success = await this.difficultyManager.setDifficultyLevel(payload.level);
        if (success) {
            this.handlerContext.updateAllViews();
        } else {
            vscode.window.showErrorMessage(`Failed to set difficulty level ${payload.level}`);
        }
    }

    public async handleSetDDAEnabled(payload: SetDDAEnabledPayload): Promise<void> {
        await this.difficultyManager.setDDAEnabled(payload.enabled);
        this.handlerContext.updateAllViews();
        vscode.window.showInformationMessage(`Dynamic Difficulty Adjustment ${payload.enabled ? 'Enabled' : 'Disabled'}`);
    }

    public async handleUnlockNextLevel(): Promise<void> {
        await this.difficultyManager.unlockNextLevel();
        this.handlerContext.updateAllViews();
        vscode.window.showInformationMessage(`Unlocked next difficulty level!`);
    }
}
    