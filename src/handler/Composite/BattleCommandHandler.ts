import * as vscode from 'vscode';
import { BiomeDataHandler } from '../../core/BiomeHandler';
import { PokemonFactory } from '../../core/CreatePokemonHandler';
import pokemonGen1Data from '../../data/pokemonGen1.json';
import rawTrainers from '../../data/trainers.json';
import { BiomeType } from '../../dataAccessObj/BiomeData';
import { MAX_DIFFICULTY_LEVEL } from '../../dataAccessObj/DifficultyData';
import { GameState } from '../../dataAccessObj/GameState';
import { BattleMode } from '../../dataAccessObj/gameStateData';
import { HandlerContext, SetGameStateDataPayload, UpdateDefenderPokemonUidPayload, UpdateOpponentPokemonUidPayload, UpdateOpponentsInPartyPayload } from '../../dataAccessObj/MessagePayload';
import { MessageType } from '../../dataAccessObj/messageType';
import { PokemonDao, RawPokemonData } from '../../dataAccessObj/pokemon';
import { TrainerData } from '../../dataAccessObj/trainerData';
import { DifficultyManager } from '../../manager/DifficultyManager';
import { GameStateManager } from '../../manager/gameStateManager';
import { JoinPokemonManager } from '../../manager/joinPokemonManager';
import { UserDaoManager } from '../../manager/userDaoManager';

const trainerDatas = rawTrainers as TrainerData[];

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;

export class BattleCommandHandler {
    private readonly userDaoManager: UserDaoManager;
    private readonly gameStateManager: GameStateManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly difficultyManager: DifficultyManager;

    private readonly biomeHandler: BiomeDataHandler;

    private _handlerContext: HandlerContext | null = null;

