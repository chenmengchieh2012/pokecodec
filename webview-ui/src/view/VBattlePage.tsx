import { useRef, useState } from 'react';
import { BattleCanvasHandle, VBattleCanvas } from '../frame/VBattleCanvas';
import { VSearchScene } from '../frame/VSearchScene';
import { BattleControl, BattleControlHandle } from '../frame/BattleControl';
import { BattleManager } from '../manager/battleManager';
import styles from './VBattlePage.module.css';
import { useMessageSubscription } from '../store/messageStore';
import { EncounterResult } from '../../../src/core/EncounterHandler';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { SetGameStateDataPayload } from '../../../src/dataAccessObj/MessagePayload';
import { vscode } from '../utilities/vscode';

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
    const mutex = battleManagerState.mutex
    
    const [isEncountering, setIsEncountering] = useState(false);
    
  
    useMessageSubscription<EncounterResult>(MessageType.TriggerEncounter, (message) => {
        if (message.data === undefined) {
            return;
        }
        // Prevent multiple triggers if already encountering or in battle
        if (isEncountering || gameState !== GameState.Searching) {
            return;
        }

        const data = message.data as EncounterResult;
        
        setIsEncountering(true);
        // Wait for the encounter animation (flash) in VSearchScene to finish
        setTimeout(() => {
            setIsEncountering(false);

            const payload: SetGameStateDataPayload = {
                gameStateData: {
                    state: GameState.WildAppear,
                    encounterResult: data,
                    defendPokemon: myPokemon
                }
            }
            vscode.postMessage({
                command: MessageType.SetGameStateData,
                ...payload
            });

        }, 1500);
    });

    console.log("[VBattlePage] Rendering VBattlePage with gameState:", gameState);

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
                mutex={mutex}
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
