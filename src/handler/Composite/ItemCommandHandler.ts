import * as vscode from 'vscode';
import { AddItemPayload, HandlerContext, RemoveItemPayload, UseItemPayload, UseMedicineInBagPayload } from '../../dataAccessObj/MessagePayload';
import { PokemonDao, getName } from '../../dataAccessObj/pokemon';
import { AchievementManager } from '../../manager/AchievementManager';
import { BagManager } from '../../manager/bagsManager';
import { JoinPokemonManager } from '../../manager/joinPokemonManager';
import { RecordItemActionPayload } from '../../utils/AchievementCritiria';
import { ItemEffectStrategy } from '../../utils/ItemEffectStrategy';
export class ItemCommandHandler {
    private readonly bagManager: BagManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly achievementManager: AchievementManager;
    
    private _handlerContext: HandlerContext | null = null;
    
    constructor(
        bagManager: BagManager,
        partyManager: JoinPokemonManager,
        achievementManager: AchievementManager,
    ) {
        this.bagManager = bagManager;
        this.partyManager = partyManager;
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

    // ==================== Get Bag ====================
    public handleGetBag(): void {
        const items = this.bagManager.getAll();
        this.handlerContext.postMessage({ type: 'bagData', data: items });
    }

    // ==================== Use Medicine In Bag ====================
    public async handleUseMedicineInBag(payload: UseMedicineInBagPayload): Promise<void> {
        const moveId = payload.moveId;
        console.log(`[Extension] useMedicineInBag: moveId=${moveId}`);
        let unActivePokemon: PokemonDao | undefined = undefined;
        if (payload.pokemonUid) {
            const partyData = this.partyManager.getAll();
            unActivePokemon = partyData.find(p => p.uid === payload.pokemonUid);
            
        }
        if (unActivePokemon === undefined) {
            vscode.window.showErrorMessage('Pokemon not found in party.');
            return;
        }
        if (!payload.item) {
            vscode.window.showErrorMessage('Item ID not provided for useMedicineInBag.');
            return;
        }
        const strategy = new ItemEffectStrategy(unActivePokemon,payload.item);
        if (moveId) {
            strategy.setEffectingMoveId(moveId);
        }

        const { itemUsed, usedMessage, pokemon: updatedPokemon } = await strategy.getEffectResult();
        
        const itemActionPayload: RecordItemActionPayload = {
            action: 'use',
            item: {
                name: payload.item.name,
                category: payload.item.category,
                price: payload.item.price,
            },
            quantity: 1,
            isUseless: !itemUsed
        };
        this.achievementManager.onItemAction(itemActionPayload);

        if (itemUsed) {
            // 更新寶可夢狀態
            await this.partyManager.update([updatedPokemon]);

            // 不是招式學習器才扣除道具
            if (payload.item.effect && !payload.item.effect.teachMove) {
                // 扣除道具
                await this.bagManager.useItem(payload.item.id, 1);
            }

            vscode.window.showInformationMessage(`Used ${payload.item.name} on ${getName(updatedPokemon)}. ${usedMessage}`);

            this.handlerContext.updateAllViews();
        } else {
            vscode.window.showInformationMessage('No changes made to Pokemon.');
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
    
}