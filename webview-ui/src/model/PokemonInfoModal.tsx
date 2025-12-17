import React, { useState } from 'react';
import styles from './PokemonInfoModal.module.css';
import { getBallUrl } from '../utilities/util';
import { PokemonDao, RawPokemonData } from '../../../src/dataAccessObj/pokemon';
import { MoveDecorator, PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { resolveAssetUrl, vscode } from '../utilities/vscode';
import pokemonGen1Data from '../../../src/data/pokemonGen1.json';
import movesData from '../../../src/data/pokemonMoves.json';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { EvolvePokemonPayload, UpdatePartyPokemonPayload } from '../../../src/dataAccessObj/MessagePayload';

const IconClose = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
);


interface PokemonInfoModalProps {
    isInParty: boolean;
    pokemon: PokemonDao;
    onClose: () => void;
    onAction: (pokemon: PokemonDao) => void;
    actionLabel: string;
}

export const PokemonInfoModal: React.FC<PokemonInfoModalProps> = ({ isInParty,pokemon, onClose, onAction, actionLabel }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'moves' | 'iv'>('stats');
    const [currentMoves, setCurrentMoves] = useState<PokemonMove[]>(pokemon.pokemonMoves);
    const [showEvolutionModal, setShowEvolutionModal] = useState(false);

    React.useEffect(() => {
        setCurrentMoves(pokemon.pokemonMoves);
    }, [pokemon.pokemonMoves]);

    const getEvolutionTarget = () => {
        const speciesData = (pokemonGen1Data as unknown as Record<string, RawPokemonData>)[pokemon.id.toString()];
        if (!speciesData || !speciesData.evolutions) return null;

        const levelUpEvo = speciesData.evolutions.find(evo => 
            evo.trigger === 'level-up' && 
            evo.min_level !== null && 
            pokemon.level >= evo.min_level
        );
        
        return levelUpEvo;
    };

    const evolutionTarget = getEvolutionTarget();

    const handleEvolve = () => {
        if (!evolutionTarget) return;
        const evolvePayload: EvolvePokemonPayload = {
            pokemonUid: pokemon.uid,
            toSpeciesId: evolutionTarget.id,
        };
        vscode.postMessage({
            command: MessageType.EvolvePokemon,
            ...evolvePayload,
        });
        setShowEvolutionModal(false);
        onClose(); 
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.summaryCard} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.summaryHeader}>
                    <span className={styles.summaryTitle}>POKéMON INFO</span>
                    <div className={styles.headerIcons}>
                        {isInParty && evolutionTarget && (
                            <button 
                                className={styles.evolveTriggerBtn}
                                onClick={() => setShowEvolutionModal(true)}
                            >
                                EVOLVE!
                            </button>
                        )}
                        <button className={styles.withdrawBtn} onClick={() => onAction(pokemon)}>
                            {actionLabel}
                        </button>
                        <div className={styles.iconBox} onClick={onClose}>
                            <IconClose />
                        </div>
                    </div>
                </div>

                <div className={styles.summaryBody}>
                    {isInParty && showEvolutionModal && evolutionTarget ? (
                        <EvolutionModal 
                            pokemon={pokemon} 
                            evolutionTarget={evolutionTarget} 
                            onConfirm={handleEvolve} 
                            onCancel={() => setShowEvolutionModal(false)} 
                        />
                    ) : (
                        <>
                    {/* Left: Sprite & Basic Info */}
                    <div className={styles.summaryLeft}>
                        <div className={styles.spriteFrame}>
                            <img 
                                src={getBallUrl(pokemon.caughtBall)} 
                                className={styles.expandedBallDecor} 
                                alt="ball" 
                            />
                            <img 
                                src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${pokemon.id}.gif`)} 
                                alt={pokemon.name} 
                                className={styles.summarySprite}
                                onError={(e) => {
                                    e.currentTarget.src = resolveAssetUrl(`./sprites/pokemon/icon/${pokemon.id}.png`);
                                }}
                            />
                        </div>
                        <div className={styles.basicInfo}>
                            <div className={styles.dexNo}>No.{String(pokemon.id).padStart(3, '0')}</div>
                            <div className={styles.pkmName}>{pokemon.name}</div>
                            <div className={styles.lvlBadge}>Lv.{pokemon.level} ({Math.floor((pokemon.currentExp / pokemon.toNextLevelExp) * 100)}%)</div>
                        </div>
                        <div className={styles.typesRow}>
                                {pokemon.types.map(t => (
                                <span key={t} className={`${styles.typeTag} ${styles[t.toLowerCase()] || ''}`}>{t}</span>
                                ))}
                        </div>
                    </div>

                    {/* Right: Tabs & Stats/Moves */}
                    <div className={styles.summaryRight}>
                        <div className={styles.tabsRow}>
                            <div 
                                className={`${styles.tab} ${activeTab === 'stats' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('stats')}
                            >
                                STATS
                            </div>
                            <div 
                                className={`${styles.tab} ${activeTab === 'moves' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('moves')}
                            >
                                MOVES
                            </div>
                            <div 
                                className={`${styles.tab} ${activeTab === 'iv' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('iv')}
                            >
                                IVs
                            </div>
                        </div>

                        <div className={styles.tabContent}>
                            {activeTab === 'stats' ? (
                                <>
                                <div className={styles.battleStats}>
                                    <div className={styles.statItem}><span>HP</span><b>{pokemon.currentHp}/{pokemon.maxHp}</b></div>
                                    <div className={styles.statItem}><span>ATK</span><b>{pokemon.stats.attack}</b></div>
                                    <div className={styles.statItem}><span>DEF</span><b>{pokemon.stats.defense}</b></div>
                                    <div className={styles.statItem}><span>SPA</span><b>{pokemon.stats.specialAttack}</b></div>
                                    <div className={styles.statItem}><span>SPD</span><b>{pokemon.stats.specialDefense}</b></div>
                                    <div className={styles.statItem}><span>SPE</span><b>{pokemon.stats.speed}</b></div>
                                    <div className={styles.statItem}><span>EXP</span><b>{pokemon.currentExp}</b></div>
                                    <div className={styles.statItem}><span>NEXT</span><b>{pokemon.toNextLevelExp}</b></div>
                                </div>
                                <div className={styles.extraInfo}>
                                    <div className={styles.infoItem}>
                                        <span>NAT.</span><span className={styles.blueText}>{pokemon.nature}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span>ABIL.</span><span className={styles.blueText}>{pokemon.ability}</span>
                                    </div>
                                </div>
                                </>
                            ) : activeTab === 'moves' ? (
                                <MoveSelector isInParty={isInParty} pokemon={pokemon} moves={currentMoves} />
                            ) : (
                                <>
                                <div className={styles.battleStats}>
                                    <div className={styles.statItem}><span>HP</span><b>{pokemon.iv.hp}</b></div>
                                    <div className={styles.statItem}><span>ATK</span><b>{pokemon.iv.attack}</b></div>
                                    <div className={styles.statItem}><span>DEF</span><b>{pokemon.iv.defense}</b></div>
                                    <div className={styles.statItem}><span>SPA</span><b>{pokemon.iv.specialAttack}</b></div>
                                    <div className={styles.statItem}><span>SPD</span><b>{pokemon.iv.specialDefense}</b></div>
                                    <div className={styles.statItem}><span>SPE</span><b>{pokemon.iv.speed}</b></div>
                                </div>
                                <div className={styles.codeInfoSection}>
                                    <div className={styles.infoItem}>
                                        <span>LANG.</span><span className={styles.blueText}>{pokemon.codingStats?.favoriteLanguage}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span>REPO.</span><span className={styles.blueText}>{pokemon.codingStats?.caughtRepo}</span>
                                    </div>
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
};


interface EvolutionModalProps {
    pokemon: PokemonDao;
    evolutionTarget: { id: number, name: string };
    onConfirm: () => void;
    onCancel: () => void;
}

const EvolutionModal: React.FC<EvolutionModalProps> = ({ pokemon, evolutionTarget, onConfirm, onCancel }) => {
    return (
        <div className={styles.modalSelectionOverlay}>
            <div className={styles.modalSelectionContent}>
                <div className={styles.moveSelectionHeader}>
                    <span>Evolution Available!</span>
                    <button className={styles.backBtn} onClick={onCancel}>Cancel</button>
                </div>
                <div className={styles.evolutionContent}>
                    <div className={styles.evolutionRow}>
                        <div className={styles.evolutionSprite}>
                            <img src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${pokemon.id}.gif`)} alt={pokemon.name} />
                            <span>{pokemon.name}</span>
                        </div>
                        <div className={styles.evolutionArrow}>➔</div>
                        <div className={styles.evolutionSprite}>
                            <img src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${evolutionTarget.id}.gif`)} alt={evolutionTarget.name} />
                            <span>{evolutionTarget.name.toUpperCase()}</span>
                        </div>
                    </div>
                    <button className={styles.evolveBtn} onClick={onConfirm}>EVOLVE</button>
                </div>
            </div>
        </div>
    );
};

interface LearnableMoveListModalProps {
    pokemon: PokemonDao;
    onSelect: (move: PokemonMove) => void;
    onCancel: () => void;
}

const LearnableMoveListModal: React.FC<LearnableMoveListModalProps> = ({pokemon, onSelect, onCancel }) => {
    
    const getLearnableMoves = (focusPokemon: PokemonDao) => {
        const speciesData = (pokemonGen1Data as unknown as Record<string, RawPokemonData>)[focusPokemon.id.toString()];
        if (!speciesData) return [];

        const currentMoveNames = new Set(focusPokemon.pokemonMoves.map(m => m.name));
        
        return speciesData.moves
            .filter((m) => m.learn_method === 'level-up' && m.level_learned_at <= pokemon.level)
            .filter((m) => !currentMoveNames.has(m.name.toUpperCase()))
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
                <div className={styles.moveSelectionHeader}>
                    <span>Select Move</span>
                    <button className={styles.backBtn} onClick={onCancel}>Cancel</button>
                </div>
                <div className={styles.moveSelectionList}>
                    {learnableMoves.map((move) => (
                        <div key={move.name} className={styles.learnableMoveItem} onClick={() => onSelect(move)}>
                            <span className={styles.moveName}>{move.name.toUpperCase()}</span>
                            <div className={styles.movePP}>PP {move.pp}/{move.pp}</div>
                        </div>
                    ))}
                    {learnableMoves.length === 0 && <div className={styles.noMoves}>No moves to learn</div>}
                </div>
            </div>
        </div>
    );
};

interface MoveSelectorProps {
    isInParty: boolean;
    pokemon: PokemonDao;
    moves: PokemonMove[];
}

const MoveSelector: React.FC<MoveSelectorProps> = ({ isInParty, pokemon, moves }) => {
    const [editingSlot, setEditingSlot] = useState<number | null>(null);

    const handleMoveClick = (index: number) => {
        setEditingSlot(index);
    };

    const handlePokemonChangeMoves = (newMove: PokemonMove) => {

        if (editingSlot === null) return;
        const newPokemon = JSON.parse(JSON.stringify(pokemon));

        const newMovesList = [...moves];
        newMovesList[editingSlot] = MoveDecorator(newMove);
        newPokemon.pokemonMoves = newMovesList;
        const updatePartyPayload: UpdatePartyPokemonPayload = {
            pokemon: newPokemon
        };
        if(isInParty) {
            vscode.postMessage({
                command: MessageType.UpdatePartyPokemon,
                ...updatePartyPayload,
            });
        }

        setEditingSlot(null);
    }

    return (
        <>
        <div className={styles.movesList}>
            {moves.length > 0 ? (
                moves.map((move, idx) => (
                    <div 
                        key={idx} 
                        className={styles.moveItem}
                        onClick={() => { if (isInParty) handleMoveClick(idx); }}
                    >
                        <span className={styles.moveName}>{move.name}</span>
                        <div className={styles.movePP}>PP {move.pp}/{move.maxPP}</div>
                    </div>
                ))
            ) : (
                <div className={styles.noMoves}>--</div>
            )}
        </div>

        {editingSlot !== null && <LearnableMoveListModal 
            pokemon={pokemon}
            onSelect={handlePokemonChangeMoves}
            onCancel={() => setEditingSlot(null)}        
            />}
        </>
    );
};