import { useState } from 'react';
import styles from './VUserInfo.module.css';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { resolveAssetUrl, vscode } from '../utilities/vscode';
import { IoSettingsSharp, IoArrowUndo, IoCaretBack, IoCaretForward } from 'react-icons/io5';
import { DifficultyModifiers, ModifierType } from '../../../src/dataAccessObj/DifficultyData';

import { DifficultyLevelPayload, SetDDAEnabledPayload } from '../../../src/dataAccessObj/MessagePayload';

const formatPlaytime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;

    const day = Math.floor(hours / 24);
    if (day > 0) {
        const remainingHours = hours % 24;
        return `${day}d ${remainingHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    } else {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
};

export const VCardLayout = () => {
    const [isFlipped, setIsFlipped] = useState(false);
    const messageStore = useMessageStore();
    const defaultUser = messageStore.getRefs().userInfo;
    const [user, setUser] = useState<UserDao | undefined>(defaultUser);

    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        setUser(message.data);
    });

    const handleStarterSelect = (starter: 'pikachu' | 'eevee') => {
        if (user) {
            setUser({ ...user, starter });
        }
    };

    if (!user) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (!user.starter) {
        return <VStarterSelection onSelect={handleStarterSelect} />;
    }

    return (
        <div className={styles.cardContainer}>
            <div className={styles.flipWrapper}>
                <div className={`${styles.flipInner} ${isFlipped ? styles.flipped : ''}`}>
                    <VUserInfo setIsFlipped={setIsFlipped} />

                    <VSetting isFlipped={isFlipped} setIsFlipped={setIsFlipped} />
                </div>
            </div>
        </div>
    );
}

const VStarterSelection = (props: { onSelect: (starter: 'pikachu' | 'eevee') => void }) => {
    const { onSelect } = props;

    const handleSelectStarter = (starter: 'pikachu' | 'eevee') => {
        vscode.postMessage({
            command: MessageType.SelectStarter,
            starter: starter
        });
        onSelect(starter);
    };

    return (
        <div className={styles.selectionContainer}>
            <div className={styles.selectionTitle}>
                CHOOSE YOUR PARTNER<br />POKEMON!
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
};

const VUserInfo = (props: { setIsFlipped: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const { setIsFlipped } = props;
    const messageStore = useMessageStore();
    const defaultUser = messageStore.getRefs().userInfo;
    const [user, setUser] = useState<UserDao | undefined>(defaultUser);

    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        setUser(message.data);
    });

    if (!user) {
        return <div className={styles.loading}>Loading Trainer Card...</div>;
    }

    return (
        <div className={styles.trainerCard}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.title}>TRAINER CARD</div>
            </div>

            {/* Main Content */}
            <div className={styles.trainerContent}>
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
            <button className={styles.flipButton}
                onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}>
                <IoSettingsSharp />
            </button>
        </div>

    );
};


const VSetting = (props: { isFlipped: boolean, setIsFlipped: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const { setIsFlipped } = props;
    const messageStore = useMessageStore();
    const defaultUser = messageStore.getRefs().userInfo;
    const defaultDifficultyModifier = messageStore.getRefs().difficultyModifiers;
    const defaultDifficultyLevel = messageStore.getRefs().difficultyLevel;
    const [difficultyModifier, setDifficultyModifier] = useState<DifficultyModifiers | undefined>(defaultDifficultyModifier);
    const [user, setUser] = useState<UserDao | undefined>(defaultUser);
    const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevelPayload | undefined>(defaultDifficultyLevel);

    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        setUser(message.data);
    });

    useMessageSubscription<DifficultyLevelPayload>(MessageType.DifficultyLevelData, (message) => {
        console.log("[BattleManager] Received setDifficultyLevel:", message.data);
        setDifficultyLevel(message.data);
    });

    useMessageSubscription<DifficultyModifiers>(MessageType.DifficultyModifiersData, (message) => {
        setDifficultyModifier(message.data);
    });

    const toggleAutoEncounter = (value: string) => {
        if (!user) return;
        const enabled = value === 'ON';
        vscode.postMessage({
            command: MessageType.SetAutoEncounter,
            enabled: enabled
        });
        // Optimistic update
        setUser({ ...user, autoEncounter: enabled });
    }

    const toggleDDA = (value: string) => {
        const enabled = value === 'ON';
        const payload: SetDDAEnabledPayload = {
            enabled: enabled
        };
        vscode.postMessage({
            command: MessageType.SetDDAEnabled,
            ...payload
        });
        // Optimistic update
        if (difficultyLevel) {
            setDifficultyLevel({ ...difficultyLevel, ddaEnabled: enabled });
        }
    }

    const changeDifficultyLevel = (delta: number) => {
        if (!difficultyLevel) return;
        const newLevel = difficultyLevel.level + delta;
        if (newLevel < 1 || newLevel > difficultyLevel.maxUnlocked) return;

        vscode.postMessage({
            command: MessageType.SetDifficultyLevel,
            level: newLevel
        });
        // Optimistic update
        setDifficultyLevel({ ...difficultyLevel, level: newLevel });
    }

    const getDDAStateEmoji = () => {
        if (difficultyLevel && !difficultyLevel.ddaEnabled) return <>?</>;
        if (!difficultyModifier) return <>...</>;
        if (difficultyModifier.modifierType === ModifierType.APPROACHING_ANXIETY) return '🔺';
        if (difficultyModifier.modifierType === ModifierType.APPROACHING_BOREDOM) return '🔻';
        if (difficultyModifier.modifierType === ModifierType.BOREDOM) return '😰';
        if (difficultyModifier.modifierType === ModifierType.ANXIETY) return '😴';
        if (difficultyModifier.modifierType === ModifierType.FLOW) return '😎';
        return <>:(</>;
    };

    return <>
        <div className={`${styles.trainerCard} ${styles.cardBack}`}>
            <div className={styles.header}>
                <div className={styles.title}>SETTINGS</div>
            </div>
            <div className={styles.settingContent}>
                <div className={styles.infoSection}>
                    <div className={styles.row}>
                        <span className={styles.label}>AUTO ENCOUNTER</span>
                        <select
                            className={styles.selectInput}
                            value={user?.autoEncounter ? 'ON' : 'OFF'}
                            onChange={(e) => toggleAutoEncounter(e.target.value)}
                            style={{
                                color: user?.autoEncounter ? '#00aa00' : '#aa0000',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="ON">ON</option>
                            <option value="OFF">OFF</option>
                        </select>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>DYNAMIC DIFFICULTY{getDDAStateEmoji()}</span>
                        <select
                            className={styles.selectInput}
                            value={difficultyLevel?.ddaEnabled ? 'ON' : 'OFF'}
                            onChange={(e) => toggleDDA(e.target.value)}
                            style={{
                                color: difficultyLevel?.ddaEnabled ? '#00aa00' : '#aa0000',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="ON">ON</option>
                            <option value="OFF">OFF</option>
                        </select>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>LEVEL</span>
                        <div className={styles.levelContainer}>
                            <button
                                className={styles.arrowButton}
                                onClick={(e) => { e.stopPropagation(); changeDifficultyLevel(-1); }}
                                disabled={!difficultyLevel || difficultyLevel.level <= 1}
                            >
                                <IoCaretBack />
                            </button>
                            <div className={styles.levelDisplay}>
                                {difficultyLevel?.config ? (
                                    <>
                                        <img
                                            src={resolveAssetUrl(`./sprites/items/${difficultyLevel.config.ball.replace('_', '-')}.png`)}
                                            alt={difficultyLevel.config.ball}
                                            style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }}
                                        />
                                        <span>
                                            {'★'.repeat(difficultyLevel.config.star)}
                                        </span>
                                    </>
                                ) : '---'}
                            </div>
                            <button
                                className={styles.arrowButton}
                                defaultValue={difficultyLevel?.level || 1}
                                onClick={(e) => { e.stopPropagation(); changeDifficultyLevel(1); }}
                                disabled={!difficultyLevel || difficultyLevel.level >= difficultyLevel.maxUnlocked}
                            >
                                <IoCaretForward />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <button className={styles.flipButton} onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}>
                <IoArrowUndo />
            </button>
        </div>

    </>
}