    constructor(
        userDaoManager: UserDaoManager,
        gameStateManager: GameStateManager,
        partyManager: JoinPokemonManager,
        biomeHandler: BiomeDataHandler,
        difficultyManager: DifficultyManager,
    ) {
        this.userDaoManager = userDaoManager;
        this.gameStateManager = gameStateManager;
        this.partyManager = partyManager;
        this.biomeHandler = biomeHandler;
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


    // ==================== Set Auto Encounter ====================
    public async handleSetAutoEncounter(payload: { enabled: boolean }): Promise<void> {
        await this.userDaoManager.setAutoEncounter(payload.enabled);
        this.handlerContext.updateAllViews();
    }

    // ==================== Set Game State ====================
    public async handleSetGameStateData(payload: SetGameStateDataPayload): Promise<void> {
        await this.gameStateManager.updateGameState(
            payload.gameStateData.state,
            {
                battleMode: payload.gameStateData.battleMode,
                trainerData: payload.gameStateData.trainerData,
                opponentParty: payload.gameStateData.opponentParty,
                encounterResult: payload.gameStateData.encounterResult,
                opponentPokemonUid: payload.gameStateData.opponentPokemonUid,
                defenderPokemonUid: payload.gameStateData.defenderPokemonUid
            }
        );
        this.handlerContext.updateAllViews();
    }

    // ==================== Get Game State ====================
    public handleGetGameStateData(): void {
        const gameStateData = this.gameStateManager.getGameStateData();
        this.handlerContext.postMessage({ type: MessageType.GameStateData, data: gameStateData });
    }    


    // ==================== Update Opponent Party ====================
    public async handleUpdateOpponentsInParty(payload: UpdateOpponentsInPartyPayload): Promise<void> {
        await this.gameStateManager.updateOpponentsInParty(payload.opponentPokemons);
    }

    // ==================== Update Defender Pokemon UId ====================
    public async handleUpdateDefenderPokemonUid(payload: UpdateDefenderPokemonUidPayload): Promise<void> {
        await this.gameStateManager.updateDefenderPokemonUid(payload.pokemonUid);
    }


    // ==================== Update Opponent Pokemon UId ====================
    public async handleUpdateOpponentPokemonUid(payload: UpdateOpponentPokemonUidPayload): Promise<void> {
        await this.gameStateManager.updateOpponentPokemonUid(payload.pokemonUid);
    }

    // ==================== Trigger Encounter ====================
    public async handleWildTriggerEncounter() {
        const encounterEvent = await this.biomeHandler.getEncountered();
        if (!encounterEvent || !encounterEvent.pokemon) {
            console.log('[Extension] No encounter event generated.');
            return;
        }

        // Notify User if a Pokemon is encountered AND the view is NOT visible
        const isVisible = this.handlerContext.isViewVisible ? this.handlerContext.isViewVisible() : false;
        if (isVisible) {
            // If view is visible, do not notify
            // Send Encounter Event Directly
            this.handlerContext.postMessage({ type: MessageType.TriggerEncounter });

            // Wait for animation (1.5s)
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Update GameState on backend
            const myFirstPartyPokemon = this.partyManager.getAll().filter(p => p.currentHp > 0);
            if (myFirstPartyPokemon.length > 0) {
                await this.gameStateManager.updateGameState(GameState.WildAppear,
                    {
                        battleMode: BattleMode.Wild,
                        trainerData: undefined,
                        opponentParty: [encounterEvent.pokemon],
                        encounterResult: encounterEvent,
                        defenderPokemonUid: myFirstPartyPokemon[0].uid,
                        opponentPokemonUid: encounterEvent.pokemon.uid
                    }
                );
                await this.handleGetGameStateData();
            }
            return;
        } else {
            console.log('[Extension] View not visible, will notify user on encounter.');
            const myFirstPartyPokemon = this.partyManager.getAll().filter(p => p.currentHp > 0);
            if (myFirstPartyPokemon.length >= 0) {
                console.log('[Extension] Healthy Pokemon found in party, proceeding with encounter.');
                // 如果視圖不可見，跳過 Appear 階段，直接進入戰鬥狀態
                // 好像可以前端處理
                await this.gameStateManager.updateGameState(
                    GameState.TrainerAppear,
                    {
                        battleMode: BattleMode.Wild,
                        trainerData: undefined,
                        opponentParty: [encounterEvent.pokemon],
                        encounterResult: encounterEvent,
                        defenderPokemonUid: myFirstPartyPokemon[0].uid,
                        opponentPokemonUid: encounterEvent.pokemon.uid
                    }
                );
                await this.handleGetGameStateData();
                const selection = await vscode.window.showInformationMessage(
                    `A wild ${encounterEvent.pokemon.name} appeared!`,
                    'Open Game'
                );
                if (selection === 'Open Game') {
                    vscode.commands.executeCommand('pokemonReact.focus');
                }
            }
        }
    }

    public async handleNPCTriggerEncounter() {
        let trainnerPokemons: PokemonDao[] = [];
        let maxDifficultyLevel = this.difficultyManager.getMaxUnlockedLevel();
        if (maxDifficultyLevel > MAX_DIFFICULTY_LEVEL || maxDifficultyLevel < 1) {
            console.error(`[Extension] Invalid difficulty level ${maxDifficultyLevel}`);
            return;
        }

        const trainer = trainerDatas[maxDifficultyLevel - 1];
        if (!trainer) {
            console.error(`[Extension] Trainer data not found for difficulty level ${maxDifficultyLevel}`);
            return;
        }
        const myFirstPartyPokemon = this.partyManager.getAll().filter(p => p.currentHp > 0);
        if (myFirstPartyPokemon.length === 0) {
            console.log('[Extension] No healthy Pokemon in party, cannot trigger trainer encounter.');
            return;
        }
        trainer.party.forEach(async pokemonInfo => {
            const pokemonData = pokemonDataMap[pokemonInfo.id];
            if (pokemonData) {
                const pokemonInstance = await PokemonFactory.createWildPokemonInstance(
                    {
                        pokemonId: pokemonInfo.id,
                        nameZh: '',
                        nameEn: '',
                        minDepth: 0,
                        encounterRate: 0
                    }, this.difficultyManager, 
                    undefined, 
                    pokemonInfo.level
                );
                trainnerPokemons.push(pokemonInstance);
            }
        });
        
        // Notify User if a Pokemon is encountered AND the view is NOT visible
        const isVisible = this.handlerContext.isViewVisible ? this.handlerContext.isViewVisible() : false;
        if (isVisible) {
            // If view is visible, do not notify
            // Send Encounter Event Directly
            this.handlerContext.postMessage({ type: MessageType.TriggerEncounter });

            // Wait for animation (1.5s)
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Update GameState on backend
            const myFirstPartyPokemon = this.partyManager.getAll().filter(p => p.currentHp > 0);
            if (myFirstPartyPokemon.length > 0) {
                await this.gameStateManager.updateGameState(GameState.TrainerAppear,
                    {
                        battleMode: BattleMode.Trainer,
                        trainerData: trainer,
                        opponentParty: trainnerPokemons,
                        encounterResult: {
                            biomeType: BiomeType.BattleArena,
                            depth: 1
                        },
                        defenderPokemonUid: myFirstPartyPokemon[0].uid,
                        opponentPokemonUid: trainnerPokemons[0].uid
                    }
                );
                await this.handleGetGameStateData();
            }
            return;
        }
    }    

    // ==================== Get Biome Data ====================
    public async handleGetBiomeData(): Promise<void> {
        const biomeData = this.biomeHandler.getBiomeData();
        this.handlerContext.postMessage({
            type: MessageType.BiomeData,
            data: biomeData
        });
    }    
}