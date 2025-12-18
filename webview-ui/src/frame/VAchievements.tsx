import { useState } from 'react';
import styles from './VAchievements.module.css';
import { useMessageStore } from '../store/messageStore';
import { PokeDexEntryStatus } from '../../../src/dataAccessObj/PokeDex';
import achievementData from '../../../src/data/achievement.json';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    isUnlocked: boolean;
    progress?: string;
}

export const VAchievements = () => {
    const messageStore = useMessageStore();
    const user = messageStore.getRefs().userInfo;
    const pokedex = messageStore.getRefs().pokeDex;
    const party = messageStore.getRefs().party;
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const achievements: Achievement[] = achievementData.map((data) => {
        let isUnlocked = false;
        let progress = 'Locked';

        // Basic logic mapping for demonstrable achievements
        const caughtCount = pokedex?.entries.filter(e => e.status === PokeDexEntryStatus.Caught).length ?? 0;
        const money = user?.money ?? 0;
        const partySize = party?.length ?? 0;

        switch (data.id) {
            case '1': // Hello World
                isUnlocked = true;
                progress = 'Completed';
                break;
            case '9': // Full Party
                isUnlocked = partySize >= 6;
                progress = `${partySize}/6`;
                break;
            case '21': // Pokedex Rookie
                isUnlocked = caughtCount >= 10;
                progress = `${caughtCount}/10`;
                break;
            case '22': // Pokedex Explorer
                isUnlocked = caughtCount >= 30;
                progress = `${caughtCount}/30`;
                break;
            case '23': // Pokedex Pro
                isUnlocked = caughtCount >= 50;
                progress = `${caughtCount}/50`;
                break;
            case '24': // Pokedex Master
                isUnlocked = caughtCount >= 100;
                progress = `${caughtCount}/100`;
                break;
            case '58': // Penny Pincher
                isUnlocked = money >= 5000;
                progress = `$${money}/$5000`;
                break;
            case '59': // Big Spender
                isUnlocked = money >= 10000; // Note: This tracks current money, not spent
                progress = `$${money}/$10000`;
                break;
            case '60': // Millionaire
                isUnlocked = money >= 1000000;
                progress = `$${money}/$1000000`;
                break;
            default:
                // Default state
                break;
        }

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            icon: data.icon,
            isUnlocked,
            progress
        };
    });

    const selectedAchievement = achievements.find(a => a.id === selectedId);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>ACHIEVEMENTS</div>
                <div className={styles.subtitle}>
                    {achievements.filter(a => a.isUnlocked).length}/{achievements.length}
                </div>
            </div>
            
            <div className={styles.grid}>
                {achievements.map(achievement => (
                    <div 
                        key={achievement.id} 
                        className={`${styles.achievementItem} ${achievement.isUnlocked ? styles.unlocked : styles.locked}`}
                        onClick={() => setSelectedId(achievement.id)}
                    >
                        {achievement.isUnlocked ? achievement.icon : '🔒'}
                    </div>
                ))}
            </div>

            {selectedAchievement && (
                <div className={styles.modalOverlay} onClick={() => setSelectedId(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalIcon}>
                            {selectedAchievement.isUnlocked ? selectedAchievement.icon : '🔒'}
                        </div>
                        <div className={styles.modalTitle}>{selectedAchievement.title}</div>
                        <div className={styles.modalDesc}>{selectedAchievement.description}</div>
                        <div className={styles.modalProgress}>
                            Progress: {selectedAchievement.progress}
                        </div>
                        <button className={styles.closeButton} onClick={() => setSelectedId(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
