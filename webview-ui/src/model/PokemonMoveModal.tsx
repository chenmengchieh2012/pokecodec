import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import styles from './PokemonMoveModal.module.css';


export interface PokemonMoveModalProps {
    selectedPokemon: PokemonDao | null;
    onMoveSelect: (pokemon: PokemonDao, moveId: number) => void;
}

export const PokemonMoveModal = (props: PokemonMoveModalProps) => {
    const { selectedPokemon, onMoveSelect } = props;
    
    if (!selectedPokemon) return null;

    const handleMoveSelect = (moveId: number) => {
        onMoveSelect(selectedPokemon, moveId);
    };

    return (
        <>
        {selectedPokemon && (
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                
                <div className={styles.moveGrid}>
                    {selectedPokemon.pokemonMoves.map(move => (
                        <div key={move.id} className={styles.moveItem} onClick={() => handleMoveSelect(move.id)}>
                            <div className={styles.moveName}>{move.name}</div>
                            <div className={styles.movePP}>PP {move.pp}/{move.maxPP}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        </>
    );
}