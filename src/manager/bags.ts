import * as vscode from 'vscode';

export enum ItemType {
    PokeBall = 'pokeball',
    Medicine = 'medicine',
    KeyItem = 'keyItem',
    BattleItem = 'battleItem'
}

export interface ItemDao {
    id: string | number;
    name: string;
    apiName?: string;
    description: string;
    type?: string; // Kept for backward compatibility, but optional
    quantity: number;
    count?: number; // Alias for quantity to match webview
    effect?: any;
    spriteUrl?: string;
    price?: number;
    sellPrice?: number;
    category?: string;
    
    // Added to align with Webview ItemDao
    pocket?: string;
    isConsumable?: boolean;
    isUsableInBattle?: boolean;
    isUsableOverworld?: boolean;
    isHoldable?: boolean;
    fling?: any;
}

export class BagManager {
    private items: ItemDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-bag-data';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    public reload() {
        const data = this.context.globalState.get<ItemDao[]>(this.STORAGE_KEY);
        if (data) {
            this.items = data.map(item => ({
                ...item,
                count: item.quantity || item.count || 0 // Ensure count is populated
            }));
        }
    }

    private async save() {
        // Sync quantity and count before saving
        const dataToSave = this.items.map(item => ({
            ...item,
            quantity: item.count || item.quantity
        }));
        await this.context.globalState.update(this.STORAGE_KEY, dataToSave);
    }

    public getAll(): ItemDao[] {
        return this.items;
    }

    public async add(item: ItemDao): Promise<void> {
        // Use apiName for uniqueness if available, otherwise id
        const existingItem = this.items.find(i => 
            (item.apiName && i.apiName === item.apiName) || 
            (i.id === item.id)
        );
        
        const addAmount = item.count || item.quantity || 1;

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 0) + addAmount;
            existingItem.count = existingItem.quantity;
        } else {
            this.items.push({
                ...item,
                quantity: addAmount,
                count: addAmount
            });
        }
        await this.save();
    }

    public async useItem(itemId: string | number, count: number = 1): Promise<boolean> {
        const index = this.items.findIndex(i => i.id === itemId || i.apiName === itemId);
        if (index !== -1) {
            const currentQty = this.items[index].count || this.items[index].quantity || 0;
            if (currentQty >= count) {
                this.items[index].quantity = currentQty - count;
                this.items[index].count = this.items[index].quantity;
                
                if (this.items[index].quantity === 0) {
                    this.items.splice(index, 1);
                }
                await this.save();
                return true;
            }
        }
        return false;
    }
    
    public getItem(itemId: string | number): ItemDao | undefined {
        return this.items.find(i => i.id === itemId || i.apiName === itemId);
    }
}
