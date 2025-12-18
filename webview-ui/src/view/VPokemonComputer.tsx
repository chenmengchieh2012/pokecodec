import { useState, useRef } from 'react';
import styles from './VPokemonComputer.module.css';
import { useMessageSubscription } from '../store/messageStore';
import { MenuSideBar } from '../frame/SideBar';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { VPokemonBox } from '../frame/VPokemonBox';
import { VPokeDex } from '../frame/VPokeDex';
import { VUserInfo } from '../frame/VUserInfo';
import { VAchievements } from '../frame/VAchievements';

const IconPCBox = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg} fill="currentColor">
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
    </svg>
);

const IconPokedex = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg} fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
        <circle cx="12" cy="12" r="3" opacity="0.5"/>
        <path d="M12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
        <rect x="8" y="16" width="8" height="2" rx="1" opacity="0.5"/>
    </svg>
);

const IconTrainer = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg} fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);

const IconAchievement = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg} fill="currentColor">
        <path d="M20.2 2H3.8c-1.1 0-2 .9-2 2v3.5C1.8 13 6.3 17 12 17s10.2-4 10.2-9.5V4c0-1.1-.9-2-2-2zM6 9.5V4h2v5.5c0 2.2 1.8 4 4 4s4-1.8 4-4V4h2v5.5c0 4.1-3.4 7.5-7.5 7.5S6.5 13.6 6.5 9.5H6zM12 18c-2.2 0-4 1.8-4 4h8c0-2.2-1.8-4-4-4z"/>
    </svg>
);

export const VPokemonComputer = () => {
    const loadingRef = useRef<NodeJS.Timeout | null>(null);
    const [activeTab, setActiveTab] = useState<string>('pokemonBox');
    const [gameState, setGameState] = useState<GameState | undefined>(undefined);

    useMessageSubscription(MessageType.GameState, (message) => {
        const gameState = message.data as GameState;
        if (gameState === undefined) {
            return;
        }
        console.log("Received battle state:", gameState);
        setGameState(gameState);
        if (loadingRef.current) {
            clearInterval(loadingRef.current);
        }
    });

    if (gameState === GameState.Battle) {
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
            <MenuSideBar barItems={[
                {
                    activeTab: 'pokemonBox',
                    onActive: (tab: string) => setActiveTab(tab),
                    Icons: <IconPCBox />
                },
                {
                    activeTab: 'pokedex',
                    onActive: (tab: string) => setActiveTab(tab),
                    Icons: <IconPokedex />
                },
                {
                    activeTab: 'userInfo',
                    onActive: (tab: string) => setActiveTab(tab),
                    Icons: <IconTrainer />
                },
                {
                    activeTab: 'achievements',
                    onActive: (tab: string) => setActiveTab(tab),
                    Icons: <IconAchievement />
                }
            ]}/>

            <div className={styles.scrollArea}>
                {activeTab === 'pokemonBox' && (
                    <VPokemonBox />
                )}
                {activeTab === 'pokedex' && (
                    <VPokeDex />
                )}
                {activeTab === 'userInfo' && (
                    <VUserInfo />
                )}
                {activeTab === 'achievements' && (
                    <VAchievements />
                )}
            </div>
        </div>
    );
};