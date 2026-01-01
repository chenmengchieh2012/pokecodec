import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as zlib from 'zlib';
import { BiomeDataHandler } from '../core/BiomeHandler';
import { PokemonFactory } from '../core/CreatePokemonHandler';
import {
    DifficultyLevelPayload,
    GetPokeDexPayload,
    HandlerContext,
    PokeDexPayload,
    RecordEncounterPayload,
    SetDDAEnabledPayload,
    SetDeviceLockPayload,
    SetDifficultyLevelPayload,
    SetGameStateDataPayload,
    UpdateDefenderPokemonUidPayload,
    UpdateMoneyPayload,
    UpdateOpponentPokemonUidPayload,
    UpdateOpponentsInPartyPayload,
    UpdatePokeDexPayload
} from '../dataAccessObj/MessagePayload';
import { MessageType } from '../dataAccessObj/messageType';
import { AchievementManager } from '../manager/AchievementManager';
import { BagManager } from '../manager/bagsManager';
import { GameStateManager } from '../manager/gameStateManager';
import { PokemonBoxManager } from '../manager/pokeBoxManager';
import { PokeDexManager } from '../manager/pokeDexManager';
import { UserDaoManager } from '../manager/userDaoManager';
import { RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload, RecordItemActionPayload } from '../utils/AchievementCritiria';
import { RestoreCodeExtractor } from '../utils/RestoreCodeExtractor';

import pokemonGen1Data from '../data/pokemonGen1.json';
import moveData from '../data/pokemonMoves.json';
import { BiomeType } from '../dataAccessObj/BiomeData';
import { GameState } from '../dataAccessObj/GameState';
import { BattleMode } from '../dataAccessObj/gameStateData';
import { PokemonDao, RawPokemonData } from '../dataAccessObj/pokemon';
import { PokemonMove } from '../dataAccessObj/pokeMove';
import { DifficultyManager } from '../manager/DifficultyManager';
import { SessionLockManager } from '../manager/SessionLockManager';

import rawTrainers from '../data/trainers.json';
import { MAX_DIFFICULTY_LEVEL } from '../dataAccessObj/DifficultyData';
import { TrainerData } from '../dataAccessObj/trainerData';
import { JoinPokemonManager } from '../manager/joinPokemonManager';
import { QrcodeGenerator } from '../utils/QrcodeGenerator';
import { ItemCommandHandler } from './Composite/ItemCommandHandler';
import { PokemonCommandHandler } from './Composite/PokemonCommandHandler';
import { BattleCommandHandler } from './Composite/BattleCommandHandler';
import { DifficultyCommandHandler } from './Composite/DifficultyCommandHandler';
import { AchievementCommandHandler } from './Composite/AchievementCommandHandler';
import { DeviceBindCommandHandler } from './Composite/DeviceBindCommandHandler';
const trainerDatas = rawTrainers as TrainerData[];

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;
const pokemonMoveDataMap = moveData as unknown as Record<string, any>;
export class CommandHandler {
    private readonly pokemonBoxManager: PokemonBoxManager;
    private readonly userDaoManager: UserDaoManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly sessionLockManager: SessionLockManager;

    private readonly biomeHandler: BiomeDataHandler;

    // Composite Handler Context
    public readonly pokemonCommandHandler: PokemonCommandHandler;
    public readonly itemCommandHandler: ItemCommandHandler;
    public readonly battleCommandHandler: BattleCommandHandler;
    public readonly difficultyCommandHandler: DifficultyCommandHandler;
    public readonly achievementCommandHandler: AchievementCommandHandler;
    public readonly deviceBindCommandHandler: DeviceBindCommandHandler;

    private _handlerContext: HandlerContext | null = null;

    constructor(
        pokemonBoxManager: PokemonBoxManager,
        bagManager: BagManager,
        userDaoManager: UserDaoManager,
        gameStateManager: GameStateManager,
        partyManager: JoinPokemonManager,
        biomeHandler: BiomeDataHandler,
        pokeDexManager: PokeDexManager,
        achievementManager: AchievementManager,
        difficultyManager: DifficultyManager,
        sessionLockManager: SessionLockManager,
        context: vscode.ExtensionContext,
    ) {
        this.pokemonBoxManager = pokemonBoxManager;
        this.userDaoManager = userDaoManager;
        this.partyManager = partyManager;
        this.biomeHandler = biomeHandler;
        this.sessionLockManager = sessionLockManager;

        this.pokemonCommandHandler = new PokemonCommandHandler(
            pokemonBoxManager,
            userDaoManager,
            partyManager,
            achievementManager,
            difficultyManager
        );

        this.itemCommandHandler = new ItemCommandHandler(
            bagManager,
            partyManager,
            achievementManager
        );

        this.battleCommandHandler = new BattleCommandHandler(
            userDaoManager,
            gameStateManager,
            partyManager,
            biomeHandler,
            difficultyManager
        );
        
        this.difficultyCommandHandler = new DifficultyCommandHandler(
            difficultyManager,
        );

        this.achievementCommandHandler = new AchievementCommandHandler(
            achievementManager,
            difficultyManager,
            pokeDexManager
        );

        this.deviceBindCommandHandler = new DeviceBindCommandHandler(
            pokemonBoxManager,
            partyManager,
            context
        );
        

    }

    public setHandlerContext(handlerContext: HandlerContext): void {
        this._handlerContext = handlerContext;
        this.pokemonCommandHandler.setHandlerContext(handlerContext);
        this.itemCommandHandler.setHandlerContext(handlerContext);
        this.battleCommandHandler.setHandlerContext(handlerContext);
        this.difficultyCommandHandler.setHandlerContext(handlerContext);
        this.achievementCommandHandler.setHandlerContext(handlerContext);
        this.deviceBindCommandHandler.setHandlerContext(handlerContext);
    }

    private get handlerContext(): HandlerContext {
        if (!this._handlerContext) {
            throw new Error('HandlerContext not set. Call setHandlerContext first.');
        }
        return this._handlerContext;
    }
    


    // ==================== Reset Storage ====================
    public async handleResetStorage(resetStorageFn: () => Promise<void>): Promise<void> {
        await resetStorageFn();
    }

    // ==================== Get User Info ====================
    public handleGetUserInfo(): void {
        const userInfoData = this.userDaoManager.getUserInfo();
        this.handlerContext.postMessage({ type: MessageType.UserData, data: userInfoData });
    }

    // ==================== Update Money ====================
    public async handleUpdateMoney(payload: UpdateMoneyPayload): Promise<void> {
        if (typeof payload.amount === 'number') {
            await this.userDaoManager.updateMoney(payload.amount);
            this.handlerContext.updateAllViews();
        }
    }


    public handleSessionStatus() {
        const isLockedByMe = this.sessionLockManager.isLockedByMe();
        this.handlerContext.postMessage({
            type: MessageType.SessionStatus,
            data: { active: isLockedByMe }
        });
    }



}