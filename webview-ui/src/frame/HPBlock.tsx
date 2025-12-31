import React, { useImperativeHandle, useState } from "react";
import { type PokemonDao } from "../../../src/dataAccessObj/pokemon";
import styles from "./HPBlock.module.css";


export const VHPBlockAnimation = {
    Catch: 'anim-catch'
} as const

export type VHPBlockAnimation = typeof VHPBlockAnimation[keyof typeof VHPBlockAnimation];

export interface VHPBlockProps {
    showParty?: boolean;
    pokemonData?: PokemonDao;
    isPlayer?: boolean; // Add flag to distinguish player vs opponent
    party?: PokemonDao[]; // 隊伍中的寶可夢列表
}


export interface VHPBlockHandle {
    triggerCatchAnimation: (animation: VHPBlockAnimation) => void;
}


export const VHPBlock = React.forwardRef<VHPBlockHandle, VHPBlockProps>(({ pokemonData, isPlayer, party = [], showParty }, ref) => {
    const [animClass, setAnimClass] = useState<string>('');

    useImperativeHandle(ref, () => ({
        triggerCatchAnimation: (animation: VHPBlockAnimation) => {
            setAnimClass(animation);
            setTimeout(() => {
                setAnimClass('');
            }, 2000); // 動畫持續時間
        }
    }), []);

    if (pokemonData == undefined) {
        return <></>
    }

    const hpPercentage = (pokemonData.currentHp / pokemonData.maxHp) * 100;
    const expPercentage = (pokemonData.currentExp / pokemonData.toNextLevelExp) * 100;

    const truncateName = (name: string) => {
        return name.length > 10 ? name.substring(0, 10) + '...' : name;
    };

    // 計算血條顏色
    const getHpColor = (percentage: number) => {
        if (percentage <= 20) return 'var(--hp-red)';
        if (percentage <= 50) return 'var(--hp-yellow)';
        return 'var(--hp-green)';
    };

    const genderSymbol = pokemonData.gender === 'Male' ? '♂' : (pokemonData.gender === 'Female' ? '♀' : '');
    const genderColor = pokemonData.gender === 'Male' ? '#6890F0' : (pokemonData.gender === 'Female' ? '#F08030' : '#000');

    // 異常狀態顯示
    const getAilmentBadge = () => {
        if (!pokemonData.ailment || pokemonData.ailment === 'healthy') return null;

        const ailmentMap: Record<string, { text: string, color: string }> = {
            'burn': { text: 'BRN', color: '#F08030' },
            'freeze': { text: 'FRZ', color: '#98D8D8' },
            'paralysis': { text: 'PAR', color: '#F8D030' },
            'poison': { text: 'PSN', color: '#A040A0' },
            'sleep': { text: 'SLP', color: '#8C888C' },
            'fainted': { text: 'FNT', color: '#C03028' }
        };

        const ailment = ailmentMap[pokemonData.ailment];
        if (!ailment) return null;

        return (
            <span className={styles['ailment-badge']} style={{ backgroundColor: ailment.color }}>
                {ailment.text}
            </span>
        );
    };

    // 隊伍精靈球圖示渲染
    const renderPartyBalls = () => {
        if (!party || party.length === 0) return null;

        // 最多顯示 6 顆球
        const slots = Array(6).fill(null);
        party.slice(0, 6).forEach((pkmn, idx) => {
            slots[idx] = pkmn;
        });

        return (
            <div className={styles['party-balls']}>
                {slots.map((pkmn, idx) => {
                    let ballClass = styles['ball-empty']; // 空位
                    if (pkmn) {
                        if (pkmn.currentHp <= 0 || pkmn.ailment === 'fainted') {
                            ballClass = styles['ball-fainted']; // 昏厥
                        } else {
                            // 根據捕捉球種決定樣式
                            const ballName = (pkmn.caughtBall || '').toLowerCase().replace(' ', '-');
                            if (ballName.includes('great') || ballName.includes('super')) {
                                ballClass = styles['ball-great'];
                            } else if (ballName.includes('ultra') || ballName.includes('hyper')) {
                                ballClass = styles['ball-ultra'];
                            } else if (ballName.includes('master')) {
                                ballClass = styles['ball-master'];
                            } else {
                                ballClass = styles['ball-poke']; // Default
                            }
                        }
                    }
                    return (
                        <span
                            key={idx}
                            className={`${styles['party-ball']} ${ballClass}`}
                            title={pkmn ? `${pkmn.nickname ? truncateName(pkmn.nickname) : pkmn.name} Lv.${pkmn.level}` : 'Empty'}
                        />
                    );
                })}
            </div>
        );
    };

    return <>
        {showParty && renderPartyBalls()}

        <div className={`${styles.hud} ${animClass === 'anim-catch' ? styles['anim-catch'] : ''}`}>
            {/* 隊伍精靈球圖示 */}
            <div className={styles['pokemon-info']}>
                <span className={styles['pokemon-name']}>{pokemonData.nickname ? truncateName(pokemonData.nickname) : pokemonData.name}</span>
                {getAilmentBadge()}
                <span className={styles['pokemon-gender']} style={{ color: genderColor }}>{genderSymbol}</span>
                <span className={styles['pokemon-lv']}>Lv{pokemonData.level}</span>
            </div>

            <div className={styles['hp-container']}>
                <div className={styles['hp-bar-bg']}>
                    <div
                        className={styles['hp-bar-fill']}
                        style={{
                            width: `${hpPercentage}%`,
                            backgroundColor: getHpColor(hpPercentage)
                        }}
                    ></div>
                </div>
            </div>

            {isPlayer && (
                <>
                    <div className={styles['hp-text']}>
                        {pokemonData.currentHp} / {pokemonData.maxHp}
                    </div>
                    <div className={styles['exp-container']}>
                        <div
                            className={styles['exp-fill']}
                            style={{ width: `${expPercentage}%` }}
                        ></div>
                    </div>
                </>
            )}
        </div>
    </>
})
VHPBlock.displayName = 'VHPBlock';