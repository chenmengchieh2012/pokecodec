import { useCallback, useMemo, useRef, useState } from "react";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { getEmptyPokemonStats, PokemonAilment, PokemonDao, PokemonStats, RawPokemonData } from "../../../src/dataAccessObj/pokemon";

import { ExperienceCalculator } from "../../../src/utils/ExperienceCalculator";
import { BattlePokemonState, MoveEffectCalculator, MoveEffectResult } from "../../../src/utils/MoveEffectCalculator";
import { CatchCalculator } from "../utilities/CatchCalculator";

import pokemonGen1Data from '../../../src/data/pokemonGen1.json';

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;



export interface RoundCheckResult {
    isWakedUp: boolean;
    isSleeping: boolean;
    isPoisoned: boolean;
    isBurned: boolean;
    isConfused: boolean;
    isConfusionRecovered: boolean;
    isHurtByConfusion: boolean;
    isHurtByAilment: boolean;
    isParalyzed: boolean;
    isParalysisRecovered: boolean;
    isFreeze: boolean;
    isFreezeRecovered: boolean;
    isFlinched: boolean;
}

export interface PokemonHitAction {
    move: PokemonMove;
    failByFlinch: boolean;
    failByConfusion: boolean;
    success: boolean;
}
interface BattlePokemonHandler {
    getBuffs: () => PokemonStats;
    getBattleState: () => BattlePokemonState;
    getHitAction: (fixMoveId?: number) => PokemonHitAction;

    resetPokemon: () => void;
    setPokemon: (pokemon: PokemonDao) => void;
    syncState: () => void;
    
    throwBall: (ballDao: PokeBallDao, catchBonusPercent: number) => boolean;
    hited: (pokemon: PokemonDao, attackerBuffs: BattlePokemonState, move: PokemonMove) => { newHp: number; moveEffectResult: MoveEffectResult; };
    effectByConfused: () => boolean;
    effectByMove: (moveEffectResult: MoveEffectResult) => void;
    heal: (amount: number) => void;
    updateAilment: (ailment: PokemonAilment) => void;
    decrementPP: (move: PokemonMove) => void;
    increaseExp: (expGain: number) => { isLevelUp: boolean };
    roundCheck: () => RoundCheckResult;
    resetFlinch: () => void;
}

export interface BattlePokemon extends BattlePokemonHandler{
    pokemon: PokemonDao | undefined;
    pokemonRef: React.RefObject<PokemonDao | undefined>;
}


