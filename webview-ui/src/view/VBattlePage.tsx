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
    dialogBoxRef: dialogBoxRef,
    battleCanvasRef: battleCanvasRef
  })
  const gameState = battleManagerState.gameState
  const battleMode = battleManagerState.battleMode
  const myPokemon = battleManagerState.myPokemon
  const myParty = battleManagerState.myParty
  const opponentParty = battleManagerState.opponentParty
  const opponentPokemon = battleManagerState.opponentPokemon
  const mutex = battleManagerState.mutex

  // console.log("[VBattlePage] Rendering VBattlePage with gameState:", gameState);

  return (
    <div className={styles["game-container"]}>
      {gameState === GameState.Searching ? (
        <VSearchScene myParty={myParty}/>
      ) : (
        <>
          <VBattleCanvas
            ref={battleCanvasRef}
            myPokemon={myPokemon}
            opponentPokemon={opponentPokemon}
            myParty={myParty}
            opponentParty={opponentParty}
            battleMode={battleMode}
          />
          <BattleControl
            myPokemon={myPokemon}
            myParty={myParty}
            mutex={mutex}
            battleMode={battleMode}
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
