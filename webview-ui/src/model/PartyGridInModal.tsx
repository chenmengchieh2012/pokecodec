import React from 'react';
import { PokemonDao } from '../dataAccessObj/pokemon';
import styles from './PartyGridInModal.module.css';

interface PartyGridInModalProps {
    party: PokemonDao[];
    onPokemonClick: (pokemon: PokemonDao) => void;
}

export const PartyGridInModal: React.FC<PartyGridInModalProps> = ({ party, onPokemonClick }) => {
    const getHpColor = (current: number, max: number) => {
        const ratio = current / max;
        if (ratio <= 0.2) return '#e74c3c'; // Red (hp-low)
        if (ratio <= 0.5) return '#f1c40f'; // Yellow (hp-mid)
        return '#2ecc71'; // Green (hp-high)
    };

    return (
            <div className={styles['party-select-overlay-content']}>
                {party.map((p) => {
                    const current = p.currentHp ?? p.stats?.hp ?? 100;
                    const max = p.maxHp ?? p.stats?.hp ?? 100;
                    const hpPercent = max > 0 ? (current / max) * 100 : 0;
                    const isFainted = current <= 0;

                    return (
                        <button 
                            key={p.uid} 
                            className={`${styles['party-card-btn']} ${isFainted ? styles.fainted : ''}`}
                            onClick={() => onPokemonClick(p)}
                        >
                            {/* 左側：寶可夢圖示 */}
                            <div className={styles['party-sprite-wrapper']}>
                                <img 
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${p.id}.png`}
                                    alt={p.name}
                                    className={styles['party-sprite']}
                                />
                            </div>
                            
                            {/* 右側：資訊欄 (名字 + 血條 + 數值) */}
                            <div className={styles['party-info']}>
                                <div className={styles['party-name']}>
                                    <div>{p.name}</div>   
                                    <div className={styles['hp-text']}>
                                        {current}/{max}
                                    </div>
                                </div>
                                
                                <div className={styles['hp-bar-container']}>
                                    <div 
                                        className={styles['hp-bar-fill']}
                                        style={{ 
                                            width: `${hpPercent}%`,
                                            backgroundColor: getHpColor(current, max)
                                        }}
                                    />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
    );
};
