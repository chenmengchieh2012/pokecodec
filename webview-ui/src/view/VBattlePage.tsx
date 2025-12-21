import { useEffect, useRef, useState } from 'react';
import { BattleCanvasHandle, VBattleCanvas } from '../frame/VBattleCanvas';
import { VSearchScene } from '../frame/VSearchScene';
import { BattleControl, BattleControlHandle } from '../frame/BattleControl';
import { BattleManager } from '../manager/battleManager';
import styles from './VBattlePage.module.css';
import { useMessageSubscription } from '../store/messageStore';
import { EncounterResult } from '../../../src/core/EncounterHandler';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { vscode } from '../utilities/vscode';
import { SetGameStatePayload } from '../../../src/dataAccessObj/MessagePayload';

// 定義遊戲狀態


export const VBattlePage = () => {
    const dialogBoxRef = useRef<BattleControlHandle>(null)
    const battleCanvasRef = useRef<BattleCanvasHandle>(null)
    const [battleManagerState, battleManagerMethod] = BattleManager({
        dialogBoxRef:dialogBoxRef,
        battleCanvasRef: battleCanvasRef
    })
    const gameState = battleManagerState.gameState
    const myPokemonState = battleManagerState.myPokemonState
    const myPokemon = battleManagerState.myPokemon
    const myParty = battleManagerState.myParty
    const opponentPokemon = battleManagerState.opponentPokemon
    const opponentPokemonState = battleManagerState.opponentPokemonState
    
    const [isEncountering, setIsEncountering] = useState(false);
  
    useMessageSubscription<EncounterResult>(MessageType.TriggerEncounter, (message) => {
        if (message.data === undefined) {
            return;
        }
        const data = message.data as EncounterResult;
        
        setIsEncountering(true);
        // Wait for the encounter animation (flash) in VSearchScene to finish
        setTimeout(() => {
            setIsEncountering(false);
            battleManagerMethod.handleStart(GameState.WildAppear, data);
        }, 1500);
    });

    useEffect(() => {
        const payload : SetGameStatePayload = {
            gameState: GameState.Searching
        }
        vscode.postMessage({
            command: MessageType.SetGameState,
            ...payload
        });
    }, []);


  return (
    <div className={styles["game-container"]}>
      {gameState === GameState.Searching ? (
             <VSearchScene 
                myPokemon={myPokemon} 
                isEncountering={isEncountering}
             />
        ) : (
            <>
            <VBattleCanvas  
                ref={battleCanvasRef}
                myPokemon={myPokemon} 
                myPokemonState={myPokemonState}
                opponentPokemon={opponentPokemon}
                opponentPokemonState={opponentPokemonState}
            />
            <BattleControl
                myPokemon={myPokemon}
                myParty={myParty}
                ref={dialogBoxRef}
                handleOnAttack={battleManagerMethod.handleOnAttack}
                handleThrowBall={battleManagerMethod.handleThrowBall}
                handleUseItem={battleManagerMethod.handleUseItem}
                handleRunAway={battleManagerMethod.handleRunAway}
                handleSwitchMyPokemon={battleManagerMethod.handleSwitchMyPokemon} 
            />
            </>
        )}
    </div>
  );
};
