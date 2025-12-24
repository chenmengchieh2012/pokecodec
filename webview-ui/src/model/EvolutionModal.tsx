import styles from './EvolutionModal.module.css';
import { resolveAssetUrl, vscode } from '../utilities/vscode';
import { EvolutionTrigger, PokemonDao, RawPokemonData } from '../../../src/dataAccessObj/pokemon';
import pokemonGen1Data from "../../../src/data/pokemonGen1.json";
import { useMemo } from 'react';
import { EvolvePokemonPayload, UseItemPayload } from '../../../src/dataAccessObj/MessagePayload';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { ItemDao } from '../../../src/dataAccessObj/item';

interface EvolutionModalProps {
    pokemon: PokemonDao;
    trigger: EvolutionTrigger;
    item?: ItemDao;
    onClose: () => void;
}

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;

export const EvolutionModal: React.FC<EvolutionModalProps> = ({ pokemon, onClose, trigger, item }) => {
    
    const evolutionTarget = useMemo(() => {
        const rawPokemonData = pokemonDataMap[pokemon.id.toString()];
        if (!rawPokemonData || !rawPokemonData.evolutions) {
            console.error('[EvolutionModal] No evolution data found for pokemon ID:', pokemon.id);
            return null;
        }
        let targetPokemons = rawPokemonData.evolutions.filter(evo => evo.trigger === trigger);
            console.error('[EvolutionModal] Target Pokemons:', targetPokemons);
        if (item != undefined) {
            targetPokemons = targetPokemons.filter(evo => evo.item === item.apiName);
        }
        if (targetPokemons.length === 0 || targetPokemons.length > 1) {
            console.error('[EvolutionModal] No valid evolution target found for pokemon ID:', pokemon.id);
            console.error('[EvolutionModal] Target Pokemons:', targetPokemons);
            console.error('[EvolutionModal] Trigger:', trigger, 'Item:', item);
            return null;
        }
        const targetPokemon = targetPokemons[0];
        return {
            id: targetPokemon.id,
            name: pokemonDataMap[targetPokemon.id.toString()]?.name || 'unknown',
        };
    }, [item, pokemon.id, trigger]);

    
    const handleEvolve = () => {
        if (!evolutionTarget) return;
        if (item && item.apiName === '' && item.apiName === undefined) {
            console.error('[EvolutionModal] Not enough item quantity to evolve:', item);
            return;
        }
        // Send evolve message to backend
        const evolvePayload: EvolvePokemonPayload = {
            pokemonUid: pokemon.uid,
            toSpeciesId: evolutionTarget.id,
        };
        vscode.postMessage({
            command: MessageType.EvolvePokemon,
            ...evolvePayload,
        });

        // If an item was used for evolution, send use item message
        const itemUsedPayload: UseItemPayload = {
            itemId: item?.apiName || '',
            item: item,
            count: 1,
        };
        vscode.postMessage({
            command: MessageType.UseItem,
            ...itemUsedPayload,
        })

        onClose(); 
    };

    if(evolutionTarget === null) {
        onClose();
    }

    return (
        <div className={styles.modalSelectionOverlay}>
            <div className={styles.modalSelectionContent}>
                <div className={styles.modalSelectionHeader}>
                    <span>Evolution Available!</span>
                    <button className={styles.backBtn} onClick={onClose}>Cancel</button>
                </div>
                <div className={styles.evolutionContent}>
                    <div className={styles.evolutionRow}>
                        <div className={styles.evolutionSprite}>
                            <img src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${pokemon.id}.gif`)} alt={pokemon.name} />
                            <span>{pokemon.name.toUpperCase()}</span>
                        </div>
                        <div className={styles.evolutionArrow}>➔</div>
                        <div className={styles.evolutionSprite}>
                            <img src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${evolutionTarget?.id}.gif`)} alt={evolutionTarget?.name} />
                            <span>{evolutionTarget?.name.toUpperCase()}</span>
                        </div>
                    </div>
                    <button className={styles.evolveBtn} onClick={handleEvolve}>EVOLVE</button>
                </div>
            </div>
        </div>
    );
};