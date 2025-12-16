import React, { useState, useEffect } from 'react';
import styles from './VPokeDex.module.css';
import { resolveAssetUrl } from '../utilities/vscode';

// Mock Data Interface
interface PokedexEntry {
    id: number;
    name: string;
    status: 'caught' | 'seen' | 'unknown';
}

export const VPokeDex = () => {
    const [activeTab, setActiveTab] = useState('GEN 1');
    const [pokedexData, setPokedexData] = useState<PokedexEntry[]>([]);

    useEffect(() => {
        // Generate Mock Data for Gen 1 (151 Pokemon)
        const mockData: PokedexEntry[] = Array.from({ length: 151 }, (_, i) => {
            const id = i + 1;
            // Randomly assign status for demonstration
            const rand = Math.random();
            let status: 'caught' | 'seen' | 'unknown' = 'unknown';
            if (rand > 0.7) status = 'caught';
            else if (rand > 0.4) status = 'seen';
            
            // Hardcode starters as caught for better demo
            if (id <= 9) status = 'caught';

            return {
                id,
                name: `Pokemon ${id}`, // Placeholder name since we don't have names yet
                status
            };
        });
        setPokedexData(mockData);
    }, []);

    const getSpriteUrl = (id: number) => {
        return resolveAssetUrl(`./sprites/pokemon/normal/${id}.png`);
    };

    const formatId = (id: number) => {
        return `#${id.toString().padStart(3, '0')}`;
    };

    return (
        <div className={styles.pokedexContainer}>
            {/* Tabs */}
            <div className={styles.dexNav}>
                <div className={`${styles.dexTab} ${activeTab === 'GEN 1' ? styles.active : ''}`} onClick={() => setActiveTab('GEN 1')}>
                    GEN 1
                </div>
                <div className={styles.dexTab} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    GEN 2
                </div>
            </div>

            {/* Content */}
            <div className={styles.dexWallpaper}>
                <div className={styles.grid}>
                    {pokedexData.map((entry) => (
                        <div 
                            key={entry.id} 
                            className={`${styles.dexSlot} ${styles[entry.status]}`}
                            title={entry.status === 'unknown' ? 'Unknown' : entry.name}
                        >
                            <div className={styles.dexNum}>{formatId(entry.id)}</div>
                            
                            <div className={styles.spriteContainer}>
                                {entry.status === 'unknown' ? (
                                    <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>?</span>
                                ) : (
                                    <img 
                                        src={getSpriteUrl(entry.id)} 
                                        alt={entry.name} 
                                        className={`${styles.sprite} ${entry.status === 'seen' ? styles.silhouette : ''}`}
                                    />
                                )}
                            </div>

                            {entry.status === 'caught' && (
                                <div className={styles.pokeballIcon}>
                                    <svg viewBox="0 0 24 24" fill="#D04040">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M2 12h20M12 2a10 10 0 0 1 10 10 1.5 1.5 0 0 1-1.5 1.5h-4.6a4 4 0 0 0-7.8 0H3.5A1.5 1.5 0 0 1 2 12 10 10 0 0 1 12 2z" fill="#fff" />
                                        <circle cx="12" cy="12" r="3" fill="#fff" stroke="#D04040" strokeWidth="2"/>
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}