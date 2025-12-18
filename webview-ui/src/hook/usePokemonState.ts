import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EncounterResult } from "../../../src/core/EncounterHandler";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { initialPokemonState, PokemonDao, PokemonState, PokemonStateAction } from "../../../src/dataAccessObj/pokemon";
import { BattleControlHandle } from "../frame/BattleControl";

import { ExperienceCalculator } from "../utilities/ExperienceCalculator";
import { HitHpCalculator } from "../../../src/utils/hitHpCalculator";

export interface PokemonStateHandler {
    newEncounter: (encounterResult: EncounterResult) => void;
    throwBall: (ballDao: PokeBallDao) => Promise<boolean>;
    hited: (pokemon: PokemonDao, move: PokemonMove) => Promise<{newHp: number; damageResult: import("../../../src/utils/hitHpCalculator").DamageResult;}>;
    randomMove: () => PokemonMove;
    resetPokemon: () => void;
    switchPokemon: (pokemon: PokemonDao) => Promise<void>;
    heal: (amount: number) => Promise<void>;
    decrementPP: (move: PokemonMove) => void;
    increaseExp: (expGain: number) => void;
}

export interface UsePokemonStateProps{
    defaultPokemonState?: PokemonState;
    defaultPokemon: PokemonDao|undefined;
}

export const usePokemonState = (dialogRef : React.RefObject<BattleControlHandle|null>, props: UsePokemonStateProps) => {
    const [ pokemon, setPokemon ] = useState<PokemonDao | undefined>(props.defaultPokemon ? props.defaultPokemon : undefined);
    const [ pokemonState, setPokemonState ] = useState<PokemonState>(props.defaultPokemonState ? props.defaultPokemonState : initialPokemonState())
    
    // 使用 ref 來保存最新的 pokemonState，以便在 useCallback 中使用而不觸發依賴更新
    const pokemonRef = useRef(pokemon);
    useEffect(() => {
        pokemonRef.current = pokemon;
    }, [pokemon]);

    const handleSwitchPokemon = useCallback(async (pokemon: PokemonDao) => {
        setPokemon(pokemon);
        setPokemonState({action: PokemonStateAction.None});
        await dialogRef.current?.setText(`Go! ${pokemon.name.toUpperCase()}!`);
    }, [dialogRef]);

    const handleThrowBall = useCallback(async (ballDao: PokeBallDao) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
        // Implement the logic for throwing a ball here
        console.log(`Throwing a ${ballDao.apiName} with catch rate modifier of ${ballDao.catchRateModifier}`);
        setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Catching }));
        await dialogRef.current?.setText(`POKé BALL!!!`);
        await dialogRef.current?.setText("...");
        await sleep(500);
        await dialogRef.current?.setText("... ...");
        await sleep(500);
        await dialogRef.current?.setText("... ... ...");
        await sleep(500);

        const isSuccess = Math.random() > 0.4; // 60% 捕獲率
        if (isSuccess) {
            setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Caught }));
            await dialogRef.current?.setText(`All right! ${currentPokemon.name.toUpperCase()} was caught!`);
        } else {
            setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Escaped }));
            await dialogRef.current?.setText(`Darn! The POKéMON broke free!`);
        }
        return isSuccess;
    }, [dialogRef]);

    const handleHited = useCallback(async (attacker: PokemonDao, move: PokemonMove) => {
        const myPokemon = pokemonRef.current;
        if (!myPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        // 傷害計算公式 (引入攻防數值)
        const damageResult = HitHpCalculator.calculateDamage(attacker, myPokemon, move);
        const damage = damageResult.damage;
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
            })
            if (newHp === 0) {
                setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Fainted }));
            }
        }
        return {newHp, damageResult};
    }, []);

    const handleNewEncounter = useCallback(async (encounterResult: EncounterResult) => {
        if (!encounterResult.pokemon) {
            throw new Error("No pokemon found in encounter result.");
        }
        // 先設定新的寶可夢
        setPokemon(encounterResult.pokemon);

        // 重置狀態
        setPokemonState({
            action: PokemonStateAction.None
        });
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
        setPokemonState({
            action: PokemonStateAction.None
        });
    }, []);

    const handleHeal = useCallback(async (amount: number) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        const maxHp = currentPokemon.maxHp || currentPokemon.stats.hp;
        const currentHp = currentPokemon.currentHp ?? maxHp;
        const newHp = Math.min(maxHp, currentHp + amount);

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

    const handleIncreaseExperience = useCallback((expGain: number) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        // 使用 ExperienceCalculator 處理經驗值增加與升級
        const newPokemon = ExperienceCalculator.addExperience(currentPokemon, expGain);

        if (newPokemon.level > currentPokemon.level) {
            // 可以在這裡處理升級動畫或訊息
            console.log(`Leveled up to ${newPokemon.level}!`);
        }

        setPokemon(newPokemon);
    }, []);

    const handler: PokemonStateHandler = useMemo(() => ({
        newEncounter: handleNewEncounter,
        throwBall: handleThrowBall,
        hited: handleHited,
        randomMove: handleRandomMove,
        switchPokemon: handleSwitchPokemon,
        resetPokemon: handleResetPokemon,
        heal: handleHeal,
        decrementPP: handleDecrementPP,
        increaseExp: handleIncreaseExperience
    }), [handleNewEncounter, handleThrowBall, handleHited, handleRandomMove, handleSwitchPokemon, handleResetPokemon, handleHeal, handleDecrementPP, handleIncreaseExperience]);

    return {
        pokemon,
        pokemonState,
        handler: handler
    }
}