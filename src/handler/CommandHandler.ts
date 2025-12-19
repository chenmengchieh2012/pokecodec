import * as vscode from 'vscode';
import { PokemonBoxManager } from '../manager/pokeBoxManager';
import { JoinPokemonManager } from '../manager/joinPokemonManager';
import { BagManager } from '../manager/bagsManager';
import { UserDaoManager } from '../manager/userDaoManager';
import {
    CatchPayload,
    DeletePokemonPayload,
    ReorderBoxPayload,
    ReorderPartyPayload,
    BatchMoveToBoxPayload,
    AddToPartyPayload,
    RemoveFromPartyPayload,
    UpdatePartyPokemonPayload,
    UseMedicineInBagPayload,
    UseItemPayload,
    AddItemPayload,
    RemoveItemPayload,
    UpdateMoneyPayload,
    SetGameStatePayload,
    GetPokeDexPayload,
    UpdatePokeDexPayload,
    HandlerContext,
    BoxPayload,
    PokeDexPayload,
    EvolvePokemonPayload,
} from '../dataAccessObj/MessagePayload';
import { GameStateManager } from '../manager/gameStateManager';
import { MessageType } from '../dataAccessObj/messageType';
import { BiomeDataManager } from '../manager/BiomeManager';
import { PokeDexManager } from '../manager/pokeDexManager';
import { PokemonFactory } from '../core/CreatePokemonHandler';
import { AchievementManager } from '../manager/AchievementManager';
import { RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload, RecordItemActionPayload } from '../utils/AchievementCritiria';

export class CommandHandler {
    private readonly pokemonBoxManager: PokemonBoxManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly bagManager: BagManager;
    private readonly userDaoManager: UserDaoManager;
    private readonly gameStateManager: GameStateManager;
    private readonly biomeManager: BiomeDataManager;
    private readonly pokeDexManager: PokeDexManager;
    private readonly achievementManager: AchievementManager;
    private _handlerContext: HandlerContext | null = null;

    constructor(
        pokemonBoxManager: PokemonBoxManager,
        partyManager: JoinPokemonManager,
        bagManager: BagManager,
        userDaoManager: UserDaoManager,
        gameStateManager: GameStateManager,
        biomeManager: BiomeDataManager,
        pokeDexManager: PokeDexManager,
        achievementManager: AchievementManager,
        context: vscode.ExtensionContext,
    ) {
        this.pokemonBoxManager = pokemonBoxManager;
        this.partyManager = partyManager;
        this.bagManager = bagManager;
        this.userDaoManager = userDaoManager;
        this.gameStateManager = gameStateManager;
        this.biomeManager = biomeManager;
        this.pokeDexManager = pokeDexManager;
        this.achievementManager = achievementManager;
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
                    } else {
                        vscode.window.showInformationMessage('HP is already full!');
                    }
                }
                // 3. Revive
                else if (effect.revive) {
                    if (pokemon.currentHp === 0) {
                        const healPercent = effect.reviveHpPercent || 50;
                        pokemon.currentHp = Math.floor(pokemon.maxHp * (healPercent / 100));
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
                     // TODO: Implement status healing
                     vscode.window.showInformationMessage('Status healing not implemented yet.');
                }                        // 5. Restore PP
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
                }                    } else {
                console.warn('[Extension] Item has no effect defined.');
                vscode.window.showWarningMessage('This item has no effect defined.');
            }

            if (itemUsed && itemId) {
                // 更新寶可夢狀態
                await this.partyManager.update(pokemon);
                
                // 扣除道具
                await this.bagManager.useItem(itemId, 1);
                
                vscode.window.showInformationMessage(`Used ${payload.item.name} on ${pokemon.name}. ${usedMessage}`);
                
                this.handlerContext.updateAllViews();
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

    // ==================== Set Game State ====================
    public async handleSetGameState(payload: SetGameStatePayload): Promise<void> {
        await this.gameStateManager.updateGameState( payload.gameState );
        this.handlerContext.updateAllViews();
    }

    // ==================== Get Game State ====================
    public handleGetGameState(): void {
        const gameState = this.gameStateManager.getGameState();
        this.handlerContext.postMessage({ type: MessageType.GameState, data: gameState });
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

    // ==================== Get Biome Data ====================
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
}
