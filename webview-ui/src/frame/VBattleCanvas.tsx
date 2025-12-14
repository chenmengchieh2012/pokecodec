import React, { useCallback, useEffect, useImperativeHandle, useState } from "react";
import { VHPBlock } from "./HPBlock";
import styles from "./VBattleCanvas.module.css";
import { BiomeType } from "../../../src/dataAccessObj/BiomeData";
import { PokemonDao, PokemonState, PokemonStateAction } from "../../../src/dataAccessObj/pokemon";

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
    handleStart: (biomeType: BiomeType)=>void
}
// 
export const VBattleCanvas = React.forwardRef<BattleCanvasHandle, VBattleProps>((props, ref)=>{
    const opponentPokemon = props.opponentPokemon
    const myPokemon = props.myPokemon
    const opponentPokemonState = props.opponentPokemonState
    const [playerAnim, setPlayerAnim] = useState('anim-enter-player');
    const [opponentAnim, setOpponentAnim] = useState('anim-enter-enemy');
    const [flash, setFlash] = useState(!props.opponentPokemon);
    const [shinyAnim, setShinyAnim] = useState('anim-enter-shiny');
    const [fixBiomeType, setFixBiomeType] = useState<BiomeType>(BiomeType.None);
    const [sceneOpacity, setSceneOpacity] = useState(0);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const triggerAnim = (setAnim: React.Dispatch<React.SetStateAction<string>>, animName: string, duration: number = 500) => {
        setAnim(animName);
        setTimeout(() => setAnim(''), duration);
    };

    useEffect(() => {
        if (opponentPokemon?.isShiny) {
            // Wait for enter animation to finish a bit then play shiny anim
            setTimeout(() => {
                triggerAnim(setShinyAnim, 'anim-shiny', 1500);
            }, 800);
        }
    }, [opponentPokemon]);

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
        handleStart: (_fixBiomeType: BiomeType)=>{
          setFixBiomeType(_fixBiomeType);
          setFlash(false);
          setTimeout(() => setSceneOpacity(1), 50);
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

    const getBiomeClass = (type: BiomeType) => {
        switch (type) {
            case BiomeType.Grassland: return styles['grassland'];
            case BiomeType.WaterBeach: return styles['water-beach'];
            case BiomeType.UrbanPowerPlant: return styles['urban-power-plant'];
            case BiomeType.MountainCave: return styles['mountain-cave'];
            case BiomeType.GhostMystic: return styles['ghost-mystic'];
            case BiomeType.ToxicWaste: return styles['toxic-waste'];
            default: return styles['none'];
        }
    };

    return <>
      <div className={`${styles['flash-effect']} ${flash ? styles['flash-active'] : ''}`}></div>

      <div className={styles['battle-scene']}>
          <div 
            className={`${styles['battle-background']} ${getBiomeClass(fixBiomeType)}`}
            style={{ opacity: sceneOpacity, transition: 'opacity 0.5s ease-in-out' }}
          />
          <>
            {/* 敵方 HUD */}
            <div className={styles['opponent-hud']}>
                <VHPBlock pokemonData={opponentPokemon} isPlayer={false} />
            </div>

            {/* 敵方區域容器 (包含草地與寶可夢) */}
            <div className={`${styles['opponent-container']} ${opponentAnim ? styles[opponentAnim] : ''}`}>
                <div className={`${styles['pokemon-wrapper']} ${shinyAnim ? styles[shinyAnim] : ''}`}>
                    {/* Shiny Sparkles */}
                    {opponentPokemon?.isShiny && shinyAnim === 'anim-shiny' && (
                        <>
                            <div className={styles['shiny-sparkle']}></div>
                            <div className={styles['shiny-sparkle']}></div>
                            <div className={styles['shiny-sparkle']}></div>
                            <div className={styles['shiny-sparkle']}></div>
                            <div className={styles['shiny-sparkle']}></div>
                        </>
                    )}
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