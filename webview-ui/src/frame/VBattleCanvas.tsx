import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { VHPBlock } from "./HPBlock";
import styles from "./VBattleCanvas.module.css";
import { BiomeType } from "../../../src/dataAccessObj/BiomeData";
import { PokemonDao, PokemonState, PokemonStateAction } from "../../../src/dataAccessObj/pokemon";
import { resolveAssetUrl } from "../utilities/vscode";
import { BattleMode } from "../../../src/dataAccessObj/gameStateData";

export interface VBattleProps {
    myParty?: PokemonDao[];
    opponentParty?: PokemonDao[];
    myPokemon?: PokemonDao;
    opponentPokemon?: PokemonDao;
    battleMode: BattleMode | undefined;
}


export const CatchPhase = {
    None: 'none',
    Throwing: 'throwing',
    Bouncing: 'bouncing',
    Shaking: 'shaking',
    Caught: 'caught',
    Escaped: 'escaped'
} as const

export type CatchPhase = typeof CatchPhase[keyof typeof CatchPhase];


export interface BattleCanvasHandle {
    handleThrowBallPhase: (state: PokemonState) => void,
    handleMyPokemonFaint: () => void,
    handleOpponentPokemonFaint: () => void,
    handleOpponentSwitchPokemon: () => Promise<void>,
    handleAttackFromOpponent: () => Promise<void>,
    handleAttackToOpponent: () => Promise<void>,
    handleRunAway: () => Promise<void>,
    handleSwitchPokemon: () => Promise<void>,
    handleStart: (biomeType: BiomeType) => void
}

