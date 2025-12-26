import * as vscode from 'vscode';
import { BiomeDataHandler } from '../core/BiomeHandler';
import { PokemonFactory } from '../core/CreatePokemonHandler';
import {
    AddItemPayload,
    AddToPartyPayload,
    BatchMoveToBoxPayload,
    BoxPayload,
    CatchPayload,
    DeletePokemonPayload,
    EvolvePokemonPayload,
    GetPokeDexPayload,
    HandlerContext,
    PokeDexPayload,
    RemoveFromPartyPayload,
    RemoveItemPayload,
    ReorderBoxPayload,
    ReorderPartyPayload,
    SetGameStateDataPayload,
    UpdateDefenderPokemonUidPayload,
    UpdateOpponentPokemonUidPayload,
    UpdateOpponentInPartyPayload,
    UpdateMoneyPayload,
    UpdatePartyPokemonPayload,
    UpdatePokeDexPayload,
    UseItemPayload,
    UseMedicineInBagPayload,
    GoTriggerEncounterPayload,
    SetDifficultyLevelPayload,
    RecordEncounterPayload,
    DifficultyLevelPayload,
    SetDDAEnabledPayload
} from '../dataAccessObj/MessagePayload';
import { MessageType } from '../dataAccessObj/messageType';
import { AchievementManager } from '../manager/AchievementManager';
import { BagManager } from '../manager/bagsManager';
import { GameStateManager } from '../manager/gameStateManager';
import { JoinPokemonManager } from '../manager/joinPokemonManager';
import { PokemonBoxManager } from '../manager/pokeBoxManager';
import { PokeDexManager } from '../manager/pokeDexManager';
import { UserDaoManager } from '../manager/userDaoManager';
import { RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload, RecordItemActionPayload } from '../utils/AchievementCritiria';

import pokemonGen1Data from '../data/pokemonGen1.json';
import moveData from '../data/pokemonMoves.json';
import { GameState } from '../dataAccessObj/GameState';
import { PokemonDao, RawPokemonData } from '../dataAccessObj/pokemon';
import { pokemonMoveInit } from '../dataAccessObj/pokeMove';
import { BiomeType } from '../dataAccessObj/BiomeData';
import { BattleMode } from '../dataAccessObj/gameStateData';
import { DifficultyManager } from '../manager/DifficultyManager';

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;
const pokemonMoveDataMap = moveData as unknown as Record<string, any>;
export class CommandHandler {
    private readonly pokemonBoxManager: PokemonBoxManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly bagManager: BagManager;
    private readonly userDaoManager: UserDaoManager;
    private readonly gameStateManager: GameStateManager;
    private readonly pokeDexManager: PokeDexManager;
    private readonly achievementManager: AchievementManager;
    private readonly difficultyManager: DifficultyManager;

    private readonly biomeHandler: BiomeDataHandler;

    private _handlerContext: HandlerContext | null = null;

