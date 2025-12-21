import { useState } from 'react';
import styles from './VUserInfo.module.css';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { resolveAssetUrl, vscode } from '../utilities/vscode';

export const VUserInfo = () => {
    const messageStore = useMessageStore();
    const defaultUser = messageStore.getRefs().userInfo;
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
                            <span className={styles.value}>${user.money}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>POKEDEX</span>
                            <span className={styles.value}>0</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>TIME</span>
                            <span className={styles.value}>00:00</span>
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
