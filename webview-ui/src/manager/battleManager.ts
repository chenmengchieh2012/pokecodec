import React, { useCallback, useEffect } from "react";
import { PokeBallDao } from "../dataAccessObj/pokeBall";
import { defaultPokemon, PokemonDao, PokemonState } from "../dataAccessObj/pokemon";
import { PokemonMove } from "../dataAccessObj/pokeMove";
import { usePokemonState } from "../hook/usePokemonState";
import { vscode } from "../utilities/vscode";
import { BattleEvent, BattleEventType, GameState } from "../dataAccessObj/battleTypes";
import { BattleCanvasHandle } from "../frame/VBattleCanvas";
import { BattleControlHandle } from "../frame/BattleControl";

const DEBUG = true
export interface BattleManagerMethod {
    handleOnAttack: (myPokemonMove: PokemonMove) =>Promise<void>,
    handleThrowBall: (ballDao: PokeBallDao)=>Promise<void>,
    handleRunAway: ()=>Promise<void>,
    handleSwitchMyPokemon: (newPokemon: PokemonDao) => Promise<void>,
    handleStart: (gameState: GameState)=>void,
}
export interface BattleManagerProps{
    dialogBoxRef : React.RefObject<BattleControlHandle|null>
    battleCanvasRef: React.RefObject<BattleCanvasHandle|null>
    defaultOpponentPokemon?: PokemonDao;
}


export interface BattleManagerState {
    myPokemon?: PokemonDao,
    myPokemonState: PokemonState,
    opponentPokemon?: PokemonDao,
    opponentPokemonState: PokemonState,
    myParty: PokemonDao[],
    gameState: GameState
}

