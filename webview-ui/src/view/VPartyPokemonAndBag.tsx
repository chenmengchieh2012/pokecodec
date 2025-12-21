import { useState, useRef } from 'react';
import { VBagBox } from '../frame/VBagBox';
import { VPartyBox } from '../frame/VPartyBox';
import styles from './VPartyPokemonAndBag.module.css';
import { useMessageSubscription } from '../store/messageStore';
import { MenuSideBar } from '../frame/SideBar';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { AccessDenied } from '../frame/AccessDenied';
import { GameStateData } from '../../../src/dataAccessObj/gameStateData';

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
    const loadingRef = useRef<NodeJS.Timeout | null>(null);
    const [activeTab, setActiveTab] = useState<string>('party');
    const [gameState, setGameState] = useState<GameStateData | undefined>(undefined);

    useMessageSubscription(MessageType.GameStateData, (message) => {
        const gameState = message.data as GameStateData;
        if (gameState === undefined) {
            return;
        }
        console.log("Received battle state:", gameState);
        setGameState(gameState);
        if (loadingRef.current) {
            clearInterval(loadingRef.current);
        }
    });

    if (gameState?.state === GameState.Battle) {
        return (
            <AccessDenied 
                className={styles.emeraldContainer}
                message={<>You cannot use the Bag or Party<br/>while in a battle!</>}
                subMessage="Finish the battle first."
            />
        );
    }

    return (
        <div className={styles.emeraldContainer}>
            {/* Sidebar: Icons Only */}
            <MenuSideBar barItems={[
                {
                    activeTab: 'party',
                    onActive: (tab: string) => setActiveTab(tab),
                    Icons: <IconPokeball />
                },
                {
                    activeTab: 'bag',
                    onActive: (tab: string) => setActiveTab(tab),
                    Icons: <IconBackpack />
                }
            ]}/>

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