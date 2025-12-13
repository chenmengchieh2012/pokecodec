import React, { useCallback, useImperativeHandle, useState } from "react";
import { type PokemonDao, PokemonState, PokemonStateAction } from "../dataAccessObj/pokemon";
import { VHPBlock } from "./HPBlock";
import styles from "./VBattleCanvas.module.css";

export interface VBattleProps {
    myPokemon?: PokemonDao;
    myPokemonState: PokemonState
    opponentPokemon?: PokemonDao;
    opponentPokemonState: PokemonState
}

export interface BattleCanvasHandle {
    handleMyPokemonFaint: ()=>void,
    handleAttackFromOpponent: ()=>Promise<void>,
    handleAttackToOpponent: ()=>Promise<void>,
    handleRunAway: ()=>Promise<void>,
    handleSwitchPokemon: ()=>Promise<void>
    handleStart: ()=>void
}
// 
export const VBattleCanvas = React.forwardRef<BattleCanvasHandle, VBattleProps>((props, ref)=>{
    const opponentPokemon = props.opponentPokemon
    const myPokemon = props.myPokemon
    const opponentPokemonState = props.opponentPokemonState
    const [playerAnim, setPlayerAnim] = useState('anim-enter-player');
    const [opponentAnim, setOpponentAnim] = useState('anim-enter-enemy');
    const [flash, setFlash] = useState(!props.opponentPokemon);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const triggerAnim = (setAnim: React.Dispatch<React.SetStateAction<string>>, animName: string, duration: number = 500) => {
        setAnim(animName);
        setTimeout(() => setAnim(''), duration);
    };

    useImperativeHandle(ref, () => ({
        handleMyPokemonFaint:()=>{
          // 我方昏厥動畫 (Flash)
          setPlayerAnim('anim-faint');
        },
        handleAttackFromOpponent: async ()=>{
          // 敵方攻擊動畫 (Shake)
          triggerAnim(setOpponentAnim, 'shake');
          await sleep(500);

          // 我方受傷動畫 (Flash)
          triggerAnim(setPlayerAnim, 'flash-sprite');
        },
        handleAttackToOpponent: async ()=>{
          // 我方攻擊動畫 (Shake)
          triggerAnim(setPlayerAnim, 'shake');
          await sleep(500);
          
          // 敵方受傷動畫 (Flash)
          triggerAnim(setOpponentAnim, 'flash-sprite');
        },
        handleRunAway: async ()=>{
          setPlayerAnim('anim-run'); // 觸發逃跑動畫
          await sleep(1000); // Wait for animation
        },
        handleSwitchPokemon: async ()=>{
          // 清除昏厥動畫狀態
          setPlayerAnim('');

          // 2. 觸發出場動畫
          triggerAnim(setPlayerAnim, 'anim-enter-player');
          await sleep(1000);
        },
        handleStart: ()=>{
          setFlash(false)
        }
      })
    )

    

    const spriteUrl = useCallback((id: string, isShiny?: boolean) =>
    id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${isShiny ? 'shiny/' : ''}${id}.gif`
    : '', []);

    const spriteBackUrl = useCallback((id: string, isShiny?: boolean) =>
    id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/${isShiny ? 'shiny/' : ''}${id}.gif`
    : '', []);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number, isBack: boolean = false) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null; // Prevent infinite loop
        target.src = isBack 
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
    };

    return <>
      <div className={`${styles['flash-effect']} ${flash ? styles['flash-active'] : ''}`}></div>

      <div className={styles['battle-scene']}>
          <>
            {/* 敵方 HUD */}
            <div className={styles['opponent-hud']}>
                <VHPBlock pokemonData={opponentPokemon} isPlayer={false} />
            </div>

            {/* 敵方區域容器 (包含草地與寶可夢) */}
            <div className={`${styles['opponent-container']} ${opponentAnim ? styles[opponentAnim] : ''}`}>
                <div className={styles['pokemon-wrapper']}>
                    <div className={styles['grass-base']}></div>
                    <img 
                      src={spriteUrl(opponentPokemon ? opponentPokemon.id.toString() : '', opponentPokemon?.isShiny)} 
                      alt="opponent pokemon" 
                      className={styles['pokemon-sprite']}
                      style={{ 
                        opacity: opponentPokemonState.action === PokemonStateAction.Caught ? 0 : 1, 
                        transition: 'opacity 0.5s' 
                      }}
                      onError={(e) => handleImageError(e, opponentPokemon ? opponentPokemon.id : 0)}
                    />
                </div>
            </div>

            {/* 我方區域容器 (包含草地與寶可夢) */}
            <div className={`${styles['player-container']} ${playerAnim ? styles[playerAnim] : ''}`}>
                <div className={styles['my-pokemon-wrapper']}>
                    <div className={styles['my-grass-base']}></div>
                    <img 
                      src={spriteBackUrl(myPokemon? myPokemon.id.toString() : '')} 
                      alt="my pokemon" 
                      className={styles['my-pokemon-sprite']}
                      onError={(e) => handleImageError(e, myPokemon ? myPokemon.id : 0, true)}
                    />
                </div>
            </div>
            
            {/* 我方 HUD */}
            <div className={styles['my-hud']}>
                <VHPBlock pokemonData={myPokemon} isPlayer={true} />
            </div>
          </>
      </div>

    </>

})
VBattleCanvas.displayName = "VBattleCanvas"