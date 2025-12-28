import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './VSearchScene.module.css';
import { BIOME_BACKGROUNDS } from '../utilities/biomeAssets';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { resolveAssetUrl, vscode } from '../utilities/vscode';
import { BiomeType, BiomeData } from '../../../src/dataAccessObj/BiomeData';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { DifficultyLevelPayload, GoTriggerEncounterPayload, SetDifficultyLevelPayload } from '../../../src/dataAccessObj/MessagePayload';
import { MAX_DIFFICULTY_LEVEL } from '../../../src/dataAccessObj/DifficultyData';
interface SearchSceneProps {
    myPokemon?: PokemonDao;
    biomeType?: number; // 新增：接收外部傳入的生態系 index (0-4)
}

// 0:地板, 1:障礙物
const MAP_WIDTH = 32;
const MAP_HEIGHT = 18;
// 精心設計的 32*20 地圖配置
const INITIAL_MAP = [
[1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0],
[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1],
[0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1],
[0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1],
[1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
[0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
[0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
[1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
[1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
[0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
[0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1],
[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1],
[1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]
]

const OBSTACLES = [1];
const EMOTES = ["♥", "♪", "!", "...", "?"];

export const VSearchScene: React.FC<SearchSceneProps> = ({ myPokemon }) => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultBiome = messageStore.getRefs().biome
    const defaultDifficultyLevel = messageStore.getRefs().difficultyLevel;

    const [pos, setPos] = useState({ x: 10, y: 10 });
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const [emote, setEmote] = useState<string | null>(null);

    const [bgImage, setBgImage] = useState(defaultBiome ? BIOME_BACKGROUNDS[defaultBiome.biomeType] : BIOME_BACKGROUNDS[BiomeType.None]);
    const [nextBgImage, setNextBgImage] = useState<string | null>(null);
    
    // const prevBiomeRef = useRef<BiomeData | undefined>(undefined);
    const currentBiomeRef = useRef<BiomeData | undefined>(undefined);

    const [transitionStage, setTransitionStage] = useState<'idle' | 'fading-in' | 'fading-out'>('idle');
    const [enableAutoEncounter, setEnableAutoEncounter] = useState(true);
    const [isEncountering, setIsEncountering] = useState(false);
    const [difficultyLevelPayload, setDifficultyLevelPayload] = useState<DifficultyLevelPayload| undefined>(defaultDifficultyLevel);
    const mapItems = useMemo(() => {
        const canWalkTiles = INITIAL_MAP.flatMap((row, y) =>{
            return row.map((cellValue, x) => {
                if (cellValue === 0 && !(x === pos.x && y === pos.y)) {
                    return { x, y };
                }
                return null;
            })
        }).filter(item => item !== null) as { x: number; y: number }[];
        const timestamp = new Date().getTime();
        const seed = Math.floor(timestamp / (1000 * 60));
        const random = (x: number, y: number) => {
            const str = `${x},${y},${seed}`;
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return (hash % 100) / 100;
        };
        const randomPos = canWalkTiles.sort((a,b) => random(a.x, b.y)).slice(0, 5);
        return randomPos.map(pos => ({ ...pos, type: random(pos.x, pos.y) < 0.5 ? 0 : 1 }));
    },[pos.x, pos.y])

    

    useMessageSubscription<void>(MessageType.TriggerEncounter, () => {
        setIsEncountering(true);
        setTimeout(() => {
            setIsEncountering(false);
        }, 1500);
    });

    
    useMessageSubscription<DifficultyLevelPayload>(MessageType.DifficultyLevelData, (message) => {
        console.log("[VSearchScene] Received DifficultyLevelData:", message.data);
        setDifficultyLevelPayload(message.data);
    });


    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        const userData = message.data;
        if (!userData) return;
        if (userData.autoEncounter === false) {
            setEnableAutoEncounter(false);
        } else {
            setEnableAutoEncounter(true);
        }
    });

    useMessageSubscription(MessageType.BiomeData, (message) => {
        const newBiomeData = (message.data as BiomeData);
        const newBg = BIOME_BACKGROUNDS[newBiomeData.biomeType];

        // 如果是第一次收到或是背景圖真的有變
        if (newBg !== bgImage && newBg !== nextBgImage) {
             if (!bgImage) {
                 // 初始沒有背景，直接設定
                 setBgImage(newBg);
                 currentBiomeRef.current = newBiomeData;
             } else {
                 // 有舊背景，開始轉場 (Fade In New Image)
                 setNextBgImage(newBg);
                 setTransitionStage('fading-in');
                 currentBiomeRef.current = newBiomeData;
             }
        }
    });

    const onBackgroundAnimationEnd = () => {
        if (transitionStage === 'fading-in' && nextBgImage) {
            // Animation complete: New image becomes current
            setBgImage(nextBgImage);
            setNextBgImage(null);
            setTransitionStage('idle');
        }
    };

    const handleMove = useCallback((dx: number, dy: number) => {
        setPos(prev => {
            const newX = prev.x + dx;
            const newY = prev.y + dy;

            if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return prev;
            if (OBSTACLES.includes(INITIAL_MAP[newY][newX])) return prev;

            if (dx > 0) setDirection('right');
            if (dx < 0) setDirection('left');

            return { x: newX, y: newY };
        });
    }, []);

    const handlePokeInteract = () => {
        if (isEncountering) return;

        // 顯示表情
        setEmote(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
        setTimeout(() => setEmote(null), 1500);

        const randomChance = Math.random();
        if (randomChance < 0.3) { // 30% 機率觸發遭遇
            const payload: GoTriggerEncounterPayload = {
                triggerType: 'wild'
            };
            vscode.postMessage({
                command: MessageType.GoTriggerEncounter,
                ...payload
            });
        }
    };

    const handleBattleTrainer = ()=>{
        if (isEncountering) return;
        const payload: GoTriggerEncounterPayload = {
            triggerType: 'npc'
        };
        vscode.postMessage({
            command: MessageType.GoTriggerEncounter,
            ...payload
        })
    }

    // 自動走動邏輯
    useEffect(() => {
        console.log("[VSearchScene] Auto-walking enabled", enableAutoEncounter);
        if (!enableAutoEncounter) return; // 暫停時也不走動
        const moveInterval = setInterval(() => {
            // 隨機決定是否移動 (70% 機率移動，30% 停在原地)
            if (Math.random() > 0.3) {
                const directions = [
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 },  // Down
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 }   // Right
                ];
                const randomDir = directions[Math.floor(Math.random() * directions.length)];
                handleMove(randomDir.dx, randomDir.dy);
            }
        }, 1000); // 每 1 秒嘗試移動一次

        return () => clearInterval(moveInterval);
    }, [handleMove, enableAutoEncounter]);


    // 使用 PokeAPI 圖片
    const spriteUrl = resolveAssetUrl(`./sprites/pokemon/icon/${myPokemon?.id}.png`);
    const pokeBallUrl = resolveAssetUrl("./sprites/items/poke-ball.png");
    const greatBallUrl = resolveAssetUrl("./sprites/items/great-ball.png");
    const ultraBallUrl = resolveAssetUrl("./sprites/items/ultra-ball.png");
    const berryUrl = resolveAssetUrl("./sprites/items/oran-berry.png");




    const handleDifficultySelect = (level: number) => {
        const payload: SetDifficultyLevelPayload = { level: level };
        vscode.postMessage({
            command: MessageType.SetDifficultyLevel,
            ...payload
        });
    };

    const getDifficultyIcon = (level: number) => {
        const ballIndex = Math.ceil(level / 3) - 1;
        if (ballIndex === 0) return pokeBallUrl;
        if (ballIndex === 1) return greatBallUrl;
        return ultraBallUrl;
    };

    return (
        <div
            className={styles.emeraldContainer}
             /* 動態背景 */
        >
            {/* Global Blurred Background */}
            <div className={styles.globalBackgroundLayer}>
                 <div 
                    className={styles.globalBackgroundImage}
                    style={{ backgroundImage: bgImage ? `url("${bgImage}")` : 'none' }}
                 />
                 {transitionStage === 'fading-in' && nextBgImage && (
                    <div 
                        className={`${styles.globalBackgroundImage} ${styles.fadeIn}`}
                        style={{ backgroundImage: `url("${nextBgImage}")` }}
                    />
                 )}
            </div>


            <div className={styles.gameScreen}>
                <div className={`${styles.flashOverlay}`} />

                <div className={styles.mapGrid}>
                    {/* Layer 1: Current Background (Bottom) */}
                    <div 
                        className={styles.mapBackground}
                        style={{ backgroundImage: bgImage ? `url("${bgImage}")` : 'none' }}
                    />
                    
                    {/* Layer 2: Next Background (Top, Fading In) */}
                    {transitionStage === 'fading-in' && nextBgImage && (
                        <div 
                            className={`${styles.mapBackground} ${styles.fadeIn}`}
                            onAnimationEnd={onBackgroundAnimationEnd}
                            style={{ backgroundImage: `url("${nextBgImage}")` }}
                        />
                    )}

                    {INITIAL_MAP.map((row, y) => (
                        row.map((cellValue, x) => {
                            const isPlayerHere = (x === pos.x && y === pos.y);
                            const itemHere = mapItems.find(item => item.x === x && item.y === y);
                            return (
                                <div key={`${x}-${y}`} 
                                    className={styles.tile} 
                                    >
                                    {itemHere && !isPlayerHere && (
                                        <img src={itemHere.type === 0 ? pokeBallUrl : berryUrl} className={styles.mapItem} alt="item" />
                                    )}
                                    {isPlayerHere && (
                                        <div
                                            className={`${styles.playerSprite} ${isEncountering ? styles.playerJump : ''}`}
                                            onClick={handlePokeInteract}
                                            style={{
                                                transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isEncountering && (
                                                <div className={styles.encounterExclamation}>!</div>
                                            )}
                                            {emote && !isEncountering && (
                                                <div className={styles.emoteBubble} style={{ transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>{emote}</div>
                                            )}
                                            {myPokemon?.id 
                                                && myPokemon?.ailment !== 'fainted' 
                                                && <img src={spriteUrl} alt="Player" className={styles.spriteImg} />}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>
            <div className={styles["controls-top-right"]}>
                <div className={styles['row']}>
                    <div className={styles.difficultyControl}>
                        <button
                            className={styles.arrowButton}
                            onClick={() => {
                                const newLevel = (difficultyLevelPayload?.level || 1) - 1;
                                if (newLevel >= 1) handleDifficultySelect(newLevel);
                            }}
                            disabled={(difficultyLevelPayload?.level || 1) <= 1}
                        >
                            ◀
                        </button>
                        <div className={styles.difficultyDisplay}>
                            <img src={getDifficultyIcon(difficultyLevelPayload?.level || 1)} className={styles.ballIcon} alt="ball" />
                            <span className={styles.stars}>{'★'.repeat((((difficultyLevelPayload?.level || 1) - 1) % 3) + 1)}</span>
                        </div>
                        <button
                            className={styles.arrowButton}
                            onClick={() => {
                                const newLevel = (difficultyLevelPayload?.level || 1) + 1;
                                if (newLevel <= 9 && newLevel <= (difficultyLevelPayload?.maxUnlocked || 1)) handleDifficultySelect(newLevel);
                            }}
                            disabled={(difficultyLevelPayload?.level || 1) >= 9 || (difficultyLevelPayload?.level || 1) >= (difficultyLevelPayload?.maxUnlocked || 1)}
                        >
                            ▶
                        </button>
                    </div>
                    <button
                        className={`${styles.pauseButton} ${!enableAutoEncounter ? styles.paused : ''}`}
                        onClick={() => {
                            vscode.postMessage({
                                command: MessageType.SetAutoEncounter,
                                enabled: !enableAutoEncounter
                            });
                        }}
                        title={enableAutoEncounter ? "Pause Encounter" : "Resume Encounter"}
                    >
                        {enableAutoEncounter ? "▶" : "⏸"}
                    </button>
                </div>
                {difficultyLevelPayload && difficultyLevelPayload?.maxUnlocked < MAX_DIFFICULTY_LEVEL && <>
                <div className={styles['row']}>
                    <button
                        className={styles.npcButton}
                        onClick={handleBattleTrainer}
                        title="Battle NPC"
                    >
                    UPGRADE
                    </button>
                </div>
                </>
                }
            </div>
        </div>
    );
};