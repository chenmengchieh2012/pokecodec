import * as vscode from 'vscode';
import GlobalStateKey from '../utils/GlobalStateKey';
import { PokeDex__GEN1, PokeDexEntry, PokeDexEntryStatus } from '../dataAccessObj/PokeDex';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { GlobalMutex } from '../utils/GlobalMutex';


const VaildGens: string[] = [PokeDex__GEN1];
export class PokeDexManager {
    private static instance: PokeDexManager;
    private context: vscode.ExtensionContext;
    // Map<GenID, PokeDexData>
    private dexDataMap: Map<string, PokeDexEntry[]> = new Map();
    private currentGen: string = 'GEN 1';
    private readonly STORAGE_KEY_BASE = GlobalStateKey.POKEDEX_DATA_BASE;
    private readonly CURRENT_GEN_KEY = GlobalStateKey.POKEDEX_CURRENT_GEN;
    private saveQueue: SequentialExecutor;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.saveQueue = new SequentialExecutor(new GlobalMutex(context, 'pokedex.lock'));
        this.reload();
    }

    public static getInstance(): PokeDexManager {
        if (!PokeDexManager.instance) {
            throw new Error("PokeDexManager not initialized. Call initialize() first.");
        }
        return PokeDexManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): PokeDexManager {
        PokeDexManager.instance = new PokeDexManager(context);
        const currentGen = PokeDexManager.instance.getCurrentGen();
        const currentData = PokeDexManager.instance.dexDataMap.get(currentGen);

        // 如果是第一次安裝 (undefined) 或是讀取到空陣列 (預設值)，則初始化資料
        if (!currentData || currentData.length === 0) {
            PokeDexManager.instance.clear();
        }
        return PokeDexManager.instance;
    }

    private getStorageKey(gen: string): string {
        // "GEN 1" -> "pokemon-pokedex-data-gen1"
        const suffix = gen.replace(/\s+/g, '').toLowerCase();
        return `${this.STORAGE_KEY_BASE}-${suffix}`;
    }

    public reload() {
        this.currentGen = this.context.globalState.get<string>(this.CURRENT_GEN_KEY, 'GEN 1');

        // Load currently supported generations
        // For now, we can just load the current one, or a fixed list.
        // To be dynamic like boxes, we could iterate, but Gens are usually fixed.
        // Let's load "GEN 1" by default, and the current one if different.
        const gensToLoad = new Set([PokeDex__GEN1, this.currentGen]);

        gensToLoad.forEach(gen => {
            const key = this.getStorageKey(gen);
            const data = this.context.globalState.get<PokeDexEntry[]>(key, []);
            this.dexDataMap.set(gen, data);
        });
    }

    public async persistCurrentPokeDexGen(newGen: string): Promise<void> {
        await this.saveQueue.execute(async () => {
            this.context.globalState.update(this.CURRENT_GEN_KEY, newGen);
            this.currentGen = newGen;
        });
    }

    public async getPokeDexEntrys(gen?: string): Promise<PokeDexEntry[]> {
        const targetGen = gen || this.currentGen;
        await this.persistCurrentPokeDexGen(targetGen);
        return this.dexDataMap.get(targetGen) || [];
    }

    public async getCurrentPokeDexEntrys(): Promise<PokeDexEntry[]> {
        return await this.getPokeDexEntrys(this.currentGen);
    }

    public getCurrentGen(): string {
        return this.currentGen;
    }

    private async performTransaction(modifier: (dexEntrys: PokeDexEntry[], gen: string) => PokeDexEntry[], gen: string): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read
            const key = this.getStorageKey(gen);
            const storedData = this.context.globalState.get<PokeDexEntry[]>(key, []);
            const dexEntrys = storedData || [];
            // 2. Modify
            const newData = modifier(dexEntrys, gen);
            // 3. Write
            await this.context.globalState.update(key, newData);
            await this.context.globalState.update(this.CURRENT_GEN_KEY, gen);

            // 4. Update Cache
            this.dexDataMap.set(gen, newData);
            this.currentGen = gen;
        });
    }

    public async updatePokemonStatus(pokemonId: number, status: PokeDexEntryStatus, gen?: string): Promise<void> {
        await this.performTransaction((dexData, _retGen) => {
            const currentEntry = dexData[pokemonId];
            let shouldUpdate = false;

            if (!currentEntry) {
                shouldUpdate = true;
            } else {
                if (status === PokeDexEntryStatus.Caught && currentEntry.status !== PokeDexEntryStatus.Caught) {
                    shouldUpdate = true;
                } else if (status === PokeDexEntryStatus.Seen && currentEntry.status === PokeDexEntryStatus.Unknown) {
                    shouldUpdate = true;
                }
            }

            if (shouldUpdate) {
                dexData[pokemonId] = { id: pokemonId, status: status };
            }

            return dexData;
        }, gen || this.currentGen);
    }

    public async clear(): Promise<void> {
        VaildGens.forEach(async (gen) => {
            await this.performTransaction((_oldEntrys: PokeDexEntry[], currentGen: string) => {
                var dexData: PokeDexEntry[] = [];
                if (currentGen === PokeDex__GEN1) {
                    dexData = this.generateEmptyGen1Dex();
                }
                return dexData;
            }, gen);
        });
    }

    public generateEmptyGen1Dex(): PokeDexEntry[] {
        const dexData: PokeDexEntry[] = [];
        for (let i = 1; i <= 151; i++) {
            dexData.push({ id: i, status: PokeDexEntryStatus.Unknown });
        }
        return dexData;
    }

    public async checkDbEmpty(): Promise<boolean> {
        const key = this.getStorageKey(this.currentGen);
        const data = this.context.globalState.get(key);
        return data === undefined;
    }
}
