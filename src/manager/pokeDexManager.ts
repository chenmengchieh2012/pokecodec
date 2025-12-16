import * as vscode from 'vscode';
import GlobalStateKey from '../utils/GlobalStateKey';
import { PokeDexData, PokeDexEntry, PokemonStatus } from '../dataAccessObj/PokeDex';
import { SequentialExecutor } from '../utils/SequentialExecutor';

export class PokeDexManager {
    private static instance: PokeDexManager;
    private context: vscode.ExtensionContext;
    // Map<GenID, PokeDexData>
    private dexDataMap: Map<string, PokeDexData> = new Map();
    private currentGen: string = 'GEN 1';
    private readonly STORAGE_KEY_BASE = GlobalStateKey.POKEDEX_DATA_BASE;
    private readonly CURRENT_GEN_KEY = GlobalStateKey.POKEDEX_CURRENT_GEN;
    private saveQueue = new SequentialExecutor();

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
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
        const gensToLoad = new Set(['GEN 1', this.currentGen]);
        
        gensToLoad.forEach(gen => {
            const key = this.getStorageKey(gen);
            const data = this.context.globalState.get<PokeDexData>(key, {});
            this.dexDataMap.set(gen, data);
        });
    }

    public getDexData(gen?: string): PokeDexData {
        const targetGen = gen || this.currentGen;
        if (!this.dexDataMap.has(targetGen)) {
            // Lazy load if not in memory
            const key = this.getStorageKey(targetGen);
            const data = this.context.globalState.get<PokeDexData>(key, {});
            this.dexDataMap.set(targetGen, data);
        }
        return this.dexDataMap.get(targetGen) || {};
    }

    public getEntry(pokemonId: number): PokeDexEntry | undefined {
        return this.getDexData()[pokemonId];
    }

    public getCurrentGen(): string {
        return this.currentGen;
    }

    public async updateCurrentGen(gen: string): Promise<void> {
        await this.saveQueue.execute(async () => {
            this.currentGen = gen;
            await this.context.globalState.update(this.CURRENT_GEN_KEY, this.currentGen);
            // Ensure data for new gen is loaded
            this.getDexData(gen);
        });
    }

    public async updatePokemonStatus(pokemonId: number, status: PokemonStatus, gen?: string): Promise<void> {
        await this.saveQueue.execute(async () => {
            const targetGen = gen || this.currentGen;
            const dexData = this.getDexData(targetGen);
            const currentEntry = dexData[pokemonId];
            let shouldUpdate = false;

            if (!currentEntry) {
                shouldUpdate = true;
            } else {
                if (status === PokemonStatus.Caught && currentEntry.status !== PokemonStatus.Caught) {
                    shouldUpdate = true;
                } else if (status === PokemonStatus.Seen && currentEntry.status === PokemonStatus.Unknown) {
                    shouldUpdate = true;
                }
            }

            if (shouldUpdate) {
                dexData[pokemonId] = { id: pokemonId, status: status };
                this.dexDataMap.set(targetGen, dexData);
                await this.context.globalState.update(this.getStorageKey(targetGen), dexData);
            }
        });
    }
}
