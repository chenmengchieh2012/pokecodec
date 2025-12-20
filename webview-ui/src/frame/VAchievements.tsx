import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import achievementDataSource from '../../../src/data/achievement.json';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokeDexPayload } from '../../../src/dataAccessObj/MessagePayload';
import { AchievementAnalyzer, AchievementContext, achievementCriteria, AchievementStatistics } from '../../../src/utils/AchievementCritiria';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import styles from './VAchievements.module.css';
import { AchievementIcons, CategoryIcons } from './AchievementIcons';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    isUnlocked: boolean;
    progress?: string;
}

const achievementDataMap: Record<string, Achievement> = achievementDataSource.reduce((map, desc) => {
    map[desc.id] = {
        id: desc.id,
        title: desc.title,
        description: desc.description,
        icon: desc.icon,
        category: desc.category,
        isUnlocked: false,
        progress: undefined
    };
    return map;
}, {} as Record<string, Achievement>);

export const VAchievements = () => {
    const messageStore = useMessageStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedAchievement = useMemo(()=>{
        const achv = selectedId ? achievementDataMap[selectedId] : null;
        return achv
    }, [selectedId]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const achievementContextRef = useRef<AchievementContext>({
        statistics: messageStore.getRefs().achievements || AchievementAnalyzer.getDefaultStatistics(),
        pokedex: messageStore.getRefs().pokeDex?.entries || [],
    })

    const refresh = useCallback(()=>{
        if (!achievementContextRef.current) return;
        const context = achievementContextRef.current;
        if( !context.statistics ) return;
        if( !context.pokedex ) return;
        const updatedAchievements: Achievement[] = Object.values(achievementDataMap).map(achv => {
            const criteria = achievementCriteria[achv.id];
            if (!criteria) return achv;
            const result = criteria(context);
            return {
                ...achv,
                isUnlocked: result.isUnlocked,
                progress: result.progress
            };
        });
        setAchievements(updatedAchievements);
    },[])
    
    useEffect(()=>{
        refresh();
    },[refresh])
    

    useMessageSubscription<AchievementStatistics>(MessageType.AchievementsData, (message) => {
        if (!message.data) return;
        achievementContextRef.current.statistics = message.data;
        refresh();
    });

    useMessageSubscription<PokeDexPayload>(MessageType.PokeDexData, (message) => {
        if (!message.data) return;
        achievementContextRef.current.pokedex = message.data.entries;
        refresh();
    });


    const getIcon = (achievement: Achievement) => {
        if (AchievementIcons[achievement.id]) {
            return AchievementIcons[achievement.id];
        }
        if (CategoryIcons[achievement.category]) {
            return CategoryIcons[achievement.category];
        }
        return achievement.icon; // Fallback to emoji from JSON
    };

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
                        {/*{achievement.isUnlocked ? getIcon(achievement) : '🔒'}*/}
                        {getIcon(achievement)}
                    </div>
                ))}
            </div>

            {selectedAchievement && (
                <div className={styles.modalOverlay} onClick={() => setSelectedId(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalIcon}>
                            {selectedAchievement.isUnlocked ? getIcon(selectedAchievement) : '🔒'}
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
