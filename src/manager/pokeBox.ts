import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';


export class PokemonBox {
    private pokemons: PokemonDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-box-data';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // 初始化時從本機儲存空間讀取資料
        this.reload();
    }

    /**
     * 從 globalState 讀取資料
     */
    public reload() {
        const data = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY);
        if (data) {
            this.pokemons = data;
        }
    }

    /**
     * 儲存資料到 globalState
     */
    private async save() {
        await this.context.globalState.update(this.STORAGE_KEY, this.pokemons);
    }

    /**
     * 新增寶可夢
     * @param pokemon 
     */
    public async add(pokemon: PokemonDao): Promise<void> {
        this.pokemons.push(pokemon);
        await this.save(); // 自動存檔
    }

    /**
     * 刪除寶可夢
     * @param uid 
     * @returns 是否刪除成功
     */
    public async remove(uid: string): Promise<boolean> {
        const index = this.pokemons.findIndex(p => p.uid === uid);
        if (index !== -1) {
            this.pokemons.splice(index, 1);
            await this.save(); // 自動存檔
            return true;
        }
        return false;
    }

    /**
     * 修改順序
     * @param fromIndex 原始位置
     * @param toIndex 目標位置
     * @returns 是否移動成功
     */
    public async move(fromIndex: number, toIndex: number): Promise<boolean> {
        if (fromIndex < 0 || fromIndex >= this.pokemons.length || 
            toIndex < 0 || toIndex >= this.pokemons.length) {
            return false;
        }
        
        const [movedPokemon] = this.pokemons.splice(fromIndex, 1);
        this.pokemons.splice(toIndex, 0, movedPokemon);
        await this.save(); // 自動存檔
        return true;
    }

    /**
     * 批量刪除寶可夢
     * @param uids 
     */
    public async batchRemove(uids: string[]): Promise<void> {
        const uidSet = new Set(uids);
        this.pokemons = this.pokemons.filter(p => !uidSet.has(p.uid));
        await this.save();
    }

    /**
     * 根據 UID 列表重新排序
     * @param uids 
     */
    public async reorder(uids: string[]): Promise<void> {
        const newOrder: PokemonDao[] = [];
        const map = new Map(this.pokemons.map(p => [p.uid, p]));
        
        for (const uid of uids) {
            const p = map.get(uid);
            if (p) {
                newOrder.push(p);
                map.delete(uid);
            }
        }
        
        // Append any remaining pokemons that weren't in the uids list (just in case)
        for (const p of map.values()) {
            newOrder.push(p);
        }
        
        this.pokemons = newOrder;
        await this.save();
    }

    /**
     * 取得所有寶可夢
     */
    public getAll(): PokemonDao[] {
        return [...this.pokemons];
    }

    /**
     * 根據 UID 取得寶可夢
     * @param uid 
     */
    public get(uid: string): PokemonDao | undefined {
        return this.pokemons.find(p => p.uid === uid);
    }

    /**
     * (擴充功能) 匯出存檔字串，可用於備份到雲端
     */
    public exportData(): string {
        return JSON.stringify(this.pokemons);
    }

    /**
     * (擴充功能) 從字串匯入存檔
     */
    public importData(jsonString: string): boolean {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                this.pokemons = data;
                this.save();
                return true;
            }
        } catch (e) {
            console.error('Import failed', e);
        }
        return false;
    }
}