    constructor(
        pokemonBoxManager: PokemonBoxManager,
        partyManager: JoinPokemonManager,
        bagManager: BagManager,
        userDaoManager: UserDaoManager,
        gameStateManager: GameStateManager,
        biomeHandler: BiomeDataHandler,
        pokeDexManager: PokeDexManager,
        achievementManager: AchievementManager,
        difficultyManager: DifficultyManager,
        context: vscode.ExtensionContext,
    ) {
        this.pokemonBoxManager = pokemonBoxManager;
        this.partyManager = partyManager;
        this.bagManager = bagManager;
        this.userDaoManager = userDaoManager;
        this.gameStateManager = gameStateManager;
        this.biomeHandler = biomeHandler;
        this.pokeDexManager = pokeDexManager;
        this.achievementManager = achievementManager;
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

    public async handleRecordEncounter(payload: RecordEncounterPayload): Promise<void> {
        this.difficultyManager.recordEncounter(payload.record);
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

    // ==================== Select Starter ====================
    public async handleSelectStarter(payload: { starter: 'pikachu' | 'eevee' }): Promise<void> {
        const { starter } = payload;

        // 1. Update User Dao
        const user = this.userDaoManager.getUserInfo();
        user.starter = starter;

        // 2. Create Pokemon
        const pokemonId = starter === 'pikachu' ? 25 : 133;
        const starterPokemon = await PokemonFactory.createWildPokemonInstance({
            pokemonId: pokemonId,
            nameZh: '',
            nameEn: '',
            minDepth: 0, // Level 5,
            encounterRate: 0
        }, this.difficultyManager, undefined, 5);

        starterPokemon.originalTrainer = user.name || 'GOLD';
        starterPokemon.caughtDate = Date.now();
        starterPokemon.caughtBall = 'poke-ball';


        await this.userDaoManager.setStarter(starterPokemon.name as 'pikachu' | 'eevee');

        // 3. Add to Party
        await this.partyManager.add(starterPokemon);

        // 4. Update Views
        this.handlerContext.updateAllViews();
        vscode.window.showInformationMessage(`You chose ${starter.toUpperCase()} as your partner!`);
    }

    // ==================== Evolve Pokemon ====================
    public async handleEvolvePokemon(payload: EvolvePokemonPayload): Promise<void> {
        const { pokemonUid, toSpeciesId } = payload;

        // Check Party
        const party = this.partyManager.getAll();
        const partyIndex = party.findIndex(p => p.uid === pokemonUid);

        if (partyIndex !== -1) {
            const pokemon = party[partyIndex];
            try {
                const evolvedPokemon = PokemonFactory.evolvePokemon(pokemon, toSpeciesId);
                await this.partyManager.update(evolvedPokemon);
                this.handlerContext.updateAllViews();
                vscode.window.showInformationMessage(`Congratulations! Your ${pokemon.name} evolved into ${evolvedPokemon.name}!`);
            } catch (error) {
                vscode.window.showErrorMessage(`Evolution failed: ${error}`);
            }
            return;
        }

        // Check Box
        const boxPokemon = this.pokemonBoxManager.get(pokemonUid);
        if (boxPokemon) {
            try {
                const evolvedPokemon = PokemonFactory.evolvePokemon(boxPokemon, toSpeciesId);
                await this.pokemonBoxManager.update(evolvedPokemon);
                this.handlerContext.updateAllViews();
                vscode.window.showInformationMessage(`Congratulations! Your ${boxPokemon.name} evolved into ${evolvedPokemon.name}!`);
            } catch (error) {
                vscode.window.showErrorMessage(`Evolution failed: ${error}`);
            }
            return;
        }

        vscode.window.showErrorMessage('Pokemon not found for evolution.');
    }

    // ==================== Reset Storage ====================
    public async handleResetStorage(resetStorageFn: () => Promise<void>): Promise<void> {
        await resetStorageFn();
    }

    // ==================== Catch ====================
    public async handleCatch(payload: CatchPayload): Promise<void> {
        vscode.window.showInformationMessage(payload.text);
        if (payload.pokemon) {
            await this.pokemonBoxManager.add(payload.pokemon);
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Get Box ====================
    public async handleGetBox(boxIndex: number = 0): Promise<void> {
        const pokemons = await this.pokemonBoxManager.getBoxOfPokemons(boxIndex);
        const totalBoxLength = this.pokemonBoxManager.getTotalBoxLength();
        const boxPayload: BoxPayload = {
            pokemons: pokemons,
            currentBox: boxIndex,
            totalBoxLength: totalBoxLength
        };
        this.handlerContext.postMessage({
            type: MessageType.BoxData,
            data: boxPayload
        });
    }


    // ==================== Get Current Box ====================
    public async handleGetCurrentBox(): Promise<void> {
        const pokemons = await this.pokemonBoxManager.getCurrentBoxOfPokemons();
        const totalBoxLength = this.pokemonBoxManager.getTotalBoxLength();
        const boxPayload: BoxPayload = {
            pokemons: pokemons,
            currentBox: this.pokemonBoxManager.getCurrentBoxIndex(),
            totalBoxLength: totalBoxLength
        };
        this.handlerContext.postMessage({
            type: MessageType.BoxData,
            data: boxPayload
        });
    }

    // ==================== Delete Pokemon ====================
    public async handleDeletePokemon(payload: DeletePokemonPayload): Promise<void> {
        if (payload.pokemonUids && Array.isArray(payload.pokemonUids)) {
            await this.pokemonBoxManager.batchRemove(payload.pokemonUids);
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Reorder Box ====================
    public async handleReorderBox(payload: ReorderBoxPayload): Promise<void> {
        if (payload.pokemonUids && Array.isArray(payload.pokemonUids)) {
            await this.pokemonBoxManager.reorder(payload.pokemonUids);
            this.handlerContext.updateAllViews();
        }
    }

    public async handleReorderParty(payload: ReorderPartyPayload): Promise<void> {
        if (payload.pokemonUids && Array.isArray(payload.pokemonUids)) {
            await this.partyManager.reorder(payload.pokemonUids);
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Batch Move To Box ====================
    public async handleBatchMoveToBox(payload: BatchMoveToBoxPayload): Promise<void> {
        if (payload.pokemonUids && Array.isArray(payload.pokemonUids) && typeof payload.targetBoxIndex === 'number') {
            const success = await this.pokemonBoxManager.batchMove(payload.pokemonUids, payload.targetBoxIndex);
            if (!success) {
                vscode.window.showErrorMessage('Move failed: Target box full or invalid.');
            }
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Get Party ====================
    public handleGetParty(): void {
        const partyData = this.partyManager.getAll();
        this.handlerContext.postMessage({ type: MessageType.PartyData, data: partyData });
    }

    // ==================== Add To Party ====================
    public async handleAddToParty(payload: AddToPartyPayload): Promise<void> {
        const uid = payload.pokemonUid;
        if (uid) {
            const pokemon = this.pokemonBoxManager.get(uid);
            if (pokemon) {
                const success = await this.partyManager.add(pokemon);
                if (success) {
                    await this.pokemonBoxManager.remove(uid);
                    // Update both views
                    this.handlerContext.updateAllViews();
                    vscode.window.showInformationMessage(`Added ${pokemon.name} to party!`);
                } else {
                    vscode.window.showErrorMessage('Party is full!');
                }
            }
        }
    }

    // ==================== Remove From Party ====================
    public async handleRemoveFromParty(payload: RemoveFromPartyPayload): Promise<void> {
        const uid = payload.uid;
        if (uid) {
            const pokemon = this.partyManager.getAll().find(p => p.uid === uid);
            if (pokemon) {
                await this.pokemonBoxManager.add(pokemon);
                await this.partyManager.remove(uid);
                // Update both views
                this.handlerContext.updateAllViews();
                vscode.window.showInformationMessage(`Moved ${pokemon.name} to Box!`);
            }
        }
    }

    // ==================== Update Party Pokemon ====================
    public async handleUpdatePartyPokemon(payload: UpdatePartyPokemonPayload): Promise<void> {
        if (payload.pokemon) {
            console.log('Received updatePartyPokemon:', payload.pokemon.name, payload.pokemon.currentHp);
            await this.partyManager.update(payload.pokemon);
            // Update views to reflect HP changes etc.
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Get Bag ====================
    public handleGetBag(): void {
        const items = this.bagManager.getAll();
        this.handlerContext.postMessage({ type: 'bagData', data: items });
    }

    // ==================== Use Medicine In Bag ====================
    public async handleUseMedicineInBag(payload: UseMedicineInBagPayload): Promise<void> {
        const itemId = payload.itemId || (payload.item && (payload.item.apiName || payload.item.id));
        console.log(`[Extension] useMedicineInBag: itemId=${itemId}, pokemonUid=${payload.pokemonUid}`);

        if (payload.pokemonUid) {
            const partyData = this.partyManager.getAll();
            const pokemon = partyData.find(p => p.uid === payload.pokemonUid);

            if (!pokemon) {
                console.error('[Extension] Pokemon not found');
                return;
            }

            if (!payload.item) {
                console.error('[Extension] Item not provided');
                return;
            }

            const effect = payload.item.effect;
            console.log('[Extension] Using item:', payload.item);
            console.log('[Extension] Item effect:', effect);

            let itemUsed = false;
            let usedMessage = '';

            if (effect) {
                const oldHp = pokemon.currentHp;

                // 1. Heal HP (Fixed)
                if (effect.healHp) {
                    if (pokemon.currentHp < pokemon.maxHp) {
                        const healAmount = effect.healHp;
                        pokemon.currentHp = Math.min(pokemon.maxHp, pokemon.currentHp + healAmount);
                        itemUsed = true;
                        usedMessage = `Restored ${pokemon.currentHp - oldHp} HP.`;
                    } else {
                        vscode.window.showInformationMessage('HP is already full!');
                    }
                }
                // 2. Heal HP (Percent)
                else if (effect.healHpPercent) {
                    if (pokemon.currentHp < pokemon.maxHp) {
                        const healAmount = Math.floor(pokemon.maxHp * (effect.healHpPercent / 100));
                        pokemon.currentHp = Math.min(pokemon.maxHp, pokemon.currentHp + healAmount);
                        itemUsed = true;
                        usedMessage = `Restored ${pokemon.currentHp - oldHp} HP.`;
                        if (effect.healStatus && effect.healStatus.includes('all')) {
                            pokemon.ailment = 'healthy';
                        }
                    } else {
                        vscode.window.showInformationMessage('HP is already full!');
                    }
                }
                // 3. Revive
                else if (effect.revive) {
                    if (pokemon.currentHp === 0 || pokemon.ailment === 'fainted') {
                        const healPercent = effect.reviveHpPercent || 50;
                        pokemon.currentHp = Math.floor(pokemon.maxHp * (healPercent / 100));
                        pokemon.ailment = 'healthy';
                        itemUsed = true;
                        usedMessage = `Revived with ${pokemon.currentHp} HP.`;
                    } else {
                        vscode.window.showInformationMessage('Pokemon is not fainted!');
                    }
                }
                // 4. PP Recovery
                else if (effect.restorePp || effect.restorePpAll) {
                    let ppRestored = false;
                    const moveId = payload.moveId;
                    if (effect.restorePpAll) {
                        // Restore all PP for all moves
                        pokemon.pokemonMoves = pokemon.pokemonMoves.map(move => ({
                            ...move,
                            pp: move.maxPP
                        }));
                        ppRestored = true;
                        usedMessage = 'Restored all PP for all moves!';
                    } else if (effect.restorePp) {
                        // Restore PP for moves that are not at max
                        const restoreAmount = effect.restorePp;
                        pokemon.pokemonMoves = pokemon.pokemonMoves.map(move => {
                            console.log("Checking move for PP restore:", move.name, "Current PP:", move.pp, "Max PP:", move.maxPP);
                            if (move.pp < move.maxPP && move.id === moveId) {
                                ppRestored = true;
                                return {
                                    ...move,
                                    pp: Math.min(move.maxPP, move.pp + restoreAmount)
                                };
                            }
                            return move;
                        });
                        if (ppRestored) {
                            usedMessage = `Restored ${restoreAmount} PP!`;
                        } else {
                            vscode.window.showInformationMessage('All moves already have full PP!');
                        }
                    }
                    itemUsed = ppRestored;
                }
                // 5. Status Heal (Placeholder)
                else if (effect.healStatus) {
                    if (pokemon.ailment && pokemon.ailment !== 'healthy' && pokemon.ailment !== 'fainted') {
                        if (effect.healStatus.includes(pokemon.ailment) || effect.healStatus.includes('all')) {
                            pokemon.ailment = 'healthy';
                            itemUsed = true;
                            usedMessage = `Cured status condition.`;
                        } else {
                            vscode.window.showInformationMessage('This item cannot cure the current status condition!');
                        }
                    } else {
                        vscode.window.showInformationMessage('No status condition to heal!');
                    }

                }
                // 5. Restore PP
                else if (effect.restorePp) {
                    if (effect.restorePpAll) {
                        // Restore All Moves
                        pokemon.pokemonMoves.forEach(move => {
                            move.pp = Math.min(move.maxPP, move.pp + (effect.restorePp || 999));
                        });
                        itemUsed = true;
                        usedMessage = `Restored PP for all moves.`;
                    } else {
                        // Restore Single Move
                        if (payload.moveId !== undefined) {
                            const move = pokemon.pokemonMoves.find(m => m.id === payload.moveId);
                            if (move) {
                                if (move.pp < move.maxPP) {
                                    move.pp = Math.min(move.maxPP, move.pp + (effect.restorePp || 0));
                                    itemUsed = true;
                                    usedMessage = `Restored PP for ${move.name}.`;
                                } else {
                                    vscode.window.showInformationMessage('PP is already full!');
                                }
                            }
                        } else {
                            console.warn('[Extension] Move ID missing for PP restore item');
                        }
                    }
                }
                // 6. Teach Move
                else if (effect.teachMove) {
                    // Teach Move Logic Here
                    const moveIdToTeach = effect.teachMove;
                    const canLearnMove = pokemonDataMap[pokemon.id].moves.filter(m => m.name === moveIdToTeach);
                    if (canLearnMove.length > 0) {
                        const learnMoveName = canLearnMove[0].name;
                        const learnMoveData = pokemonMoveDataMap[learnMoveName];
                        // Check if already knows the move
                        const alreadyKnows = pokemon.pokemonMoves.some(m => m.name === moveIdToTeach);
                        if (!alreadyKnows) {
                            // Teach the move
                            if (payload.moveId !== undefined) {
                                let newMoves = pokemon.pokemonMoves.filter(m => m.id !== payload.moveId);
                                newMoves.push(pokemonMoveInit(learnMoveData));
                                pokemon.pokemonMoves = newMoves;
                                itemUsed = true;
                                usedMessage = `Taught ${pokemon.name} the move ${moveIdToTeach}.`;
                            } else if (pokemon.pokemonMoves.length < 4) {
                                // 直接學會招式
                                pokemon.pokemonMoves.push(pokemonMoveInit(learnMoveData));
                                itemUsed = true;
                                usedMessage = `Taught ${pokemon.name} the move ${moveIdToTeach}.`;
                            } else {
                                console.warn('[Extension] Move slot full, cannot learn new move.');
                            }
                        } else {
                            vscode.window.showInformationMessage(`${pokemon.name} already knows the move ${moveIdToTeach}.`);
                        }
                    } else {
                        vscode.window.showInformationMessage(`${pokemon.name} cannot learn the move ${moveIdToTeach}.`);
                    }
                }
            } else {
                console.warn('[Extension] Item has no effect defined.');
                vscode.window.showWarningMessage('This item has no effect defined.');
            }
            let isTreasure = false;
            if (itemId) {
                const itemActionPayload: RecordItemActionPayload = {
                    action: 'use',
                    item: {
                        name: payload.item.name,
                        category: payload.item.category,
                        price: payload.item.price,
                    },
                    quantity: 1,
                    isUseless: itemUsed
                };
                isTreasure = payload.item.category === 'Treasures';
                this.achievementManager.onItemAction(itemActionPayload);
            }

            if (itemUsed && itemId) {
                // 更新寶可夢狀態
                await this.partyManager.update(pokemon);

                // 不是寶藏道具才扣除
                if (!isTreasure) {
                    // 扣除道具
                    await this.bagManager.useItem(itemId, 1);
                }

                vscode.window.showInformationMessage(`Used ${payload.item.name} on ${pokemon.name}. ${usedMessage}`);

                this.handlerContext.updateAllViews();
            } else {
                vscode.window.showInformationMessage('No changes made to Pokemon.');
            }

        }
    }

    // ==================== Use Item ====================
    public async handleUseItem(payload: UseItemPayload): Promise<void> {
        // 1. 取得 Item ID
        const itemId = payload.itemId || (payload.item && (payload.item.apiName || payload.item.id));
        if (!itemId) {
            console.error('[Extension] Item ID not provided for useItem');
            return;
        }
        // 2. 單純消耗道具 (既有邏輯)
        const success = await this.bagManager.useItem(itemId, payload.count || 1);
        if (success) {
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Add Item ====================
    public async handleAddItem(payload: AddItemPayload): Promise<void> {
        if (payload.item) {
            console.log("Adding item:", payload.item, "Count:", payload.count);
            await this.bagManager.add(payload.item, payload.count);
            this.handlerContext.updateAllViews();
        }
    }

    // ==================== Remove Item ====================
    public async handleRemoveItem(payload: RemoveItemPayload): Promise<void> {
        // Support both direct itemId or item object
        const itemId = payload.itemId || (payload.item && (payload.item.apiName || payload.item.id));
        if (itemId) {
            await this.bagManager.useItem(itemId, payload.count || 1);
            this.handlerContext.updateAllViews();
        }
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

    // ==================== Update Opponent Party ====================
    public async handleUpdateOpponentInParty(payload: UpdateOpponentInPartyPayload): Promise<void> {
        await this.gameStateManager.updateOpponentInParty(payload.opponentPokemon);
    }

    // ==================== Update Defender Pokemon UId ====================
    public async handleUpdateDefenderPokemonUid(payload: UpdateDefenderPokemonUidPayload): Promise<void> {
        await this.gameStateManager.updateDefenderPokemonUid(payload.pokemonUid);
    }


    // ==================== Update Opponent Pokemon UId ====================
    public async handleUpdateOpponentPokemonUid(payload: UpdateOpponentPokemonUidPayload): Promise<void> {
        await this.gameStateManager.updateOpponentPokemonUid(payload.pokemonUid);
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

    // ==================== Item Action ====================
    public async handleRecordItemAction(payload: RecordItemActionPayload): Promise<void> {
        await this.achievementManager.onItemAction(payload);
        this.handlerContext.updateAchievementsView();
    }

    // ==================== Get Biome Data ====================
    public async handleGetBiomeData(): Promise<void> {
        const biomeData = this.biomeHandler.getBiomeData();
        this.handlerContext.postMessage({
            type: MessageType.BiomeData,
            data: biomeData
        });
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
                await this.gameStateManager.updateGameState(
                    GameState.WildAppear,
                    {
                        battleMode: BattleMode.Wild,
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
        // MARK: [TODO] Generate NPC Encounter Event
        let debugPokemons: PokemonDao[] = [];
        for (let i = 1; i <= 6; i++) {
            const pokemon = await PokemonFactory.createWildPokemonInstance({
                pokemonId: Math.floor(Math.random() * 150) + 1,
                nameZh: '',
                nameEn: '',
                minDepth: 0,
                encounterRate: 0
            }, this.difficultyManager, 'test/file/path', undefined);
            debugPokemons.push(pokemon);
        };
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
                        opponentParty: debugPokemons,
                        encounterResult: {
                            biomeType: BiomeType.BattleArena,
                            depth: 1
                        },
                        defenderPokemonUid: myFirstPartyPokemon[0].uid,
                        opponentPokemonUid: debugPokemons[0].uid
                    }
                );
                await this.handleGetGameStateData();
            }
            return;
        }
    }
}
