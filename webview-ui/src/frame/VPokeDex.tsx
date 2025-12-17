import { useState } from 'react';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { resolveAssetUrl } from '../utilities/vscode';
import styles from './VPokeDex.module.css';
import { PokeDex__GEN1, PokeDexEntry, PokeDexEntryStatus } from '../../../src/dataAccessObj/PokeDex';
import { PokeDexPayload } from '../../../src/dataAccessObj/MessagePayload';

// Mock Data Interface

export const VPokeDex = () => {
    const messageStore = useMessageStore();
    const _defaultPokeDex = messageStore.getRefs().pokeDex;
    const [activeTab, setActiveTab] = useState(PokeDex__GEN1);
    const [pokedexData, setPokedexData] = useState<PokeDexEntry[]>(_defaultPokeDex?.entries || []);

    useMessageSubscription(MessageType.PokeDexData, (message) => {
        const pokeDexPayload = message.data as PokeDexPayload;
        setPokedexData(pokeDexPayload.entries);
    });

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
                    {pokedexData && pokedexData.map((entry) => (
                        <div 
                            key={entry.id} 
                            className={`${styles.dexSlot} ${styles[entry.status]}`}
                        >
                            <div className={styles.dexNum}>{formatId(entry.id)}</div>
                            
                            <div className={styles.spriteContainer}>
                                {entry.status === PokeDexEntryStatus.Unknown ? (
                                    <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>?</span>
                                ) : (
                                    <img 
                                        src={getSpriteUrl(entry.id)} 
                                        alt={entry.id.toString()} 
                                        className={`${styles.sprite} ${entry.status === PokeDexEntryStatus.Seen ? styles.silhouette : ''}`}
                                    />
                                )}
                            </div>

                            {entry.status === PokeDexEntryStatus.Caught && (
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