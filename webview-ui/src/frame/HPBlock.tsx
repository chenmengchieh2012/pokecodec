import { useImperativeHandle, useState } from "react";
import type { PokemonDao } from "../../../src/dataAccessObj/pokemon"
import React from "react";
import styles from "./HPBlock.module.css";


export const VHPBlockAnimation = {
    Catch: 'anim-catch'
} as const

export type VHPBlockAnimation = typeof VHPBlockAnimation[keyof typeof VHPBlockAnimation];

export interface VHPBlockProps {
    pokemonData?: PokemonDao;
    isPlayer?: boolean; // Add flag to distinguish player vs opponent
}


export interface VHPBlockHandle {
    triggerCatchAnimation: (animation : VHPBlockAnimation) => void;
}


export const VHPBlock = React.forwardRef<VHPBlockHandle, VHPBlockProps>( ({ pokemonData, isPlayer }, ref)=>{
    const [animClass, setAnimClass] =  useState<string>('');
    
    useImperativeHandle(ref, () => ({
        triggerCatchAnimation: (animation: VHPBlockAnimation) => {
            setAnimClass(animation);
            setTimeout(() => {
                setAnimClass('');
            }, 2000); // 動畫持續時間
        }
    }), []);

    if(pokemonData == undefined){
        return <></>
    }
    
    const hpPercentage = (pokemonData.currentHp / pokemonData.maxHp) * 100;
    const expPercentage = (pokemonData.currentExp / pokemonData.toNextLevelExp) * 100;

    // 計算血條顏色
    const getHpColor = (percentage: number) => {
        if (percentage <= 20) return 'var(--hp-red)';
        if (percentage <= 50) return 'var(--hp-yellow)';
        return 'var(--hp-green)';
    };
    
    const genderSymbol = pokemonData.gender === 'Male' ? '♂' : (pokemonData.gender === 'Female' ? '♀' : '');
    const genderColor = pokemonData.gender === 'Male' ? '#6890F0' : (pokemonData.gender === 'Female' ? '#F08030' : '#000');
   
    return <>
        <div className={`${styles.hud} ${animClass === 'anim-catch' ? styles['anim-catch'] : ''}`}>
            <div className={styles['pokemon-info']}>
                <span className={styles['pokemon-name']}>{pokemonData.name.toUpperCase()}</span>
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