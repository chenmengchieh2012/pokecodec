import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import GlobalStateKey from '../utils/GlobalStateKey';
import { GlobalMutex } from '../utils/GlobalMutex';

export class JoinPokemonManager {
    private static instance: JoinPokemonManager;
    // 記憶體快取
    private party: PokemonDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.PARTY_DATA;
    private readonly MAX_PARTY_SIZE = 6;

    private saveQueue: SequentialExecutor;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.saveQueue = new SequentialExecutor(new GlobalMutex(context, 'party.lock'));
        this.reload();
    }

    public static getInstance(): JoinPokemonManager {
        if (!JoinPokemonManager.instance) {
            throw new Error("JoinPokemonManager not initialized. Call initialize() first.");
        }
        return JoinPokemonManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): JoinPokemonManager {
        JoinPokemonManager.instance = new JoinPokemonManager(context);
        return JoinPokemonManager.instance;
    }

    public reload() {
        const data = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY);
        if (data) {
            this.party = data;
        } else {
            this.party = [];
        }
    }

    public getAll(): PokemonDao[] {
        return [...this.party];
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (party: PokemonDao[]) => PokemonDao[]): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read
            const currentParty = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY) || [];
            
            // 2. Modify
            const newParty = modifier(currentParty);

            // 3. Write
            await this.context.globalState.update(this.STORAGE_KEY, newParty);

            // 4. Update Cache
            this.party = newParty;
        });
    }

    public async add(pokemon: PokemonDao): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            // 在 Transaction 內部檢查長度，確保絕對不會超過上限
            if (party.length < this.MAX_PARTY_SIZE) {
                party.push(pokemon);
                success = true;
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async remove(uid: string): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            const index = party.findIndex(p => p.uid === uid);
            if (index !== -1) {
                party.splice(index, 1);
                success = true;
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async swap(index1: number, index2: number): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            if (index1 >= 0 && index1 < party.length && 
                index2 >= 0 && index2 < party.length) {
                const temp = party[index1];
                party[index1] = party[index2];
                party[index2] = temp;
                success = true;
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async reorder(uids: string[]): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            // Create a map for quick lookup
            const partyMap = new Map(party.map(p => [p.uid, p]));
            const newParty: PokemonDao[] = [];
            
            // Reconstruct party based on uids order
            for (const uid of uids) {
                const pokemon = partyMap.get(uid);
                if (pokemon) {
                    newParty.push(pokemon);
                    partyMap.delete(uid);
                }
            }
            
            // Append any remaining pokemon (shouldn't happen if uids are correct, but for safety)
            for (const pokemon of partyMap.values()) {
                newParty.push(pokemon);
            }

            if (newParty.length === party.length) {
                // Replace content of party array
                party.length = 0;
                party.push(...newParty);
                success = true;
            }
            
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async update(pokemons: PokemonDao[]): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            for (const pokemon of pokemons) {
                const index = party.findIndex(p => p.uid === pokemon.uid);
                if (index !== -1) {
                    party[index] = pokemon;
                    success = true;
                }
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async clear(): Promise<void> {
        await this.performTransaction(() => {
            return [];
        });
    }
}