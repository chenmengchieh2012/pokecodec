import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';

export class JoinPokemon {
    private party: PokemonDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-party-data';
    private readonly MAX_PARTY_SIZE = 6;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    /**
     * Load party from globalState
     */
    public reload() {
        const data = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY);
        if (data) {
            this.party = data;
        }
    }

    /**
     * Save party to globalState
     */
    private async save() {
        await this.context.globalState.update(this.STORAGE_KEY, this.party);
    }

    /**
     * Add a pokemon to the party
     * @param pokemon 
     * @returns true if added, false if party is full
     */
    public async add(pokemon: PokemonDao): Promise<boolean> {
        if (this.party.length >= this.MAX_PARTY_SIZE) {
            return false;
        }
        this.party.push(pokemon);
        await this.save();
        return true;
    }

    /**
     * Remove a pokemon from the party by UID
     * @param uid 
     * @returns true if removed, false if not found
     */
    public async remove(uid: string): Promise<boolean> {
        const index = this.party.findIndex(p => p.uid === uid);
        if (index !== -1) {
            this.party.splice(index, 1);
            await this.save();
            return true;
        }
        return false;
    }

    /**
     * Get all pokemon in the party
     */
    public getAll(): PokemonDao[] {
        return this.party;
    }

    /**
     * Swap two pokemon in the party
     * @param index1 
     * @param index2 
     */
    public async swap(index1: number, index2: number): Promise<boolean> {
        if (index1 < 0 || index1 >= this.party.length || index2 < 0 || index2 >= this.party.length) {
            return false;
        }
        const temp = this.party[index1];
        this.party[index1] = this.party[index2];
        this.party[index2] = temp;
        await this.save();
        return true;
    }

    /**
     * Update a pokemon in the party (e.g. HP change, level up)
     * @param pokemon 
     */
    public async update(pokemon: PokemonDao): Promise<boolean> {
        const index = this.party.findIndex(p => p.uid === pokemon.uid);
        if (index !== -1) {
            this.party[index] = pokemon;
            await this.save();
            return true;
        }
        return false;
    }
}
