import { useCallback, useMemo, useRef } from "react";
import { PokemonDao } from "../../../src/dataAccessObj/pokemon";
import { vscode } from "../utilities/vscode";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import { MoveEffectResult } from "../../../src/utils/MoveEffectCalculator";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { getDefaultBattleCummulativeStats, RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleCummulativeStats, RecordBattleFinishedPayload } from "../../../src/utils/AchievementCritiria";


export interface BattleRecorderHandler {
    onBattleFinished: (
        myPokemon: PokemonDao | undefined,
        opponentPokemon: PokemonDao | undefined,
        myParty: PokemonDao[]
    ) => void;
    onBattleAction: (
        isSwitch: boolean,
        myPokemonMoveEffectResult: MoveEffectResult | undefined,
        opponentPokemonMoveEffectResult: MoveEffectResult | undefined,
        myPokemonMove: PokemonMove | undefined,
        opponentPokemonMove: PokemonMove | undefined,
        opponentPokemon: PokemonDao | undefined
    ) => void;
    onCatch: (
        opponentPokemon: PokemonDao | undefined,
        biome: string
    ) => void;
}

export const BattleRecorder = () => {
    const battleCummulativeStatsRef = useRef<RecordBattleCummulativeStats>(getDefaultBattleCummulativeStats());

    const onBattleFinished = useCallback((
        myPokemon: PokemonDao | undefined,
        opponentPokemon: PokemonDao | undefined,
        myParty: PokemonDao[]
    ): void => {
        if (!myPokemon || !opponentPokemon) {
            console.warn("BattleRecorder: Missing Pokemon data on battle finished.");
            return;
        }
        const won = myPokemon.currentHp > 0 && opponentPokemon.currentHp <= 0;
        const stats = battleCummulativeStatsRef.current;
        const payload: RecordBattleFinishedPayload = {
            won: won,
            myParty: myParty.map(p => ({ 
                id: p.id,
                level: p.level,
                hp: p.currentHp,
                types: p.types,
            })),
            opponent: {
                level: opponentPokemon.level,
                types: opponentPokemon.types,
                isLegendary: opponentPokemon.isLegendary,
            }, 
            stats: stats
        }
        vscode.postMessage({
            command: MessageType.RecordBattleFinished,
            ...payload
        });
    }, []);

    const onBattleAction = useCallback((
        isSwitch: boolean,
        myPokemonMoveEffectResult: MoveEffectResult | undefined, 
        opponentPokemonMoveEffectResult: MoveEffectResult | undefined,
        myPokemonMove: PokemonMove | undefined,
        opponentPokemonMove: PokemonMove | undefined,
        opponentPokemon: PokemonDao | undefined
    )=>{
        battleCummulativeStatsRef.current.turns += 1;
        const damageDealt = myPokemonMoveEffectResult ? myPokemonMoveEffectResult.damage : 0;
        const damageTaken = opponentPokemonMoveEffectResult ? opponentPokemonMoveEffectResult.damage : 0;

        const isCritical = (myPokemonMoveEffectResult && myPokemonMoveEffectResult.isCritical) || (opponentPokemonMoveEffectResult && opponentPokemonMoveEffectResult.isCritical) || false;
        const isSuperEffective = (myPokemonMoveEffectResult && myPokemonMoveEffectResult.effectiveness > 1) || (opponentPokemonMoveEffectResult && opponentPokemonMoveEffectResult.effectiveness > 1) || false;
       
        const isOHKO = (opponentPokemonMoveEffectResult && (opponentPokemon && opponentPokemonMoveEffectResult.damage >= opponentPokemon.currentHp)) || false;
        const transformUsed = myPokemonMove?.name === 'transform' || false;
        const ppRunOut = (myPokemonMove && myPokemonMove.pp <= 0) || false;
        const leerGlareUsed = (myPokemonMove && (myPokemonMove.name ==='leer' || myPokemonMove.name ==='glare')) || false;
       
        const isSwitchedTurnOne = isSwitch && battleCummulativeStatsRef.current.turns === 0;
        if (isSwitch) {
            battleCummulativeStatsRef.current.switches += 1;
        }

        const useSameMove = (myPokemonMove && opponentPokemonMove && myPokemonMove.name === opponentPokemonMove.name) || false;
        const moveFailed = (myPokemonMoveEffectResult && !myPokemonMoveEffectResult.isHit) || false;
        const hyperBeamUsed = myPokemonMove?.name === 'hyper beam' || false;

        // Update battle cummulative stats here as needed
        const payload:  RecordBattleActionPayload = {
            damageDealt: damageDealt,
            damageTaken: damageTaken,
            isSuperEffective: isSuperEffective,
            isCritical: isCritical,
            isOHKO: isOHKO,
            transformUsed: transformUsed,
            ppRunOut: ppRunOut,
            leerGlareUsed: leerGlareUsed,
            switchedTurnOne: isSwitchedTurnOne,
            moveFailed: moveFailed,
            hyperBeamUsed: hyperBeamUsed,
            useSameMove: useSameMove
        }

        vscode.postMessage({
            command: MessageType.RecordBattleAction,
            ...payload
        });
    }, []);

    const onCatch = useCallback((
        opponentPokemon: PokemonDao | undefined,
        biome: string
    ): void => {
        if(opponentPokemon == undefined) {
            console.warn("BattleRecorder: Missing Pokemon data on catch.");
            return;
        }
        const hour = new Date().getHours();
        const payload :  RecordBattleCatchPayload = {
            pokemon: {
                id: opponentPokemon.id,
                types: opponentPokemon.types,
                isLegendary: opponentPokemon.isLegendary,
                isShiny: opponentPokemon.isShiny
            },
            location: {
                biome: biome
            },
            isCritical: Math.random() < 0.25, // Placeholder logic for critical catch
            time: hour
        }
        vscode.postMessage({
            command: MessageType.RecordBattleCatch,
            ...payload
        });
    }, []);

    return useMemo(() => ({
        onBattleFinished,
        onBattleAction,
        onCatch,
    }), [onBattleFinished, onBattleAction, onCatch]);
}
