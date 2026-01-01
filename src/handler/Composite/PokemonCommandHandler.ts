import * as vscode from 'vscode';
import { BiomeDataHandler } from "../../core/BiomeHandler";
import { AddToPartyPayload, BatchMoveToBoxPayload, BoxPayload, CatchPayload, DeletePokemonPayload, EvolvePokemonPayload, HandlerContext, RemoveFromPartyPayload, ReorderBoxPayload, ReorderPartyPayload, UpdatePartyPokemonPayload } from "../../dataAccessObj/MessagePayload";
import { AchievementManager } from "../../manager/AchievementManager";
import { BagManager } from "../../manager/bagsManager";
import { DifficultyManager } from "../../manager/DifficultyManager";
import { GameStateManager } from "../../manager/gameStateManager";
import { JoinPokemonManager } from "../../manager/joinPokemonManager";
import { PokemonBoxManager } from "../../manager/pokeBoxManager";
import { PokeDexManager } from "../../manager/pokeDexManager";
import { SessionLockManager } from "../../manager/SessionLockManager";
import { UserDaoManager } from "../../manager/userDaoManager";
import { MessageType } from '../../dataAccessObj/messageType';
import { getName } from '../../dataAccessObj/pokemon';
import { PokemonFactory } from '../../core/CreatePokemonHandler';

export class PokemonCommandHandler {
    private readonly pokemonBoxManager: PokemonBoxManager;
    private readonly userDaoManager: UserDaoManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly achievementManager: AchievementManager;
    private readonly difficultyManager: DifficultyManager;


    private _handlerContext: HandlerContext | null = null;

    constructor(
        pokemonBoxManager: PokemonBoxManager,
        userDaoManager: UserDaoManager,
        partyManager: JoinPokemonManager,
        achievementManager: AchievementManager,
        difficultyManager: DifficultyManager,
    ) {
        this.pokemonBoxManager = pokemonBoxManager;
        this.userDaoManager = userDaoManager;
        this.partyManager = partyManager;
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
                    vscode.window.showInformationMessage(`Added ${getName(pokemon)} to party!`);
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
        if (payload.pokemons) {
            console.log('Received batch updatePartyPokemon:', payload.pokemons.length);
            await this.partyManager.update(payload.pokemons);
            this.handlerContext.updateAllViews();
        }
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
                await this.partyManager.update([evolvedPokemon]);
                
                // Record Achievement
                await this.achievementManager.onEvolve({
                    pokemonId: evolvedPokemon.id,
                    isFriendship: false // TODO: Implement friendship check
                });
                this.handlerContext.updateAchievementsView();

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

                // Record Achievement
                await this.achievementManager.onEvolve({
                    pokemonId: evolvedPokemon.id,
                    isFriendship: false // TODO: Implement friendship check
                });
                this.handlerContext.updateAchievementsView();

                this.handlerContext.updateAllViews();
                vscode.window.showInformationMessage(`Congratulations! Your ${boxPokemon.name} evolved into ${evolvedPokemon.name}!`);
            } catch (error) {
                vscode.window.showErrorMessage(`Evolution failed: ${error}`);
            }
            return;
        }

        vscode.window.showErrorMessage('Pokemon not found for evolution.');
    }
}