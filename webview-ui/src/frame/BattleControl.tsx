import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { type PokeBallDao } from "../dataAccessObj/pokeBall";
import type { PokemonMove } from "../dataAccessObj/pokeMove";
import { type PokemonDao } from "../dataAccessObj/pokemon";
import styles from "./BattleControl.module.css";
import { DialogBox, type DialogBoxHandle } from "./DialogBox";

export interface BattleControlHandle extends DialogBoxHandle {
    openPartyMenu: () => void;
}

interface BattleControlProps {
    myPokemon?: PokemonDao;
    myParty: PokemonDao[];
    handleOnAttack: (move: PokemonMove) => void;
    handleThrowBall: (ball: PokeBallDao) => void;
    handleRunAway: () => void;
    handleSwitchMyPokemon: (pokemon: PokemonDao) => void;
}

export const BattleControl = forwardRef<BattleControlHandle, BattleControlProps>(({
    myPokemon,
    myParty,
    handleOnAttack,
    handleThrowBall,
    handleRunAway,
    handleSwitchMyPokemon,
}, ref) => {

    const [menuState, setMenuState] = useState<'main' | 'moves' | 'party'>('main');
    const dialogBoxRef = useRef<DialogBoxHandle>(null);


    useImperativeHandle(ref, () => ({
        setText: async (text: string) => {
            await dialogBoxRef.current?.setText(text);
        },
        openPartyMenu: () => {
            setMenuState('party');
        }
    }));

    const isExpanded = menuState !== 'main';

    const getHpColor = (current: number, max: number) => {
        const ratio = current / max;
        if (ratio <= 0.2) return '#e74c3c'; // Red (hp-low)
        if (ratio <= 0.5) return '#f1c40f'; // Yellow (hp-mid)
        return '#2ecc71'; // Green (hp-high)
    };

    const onAttackClick = (move: PokemonMove) => {
        setMenuState('main');
        handleOnAttack(move);
    };

    const onPokemonClick = (pokemon: PokemonDao) => {
        if (handleSwitchMyPokemon) {
            setMenuState('main');
            handleSwitchMyPokemon(pokemon);
        }
    };

    return (
        <div className={styles['console-area']}>
            {/* 左側面板 */}
            <div className={`${styles['dialog-box-wrapper']} ${isExpanded ? styles['wrapper-expanded'] : ''}`}>
                <div className={styles['dialog-layer']}>
                    <DialogBox ref={dialogBoxRef} />
                </div>

                {menuState === 'moves' && (
                    <div className={styles['move-select-overlay-container']}>
                        <div className={styles['move-select-overlay-content']}>
                        {myPokemon?.pokemonMoves.map((move) => (
                            <button 
                                key={"move-" + move.name} 
                                className={styles['move-btn']}
                                onClick={() => onAttackClick(move)}
                            >
                                <div className={styles['move-name']}>{move.name}</div>
                                <div className={styles['move-info-row']}>
                                    <span className={styles['move-pp']}>PP {move.pp}/{move.maxPP}</span>
                                </div>
                            </button>
                        ))}
                        </div>
                    </div>
                )}

                {menuState === 'party' && (
                    <div className={styles['move-select-overlay-container']}>
                        <div className={styles['party-select-overlay-content']}>
                        {myParty.map((p) => {
                            const current = p.currentHp ?? p.stats?.hp ?? 100;
                            const max = p.maxHp ?? p.stats?.hp ?? 100;
                            const hpPercent = max > 0 ? (current / max) * 100 : 0;
                            const isFainted = current <= 0;

                            return (
                                <button 
                                    key={p.uid} 
                                    className={`${styles['party-card-btn']} ${isFainted ? styles.fainted : ''}`}
                                    onClick={() => !isFainted && onPokemonClick(p)}
                                    disabled={isFainted}
                                >
                                    {/* 左側：寶可夢圖示 */}
                                    <div className={styles['party-sprite-wrapper']}>
                                        <img 
                                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${p.id}.png`}
                                            alt={p.name}
                                            className={styles['party-sprite']}
                                        />
                                    </div>
                                    
                                    {/* 右側：資訊欄 (名字 + 血條 + 數值) */}
                                    <div className={styles['party-info']}>
                                        <div className={styles['party-name']}>
                                            <div>{p.name}</div>   
                                            <div className={styles['hp-text']}>
                                                {current}/{max}
                                            </div>
                                        </div>
                                        
                                        <div className={styles['hp-bar-container']}>
                                            <div 
                                                className={styles['hp-bar-fill']}
                                                style={{ 
                                                    width: `${hpPercent}%`,
                                                    backgroundColor: getHpColor(current, max)
                                                }}
                                            />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        </div>
                    </div>
                )}
            </div>

            {/* 右側面板：雙層 DIV 架構更新 */}
            <div className={`
                    ${styles['battle-menu']} 
                    ${menuState !== 'main' ? styles['battle-menu-single'] : ''}
                `}>
                {menuState !== 'main' ? (
                    <button 
                        className={styles['cancel-btn-outer']}
                        onClick={() => setMenuState('main')}
                    >
                        <div className={styles['cancel-btn-inner']}>
                            CANCEL
                        </div>
                    </button>
                ) : (
                    <>
                        {/* FIGHT */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={() => setMenuState('moves')}
                        >
                            <div className={styles['menu-btn-inner']}>
                                FIGHT
                            </div>
                        </button>

                        {/* BAG */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={() => handleThrowBall({ id: 1, type: 'Pokeball', catchRateModifier: 1 })}
                        >
                            <div className={styles['menu-btn-inner']}>
                                BAG
                            </div>
                        </button>

                        {/* POKÉMON */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={() => setMenuState('party')}
                        >
                            <div className={styles['menu-btn-inner']}>
                                POKÉMON
                            </div>
                        </button>

                        {/* RUN */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={handleRunAway}
                        >
                            <div className={styles['menu-btn-inner']}>
                                RUN
                            </div>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});