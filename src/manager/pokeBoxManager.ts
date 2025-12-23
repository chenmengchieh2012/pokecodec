import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import GlobalStateKey from '../utils/GlobalStateKey';
import { GlobalMutex } from '../utils/GlobalMutex';

export class PokemonBoxManager {
    private static instance: PokemonBoxManager;

    
    // 記憶體快取：Box Index -> Pokemon List
    private boxes: PokemonDao[][] = [];
    private currentBoxIndex: number = 0;
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.BOX_DATA;
    private readonly CURRENT_BOX_INDEX_KEY = GlobalStateKey.CURRENT_BOX_INDEX;
    private static readonly BOX_CAPACITY = 30;
    private static readonly MAX_BOXES = 30; // 假設最大箱子數量為 100

    private saveQueue: SequentialExecutor;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.saveQueue = new SequentialExecutor(new GlobalMutex(context, 'box.lock'));
        this.reload();
    }

    public static getMaxBoxCapacity(): number {
        return this.BOX_CAPACITY;
    }

    public static getInstance(): PokemonBoxManager {
        if (!PokemonBoxManager.instance) {
            throw new Error("PokemonBoxManager not initialized. Call initialize() first.");
        }
        return PokemonBoxManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): PokemonBoxManager {
        PokemonBoxManager.instance = new PokemonBoxManager(context);
        return PokemonBoxManager.instance;
    }

    public async reload() {
        this.boxes = [];
        let i = 0;
        while (true) {
            const boxData = this.context.globalState.get<PokemonDao[]>(`${this.STORAGE_KEY}_${i}`);
            if (!boxData) {
                break;
            }
            this.boxes.push(boxData);
            i++;
        }
        
        // 確保至少有一個箱子
        if (this.boxes.length === 0) {
            this.boxes.push([]);
            await this.context.globalState.update(`${this.STORAGE_KEY}_0`, []);
        }
        
    }

    public getAll(): PokemonDao[] {
        return this.boxes.flat();
    }

    public async getBoxOfPokemons(index: number): Promise<PokemonDao[]> {
        await this.setCurrentBoxIndex(index); // 同步當前箱子索引
        return this.boxes[index] || [];
    }

    public getCurrentBoxIndex(): number {
        return this.currentBoxIndex;
    }


    public async getCurrentBoxOfPokemons(): Promise<PokemonDao[]> {
        if (this.currentBoxIndex !== undefined) {
            return await this.getBoxOfPokemons(this.currentBoxIndex);
        }
        return await this.getBoxOfPokemons(0); // 預設為第一個箱子
    }

    public getTotalBoxLength(): number {
        return this.boxes.length;
    }

    public async setCurrentBoxIndex(index: number): Promise<void> {
        await this.saveQueue.execute(async () => {
            this.currentBoxIndex = index;
            await this.context.globalState.update(this.CURRENT_BOX_INDEX_KEY, index);
        });
    }


    public get(uid: string): PokemonDao | undefined {
        for (const box of this.boxes) {
            const found = box.find(p => p.uid === uid);
            if (found) return found;
        }
        return undefined;
    }


    /** 
     * 針對箱新增使用此方法確保操作的原子性
    */
    private async performBoxIncreaseTransaction(): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Sync all boxes to ensure we know the true length
            await this.reload();

            // 2. Read (from memory or disk, but memory is sync)
            let currentList = this.boxes[this.boxes.length -1] || [];
            
            // 3. 確認最後一個箱子是不是空的
            if (currentList.length !== 0 && this.boxes.length < PokemonBoxManager.MAX_BOXES) {
                // 需要新增一個箱子
                this.boxes.push([]);
                currentList = [];
            }

            // 4. Write to Disk
            const newBoxIndex = this.boxes.length -1;
            await this.context.globalState.update(`${this.STORAGE_KEY}_${newBoxIndex}`, currentList);

            // 5. Update Memory
            if (!this.boxes[newBoxIndex]) {
                this.boxes[newBoxIndex] = [];
            }
            this.boxes[newBoxIndex] = currentList;

        });
    }


    /**
     * 針對特定箱子的交易處理
     */
    private async performBoxTransaction(boxIndex: number, modifier: (list: PokemonDao[]) => PokemonDao[]): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read from disk
            const key = `${this.STORAGE_KEY}_${boxIndex}`;
            let currentList = this.context.globalState.get<PokemonDao[]>(key) || [];
            
            // 2. Modify
            const newList = modifier(currentList);

            // 3. Write to Disk
            await this.context.globalState.update(key, newList);
            await this.context.globalState.update(this.CURRENT_BOX_INDEX_KEY, boxIndex);

            // 4. Update Memory
            if (!this.boxes[boxIndex]) {
                this.boxes[boxIndex] = [];
            }
            this.boxes[boxIndex] = newList;
            this.currentBoxIndex = boxIndex;
        });
    }

    public async update(pokemon: PokemonDao): Promise<void> {
        // Find which box the pokemon is in
        let targetBoxIndex = -1;
        for (let i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].some(p => p.uid === pokemon.uid)) {
                targetBoxIndex = i;
                break;
            }
        }

        if (targetBoxIndex !== -1) {
            await this.performBoxTransaction(targetBoxIndex, (list) => {
                return list.map(p => p.uid === pokemon.uid ? pokemon : p);
            });
        }
    }

    public async add(pokemon: PokemonDao): Promise<void> {
        await this.reload();
        
        // 尋找第一個有空位的箱子
        let targetBoxIndex = -1;
        for (let i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].length < PokemonBoxManager.BOX_CAPACITY) {
                targetBoxIndex = i;
                break;
            }
        }

        await this.performBoxTransaction(targetBoxIndex, (list) => {
            return [...list, pokemon];
        });

        // 確保最後一個箱子是空的
        await this.performBoxIncreaseTransaction();
    }

    public async remove(uid: string): Promise<boolean> {
        await this.reload();
        // 尋找寶可夢在哪個箱子
        let targetBoxIndex = -1;
        for (let i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].some(p => p.uid === uid)) {
                targetBoxIndex = i;
                break;
            }
        }

        if (targetBoxIndex !== -1) {
            await this.performBoxTransaction(targetBoxIndex, (list) => {
                return list.filter(p => p.uid !== uid);
            });
            return true;
        }
        return false;
    }

    // 支援跨箱移動 (尚未實作 UI，但後端先準備好)
    // 目前前端只支援單箱排序，所以這裡先保留舊的 reorder 邏輯 (針對單一箱子)
    // 但因為前端傳來的是 UIDs，我們需要知道是哪個箱子。
    // 假設前端傳來的 UIDs 都是同一個箱子的。
    public async reorder(uids: string[]): Promise<void> {
        if (uids.length === 0) return;
        await this.reload();

        // 找出這些 UIDs 屬於哪個箱子 (假設都在同一個)
        const firstUid = uids[0];
        let targetBoxIndex = -1;
        for (let i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].some(p => p.uid === firstUid)) {
                targetBoxIndex = i;
                break;
            }
        }

        if (targetBoxIndex !== -1) {
            await this.performBoxTransaction(targetBoxIndex, (list) => {
                const newOrder: PokemonDao[] = [];
                const map = new Map(list.map(p => [p.uid, p]));
                
                for (const uid of uids) {
                    const p = map.get(uid);
                    if (p) {
                        newOrder.push(p);
                        map.delete(uid);
                    }
                }
                // 剩下的放後面 (防呆)
                for (const p of map.values()) {
                    newOrder.push(p);
                }
                return newOrder;
            });
        }
    }

    public async batchRemove(uids: string[]): Promise<void> {
        await this.reload();
        // 這比較麻煩，可能跨箱。
        // 簡單作法：對每個 UID 呼叫 remove
        // 優化作法：先分組，再批次處理
        const uidsByBox = new Map<number, Set<string>>();
        
        for (const uid of uids) {
            for (let i = 0; i < this.boxes.length; i++) {
                if (this.boxes[i].some(p => p.uid === uid)) {
                    if (!uidsByBox.has(i)) uidsByBox.set(i, new Set());
                    uidsByBox.get(i)!.add(uid);
                    break;
                }
            }
        }

        for (const [boxIndex, uidSet] of uidsByBox) {
            await this.performBoxTransaction(boxIndex, (list) => {
                return list.filter(p => !uidSet.has(p.uid));
            });
        }
    }

    public async batchMove(uids: string[], targetBoxIndex: number): Promise<boolean> {
        // Check target box existence
        if (targetBoxIndex < 0 || targetBoxIndex >= this.boxes.length) return false;
        
        // Check capacity
        if (this.boxes[targetBoxIndex].length + uids.length > PokemonBoxManager.BOX_CAPACITY) {
            console.log('[PokemonBoxManager] Not enough space in target box for batch move');
            return false; // Not enough space
        }

        await this.saveQueue.execute(async () => {
            // 1. Sync all boxes first
            await this.reload();

            // 2. Find and Remove from source boxes
            const movedPokemons: PokemonDao[] = [];
            const modifiedBoxIndices = new Set<number>();
            modifiedBoxIndices.add(targetBoxIndex);

            for (const uid of uids) {
                for (let i = 0; i < this.boxes.length; i++) {
                    const index = this.boxes[i].findIndex(p => p.uid === uid);
                    if (index !== -1) {
                        const [p] = this.boxes[i].splice(index, 1);
                        movedPokemons.push(p);
                        modifiedBoxIndices.add(i);
                        break;
                    }
                }
            }

            // 3. Add to target box
            this.boxes[targetBoxIndex].push(...movedPokemons);

            // 4. Persist all modified boxes
            for (const i of modifiedBoxIndices) {
                await this.context.globalState.update(`${this.STORAGE_KEY}_${i}`, this.boxes[i]);
            }
        });

        // 確保最後一個箱子是空的
        await this.performBoxIncreaseTransaction();

        return true;
    }

    public exportData(): string {
        return JSON.stringify(this.getAll());
    }

    public async importData(jsonString: string): Promise<boolean> {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                await this.clear();

                // 重新加入
                for (const p of data) {
                    await this.add(p);
                }
                return true;
            }
        } catch (e) {
            console.error('Import failed', e);
        }
        return false;
    }

    public async clear(): Promise<void> {

        // 直接刪除所有資料
        for (let i = 0; i < this.boxes.length; i++) {
            await this.context.globalState.update(`${this.STORAGE_KEY}_${i}`, undefined);
        }

        this.boxes = [];
        // 確保至少有一個空箱子
        this.boxes.push([]);
        await this.context.globalState.update(`${this.STORAGE_KEY}_0`, []);
    }
}