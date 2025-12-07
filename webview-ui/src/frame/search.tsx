import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './search.module.css';
import type { PokemonDao } from '../dataAccessObj/pokemon';

interface SearchSceneProps {
    myPokemon?: PokemonDao;
}

// 0:地板, 1:樹, 2:草, 3:岩, 4:水, 5:花, 6:磚, 7:果樹, 8:球
const MAP_SIZE = 9;

// 精心設計的地圖配置
const INITIAL_MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 8, 0, 2, 2, 3, 3, 1], // 左上有球，右上有岩石
    [1, 0, 0, 0, 2, 2, 3, 3, 1],
    [1, 7, 0, 6, 6, 0, 0, 0, 1], // 左邊有樹果，中間有遺跡牆
    [1, 2, 2, 6, 4, 4, 0, 7, 1], // 下方有水池
    [1, 2, 2, 0, 4, 4, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 1],
    [1, 3, 0, 1, 0, 5, 0, 3, 1], // 有花朵點綴
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const OBSTACLES = [1, 3, 4, 6]; 
const EMOTES = ["♥", "♪", "!", "...", "?"];

export const SearchScene: React.FC<SearchSceneProps> = ({ myPokemon }) => {
    const [pos, setPos] = useState({ x: 4, y: 3 });
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const [isSearching, setIsSearching] = useState(false);
    const isSearchingRef = useRef(isSearching);
    const [emote, setEmote] = useState<string | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);

    useEffect(() => {
        isSearchingRef.current = isSearching;
    }, [isSearching]);

    const triggerEncounter = () => {
        setIsSearching(true);
        setIsFlashing(true);
        setTimeout(() => {
            setIsFlashing(false);
            setTimeout(() => {
                setTimeout(() => setIsSearching(false), 1500);
            }, 1000);
        }, 1000);
    };

    const handleMove = useCallback((dx: number, dy: number) => {
        if (isSearchingRef.current) return;
        setPos(prev => {
            const newX = prev.x + dx;
            const newY = prev.y + dy;

            if (newX < 0 || newX >= MAP_SIZE || newY < 0 || newY >= MAP_SIZE) return prev;
            if (OBSTACLES.includes(INITIAL_MAP[newY][newX])) return prev;

            if (dx > 0) setDirection('right');
            if (dx < 0) setDirection('left');

            const tileType = INITIAL_MAP[newY][newX];
            if ([2, 5, 7].includes(tileType)) { // 草、花、樹果樹
                if (Math.random() < 0.2) triggerEncounter();
            }

            return { x: newX, y: newY };
        });
    }, []);

    const handlePokeInteract = () => {
        if (emote || isSearching) return;
        setEmote(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
        setTimeout(() => setEmote(null), 1500);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch(e.key) {
                case "ArrowUp": handleMove(0, -1); break;
                case "ArrowDown": handleMove(0, 1); break;
                case "ArrowLeft": handleMove(-1, 0); break;
                case "ArrowRight": handleMove(1, 0); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleMove]);

    // 使用 PokeAPI 圖片
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${myPokemon?.id || 25}.png`;
    const berryUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.png";
    const ballUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";

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
        <div className={styles.emeraldContainer}>
            <div className={styles.gameScreen}>
                <div className={`${styles.flashOverlay} ${isFlashing ? styles.flashing : ''}`} />

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
                                            className={styles.playerSprite}
                                            onClick={handlePokeInteract}
                                            style={{ 
                                                transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {emote && (
                                                <div className={styles.emoteBubble} style={{ transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>{emote}</div>
                                            )}
                                            <img src={spriteUrl} alt="Player" className={styles.spriteImg} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>
        </div>
    );
};