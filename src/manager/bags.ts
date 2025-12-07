import * as vscode from 'vscode';

export enum ItemType {
    PokeBall = 'pokeball',
    Medicine = 'medicine',
    KeyItem = 'keyItem',
    BattleItem = 'battleItem'
}

export interface ItemDao {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    quantity: number;
    effect?: any;
}

export class BagManager {
    private items: ItemDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-bag-data';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
        
        // Initialize with some default items if empty (for testing)
        if (this.items.length === 0) {
            this.add({
                id: 'poke-ball',
                name: 'Poke Ball',
                description: 'A device for catching wild Pokemon.',
                type: ItemType.PokeBall,
                quantity: 10,
                effect: { catchRate: 1 }
            });
            this.add({
                id: 'potion',
                name: 'Potion',
                description: 'Restores 20 HP.',
                type: ItemType.Medicine,
                quantity: 5,
                effect: { heal: 20 }
            });
        }
    }

    public reload() {
        const data = this.context.globalState.get<ItemDao[]>(this.STORAGE_KEY);
        if (data) {
            this.items = data;
        }
    }

    private async save() {
        await this.context.globalState.update(this.STORAGE_KEY, this.items);
    }

    public getAll(): ItemDao[] {
        return this.items;
    }

    public async add(item: ItemDao): Promise<void> {
        const existingItem = this.items.find(i => i.id === item.id);
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            this.items.push(item);
        }
        await this.save();
    }

    public async useItem(itemId: string, count: number = 1): Promise<boolean> {
        const index = this.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            if (this.items[index].quantity >= count) {
                this.items[index].quantity -= count;
                if (this.items[index].quantity === 0) {
                    this.items.splice(index, 1);
                }
                await this.save();
                return true;
            }
        }
        return false;
    }
    
    public getItem(itemId: string): ItemDao | undefined {
        return this.items.find(i => i.id === itemId);
    }
}
