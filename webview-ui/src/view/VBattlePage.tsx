import { useRef } from 'react';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { BattleControl, BattleControlHandle } from '../frame/BattleControl';
import { BattleCanvasHandle, VBattleCanvas } from '../frame/VBattleCanvas';
import { VSearchScene } from '../frame/VSearchScene';
import { BattleManager } from '../manager/battleManager';
import styles from './VBattlePage.module.css';

// 定義遊戲狀態


export const VBattlePage = () => {
    const dialogBoxRef = useRef<BattleControlHandle>(null)
    const battleCanvasRef = useRef<BattleCanvasHandle>(null)
    const [battleManagerState, battleManagerMethod] = BattleManager({
        dialogBoxRef:dialogBoxRef,
        battleCanvasRef: battleCanvasRef
    })
    const gameState = battleManagerState.gameState
    const myPokemon = battleManagerState.myPokemon
    const myParty = battleManagerState.myParty
    const opponentPokemon = battleManagerState.opponentPokemon
    const mutex = battleManagerState.mutex
   
    // console.log("[VBattlePage] Rendering VBattlePage with gameState:", gameState);

  return (
    <div className={styles["game-container"]}>
      {gameState === GameState.Searching ? (
             <VSearchScene 
                myPokemon={myPokemon} 
             />
        ) : (
            <>
            <VBattleCanvas  
                ref={battleCanvasRef}
                myPokemon={myPokemon} 
                opponentPokemon={opponentPokemon}
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