export const BattleManager = ({dialogBoxRef, battleCanvasRef}: BattleManagerProps): [BattleManagerState, BattleManagerMethod] => {
    const [myParty, setParty] = React.useState<PokemonDao[]>([]);
    
    const { pokemonState: myPokemonState, pokemon: myPokemon, handler: myPokemonHandler } = usePokemonState( dialogBoxRef, {defaultPokemon: undefined } );
    const { pokemonState: opponentPokemonState, pokemon: opponentPokemon, handler: opponentPokemonHandler } = usePokemonState(  dialogBoxRef, {defaultPokemon: undefined } );
  
    const [gameState, setGameState] = React.useState<GameState>(GameState.Searching);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const myPokemonRef = React.useRef<PokemonDao>(myPokemon);
    const opponentPokemonRef = React.useRef<PokemonDao>(opponentPokemon);

    useEffect(()=>{
        myPokemonRef.current = myPokemon    
    },[myPokemon])
    useEffect(()=>{
        opponentPokemonRef.current = opponentPokemon    
    },[opponentPokemon])

    const onBattleEvent = useCallback((event: BattleEvent) => {
        switch (event.type) {
            case BattleEventType.AllMyPokemonFainted:
                setGameState(GameState.Searching);
                opponentPokemonHandler.resetPokemon();
                break;
            case BattleEventType.WildPokemonFaint:
                setGameState(GameState.Searching);
                opponentPokemonHandler.resetPokemon();
                break;
            case BattleEventType.Escaped:
                setGameState(GameState.Searching);
                opponentPokemonHandler.resetPokemon();
                break;
            // 可以在這裡處理捕獲成功的邏輯，如果 VBattle 有支援的話
        }
    },[opponentPokemonHandler])

    const handleAllMyPokemonFainted = useCallback(async () => {
        // 觸發昏厥動畫 (不移除 class 以保持隱藏狀態)
        await dialogBoxRef.current?.setText(`All of your Pokémon have fainted!`)
        await sleep(1000);
        onBattleEvent({
            type: BattleEventType.AllMyPokemonFainted,
            state: 'finish',
        });
    }, [dialogBoxRef, onBattleEvent]);


    const handleMyPokemonFaint = useCallback(async () => {
        battleCanvasRef.current?.handleMyPokemonFaint()
        dialogBoxRef.current?.openPartyMenu();
        onBattleEvent({
            type: BattleEventType.MyPokemonFaint,
            state: 'ongoing'
        });
        
        
    }, [battleCanvasRef, dialogBoxRef, onBattleEvent]);


    const handleOpponentPokemonFaint = useCallback(() => {
        onBattleEvent({
            type: BattleEventType.WildPokemonFaint,
            state: 'finish',
        });
    }, [onBattleEvent]);
    

    const handleAttackFromOpponent = useCallback(async (move : PokemonMove) => {
        battleCanvasRef.current?.handleAttackFromOpponent()
        if(opponentPokemonRef.current == undefined){
            throw new Error(" no opponent Pokemon")
        }
        const remainingHp = await myPokemonHandler.hited(opponentPokemonRef.current, move);
        if(remainingHp  === 0){
            handleMyPokemonFaint();
        }
        
        return remainingHp;
    }, [battleCanvasRef, handleMyPokemonFaint, myPokemonHandler]);

    const handleAttackToOpponent = useCallback(async (move : PokemonMove) => {
        battleCanvasRef.current?.handleAttackToOpponent()
        if(myPokemonRef.current == undefined){
            throw new Error(" no opponent Pokemon")
        }
        const remainingHp = await opponentPokemonHandler.hited(myPokemonRef.current, move);
        if(remainingHp  === 0){
            handleOpponentPokemonFaint();
        }

        return remainingHp;
    }, [opponentPokemonHandler, battleCanvasRef, handleOpponentPokemonFaint]);

    const handleOnAttack = useCallback(async (myPokemonMove: PokemonMove) => {
        if(opponentPokemonRef.current == undefined){
            throw new Error(" no opponent Pokemon")
        }
        if(myPokemonRef.current == undefined){
            throw new Error(" no opponent Pokemon")
        }
        if( myPokemonRef.current.stats.speed >= opponentPokemonRef.current.stats.speed ){
            const opponentHp = await handleAttackToOpponent(myPokemonMove);
            
            if(opponentHp > 0){
                const opponentMove = opponentPokemonHandler.randomMove();
                await handleAttackFromOpponent(opponentMove);
            }
        } else {
            const opponentMove = opponentPokemonHandler.randomMove();
            const myHp = await handleAttackFromOpponent(opponentMove);
            
            if(myHp > 0){
                await handleAttackToOpponent(myPokemonMove);
            }
        }
    },[handleAttackFromOpponent, handleAttackToOpponent, opponentPokemonHandler])


    const handleThrowBall = useCallback(async (ballDao: PokeBallDao) => {
        if(opponentPokemonRef.current == undefined){
            throw new Error(" no opponent Pokemon")
        }
        const currentOpponentPokemon = opponentPokemonRef.current;
        // Implement throw ball logic here
        const caught = await opponentPokemonHandler.throwBall(ballDao);
        
        if (caught) {
            // Wait for "Caught" animation (handled by opacity transition in render)
            await sleep(1000); 
            
            vscode.postMessage({ 
                command: 'catch', 
                text: `Caught ${currentOpponentPokemon.name} (Lv.${currentOpponentPokemon.level})!`,
                pokemon: currentOpponentPokemon
            });
            // 觸發戰鬥結束
            onBattleEvent({
                type: BattleEventType.WildPokemonFaint, // 借用 Faint 事件來結束戰鬥，或者可以新增 Caught 事件
                state: 'finish',
            });
        } else {
            // 沒抓到，對方攻擊
            const opponentMove = opponentPokemonHandler.randomMove();
            await handleAttackFromOpponent(opponentMove);
        }
    }, [opponentPokemonHandler, onBattleEvent, handleAttackFromOpponent]);

    const handleRunAway = useCallback(async () => {
        battleCanvasRef.current?.handleRunAway()
        onBattleEvent({
            type: BattleEventType.Escaped,
            state: 'finish',
        });
    }, [onBattleEvent,battleCanvasRef]);

    const handleSwitchMyPokemon = useCallback(async (newPokemon: PokemonDao) => {
        // 1. 執行切換
        battleCanvasRef.current?.handleSwitchPokemon()
        await myPokemonHandler.switchPokemon(newPokemon);
        const opponentMove = opponentPokemonHandler.randomMove();
        await handleAttackFromOpponent(opponentMove);
    }, [battleCanvasRef, myPokemonHandler, opponentPokemonHandler, handleAttackFromOpponent]);
    
    const handleStart = useCallback((gameState: GameState)=>{
        opponentPokemonHandler.resetPokemon()
        setGameState(gameState)
    },[opponentPokemonHandler])

    useEffect(()=>{
        vscode.postMessage({
            command: 'updatePartyPokemon',
            pokemon: myPokemon,
        });
    },[myPokemon])

    useEffect(() => {
      vscode.setState({
          gameState,
          myPokemon,
          opponentPokemon
      });
  }, [gameState, myPokemon, opponentPokemon]);
  
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'partyData') {
                setParty(message.data);
                const remainingHp = message.data.filter((p: PokemonDao) => (p.currentHp ?? p.stats?.hp ?? 0) > 0).length;
                if(remainingHp === 0 && handleAllMyPokemonFainted){
                    handleAllMyPokemonFainted();
                    return 
                }


                console.log('gameState',gameState)
                if(gameState === GameState.WildAppear){
                    console.log("Start initializing BattleControl...");
                    console.log("My Pokemon:", myPokemon);
                    if ((myPokemon && myPokemon.currentHp === 0)) {
                        for(const pkmn of message.data){
                            if(pkmn.currentHp && pkmn.currentHp > 0){
                                myPokemonHandler.switchPokemon(pkmn);
                                break;
                            }
                        }
                    }
                    if(DEBUG){
                        myPokemonHandler.switchPokemon(defaultPokemon)
                    }

                    if(!opponentPokemon){
                        opponentPokemonHandler.newEncounter();
                        dialogBoxRef.current?.setText("A Wild Pokemon appear!! ")
                    }

                    battleCanvasRef.current?.handleStart()
                    setGameState(GameState.Battle);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        vscode.postMessage({ command: 'getParty' });
        return () => window.removeEventListener('message', handleMessage);
    }, [battleCanvasRef, dialogBoxRef, gameState, handleAllMyPokemonFainted, myPokemon, myPokemonHandler, opponentPokemon, opponentPokemonHandler]);
    return [
        {
            myPokemon: myPokemon,
            myPokemonState: myPokemonState,
            opponentPokemon: opponentPokemon,
            opponentPokemonState: opponentPokemonState,
            myParty: myParty,
            gameState: gameState
        },
        {
            handleOnAttack,
            handleThrowBall,
            handleRunAway,
            handleSwitchMyPokemon,
            handleStart
        }
    ]
}