// 
export const VBattleCanvas = React.forwardRef<BattleCanvasHandle, VBattleProps>((props, ref) => {
    const opponentPokemon = props.opponentPokemon
    const myPokemon = props.myPokemon
    const opponentParty = props.opponentParty || []
    const myParty = props.myParty || []
    const battleMode = props.battleMode
    const [opponentPokemonState, setOpponentPokemonState] = useState<PokemonState>({
        action: PokemonStateAction.None,
        caughtBallApiName: undefined
    });
    const [playerAnim, setPlayerAnim] = useState('anim-enter-player');
    const [opponentAnim, setOpponentAnim] = useState('anim-enter-enemy');
    const [flash, setFlash] = useState(!props.opponentPokemon);
    const [shinyAnim, setShinyAnim] = useState('anim-enter-shiny');
    const [fixBiomeType, setFixBiomeType] = useState<BiomeType>(BiomeType.None);
    const [sceneOpacity, setSceneOpacity] = useState(0);
    const [catchAnimPhase, setCatchAnimPhase] = useState<CatchPhase>(CatchPhase.None);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const triggerAnim = (setAnim: React.Dispatch<React.SetStateAction<string>>, animName: string, duration: number = 500) => {
        setAnim(animName);
        setTimeout(() => setAnim(''), duration);
    };

    const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const role = target.getAttribute('data-role');

        if (opponentPokemonState.action === PokemonStateAction.Catching) {
            if (catchAnimPhase === 'throwing' && role === 'pokeball') {
                setCatchAnimPhase('bouncing');
            } else if (catchAnimPhase === 'bouncing' && role === 'pokeball') {
                setCatchAnimPhase('shaking');
            }
        } else if (opponentPokemonState.action === PokemonStateAction.Escaped) {
            if (catchAnimPhase === 'escaped' && role === 'pokemon') {
                setCatchAnimPhase('none');
            }
        }
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
        handleThrowBallPhase: (state: PokemonState) => {
            setOpponentPokemonState(state);
            if (state.action === PokemonStateAction.Catching) {
                setCatchAnimPhase('throwing');
            } else if (state.action === PokemonStateAction.Caught) {
                setCatchAnimPhase('caught');
            } else if (state.action === PokemonStateAction.Escaped) {
                setCatchAnimPhase('escaped');
            } else {
                setCatchAnimPhase('none');
            }
        },
        handleMyPokemonFaint: () => {
            // 我方昏厥動畫 (Flash)
            setPlayerAnim('anim-faint');
        },
        handleOpponentPokemonFaint: () => {
            // 敵方昏厥動畫 (Flash)
            setOpponentAnim('anim-faint');
        },
        handleOpponentSwitchPokemon: async () => {
            // 清除昏厥動畫狀態
            setOpponentAnim('');

            // 觸發敵方出場動畫
            triggerAnim(setOpponentAnim, 'anim-enter-enemy');
            await sleep(1000);
        },
        handleAttackFromOpponent: async () => {
            // 敵方攻擊動畫 (Shake)
            triggerAnim(setOpponentAnim, 'shake');
            await sleep(500);

            // 我方受傷動畫 (Flash)
            triggerAnim(setPlayerAnim, 'flash-sprite');
        },
        handleAttackToOpponent: async () => {
            // 我方攻擊動畫 (Shake)
            triggerAnim(setPlayerAnim, 'shake');
            await sleep(500);

            // 敵方受傷動畫 (Flash)
            triggerAnim(setOpponentAnim, 'flash-sprite');
        },
        handleRunAway: async () => {
            setPlayerAnim('anim-run'); // 觸發逃跑動畫
            await sleep(1000); // Wait for animation
        },
        handleSwitchPokemon: async () => {
            // 清除昏厥動畫狀態
            setPlayerAnim('');

            // 2. 觸發出場動畫
            triggerAnim(setPlayerAnim, 'anim-enter-player');
            await sleep(1000);
        },
        handleStart: (_fixBiomeType: BiomeType) => {
            setFixBiomeType(_fixBiomeType);
            setFlash(false);
            setTimeout(() => setSceneOpacity(1), 50);
        }
    })
    )



    const spriteUrl = useCallback((id: string, isShiny?: boolean) =>
        id ? resolveAssetUrl(`./sprites/pokemon/${isShiny ? 'shiny' : 'normal'}/${id}.gif`)
            : '', []);

    const spriteBackUrl = useCallback((id: string, isShiny?: boolean) =>
        id ? resolveAssetUrl(`./sprites/pokemon/${isShiny ? 'back-shiny' : 'back'}/${id}.gif`)
            : '', []);


    const pokeBallUrl = useCallback((ballName: string) => {
        const ballApiName = ballName || 'poke-ball';
        return resolveAssetUrl(`./sprites/items/${ballApiName}.png`);
    }, []);


    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null; // Prevent infinite loop
        // Fallback to icon if animated sprite fails, or maybe just hide it?
        // For now let's try to load the icon as a last resort or keep the old fallback if you prefer online fallback
        // But since we want offline, let's fallback to icon which we have
        target.src = resolveAssetUrl(`./sprites/pokemon/icon/${id}.png`);
    };

    const getBiomeClass = (type: BiomeType) => {
        switch (type) {
            case BiomeType.BattleArena: return styles['battle-arena'];
            case BiomeType.Grassland: return styles['grassland'];
            case BiomeType.WaterBeach: return styles['water-beach'];
            case BiomeType.UrbanPowerPlant: return styles['urban-power-plant'];
            case BiomeType.MountainCave: return styles['mountain-cave'];
            case BiomeType.GhostMystic: return styles['ghost-mystic'];
            case BiomeType.ToxicWaste: return styles['toxic-waste'];
            default: return styles['none'];
        }
    };

    const getCatchAnimClass = () => {
        switch (catchAnimPhase) {
            case 'throwing': return styles['state-throwing'];
            case 'bouncing': return styles['state-bouncing'];
            case 'shaking': return styles['state-shaking'];
            case 'caught': return styles['state-caught'];
            case 'escaped': return styles['state-escaped'];
            default: return '';
        }
    };

    const isShowOpponentParty = useMemo(() => {
        return battleMode === BattleMode.Trainer;
    }, [battleMode])

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
                    <VHPBlock pokemonData={opponentPokemon} isPlayer={false} party={opponentParty} showParty={isShowOpponentParty} />
                </div>

                {/* 敵方區域容器 (包含草地與寶可夢) */}
                <div
                    className={`${styles['opponent-container']} ${opponentAnim ? styles[opponentAnim] : ''} ${getCatchAnimClass()}`}
                    onAnimationEnd={handleAnimationEnd}
                >
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
                            src={pokeBallUrl(opponentPokemonState.caughtBallApiName || '')}
                            className={styles['pokeball-sprite']}
                            alt="pokeball"
                            data-role="pokeball"
                        />
                        <img
                            src={spriteUrl(opponentPokemon ? opponentPokemon.id.toString() : '', opponentPokemon?.isShiny)}
                            alt="opponent pokemon"
                            className={styles['pokemon-sprite']}
                            data-role="pokemon"
                            style={{
                                transition: 'opacity 0.5s'
                            }}
                            onError={(e) => handleImageError(e, opponentPokemon ? opponentPokemon.id : 0)}
                        />
                    </div>
                </div>

                {/* 我方區域容器 (包含草地與寶可夢) */}
                <div className={`${styles['player-container']} ${playerAnim ? styles[playerAnim] : ''}`}>
                    <div className={styles['my-pokemon-wrapper']}>
                        {/* Shiny Sparkles */}
                        {myPokemon?.isShiny && shinyAnim === 'anim-shiny' && (
                            <>
                                <div className={styles['shiny-sparkle']}></div>
                                <div className={styles['shiny-sparkle']}></div>
                                <div className={styles['shiny-sparkle']}></div>
                                <div className={styles['shiny-sparkle']}></div>
                                <div className={styles['shiny-sparkle']}></div>
                            </>
                        )}
                        <div className={styles['my-grass-base']}></div>
                        <img
                            src={spriteBackUrl(myPokemon ? myPokemon.id.toString() : '', myPokemon?.isShiny)}
                            alt="my pokemon"
                            className={styles['my-pokemon-sprite']}
                            onError={(e) => handleImageError(e, myPokemon ? myPokemon.id : 0)}
                        />
                    </div>
                </div>

                {/* 我方 HUD */}
                <div className={styles['my-hud']}>
                    <VHPBlock pokemonData={myPokemon} isPlayer={true} party={myParty} showParty={true} />
                </div>
            </>
        </div>

    </>

})
VBattleCanvas.displayName = "VBattleCanvas"