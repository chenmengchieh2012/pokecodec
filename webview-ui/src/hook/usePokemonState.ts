import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EncounterResult } from "../../../src/core/EncounterHandler";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { getEmptyPokemonStats, PokemonAilment, PokemonDao, PokemonState, PokemonStateAction, PokemonStats, RawPokemonData } from "../../../src/dataAccessObj/pokemon";
import { BattleControlHandle } from "../frame/BattleControl";

import { MoveEffectResult, MoveEffectCalculator, BattlePokemonState } from "../../../src/utils/MoveEffectCalculator";
import { ExperienceCalculator } from "../utilities/ExperienceCalculator";
import { CapitalizeFirstLetter } from "../utilities/util";
import { CatchCalculator } from "../utilities/CatchCalculator";

import pokemonGen1Data from '../../../src/data/pokemonGen1.json';

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;



export interface PokemonStateHandler {
    getBuffs: () => PokemonStats;
    getBattleState: () => BattlePokemonState;
    resetFlinch: () => void;
    newEncounter: (encounterResult: EncounterResult) => void;
    throwBall: (ballDao: PokeBallDao,onAction: (action: PokemonStateAction) => void) => Promise<boolean>;
    hited: (pokemon: PokemonDao, attackerBuffs: BattlePokemonState, move: PokemonMove) => Promise<{newHp: number; moveEffectResult: MoveEffectResult;}>;
    randomMove: () => PokemonMove;
    useMoveEffect: (moveEffectResult: MoveEffectResult) => void;
    resetPokemon: () => void;
    switchPokemon: (pokemon: PokemonDao) => Promise<void>;
    heal: (amount: number) => Promise<void>;
    updateAilment: (ailment: PokemonAilment) => Promise<void>;
    restorePp: (move: PokemonMove, amount: number) => Promise<void>;
    decrementPP: (move: PokemonMove) => void;
    increaseExp: (expGain: number) => void;
    onRoundFinish: () => Promise<void>;
}

export interface UsePokemonStateProps{
    defaultPokemonState?: PokemonState;
    defaultPokemon: PokemonDao|undefined;
}


