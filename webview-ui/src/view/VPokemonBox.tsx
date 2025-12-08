import React, { useState, useEffect } from 'react';
import { vscode } from '../utilities/vscode';
import { type PokemonDao } from '../dataAccessObj/pokemon';
import styles from './VPokemonBox.module.css';
import { PokemonInfoModal } from '../model/PokemonInfoModal';


const IconTrash = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
);

export const VPokemonBox = () => {
    const [pokemons, setPokemons] = useState<PokemonDao[]>([]);
    const [selectedPokemon, setSelectedPokemon] = useState<PokemonDao | null>(null);
    
    // Organization State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [draggedPokemonUid, setDraggedPokemonUid] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [activeBox, setActiveBox] = useState(0);

    useEffect(() => {
        vscode.postMessage({ command: 'getBox' });
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'boxData') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const validPokemons = (message.data as any[]).map(p => {
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
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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
            command: 'reorderBox', 
            pokemonUids: newPokemons.map(p => p.uid) 
        });
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        vscode.postMessage({ 
            command: 'deletePokemon', 
            pokemonUids: Array.from(selectedIds) 
        });
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setShowDeleteConfirm(false);
    };

    const handleAddToParty = (pokemon: PokemonDao) => {
        vscode.postMessage({ 
            command: 'addToParty', 
            pokemonUid: pokemon.uid 
        });
        setSelectedPokemon(null);
    };

    return (
        <div className={styles.emeraldContainer}>
            {/* Tabs Navigation */}
            <div className={styles.boxNav}>
                <div className={styles.tabsLeft}>
                    <div 
                        className={`${styles.boxTab} ${activeBox === 0 ? styles.active : ''}`} 
                        onClick={() => setActiveBox(0)}
                    >
                        BOX 1
                    </div>
                    <div 
                        className={`${styles.boxTab} ${activeBox === 1 ? styles.active : ''}`} 
                        onClick={() => setActiveBox(1)}
                    >
                        BOX 2
                    </div>
                </div>
                
                <div className={styles.tabsRight}>
                    {isSelectionMode ? (
                        <>
                            <button className={`${styles.navBtn} ${styles.dangerBtn}`} onClick={handleDeleteSelected}>
                                <IconTrash /> {selectedIds.size}
                            </button>
                            <button className={styles.navBtn} onClick={() => {
                                setIsSelectionMode(false);
                                setSelectedIds(new Set());
                            }}>✖</button>
                        </>
                    ) : (
                        <button className={styles.navBtn} onClick={() => setIsSelectionMode(true)}>
                            ORGANIZE
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className={styles.boxWallpaper}>
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
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${p.id}.png`} 
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
            </div>

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
        </div>
    );
};
