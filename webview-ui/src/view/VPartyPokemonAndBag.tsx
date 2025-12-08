import { useState, useEffect } from 'react';
import { VBagBox } from '../frame/VBagBox';
import { VPartyBox } from '../frame/VPartyBox';
import styles from './VPartyPokemonAndBag.module.css';
import { vscode } from '../utilities/vscode';

const IconPokeball = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg}>
        <path d="M12 2a10 10 0 0 1 10 10 1.5 1.5 0 0 1-1.5 1.5h-4.6a4 4 0 0 0-7.8 0H3.5A1.5 1.5 0 0 1 2 12 10 10 0 0 1 12 2zm0 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        <path d="M12 22a10 10 0 0 1-10-10 1.5 1.5 0 0 1 1.5-1.5h4.6a4 4 0 0 0 7.8 0h4.6a1.5 1.5 0 0 1 1.5 1.5 10 10 0 0 1-10 10z" opacity="0.5" />
    </svg>
);

const IconBackpack = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg}>
        <path d="M7 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h-10V4zm-2 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
        <rect x="9" y="12" width="6" height="4" rx="1" fill="rgba(255,255,255,0.3)" />
    </svg>
);

export const VPartyPokemonAndBag = () => {
    const [activeTab, setActiveTab] = useState<'party' | 'bag'>('party');
    const [inBattle, setInBattle] = useState(false);

    useEffect(() => {
        vscode.postMessage({ command: 'getBattleState' });
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'battleState') {
                setInBattle(message.inBattle);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    if (inBattle) {
        return (
            <div className={styles.emeraldContainer} style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                position: 'relative'
            }}>
                {/* Overlay to dim background if we wanted to show it, but here we replace it */}
                <div style={{ 
                    width: '280px',
                    backgroundColor: 'var(--emerald-dark)', 
                    padding: '4px', 
                    borderRadius: '4px', 
                    border: '2px solid var(--ui-border)',
                    boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
                    imageRendering: 'pixelated'
                }}>
                    <div style={{
                        border: '2px solid #78C8B8',
                        backgroundColor: '#204840',
                        padding: '12px',
                        borderRadius: '2px',
                        color: '#fff',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{ 
                            fontSize: '10px', 
                            color: '#F8B050', 
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '4px'
                        }}>
                            ⚠️ Access Denied
                        </div>
                        <div style={{ 
                            fontSize: '10px', 
                            lineHeight: '1.6',
                            color: '#ffffff',
                            textShadow: '1px 1px 0 #000'
                        }}>
                            You cannot use the Bag or Party<br/>while in a battle!
                        </div>
                        <div style={{
                            marginTop: '8px',
                            fontSize: '8px',
                            color: '#78C8B8',
                            opacity: 0.8
                        }}>
                            Finish the battle first.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.emeraldContainer}>
            {/* Sidebar: Icons Only */}
            <div className={styles.sideBar}>
                <div className={styles.tabs}>
                    <div 
                        className={`${styles.iconTab} ${activeTab === 'party' ? styles.active : ''}`}
                        onClick={() => setActiveTab('party')}
                        title="Pokémon"
                    >
                        <IconPokeball />
                    </div>
                    <div 
                        className={`${styles.iconTab} ${activeTab === 'bag' ? styles.active : ''}`}
                        onClick={() => setActiveTab('bag')}
                        title="Bag"
                    >
                        <IconBackpack />
                    </div>
                </div>
            </div>

            <div className={styles.scrollArea}>
                {activeTab === 'party' ? (
                    <VPartyBox />
                ) : (
                    <VBagBox/>
                )}
            </div>
        </div>
    );
};