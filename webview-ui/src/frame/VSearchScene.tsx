import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './VSearchScene.module.css';
import { BIOME_BACKGROUNDS } from '../utilities/biomeAssets';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { resolveAssetUrl, vscode } from '../utilities/vscode';
import { BiomeType, BiomeData } from '../../../src/dataAccessObj/BiomeData';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { UserDao } from '../../../src/dataAccessObj/userData';

interface SearchSceneProps {
    myPokemon?: PokemonDao;
    biomeType?: number; // 新增：接收外部傳入的生態系 index (0-4)
}

// 0:地板, 1:樹, 2:草, 3:岩, 4:水, 5:花, 6:磚, 7:果樹, 8:球
const MAP_WIDTH = 15;
const MAP_HEIGHT = 6;
// 精心設計的 15x6 地圖配置
const INITIAL_MAP = [
    // 第 1 列：上方邊界
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    
    // 第 2 列：左上有球，中間有樹果與遺跡牆
    [1, 0, 8, 0, 2, 2, 0, 6, 6, 0, 7, 0, 0, 0, 1], 
    
    // 第 3 列：中間有較寬的水池區域
    [1, 0, 0, 0, 2, 5, 0, 4, 4, 4, 0, 0, 3, 3, 1], 
    
    // 第 4 列：下方有花朵點綴與岩石區
    [1, 3, 0, 0, 0, 0, 0, 4, 4, 4, 0, 5, 3, 3, 1], 
    
    // 第 5 列：右下角稍微空曠，適合走路
    [1, 3, 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
    
    // 第 6 列：下方邊界
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const OBSTACLES = [1, 3, 4, 6]; 
const EMOTES = ["♥", "♪", "!", "...", "?"];

export const VSearchScene: React.FC<SearchSceneProps> = ({ myPokemon}) => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultBiome = messageStore.getRefs().biome
    
    const [pos, setPos] = useState({ x: 5, y: 3 });
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const [emote, setEmote] = useState<string | null>(null);

    const [bgImage, setBgImage] = useState(defaultBiome ? BIOME_BACKGROUNDS[defaultBiome.biomeType] : BIOME_BACKGROUNDS[BiomeType.None]);
    const prevBiomeRef = useRef<BiomeData | undefined>(undefined);
    const currentBiomeRef = useRef<BiomeData | undefined>(undefined);

    const [transitionStage, setTransitionStage] = useState<'idle' | 'fading-in' | 'fading-out'>('idle');
    const [enableAutoEncounter, setEnableAutoEncounter] = useState(true);
    const [isEncountering, setIsEncountering] = useState(false);

  
    useMessageSubscription<void>(MessageType.TriggerEncounter, () => {
        setIsEncountering(true);
        setTimeout(() => {
            setIsEncountering(false);
        }, 1500);
    });


    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        const userData = message.data;
        if(!userData) return;
        if (userData.autoEncounter === false) {
            setEnableAutoEncounter(false);
        } else {
            setEnableAutoEncounter(true);
        }
    });

    useMessageSubscription(MessageType.BiomeData, (message) => {
        const newBiomeData = (message.data as BiomeData);
        if (newBiomeData.biomeType !== prevBiomeRef.current?.biomeType) {
            // 修正：使用 setTimeout(..., 0) 來避免同步 setState 警告
            setTransitionStage('fading-in');
            prevBiomeRef.current = currentBiomeRef.current;
            currentBiomeRef.current = newBiomeData;
            
        } else {
            // 初始化設定 (第一次 render)
            // 這裡也用 setTimeout 避免警告，雖然初始化通常只跑一次
            setBgImage(BIOME_BACKGROUNDS[newBiomeData.biomeType]);
        }
    });

    const onTransitionOverlayAnimationEnd = () => {
        const currentBiome = currentBiomeRef.current;
        if( currentBiome === undefined ) return;
        if (transitionStage === 'fading-in') {
            // 1. 變黑結束，換圖片
            setBgImage(BIOME_BACKGROUNDS[currentBiome.biomeType]);
            prevBiomeRef.current = currentBiomeRef.current;
            
            // 2. 開始變亮
            setTransitionStage('fading-out');
        } else if (transitionStage === 'fading-out') {
            // 3. 變亮結束，回歸閒置
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
        if (isEncountering ) return;

        // 顯示表情
        setEmote(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
        setTimeout(() => setEmote(null), 1500);

        const randomChance = Math.random();
        if ( randomChance < 0.3) { // 30% 機率觸發遭遇
            vscode.postMessage({ command: MessageType.GoTriggerEncounter });
        }
    };

    // 自動走動邏輯
    useEffect(() => {
        console.log("[VSearchScene] Auto-walking enabled",enableAutoEncounter);
        if ( !enableAutoEncounter ) return; // 暫停時也不走動
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
    const berryUrl = resolveAssetUrl("./sprites/items/oran-berry.png");
    const ballUrl = resolveAssetUrl("./sprites/items/poke-ball.png");

    const getTileClass = (type: number) => {
        switch(type) {
            case 0: return styles.tileGround;
            case 1: return styles.tileTree;
            case 2: return styles.tileGrass;
            case 3: return styles.tileRock;
            case 4: return styles.tileWater;
            case 5: return styles.tileFlower;
            case 6: return styles.tileBrick;
            default: return styles.tileGround;
        }
    };

    return (
        <div 
            className={styles.emeraldContainer}
            style={{ backgroundImage: bgImage }} /* 動態背景 */
        >
            {/* 全螢幕轉場遮罩 */}
            <div 
                className={`
                    ${styles.biomeTransitionOverlay} 
                    ${transitionStage === 'fading-in' ? styles.fadeIn : ''}
                    ${transitionStage === 'fading-out' ? styles.fadeOut : ''}
                `} 
                onAnimationEnd={onTransitionOverlayAnimationEnd}
            />
            <div className={styles.gameScreen}>
                <div className={`${styles.flashOverlay}`} />

                <div className={styles.mapGrid}>
                    {INITIAL_MAP.map((row, y) => (
                        row.map((cellType, x) => {
                            const isPlayerHere = (x === pos.x && y === pos.y);
                            return (
                                <div key={`${x}-${y}`} className={`${styles.tile} ${getTileClass(cellType)}`}>
                                    
                                    {/* 樹果與精靈球 */}
                                    {cellType === 7 && <img src={berryUrl} className={styles.objSprite} alt="berry" />}
                                    {cellType === 8 && <img src={ballUrl} className={styles.objSprite} alt="ball" />}

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
                                            { myPokemon?.id && <img src={spriteUrl} alt="Player" className={styles.spriteImg} /> }  
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>
            <div className={styles.controls}>
                <button 
                    className={`${styles.pauseButton} ${enableAutoEncounter ? styles.paused : ''}`} 
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
        </div>
    );
};