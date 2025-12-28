import { useCallback, useRef } from "react";
import { PokemonDao } from "../../../src/dataAccessObj/pokemon";
import { vscode } from "../utilities/vscode";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import { MoveEffectResult } from "../../../src/utils/MoveEffectCalculator";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { getDefaultBattleCummulativeStats, RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleCummulativeStats, RecordBattleFinishedPayload } from "../../../src/utils/AchievementCritiria";

export interface BattleRecoderInitProps {
    myPokemonRef: React.RefObject<PokemonDao|undefined>;
    opponentPokemonRef: React.RefObject<PokemonDao|undefined>;
    myPartyRef: React.RefObject<PokemonDao[]>;
}

export interface BattleRecorderHandler {
    onBattleFinished: () => void;
    onBattleAction: (
        isSwitch: boolean,
        myPokemonMoveEffectResult?: MoveEffectResult, 
        opponentPokemonMoveEffectResult?: MoveEffectResult,
        myPokemonMove?: PokemonMove,
        opponentPokemonMove?: PokemonMove,
    ) => void;
    onCatch: () => void;
}

export const BattleRecorder = (props: BattleRecoderInitProps) => {
    const battleCummulativeStatsRef = useRef< RecordBattleCummulativeStats>(getDefaultBattleCummulativeStats());
    const myPokemonRef = props.myPokemonRef;;
    const opponentPokemonRef = props.opponentPokemonRef;
    const myPartyRef = props.myPartyRef;
    const biomeRef = useRef<string>("");


    const onBattleFinished = useCallback((): void => {
        if (!myPokemonRef.current || !opponentPokemonRef.current) {
            console.warn("BattleRecorder: Missing Pokemon data on battle finished.");
            return;
        }
        const won = myPokemonRef.current.currentHp > 0 && opponentPokemonRef.current.currentHp <= 0;
        const stats = battleCummulativeStatsRef.current;
        const payload:  RecordBattleFinishedPayload = {
            won: won,
            myParty: myPartyRef.current.map(p => ({ 
                id: p.id,
                level: p.level,
                hp: p.currentHp,
                types: p.types,
            })),
            opponent: {
                level: opponentPokemonRef.current.level,
                types: opponentPokemonRef.current.types,
                isLegendary: opponentPokemonRef.current.isLegendary,
            }, 
            stats: stats
        }
        vscode.postMessage({
            command: MessageType. RecordBattleFinished,
            ...payload
        });
    },[myPartyRef, myPokemonRef, opponentPokemonRef]);

    const onBattleAction = useCallback((
        isSwitch: boolean,
        myPokemonMoveEffectResult?: MoveEffectResult, 
        opponentPokemonMoveEffectResult?: MoveEffectResult,
        myPokemonMove?: PokemonMove,
        opponentPokemonMove?: PokemonMove,
    )=>{
        battleCummulativeStatsRef.current.turns += 1;
        const damageDealt = myPokemonMoveEffectResult ? myPokemonMoveEffectResult.damage : 0;
        const damageTaken = opponentPokemonMoveEffectResult ? opponentPokemonMoveEffectResult.damage : 0;

        const isCritical = (myPokemonMoveEffectResult && myPokemonMoveEffectResult.isCritical) || (opponentPokemonMoveEffectResult && opponentPokemonMoveEffectResult.isCritical) || false;
        const isSuperEffective = (myPokemonMoveEffectResult && myPokemonMoveEffectResult.effectiveness > 1) || (opponentPokemonMoveEffectResult && opponentPokemonMoveEffectResult.effectiveness > 1) || false;
       
        const isOHKO = (opponentPokemonMoveEffectResult && (opponentPokemonRef.current && opponentPokemonMoveEffectResult.damage >= opponentPokemonRef.current?.currentHp)) || false;
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
            command: MessageType. RecordBattleAction,
            ...payload
        });
    }, [opponentPokemonRef]);

    const onCatch = useCallback((): void => {
        if(opponentPokemonRef.current == undefined) {
            console.warn("BattleRecorder: Missing Pokemon data on catch.");
            return;
        }
        const hour = new Date().getHours();
        const payload :  RecordBattleCatchPayload = {
            pokemon: {
                id: opponentPokemonRef.current.id,
                types: opponentPokemonRef.current.types,
                isLegendary: opponentPokemonRef.current.isLegendary,
                isShiny: opponentPokemonRef.current.isShiny
            },
            location: {
                biome: biomeRef.current
            },
            isCritical: Math.random() < 0.25, // Placeholder logic for critical catch
            time: hour
        }
        vscode.postMessage({
            command: MessageType.RecordBattleCatch,
            ...payload
        });
    }, [opponentPokemonRef]);

    return {
        onBattleFinished,
        onBattleAction,
        onCatch,
    }
}