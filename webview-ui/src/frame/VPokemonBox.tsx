import React, { useState } from 'react';
import { vscode, resolveAssetUrl } from '../utilities/vscode';
import styles from './VPokemonBox.module.css';
import { PokemonInfoModal } from '../model/PokemonInfoModal';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { BoxPayload } from '../../../src/dataAccessObj/MessagePayload';
import { EmeraldTabPanel } from './EmeraldTabPanel';


const IconTrash = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
);

export const VPokemonBox = () => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const { pokemons: defaultPokemons, currentBox, totalBoxLength} = messageStore.getRefs().box || {};
    const [pokemons, setPokemons] = useState<PokemonDao[]>(defaultPokemons || []);
    const [selectedPokemon, setSelectedPokemon] = useState<PokemonDao | null>(null);
    
    // Organization State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [draggedPokemonUid, setDraggedPokemonUid] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMoveBoxSelector, setShowMoveBoxSelector] = useState(false);

    const [activeBox, setActiveBox] = useState(currentBox || 0);
    const [totalBoxes, setTotalBoxes] = useState(totalBoxLength || 1);

    useMessageSubscription(MessageType.BoxData, (message) => {
        const boxPayload = message.data as BoxPayload;
        const rawPokemons = boxPayload.pokemons || [];

        const validPokemons = rawPokemons.map(p => {
            if (!p.stats) {
                return {
                    ...p,
                    stats: { hp: p.maxHp || 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
                    iv: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
                    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
                    nature: 'Unknown',
                    ability: 'Unknown',
                    originalTrainer: 'Unknown',
                    types: p.types || ['Normal']
                } as PokemonDao;
            }
            return p as PokemonDao;
        });
        setPokemons(validPokemons);
        setActiveBox(boxPayload.currentBox);
        setTotalBoxes(boxPayload.totalBoxLength);
    });

    // Fetch data when activeBox changes
    React.useEffect(() => {
        vscode.postMessage({ command: MessageType.GetBox, boxIndex: activeBox });
    }, [activeBox]);

    // Handlers
    const handleSlotClick = (p: PokemonDao) => {
        if (isSelectionMode) {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(p.uid)) {
                newSelected.delete(p.uid);
            } else {
                newSelected.add(p.uid);
            }
            setSelectedIds(newSelected);
        } else {
            setSelectedPokemon(p);
        }
    };

    const handleDragStart = (e: React.DragEvent, p: PokemonDao) => {
        if (isSelectionMode) {
            e.preventDefault();
            return;
        }
        setDraggedPokemonUid(p.uid);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetP: PokemonDao) => {
        e.preventDefault();
        if (!draggedPokemonUid || draggedPokemonUid === targetP.uid) return;

        const fromIndex = pokemons.findIndex(p => p.uid === draggedPokemonUid);
        const toIndex = pokemons.findIndex(p => p.uid === targetP.uid);

        if (fromIndex === -1 || toIndex === -1) return;

        const newPokemons = [...pokemons];
        const [movedItem] = newPokemons.splice(fromIndex, 1);
        newPokemons.splice(toIndex, 0, movedItem);

        setPokemons(newPokemons);
        setDraggedPokemonUid(null);
        
        vscode.postMessage({ 
            command: MessageType.ReorderBox, 
            pokemonUids: newPokemons.map(p => p.uid) 
        });
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        vscode.postMessage({ 
            command: MessageType.DeletePokemon, 
            pokemonUids: Array.from(selectedIds) 
        });
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setShowDeleteConfirm(false);
    };

    const handleBatchMove = (targetBoxIndex: number) => {
        vscode.postMessage({ 
            command: MessageType.BatchMoveToBox, 
            pokemonUids: Array.from(selectedIds),
            targetBoxIndex: targetBoxIndex
        });
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setShowMoveBoxSelector(false);
    };

    const handleAddToParty = (pokemon: PokemonDao) => {
        vscode.postMessage({ 
            command: MessageType.AddToParty, 
            pokemonUid: pokemon.uid 
        });
        setSelectedPokemon(null);
    };

    return (
        <EmeraldTabPanel
            tabs={
                Array.from({ length: totalBoxes }).map((_, index) => ({
                    label: `BOX ${index + 1}`,
                    onClick: () => setActiveBox(index),
                    isActive: activeBox === index,
                    disabled: isSelectionMode
                }))
            }
            actions={
                isSelectionMode ? [
                    {
                        label: 'MOVE',
                        onClick: () => setShowMoveBoxSelector(true)
                    },
                    {
                        label: <><IconTrash /> {selectedIds.size}</>,
                        onClick: handleDeleteSelected,
                        isDanger: true
                    },
                    {
                        label: '✖',
                        onClick: () => {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                        }
                    }
                ] : [
                    {
                        label: 'ORGANIZE',
                        onClick: () => setIsSelectionMode(true)
                    }
                ]
            }
        >
            <div className={styles.grid}>
                {pokemons.map((p) => (
                    <div 
                        key={p.uid} 
                        className={`
                            ${styles.pokemonSlot} 
                            ${selectedIds.has(p.uid) ? styles.selectedSlot : ''}
                            ${draggedPokemonUid === p.uid ? styles.draggedSlot : ''}
                        `}
                        onClick={() => handleSlotClick(p)}
                        draggable={!isSelectionMode}
                        onDragStart={(e) => handleDragStart(e, p)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, p)}
                        title={p.name}
                    >
                        {selectedIds.has(p.uid) && <div className={styles.checkMark}>✔</div>}
                        <img 
                            src={resolveAssetUrl(`./sprites/pokemon/${p.isShiny ? 'shiny' : 'normal'}/${p.id}.png`)} 
                            alt={p.name} 
                            className={styles.sprite}
                        />
                    </div>
                ))}
                
                {pokemons.length === 0 && (
                    <div className={styles.emptyMessage}>
                        BOX IS EMPTY
                    </div>
                )}
            </div>

            {/* Move Box Selector Modal */}
            {showMoveBoxSelector && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Move to Box...</h3>
                        <div className={styles.boxGrid}>
                            {Array.from({ length: totalBoxes }).map((_, index) => (
                                <button 
                                    key={index} 
                                    className={styles.boxSelectBtn}
                                    onClick={() => handleBatchMove(index)}
                                    disabled={index === activeBox}
                                >
                                    BOX {index + 1}
                                </button>
                            ))}
                        </div>
                        <button className={styles.navBtn} onClick={() => setShowMoveBoxSelector(false)}>Cancel</button>
                    </div>
                </div>
            )}
            {/* Release Confirmation Modal */}
            {showDeleteConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.dialogBox}>
                        <div className={styles.dialogText}>
                            Release {selectedIds.size} POKéMON?
                            <br/>
                            This cannot be undone!
                        </div>
                        <div className={styles.dialogActions}>
                            <button className={styles.retroBtn} onClick={confirmDelete}>YES</button>
                            <button className={styles.retroBtn} onClick={() => setShowDeleteConfirm(false)}>NO</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pokemon Info Modal (Summary Screen Style) */}
            {selectedPokemon && (
                <PokemonInfoModal 
                    pokemon={selectedPokemon}
                    onClose={() => setSelectedPokemon(null)}
                    onAction={handleAddToParty}
                    actionLabel="WITHDRAW"
                />
            )}
        </EmeraldTabPanel>
    );
};
