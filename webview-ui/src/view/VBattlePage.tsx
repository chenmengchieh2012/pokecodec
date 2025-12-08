import { useEffect, useRef } from 'react';
import { BattleCanvasHandle, VBattleCanvas } from '../frame/VBattleCanvas';
import { VSearchScene } from '../frame/VSearchScene';
import { BattleControl, BattleControlHandle } from '../frame/BattleControl';
import { BattleManager } from '../manager/battleManager';
import { GameState } from '../dataAccessObj/battleTypes';

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
    
  
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        if (message.type === 'encounter') {
            battleManagerMethod.handleStart(GameState.WildAppear);
        }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [battleManagerMethod]);


  return (
    <div className="game-container">
      {gameState === GameState.Searching ? (
             <VSearchScene 
                myPokemon={myPokemon} 
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
