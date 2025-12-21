import { useState } from 'react';
import styles from './VUserInfo.module.css';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { resolveAssetUrl, vscode } from '../utilities/vscode';

const formatPlaytime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;

    const day = Math.floor(hours / 24);
    if (day > 0) {
        const remainingHours = hours % 24;
        return `${day}d ${remainingHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }else{
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
};

export const VUserInfo = () => {
    const messageStore = useMessageStore();
    const defaultUser = messageStore.getRefs().userInfo;
    const pokeDex = messageStore.getRefs().pokeDex;
    const [user, setUser] = useState<UserDao | undefined>(defaultUser);

    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        setUser(message.data);
    });

    if (!user) {
        return <div className={styles.loading}>Loading Trainer Card...</div>;
    }

    const handleSelectStarter = (starter: 'pikachu' | 'eevee') => {
        vscode.postMessage({
            command: MessageType.SelectStarter,
            starter: starter
        });
        // Optimistic update
        setUser({ ...user, starter: starter });
    };

    if (!user.starter) {
        return (
            <div className={styles.selectionContainer}>
                <div className={styles.selectionTitle}>
                    CHOOSE YOUR PARTNER<br/>POKEMON!
                </div>
                <div className={styles.startersRow}>
                    <div className={styles.starterCard} onClick={() => handleSelectStarter('pikachu')}>
                        <img 
                            src={resolveAssetUrl('./sprites/pokemon/normal/25.gif')} 
                            alt="Pikachu" 
                            className={styles.starterImg}
                        />
                        <div className={styles.starterName}>Pikachu</div>
                    </div>
                    <div className={styles.starterCard} onClick={() => handleSelectStarter('eevee')}>
                        <img 
                            src={resolveAssetUrl('./sprites/pokemon/normal/133.gif')} 
                            alt="Eevee" 
                            className={styles.starterImg}
                        />
                        <div className={styles.starterName}>Eevee</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.cardContainer}>
            <div className={styles.trainerCard}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.title}>TRAINER CARD</div>
                </div>

                {/* Main Content */}
                <div className={styles.content}>
                    <div className={styles.infoSection}>
                        <div className={styles.row}>
                            <span className={styles.label}>NAME</span>
                            <span className={styles.value}>{user.name || 'GOLD'}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>MONEY</span>
                            <span className={styles.value}>${user.money.toFixed(2)}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>POKEDEX</span>
                            <span className={styles.value}>{pokeDex ? Object.keys(pokeDex).length : 0}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>TIME</span>
                            <span className={styles.value}>{formatPlaytime(user.playtime || 0)}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>STARTER</span>
                            <span className={styles.value}>{user.starter === 'pikachu' ? 'Pikachu' : 'Eevee'}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>AUTO</span>
                            <span className={styles.value}>{user.autoEncounter ? 'On' : 'Off'}</span>
                        </div>
                    </div>

                    <div className={styles.spriteSection}>
                        <img 
                            src={resolveAssetUrl('./sprites/items/poke-ball.png')} 
                            alt="Trainer" 
                            className={styles.trainerSprite}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