export const BattlePokemonFactory = ():BattlePokemon => {
    const [pokemon, setPokemon] = useState<PokemonDao | undefined>(undefined);
    const nextRoundPokemonRef = useRef<PokemonDao | undefined>(undefined);
    const battlePokemonStateRef = useRef<BattlePokemonState>({
        effectStats: getEmptyPokemonStats(),
        flinched: false,
        confused: false
    });
    
    const synchronized = useCallback(() => {
        setPokemon( nextRoundPokemonRef.current);
    }, []);


    const handleThrowBall = useCallback(( 
        ballDao: PokeBallDao, 
        catchBonusPercent: number
    ) => {
        
        const nextRoundPokemon = nextRoundPokemonRef.current;
        if (!nextRoundPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        
        // Implement the logic for throwing a ball here
        console.log(`Throwing a ${ballDao.apiName} with catch rate modifier of ${ballDao.catchRateModifier}`);
        
        // 計算捕獲率
        const baseCatchRate = pokemonDataMap[nextRoundPokemon.id]?.species.capture_rate || 45;
        let catchRate = CatchCalculator.calculateCatchRate(baseCatchRate, nextRoundPokemon.currentHp / nextRoundPokemon.stats.hp, ballDao.catchRateModifier, nextRoundPokemon.ailment || 'healthy');

        // 增加 catchRateBonus 邏輯
        if (catchBonusPercent !== 0) {
            catchRate = Math.min(Math.max(catchRate + (catchBonusPercent / 100), 0), 1);
        }
        console.log(`Final catch rate: ${catchRate} (base: ${baseCatchRate}, hpRatio: ${nextRoundPokemon.currentHp / nextRoundPokemon.stats.hp}, ballModifier: ${ballDao.catchRateModifier}, ailment: ${nextRoundPokemon.ailment}, bonusPercent: ${catchBonusPercent})`);
        

        const isSuccess = Math.random() < catchRate; //
        if (isSuccess) {
            nextRoundPokemonRef.current = { ...nextRoundPokemon, caughtBall: ballDao.apiName };
        }
        return isSuccess;
    }, []);

    const handleGetBattleState = useCallback(() => {
        return battlePokemonStateRef.current;
    }, []);

    const handleResetFlinch = useCallback(() => {
        battlePokemonStateRef.current = {
            ...battlePokemonStateRef.current,
            flinched: false
        };
    }, []);

    const handleHited = useCallback((attacker: PokemonDao, attackerBuffs: BattlePokemonState, move: PokemonMove) => {
        const nextRoundPokemon = nextRoundPokemonRef.current;
        if (!nextRoundPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }

        // 傷害計算公式 (引入攻防數值)
        const moveEffectResult = MoveEffectCalculator.calculateEffect(
            attacker, attackerBuffs, nextRoundPokemon, battlePokemonStateRef.current, move);
        const damage = moveEffectResult.damage;

        // 更新畏縮狀態
        if (moveEffectResult.flinched) {
            battlePokemonStateRef.current = {
                ...battlePokemonStateRef.current,
                flinched: true
            };
            
        }

        // 更新confused狀態
        if (moveEffectResult.confused) {
            battlePokemonStateRef.current = {
                ...battlePokemonStateRef.current,
                confused: true
            };
        }


        // 處理異常狀態 (Ailment)
        if (moveEffectResult.ailment && (!nextRoundPokemon.ailment || nextRoundPokemon.ailment === 'healthy')) {
            // 只有在健康狀態下才會中異常狀態 (簡化規則)
            nextRoundPokemonRef.current = { ...nextRoundPokemon, ailment: moveEffectResult.ailment };
        }

        // 判斷是否瀕死
        const currentHp = nextRoundPokemon.currentHp;

        let newHp = currentHp;
        if (damage > 0) {
            newHp = Math.max(0, currentHp - damage);
            nextRoundPokemonRef.current = { ...nextRoundPokemon, currentHp: newHp };
        }
        return { newHp, moveEffectResult };
    }, []);

    const getHitAction = useCallback((fixMoveId: number | undefined): PokemonHitAction => {
        
        if (!nextRoundPokemonRef.current) {
            throw new Error("No pokemon available for random move selection.");
        }
        const nextRoundPokemon = nextRoundPokemonRef.current;
        const moves = nextRoundPokemon.pokemonMoves;
        let move = undefined;
        let success = false;
        if (fixMoveId !== undefined) {
            const fixedMove = moves.find(m => m.id === fixMoveId);
            if (fixedMove) {
                move = fixedMove;
                if (move.pp > 0) {
                    success = true;
                }
            }else{
                throw new Error(`Fixed move with id ${fixMoveId} not found on pokemon ${nextRoundPokemon.name}.`);
            }
        }else{
            if (moves.length === 0) {
                throw new Error("No moves available for random move selection.");
            }
            const randomIndex = Math.floor(Math.random() * moves.length);
            move = moves[randomIndex];
            if (move.pp > 0) {
                success = true;
            }
        }
        
        if (battlePokemonStateRef.current.flinched) {
            return { move: move, success: false, failByFlinch: true, failByConfusion: false};
        }
        if (battlePokemonStateRef.current.confused) {
            return { move: move, success: false, failByConfusion: true, failByFlinch: false};
        }
        return { move: move, success: success, failByFlinch: false, failByConfusion: false};
    }, []);

    const handleResetPokemon = useCallback(() => {
        nextRoundPokemonRef.current = undefined;
        setPokemon(undefined);
    }, []);

    const handleHeal = useCallback((amount: number) => {
        const nextRoundPokemon = nextRoundPokemonRef.current;
        if (!nextRoundPokemon) return;

        const maxHp = nextRoundPokemon.maxHp || nextRoundPokemon.stats.hp;
        const currentHp = nextRoundPokemon.currentHp ?? maxHp;
        const newHp = Math.max(0, Math.min(maxHp, currentHp + amount));
        nextRoundPokemonRef.current = { ...nextRoundPokemon, currentHp: newHp };
    }, []);

    const handleDecrementPP = useCallback((move: PokemonMove) => {
        const nextRoundPokemon = nextRoundPokemonRef.current;
        if (!nextRoundPokemon) return;

        // Find the move and decrement its PP
        const updatedMoves = nextRoundPokemon.pokemonMoves.map(m => {
            if (m.name === move.name && m.pp > 0) {
                return { ...m, pp: m.pp - 1 };
            }
            return m;
        });
        nextRoundPokemonRef.current = { ...nextRoundPokemon, pokemonMoves: updatedMoves };
    }, []);

    const handleUpdateAilment = useCallback((ailment: PokemonAilment) => {
        nextRoundPokemonRef.current = nextRoundPokemonRef.current ? { ...nextRoundPokemonRef.current, ailment: ailment } : undefined;
    }, []);

    const handleIncreaseExperience = useCallback((expGain: number):{
        isLevelUp: boolean;
    } => {
        const nextRoundPokemon = nextRoundPokemonRef.current;
        if (!nextRoundPokemon) return ({ isLevelUp: false });

        // 使用 ExperienceCalculator 處理經驗值增加與升級
        const newPokemon = ExperienceCalculator.addExperience(nextRoundPokemon, expGain);
        if (newPokemon.level > nextRoundPokemon.level) {
            // 可以在這裡處理升級動畫或訊息
            nextRoundPokemonRef.current = newPokemon;
            console.log(`Leveled up to ${newPokemon.level}!`);
        }
        nextRoundPokemonRef.current = newPokemon;
        return {
            isLevelUp: newPokemon.level > nextRoundPokemon.level
        }
    }, []);

    const handleEffectByMove = useCallback((moveEffectResult: MoveEffectResult) => {
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

    const handleRoundCheck = useCallback((): RoundCheckResult => {
        const nextRoundPokemon = nextRoundPokemonRef.current;
        const result: RoundCheckResult = {
            isWakedUp: false,
            isSleeping: false,
            isPoisoned: false,
            isBurned: false,
            isConfused: false,
            isConfusionRecovered: false,
            isHurtByConfusion: false,
            isHurtByAilment: false,
            isParalyzed: false,
            isParalysisRecovered: false,
            isFreeze: false,
            isFreezeRecovered: false,
            isFlinched: false
        };

        if (!nextRoundPokemon) {
            return result;
        }
        if (nextRoundPokemon.currentHp === 0) {
            nextRoundPokemon.ailment = 'fainted';
            return result;
        }

        // 處理睡眠狀態
        if (nextRoundPokemon.ailment === 'sleep') {
            const randomWake = Math.random();
            if (randomWake < 0.33) {
                nextRoundPokemon.ailment = 'healthy';
                result.isWakedUp = true;
            } else {
                result.isSleeping = true;
                nextRoundPokemon.currentHp = Math.min(nextRoundPokemon.maxHp, nextRoundPokemon.currentHp + Math.floor(nextRoundPokemon.maxHp / 8));
            }
        }

        // 處理中毒狀態
        if (nextRoundPokemon.ailment === 'poison') {
            const poisonDamage = Math.floor(nextRoundPokemon.maxHp / 8);
            nextRoundPokemon.currentHp = Math.max(0, nextRoundPokemon.currentHp - poisonDamage);
            result.isPoisoned = true;
            result.isHurtByAilment = true;
        }

        // 處理灼傷狀態
        if (nextRoundPokemon.ailment === 'burn') {
            const burnDamage = Math.floor(nextRoundPokemon.maxHp / 16);
            nextRoundPokemon.currentHp = Math.max(0, nextRoundPokemon.currentHp - burnDamage);
            result.isBurned = true;
            result.isHurtByAilment = true;
        }

        if (nextRoundPokemon.ailment === 'freeze') {
            const randomThaw = Math.random();
            if (randomThaw < 0.2) {
                nextRoundPokemon.ailment = 'healthy';
                result.isFreezeRecovered = true;
            } else {
                result.isFreeze = true;
            }
        }

        if (nextRoundPokemon.ailment === 'paralysis') {
            const randomParalysis = Math.random();
            if (randomParalysis < 0.25) {
                result.isParalyzed = true;
            } else {
                nextRoundPokemon.ailment = 'healthy';
                result.isParalysisRecovered = true;
            }
        }

        if (battlePokemonStateRef.current.flinched) {
            battlePokemonStateRef.current = {
                ...battlePokemonStateRef.current,
                flinched: false
            };
            result.isFlinched = true;
        }

        nextRoundPokemonRef.current = nextRoundPokemon;
        return result;
    }, []);

    const handleEffectByConfused = useCallback((): boolean => {
        if (!nextRoundPokemonRef.current) {
            throw new Error("No pokemon available for random move selection.");
        }
        const nextRoundPokemon = nextRoundPokemonRef.current;
        if (battlePokemonStateRef.current.confused) {
            const randomConfused = Math.random();
            if (randomConfused < 0.5) {
                // 自傷
                const selfDamage = Math.floor(nextRoundPokemon.maxHp / 8);
                nextRoundPokemon.currentHp = Math.max(0, nextRoundPokemon.currentHp - selfDamage);
                nextRoundPokemonRef.current = nextRoundPokemon;
                return true;
            } else {
                battlePokemonStateRef.current = {
                    ...battlePokemonStateRef.current,
                    confused: false
                };
            }
        }
        return false;
    }, []);

    const handler: BattlePokemonHandler = useMemo(() => ({
        throwBall: handleThrowBall,
        hited: handleHited,
        resetPokemon: handleResetPokemon,
        heal: handleHeal,
        updateAilment: handleUpdateAilment,
        decrementPP: handleDecrementPP,
        increaseExp: handleIncreaseExperience,
        effectByMove: handleEffectByMove,
        getBuffs: () => battlePokemonStateRef.current.effectStats,
        getBattleState: handleGetBattleState,
        resetFlinch: handleResetFlinch,
        getHitAction: getHitAction,
        roundCheck: handleRoundCheck,
        effectByConfused: handleEffectByConfused,
        setPokemon: (pokemon) => (nextRoundPokemonRef.current = pokemon),
        syncState: synchronized,
    }), [handleThrowBall, handleHited, handleResetPokemon, handleHeal, handleUpdateAilment, handleDecrementPP, handleIncreaseExperience, handleEffectByMove, handleGetBattleState, handleResetFlinch, getHitAction, handleRoundCheck, handleEffectByConfused, synchronized]);
    return {
        pokemon,
        pokemonRef: nextRoundPokemonRef,
        ...handler
    }
}