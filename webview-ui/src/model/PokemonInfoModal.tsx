import React, { useState } from 'react';
import styles from './PokemonInfoModal.module.css';
import { getBallUrl } from '../utilities/util';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { resolveAssetUrl } from '../utilities/vscode';

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
                        <button className={styles.withdrawBtn} onClick={() => onAction(pokemon)}>
                            {actionLabel}
                        </button>
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
                </div>
            </div>
        </div>
    );
};