import { PokemonDao, RawPokemonData } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { PokemonTypeIcon } from '../utilities/pokemonTypeIcon';
import pokemonGen1Data from '../../../src/data/pokemonGen1.json';
import movesData from '../../../src/data/pokemonMoves.json';
import styles from './LearnableMoveListModal.module.css';

interface LearnableMoveListModalProps {
    pokemon: PokemonDao;
    onSelect: (move: PokemonMove) => void;
    onCancel: () => void;
}

export const LearnableMoveListModal: React.FC<LearnableMoveListModalProps> = ({pokemon, onSelect, onCancel }) => {
    
    const getLearnableMoves = (focusPokemon: PokemonDao) => {
        const speciesData = (pokemonGen1Data as unknown as Record<string, RawPokemonData>)[focusPokemon.id.toString()];
        if (!speciesData) return [];

        const currentMoveNames = new Set(focusPokemon.pokemonMoves.map(m => m.name));
        
        return speciesData.moves
            .filter((m) => m.learn_method === 'level-up' && m.level_learned_at <= pokemon.level)
            .filter((m) => !currentMoveNames.has(m.name))
            .map((m) => {
                const moveDetails = movesData[m.name as keyof typeof movesData];
                if (!moveDetails) return null;
                return {
                    ...moveDetails,
                    id: moveDetails.id,
                    name: m.name,
                } as PokemonMove;
            })
            .filter((m): m is PokemonMove => m !== null);
    }
    const learnableMoves = getLearnableMoves(pokemon);
    
    return (
        <div className={styles.modalSelectionOverlay}>
            <div className={styles.modalSelectionContent}>
                <div className={styles.modalSelectionHeader}>
                    <span>Select Move</span>
                    <button className={styles.backBtn} onClick={onCancel}>Cancel</button>
                </div>
                <div className={styles.moveSelectionList}>
                    {learnableMoves.map((move) => (
                        <div key={move.name} className={styles.learnableMoveItem} onClick={() => onSelect(move)}>
                            <span className={styles.moveName}><PokemonTypeIcon className={styles.moveTypeIcon} type={move.type} />{move.name.toUpperCase()}</span>
                            <div className={styles.movePP}>PP {move.pp}/{move.pp}</div>
                        </div>
                    ))}
                    {learnableMoves.length === 0 && <div className={styles.noMoves}>No moves to learn</div>}
                </div>
            </div>
        </div>
    );
};