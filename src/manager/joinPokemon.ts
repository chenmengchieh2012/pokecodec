import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { SequentialExecutor } from '../utils/SequentialExecutor';

export class JoinPokemon {
    // 記憶體快取
    private party: PokemonDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-party-data';
    private readonly MAX_PARTY_SIZE = 6;

    private saveQueue = new SequentialExecutor();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
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
    private async performTransaction(modifier: (party: PokemonDao[]) => void): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read
            const currentParty = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY) || [];
            
            // 2. Modify
            modifier(currentParty);

            // 3. Write
            await this.context.globalState.update(this.STORAGE_KEY, currentParty);

            // 4. Update Cache
            this.party = currentParty;
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
        });
        return success;
    }

    public async update(pokemon: PokemonDao): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            const index = party.findIndex(p => p.uid === pokemon.uid);
            if (index !== -1) {
                party[index] = pokemon;
                success = true;
            }
        });
        return success;
    }
}