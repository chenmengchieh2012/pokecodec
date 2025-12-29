import { ItemDao } from "../dataAccessObj/item";
import { PokemonDao } from "../dataAccessObj/pokemon";

export class ItemEffectStrategy {
    private effectingPokemon: PokemonDao;
    private effectingMoveId?: number;
    private isItemUsed: boolean = false;
    private usingItem: ItemDao;
    private loggerString: string = '';


    constructor(pokemon: PokemonDao, item: ItemDao) {
        this.effectingPokemon = JSON.parse(JSON.stringify(pokemon)); // Deep copy to avoid mutating original
        this.usingItem = item;
    }
    
    setEffectingMoveId(moveId: number) {
        this.effectingMoveId = moveId;
    }

    private async effectOfHpMedicine() {
        // Implement HP medicine effect logic here
        const effect = this.usingItem.effect;
        const oldHp = this.effectingPokemon.currentHp;
        if(effect === undefined){
            console.log("No effect defined for this item.");
            return ;
        }

        // 1. Heal HP (Fixed)
        if (effect.healHp) {
            if (this.effectingPokemon.currentHp < this.effectingPokemon.maxHp) {
                const healAmount = effect.healHp;
                this.effectingPokemon.currentHp = Math.min(this.effectingPokemon.maxHp, this.effectingPokemon.currentHp + healAmount);
                this.isItemUsed = true;
                this.loggerString = `Restored ${this.effectingPokemon.currentHp - oldHp} HP.`;
            } else {
                this.loggerString = 'HP is already full!';
            }
        }
        // 2. Heal HP (Percent)
        else if (effect.healHpPercent) {
            if (this.effectingPokemon.currentHp < this.effectingPokemon.maxHp) {
                const healAmount = Math.floor(this.effectingPokemon.maxHp * (effect.healHpPercent / 100));
                this.effectingPokemon.currentHp = Math.min(this.effectingPokemon.maxHp, this.effectingPokemon.currentHp + healAmount);
                this.isItemUsed = true;
                this.loggerString = `Restored ${this.effectingPokemon.currentHp - oldHp} HP.`;
                if (effect.healStatus && effect.healStatus.includes('all')) {
                    this.effectingPokemon.ailment = 'healthy';
                }
            } else {
                this.loggerString = 'HP is already full!';
            }
        }
    }

    private async effectOfPpMedicine() {
        // Implement PP medicine effect logic here
        const effect = this.usingItem.effect;
        if(effect === undefined){
            console.log("No effect defined for this item.");
            return ;
        }
        const effectingMoveId = this.effectingMoveId;
        if (effect.restorePp || effect.restorePpAll) {
            let ppRestored = false;
            if (effect.restorePpAll) {
                // Restore all PP for all moves
                this.effectingPokemon.pokemonMoves = this.effectingPokemon.pokemonMoves.map(move => ({
                    ...move,
                    pp: move.maxPP
                }));
                ppRestored = true;
                this.loggerString = 'Restored all PP for all moves!';
            } else if (effect.restorePp) {
                // Restore PP for moves that are not at max
                const restoreAmount = effect.restorePp;
                this.effectingPokemon.pokemonMoves = this.effectingPokemon.pokemonMoves.map(move => {
                    console.log("Checking move for PP restore:", move.id , move.name, "Current PP:", move.pp, "Max PP:", move.maxPP);
                    if (move.pp < move.maxPP && move.id === effectingMoveId) {
                        ppRestored = true;
                        return {
                            ...move,
                            pp: Math.min(move.maxPP, move.pp + restoreAmount)
                        };
                    }
                    return move;
                });
                if (ppRestored) {
                    this.loggerString = `Restored ${restoreAmount} PP!`;
                } else {
                   this.loggerString = 'All moves already have full PP!';
                }
            }
            this.isItemUsed = ppRestored;
        }
        
    }

    private async effectOfRevive() {
        // Implement Revive effect logic here
        const effect = this.usingItem.effect;
        if(effect === undefined){
            console.log("No effect defined for this item.");
            return ;
        }
        if (effect.revive) {
            if (this.effectingPokemon.currentHp === 0 || this.effectingPokemon.ailment === 'fainted') {
                const healPercent = effect.reviveHpPercent || 50;
                this.effectingPokemon.currentHp = Math.floor(this.effectingPokemon.maxHp * (healPercent / 100));
                this.effectingPokemon.ailment = 'healthy';
                this.isItemUsed = true;
                this.loggerString = `Revived with ${this.effectingPokemon.currentHp} HP.`;
            } else {
                this.loggerString = 'Pokemon is not fainted!';
            }
        }
    }

    private async effectOfStatusMedicine() {
        // Implement Status medicine effect logic here
        const effect = this.usingItem.effect;
        if(effect === undefined){
            console.log("No effect defined for this item.");
            return ;
        }
        if (effect.healStatus) {
            if (this.effectingPokemon.ailment && this.effectingPokemon.ailment !== 'healthy' && this.effectingPokemon.ailment !== 'fainted') {
                if (effect.healStatus.includes(this.effectingPokemon.ailment) || effect.healStatus.includes('all')) {
                    this.effectingPokemon.ailment = 'healthy';
                    this.isItemUsed = true;
                    this.loggerString = `Cured status condition.`;
                } else {
                    this.loggerString = 'This item cannot cure the current status condition!';
                }
            } else {
                this.loggerString = 'No status condition to heal!';
            }
        }
    }

    private async applyEffect() {
        await this.effectOfHpMedicine();
        await this.effectOfPpMedicine();
        await this.effectOfRevive();
        await this.effectOfStatusMedicine();    
    }

    async getEffectResult(): Promise<{ itemUsed: boolean; usedMessage: string, pokemon: PokemonDao }> {
        await this.applyEffect();
        return {
            itemUsed: this.isItemUsed,
            usedMessage: this.loggerString,
            pokemon: this.effectingPokemon,
        };
    }
}