export const usePokemonState = (dialogRef : React.RefObject<BattleControlHandle|null>, props: UsePokemonStateProps) => {
    const [ pokemon, setPokemon ] = useState<PokemonDao | undefined>(props.defaultPokemon ? props.defaultPokemon : undefined);
    const battlePokemonStateRef = useRef<BattlePokemonState>({
        effectStats: getEmptyPokemonStats(),
        flinched: false,
        confused: false
    });

    // 使用 ref 來保存最新的 pokemonState，以便在 useCallback 中使用而不觸發依賴更新
    const pokemonRef = useRef(pokemon);
    useEffect(() => {
        pokemonRef.current = pokemon;
        battlePokemonStateRef.current = {
            effectStats: getEmptyPokemonStats(),
            flinched: false,
            confused: false
        };
    }, [pokemon]);

    const handleSwitchPokemon = useCallback(async (pokemon: PokemonDao) => {
        setPokemon(pokemon);
        await dialogRef.current?.setText(`Go! ${pokemon.name.toUpperCase()}!`);
    }, [dialogRef]);

    const handleThrowBall = useCallback(async (ballDao: PokeBallDao, onAction: (action: PokemonStateAction) => void) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
        // Implement the logic for throwing a ball here
        console.log(`Throwing a ${ballDao.apiName} with catch rate modifier of ${ballDao.catchRateModifier}`);
        onAction(PokemonStateAction.Catching);
        await dialogRef.current?.setText(`POKé BALL!!!`);
        await dialogRef.current?.setText("...");
        await sleep(500);
        await dialogRef.current?.setText("... ...");
        await sleep(500);
        await dialogRef.current?.setText("... ... ...");
        await sleep(500);
        
        // 計算捕獲率
        const baseCatchRate = pokemonDataMap[currentPokemon.id]?.species.capture_rate || 45;
        const catchRate = CatchCalculator.calculateCatchRate(baseCatchRate, currentPokemon.currentHp / currentPokemon.stats.hp, ballDao.catchRateModifier, currentPokemon.ailment || 'healthy');
        
        await dialogRef.current?.setText(`( catch rate: ${catchRate.toFixed(2)} )`);


        const isSuccess = Math.random() < catchRate; //
        if (isSuccess) {
            onAction(PokemonStateAction.Caught);
            setPokemon(prev=>{
                if(!prev){
                    return prev;
                }
                return { ...prev, caughtBall: ballDao.apiName  };
            })
            await dialogRef.current?.setText(`All right! ${currentPokemon.name.toUpperCase()} was caught!`);
        } else {
            onAction(PokemonStateAction.Escaped);
            await dialogRef.current?.setText(`Darn! The POKéMON broke free!`);
        }
        return isSuccess;
    }, [dialogRef]);

    const handleGetBattleState = useCallback(() => {
        return battlePokemonStateRef.current;
    }, []);

    const handleResetFlinch = useCallback(() => {
        battlePokemonStateRef.current = {
            ...battlePokemonStateRef.current,
            flinched: false
        };
    }, []);


    const handleHited = useCallback(async (attacker: PokemonDao, attackerBuffs: BattlePokemonState, move: PokemonMove) => {
        const myPokemon = pokemonRef.current;
        if (!myPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        
        // 傷害計算公式 (引入攻防數值)
        const moveEffectResult = MoveEffectCalculator.calculateEffect(
            attacker, attackerBuffs, myPokemon, battlePokemonStateRef.current, move);
        const damage = moveEffectResult.damage;
        
        // 更新畏縮狀態
        if (moveEffectResult.flinched) {
            battlePokemonStateRef.current = {
                ...battlePokemonStateRef.current,
                flinched: true
            };
            await dialogRef.current?.setText(`${myPokemon.name} flinched!`);
        }

        // 更新confused狀態
        if (moveEffectResult.confused) {
            battlePokemonStateRef.current = {
                ...battlePokemonStateRef.current,
                confused: true
            };
            await dialogRef.current?.setText(`${myPokemon.name} became confused!`);
        }
        

        // 處理異常狀態 (Ailment)
        if (moveEffectResult.ailment && (!myPokemon.ailment || myPokemon.ailment === 'healthy')) {
            // 只有在健康狀態下才會中異常狀態 (簡化規則)
            setPokemon(prev => prev ? { ...prev, ailment: moveEffectResult.ailment } : undefined);
            await dialogRef.current?.setText(`${myPokemon.name} was ${moveEffectResult.ailment}!`);
        }

        // 判斷是否瀕死並設定對話
        const currentHp = myPokemon.currentHp;

        let newHp = currentHp;
        if (damage > 0) {
            newHp = Math.max(0, currentHp - damage);
            setPokemon(prev=>{
                if(!prev){
                    return prev;
                }
                return {
                    ...prev,
                    currentHp: newHp
                }
            });
        }
        return {newHp, moveEffectResult};
    }, [dialogRef]);

    const handleNewEncounter = useCallback(async (encounterResult: EncounterResult) => {
        if (!encounterResult.pokemon) {
            throw new Error("No pokemon found in encounter result.");
        }
        // 先設定新的寶可夢
        setPokemon(encounterResult.pokemon);

    }, []);

    const handleRandomMove = useCallback(() => {
        if (!pokemonRef.current) {
            throw new Error("No pokemon available for random move selection.");
        }
        const moves = pokemonRef.current.pokemonMoves;
        const randomIndex = Math.floor(Math.random() * moves.length);
        return moves[randomIndex];
    }, []);

    const handleResetPokemon = useCallback(() => {
        setPokemon(undefined);
    }, []);

    const handleHeal = useCallback(async (amount: number) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        const maxHp = currentPokemon.maxHp || currentPokemon.stats.hp;
        const currentHp = currentPokemon.currentHp ?? maxHp;
        const newHp = Math.max(0, Math.min(maxHp, currentHp + amount));

        setPokemon(prev => prev ? { ...prev, currentHp: newHp } : undefined);
    }, []);

    const handleDecrementPP = useCallback((move: PokemonMove) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        // Find the move and decrement its PP
        const updatedMoves = currentPokemon.pokemonMoves.map(m => {
            if (m.name === move.name && m.pp > 0) {
                return { ...m, pp: m.pp - 1 };
            }
            return m;
        });

        setPokemon(prev => prev ? { ...prev, pokemonMoves: updatedMoves } : undefined);
    }, []);

    const handleRestorePP = useCallback(async (move: PokemonMove, restoreAmount: number) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;
        // Find the move and restore its PP
        const restoredMoves = currentPokemon.pokemonMoves.map(m => {
            if (m.name === move.name) {
                const newPp = Math.min(m.maxPP, m.pp + restoreAmount);
                return { ...m, pp: newPp };
            }
            return m;
        });

        setPokemon(prev => prev ? { ...prev, pokemonMoves: restoredMoves } : undefined);
    }, []);

    const handleUpdateAilment = useCallback(async (ailment: PokemonAilment) => {
        setPokemon(prev => {
            if (!prev) return prev;
            return { ...prev, ailment: ailment };
        });
    }, []);

    const handleIncreaseExperience = useCallback((expGain: number) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        // 使用 ExperienceCalculator 處理經驗值增加與升級
        const newPokemon = ExperienceCalculator.addExperience(currentPokemon, expGain);

        if (newPokemon.level > currentPokemon.level) {
            // 可以在這裡處理升級動畫或訊息
            console.log(`Leveled up to ${newPokemon.level}!`);
            dialogRef.current?.setText(`${CapitalizeFirstLetter(newPokemon.name)} leveled up to Lv${newPokemon.level}!`);
        }

        setPokemon(newPokemon);
    }, [dialogRef]);

    const handleUseMoveEffect = useCallback((moveEffectResult: MoveEffectResult) => {
        // 這裡可以根據 move 的效果來更新 pokemonState 或 battlePokemonState
        console.log(`Using move effect...`);
        const attackerStatChanges = moveEffectResult.attackerStatChanges;
        const newEffectStats = { ...battlePokemonStateRef.current.effectStats };
        // 處理攻擊者的狀態變化
        if (attackerStatChanges === undefined) {
            return;
        }
        if (attackerStatChanges.hp) {
            newEffectStats.hp += attackerStatChanges.hp;
        }
        if (attackerStatChanges.attack) {
            newEffectStats.attack += attackerStatChanges.attack;
        }
        if (attackerStatChanges.defense) {
            newEffectStats.defense += attackerStatChanges.defense;
        }
        if (attackerStatChanges.specialAttack) {
            newEffectStats.specialAttack += attackerStatChanges.specialAttack;
        }
        if (attackerStatChanges.specialDefense) {
            newEffectStats.specialDefense += attackerStatChanges.specialDefense;
        }
        if (attackerStatChanges.speed) {
            newEffectStats.speed += attackerStatChanges.speed;
        }
        battlePokemonStateRef.current = {
            ...battlePokemonStateRef.current,
            effectStats: newEffectStats,
        }

    }, []);

    const handleOnRoundFinish = useCallback(async () => {
        if(!pokemonRef.current || pokemonRef.current.currentHp === 0){
            setPokemon(prev => {
                if (!prev) return prev;
                return { ...prev, ailment: 'fainted', currentHp: 0 };
            });
            return
        }
        const nextStatePokemon = pokemonRef.current;
        // 處理睡眠狀態
        if(pokemonRef.current.ailment === 'sleep'){
            const randomWake = Math.random();
            if(randomWake < 0.33) {
                nextStatePokemon.ailment = 'healthy';
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} woke up!`);
            }else{
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} is still sleeping!`);
                nextStatePokemon.currentHp = Math.min(nextStatePokemon.maxHp, nextStatePokemon.currentHp  + Math.floor(nextStatePokemon.maxHp / 8));
            }
        }

        // 處理中毒狀態
        if(pokemonRef.current.ailment === 'poison'){
            const poisonDamage = Math.floor(pokemonRef.current.maxHp / 8);
            nextStatePokemon.currentHp = Math.max(0, nextStatePokemon.currentHp - poisonDamage);
            await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} is hurt by poison!`);
        }

        // 處理灼傷狀態
        if(pokemonRef.current.ailment === 'burn'){
            const burnDamage = Math.floor(pokemonRef.current.maxHp / 16);
            nextStatePokemon.currentHp = Math.max(0, nextStatePokemon.currentHp - burnDamage);
            await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} is hurt by its burn!`);
        }

        // 處理混亂狀態
        if(battlePokemonStateRef.current.confused){
            const randomConfused = Math.random();
            if(randomConfused < 0.5){
                // 自傷
                const selfDamage = Math.floor(pokemonRef.current.maxHp / 8);
                nextStatePokemon.currentHp = Math.max(0, nextStatePokemon.currentHp - selfDamage);
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} hurt itself in its confusion!`);
            }else{
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} snapped out of its confusion!`);
                battlePokemonStateRef.current = {
                    ...battlePokemonStateRef.current,
                    confused: false
                };
            }
        }

        if(pokemonRef.current.ailment === 'freeze'){
            const randomThaw = Math.random();
            if(randomThaw < 0.2) {
                nextStatePokemon.ailment = 'healthy';
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} thawed out!`);
            }else{
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} is still frozen solid!`);
            }
        }

        if(pokemonRef.current.ailment === 'paralysis'){
            const randomParalysis = Math.random();
            if(randomParalysis < 0.25) {
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} is paralyzed! It can't move!`);
            }else{
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} is not paralyzed anymore!`);
                nextStatePokemon.ailment = 'healthy';
            }
        }

        if(battlePokemonStateRef.current.flinched){
            battlePokemonStateRef.current = {
                ...battlePokemonStateRef.current,
                flinched: false
            };
        }   
        
        if(battlePokemonStateRef.current.confused){
            const recoverRand = Math.random();
            if(recoverRand < 0.2) {
                await dialogRef.current?.setText(`${CapitalizeFirstLetter(pokemonRef.current.name)} snapped out of its confusion!`);
                battlePokemonStateRef.current = {
                    ...battlePokemonStateRef.current,
                    confused: false
                };
            }
        }
        setPokemon(prev => {
            if (!prev) return prev;
            return { ...nextStatePokemon };
        });
    }, [dialogRef]);

    const handler: PokemonStateHandler = useMemo(() => ({
        newEncounter: handleNewEncounter,
        throwBall: handleThrowBall,
        hited: handleHited,
        randomMove: handleRandomMove,
        switchPokemon: handleSwitchPokemon,
        resetPokemon: handleResetPokemon,
        heal: handleHeal,
        updateAilment: handleUpdateAilment,
        decrementPP: handleDecrementPP,
        restorePp: handleRestorePP,
        increaseExp: handleIncreaseExperience,
        useMoveEffect: handleUseMoveEffect,
        getBuffs: () => battlePokemonStateRef.current.effectStats,
        getBattleState: handleGetBattleState,
        resetFlinch: handleResetFlinch,
        onRoundFinish: handleOnRoundFinish
    }), [handleNewEncounter, handleThrowBall, handleHited, handleRandomMove, handleSwitchPokemon, handleResetPokemon, handleHeal, handleUpdateAilment, handleDecrementPP, handleRestorePP, handleIncreaseExperience, handleUseMoveEffect, handleGetBattleState, handleResetFlinch, handleOnRoundFinish]);
    return {
        pokemon,
        handler: handler
    }
}