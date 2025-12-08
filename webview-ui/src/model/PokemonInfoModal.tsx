import React, { useState } from 'react';
import { PokemonDao } from '../dataAccessObj/pokemon';
import styles from './PokemonInfoModal.module.css';
import { getBallUrl } from '../utilities/util';

const IconClose = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
);

interface PokemonInfoModalProps {
    pokemon: PokemonDao;
    onClose: () => void;
    onAction: (pokemon: PokemonDao) => void;
    actionLabel: string;
}

export const PokemonInfoModal: React.FC<PokemonInfoModalProps> = ({ pokemon, onClose, onAction, actionLabel }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'moves' | 'iv'>('stats');

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.summaryCard} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.summaryHeader}>
                    <span className={styles.summaryTitle}>POKéMON INFO</span>
                    <div className={styles.headerIcons}>
                        <div className={styles.iconBox} onClick={onClose}>
                            <IconClose />
                        </div>
                    </div>
                </div>

                <div className={styles.summaryBody}>
                    {/* Left: Sprite & Basic Info */}
                    <div className={styles.summaryLeft}>
                        <div className={styles.spriteFrame}>
                            <img 
                                src={getBallUrl(pokemon.caughtBall)} 
                                className={styles.expandedBallDecor} 
                                alt="ball" 
                            />
                            <img 
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${pokemon.id}.png`} 
                                alt={pokemon.name} 
                                className={styles.summarySprite}
                                onError={(e) => {
                                    e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
                                }}
                            />
                        </div>
                        <div className={styles.basicInfo}>
                            <div className={styles.dexNo}>No.{String(pokemon.id).padStart(3, '0')}</div>
                            <div className={styles.pkmName}>{pokemon.name}</div>
                            <div className={styles.lvlBadge}>Lv.{pokemon.level}</div>
                        </div>
                        <div className={styles.typesRow}>
                                {pokemon.types.map(t => (
                                <span key={t} className={`${styles.typeTag} ${styles[t.toLowerCase()] || ''}`}>{t}</span>
                                ))}
                        </div>
                        <button className={styles.withdrawBtn} onClick={() => onAction(pokemon)}>
                            {actionLabel}
                        </button>
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
                                <div className={styles.statsGrid}>
                                    <div className={styles.statItem}><span>HP</span><b>{pokemon.currentHp}/{pokemon.maxHp}</b></div>
                                    <div className={styles.statItem}><span>ATK</span><b>{pokemon.stats.attack}</b></div>
                                    <div className={styles.statItem}><span>DEF</span><b>{pokemon.stats.defense}</b></div>
                                    <div className={styles.statItem}><span>SPA</span><b>{pokemon.stats.specialAttack}</b></div>
                                    <div className={styles.statItem}><span>SPD</span><b>{pokemon.stats.specialDefense}</b></div>
                                    <div className={styles.statItem}><span>SPE</span><b>{pokemon.stats.speed}</b></div>
                                    <div className={`${styles.statItem} ${styles.fullWidth}`}>
                                        <span>NAT.</span><span className={styles.blueText}>{pokemon.nature}</span>
                                    </div>
                                    <div className={`${styles.statItem} ${styles.fullWidth}`}>
                                        <span>ABIL.</span><span className={styles.blueText}>{pokemon.ability}</span>
                                    </div>
                                </div>
                            ) : activeTab === 'moves' ? (
                                <div className={styles.movesList}>
                                    {pokemon.pokemonMoves.length > 0 ? (
                                        pokemon.pokemonMoves.map((move, idx) => (
                                            <div key={idx} className={styles.moveItem}>
                                                <span className={styles.moveName}>{move.name}</span>
                                                <div className={styles.movePP}>PP {move.pp}/{move.maxPP}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.noMoves}>--</div>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.statsGrid}>
                                    <div className={styles.statItem}><span>HP</span><b>{pokemon.iv.hp}</b></div>
                                    <div className={styles.statItem}><span>ATK</span><b>{pokemon.iv.attack}</b></div>
                                    <div className={styles.statItem}><span>DEF</span><b>{pokemon.iv.defense}</b></div>
                                    <div className={styles.statItem}><span>SPA</span><b>{pokemon.iv.specialAttack}</b></div>
                                    <div className={styles.statItem}><span>SPD</span><b>{pokemon.iv.specialDefense}</b></div>
                                    <div className={styles.statItem}><span>SPE</span><b>{pokemon.iv.speed}</b></div>
                                    <div className={`${styles.statItem} ${styles.fullWidth}`}>
                                        <span>EV TOTAL</span><b>{Object.values(pokemon.ev).reduce((a, b) => a + b, 0)}</b>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};