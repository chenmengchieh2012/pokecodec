import { useState } from 'react';
import { BagItem, VBagBox } from '../frame/VBagBox';
import { VPartyBox } from '../frame/VPartyBox';
import styles from './VPartyPokemonAndBag.module.css';

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

// 模擬資料 (因為目前沒有後端傳入道具)
const mockBagItems: BagItem[] = [
    { id: 1, name: 'Potion', apiName: 'potion', count: 5, category: 'items' },
    { id: 2, name: 'Super Potion', apiName: 'super-potion', count: 2, category: 'items' },
    { id: 3, name: 'Revive', apiName: 'revive', count: 1, category: 'items' },
    { id: 4, name: 'Antidote', apiName: 'antidote', count: 3, category: 'items' },
    { id: 5, name: 'Poke Ball', apiName: 'poke-ball', count: 15, category: 'balls' },
    { id: 6, name: 'Great Ball', apiName: 'great-ball', count: 5, category: 'balls' },
    { id: 7, name: 'Ultra Ball', apiName: 'ultra-ball', count: 1, category: 'balls' },
    { id: 8, name: 'Exp. Share', apiName: 'exp-share', count: 1, category: 'key' },
    { id: 9, name: 'Old Rod', apiName: 'old-rod', count: 1, category: 'key' },
    { id: 10, name: 'Bicycle', apiName: 'bicycle', count: 1, category: 'key' },
];

export const VPartyPokemonAndBag = () => {
    const [activeTab, setActiveTab] = useState<'party' | 'bag'>('party');




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
                    <VBagBox items={mockBagItems} />
                )}
            </div>
        </div>
    );
};