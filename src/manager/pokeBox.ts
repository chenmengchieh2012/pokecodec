import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { SequentialExecutor } from '../utils/SequentialExecutor';

export class PokemonBox {
    // 記憶體快取
    private pokemons: PokemonDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-box-data';

    private saveQueue = new SequentialExecutor();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    public reload() {
        const data = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY);
        if (data) {
            this.pokemons = data;
        } else {
            this.pokemons = [];
        }
    }

    public getAll(): PokemonDao[] {
        return [...this.pokemons];
    }

    public get(uid: string): PokemonDao | undefined {
        return this.pokemons.find(p => p.uid === uid);
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (list: PokemonDao[]) => void): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read
            const currentList = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY) || [];
            
            // 2. Modify
            modifier(currentList);

            // 3. Write
            await this.context.globalState.update(this.STORAGE_KEY, currentList);

            // 4. Update Cache
            this.pokemons = currentList;
        });
    }

    public async add(pokemon: PokemonDao): Promise<void> {
        await this.performTransaction((list) => {
            list.push(pokemon);
        });
    }

    public async remove(uid: string): Promise<boolean> {
        let success = false;
        await this.performTransaction((list) => {
            const index = list.findIndex(p => p.uid === uid);
            if (index !== -1) {
                list.splice(index, 1);
                success = true;
            }
        });
        return success;
    }

    public async move(fromIndex: number, toIndex: number): Promise<boolean> {
        let success = false;
        await this.performTransaction((list) => {
            if (fromIndex >= 0 && fromIndex < list.length && 
                toIndex >= 0 && toIndex < list.length) {
                const [movedPokemon] = list.splice(fromIndex, 1);
                list.splice(toIndex, 0, movedPokemon);
                success = true;
            }
        });
        return success;
    }

    public async batchRemove(uids: string[]): Promise<void> {
        await this.performTransaction((list) => {
            const uidSet = new Set(uids);
            // 直接修改傳入的 list 參照 (Array.filter 會回傳新陣列，所以要用 splice 或是重新賦值)
            // 由於 performTransaction 預期我們修改 list，這裡我們用 filter 算出結果後，清空 list 再塞回去
            const filtered = list.filter(p => !uidSet.has(p.uid));
            list.length = 0; // 清空原陣列
            list.push(...filtered); // 塞入過濾後的資料
        });
    }

    public async reorder(uids: string[]): Promise<void> {
        await this.performTransaction((list) => {
            const newOrder: PokemonDao[] = [];
            const map = new Map(list.map(p => [p.uid, p]));
            
            for (const uid of uids) {
                const p = map.get(uid);
                if (p) {
                    newOrder.push(p);
                    map.delete(uid);
                }
            }
            // 剩下的放後面
            for (const p of map.values()) {
                newOrder.push(p);
            }
            
            list.length = 0;
            list.push(...newOrder);
        });
    }

    public exportData(): string {
        return JSON.stringify(this.pokemons);
    }

    public async importData(jsonString: string): Promise<boolean> {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                await this.performTransaction((list) => {
                    list.length = 0;
                    list.push(...data);
                });
                return true;
            }
        } catch (e) {
            console.error('Import failed', e);
        }
        return false;
    }
}