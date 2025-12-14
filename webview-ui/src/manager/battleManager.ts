import React, { useCallback, useEffect, useRef } from "react";
import { usePokemonState } from "../hook/usePokemonState";
import { vscode } from "../utilities/vscode";
import { BattleCanvasHandle } from "../frame/VBattleCanvas";
import { BattleControlHandle } from "../frame/BattleControl";
import { SequentialExecutor } from "../utilities/SequentialExecutor";
import { useMessageSubscription } from "../store/messageStore";
import { EncounterResult } from "../../../src/core/EncounterHandler";
import { ItemDao } from "../../../src/dataAccessObj/item";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { PokemonDao, PokemonState } from "../../../src/dataAccessObj/pokemon";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { BattleEvent, BattleEventType, GameState } from "../../../src/dataAccessObj/GameState";

export interface BattleManagerMethod {
    handleOnAttack: (myPokemonMove: PokemonMove) => Promise<void>,
    handleThrowBall: (ballDao: PokeBallDao) => Promise<void>,
    handleUseItem: (item: ItemDao) => Promise<void>,
    handleRunAway: () => Promise<void>,
    handleSwitchMyPokemon: (newPokemon: PokemonDao) => Promise<void>,
    handleStart: (gameState: GameState, encounterEvent: EncounterResult) => void,
}

export interface BattleManagerProps {
    dialogBoxRef: React.RefObject<BattleControlHandle | null>
    battleCanvasRef: React.RefObject<BattleCanvasHandle | null>
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

export const BattleManager = ({ dialogBoxRef, battleCanvasRef }: BattleManagerProps): [BattleManagerState, BattleManagerMethod] => {

    const [myParty, setParty] = React.useState<PokemonDao[]>([]);

    const { pokemonState: myPokemonState, pokemon: myPokemon, handler: myPokemonHandler } = usePokemonState(dialogBoxRef, { defaultPokemon: undefined });
    const { pokemonState: opponentPokemonState, pokemon: opponentPokemon, handler: opponentPokemonHandler } = usePokemonState(dialogBoxRef, { defaultPokemon: undefined });
    const previousGameStateRef = useRef<GameState>(GameState.Searching);
    const [gameState, setGameState] = React.useState<GameState>(GameState.Searching);

    // Sync battle state with extension
    useEffect(() => {
        const inBattle = (gameState !== GameState.Searching);
        console.log("[BattleManager] In Battle:", inBattle);
        if(previousGameStateRef.current === gameState && !inBattle) {
            console.log("[BattleManager] Not in Battle");
            return;
        }

        if(gameState === GameState.Searching) {
            console.log("[BattleManager] Exiting Battle");
            opponentPokemonHandler.resetPokemon();
        }
        console.log("[BattleManager] Updating Game State to extension:", gameState);
        vscode.postMessage({
            command: MessageType.SetGameState,
            gameState: gameState
        });
        previousGameStateRef.current = gameState;
    }, [gameState, opponentPokemonHandler]);

    // 1. 初始化 SequentialExecutor
    // 使用 useRef 確保在整個 Component 生命週期中只有這一個 Queue
    const queue = useRef(new SequentialExecutor()).current;

    // const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const myPokemonRef = React.useRef<PokemonDao>(myPokemon);
    const opponentPokemonRef = React.useRef<PokemonDao>(opponentPokemon);

    useEffect(() => {
        myPokemonRef.current = myPokemon
    }, [myPokemon])
    useEffect(() => {
        opponentPokemonRef.current = opponentPokemon
    }, [opponentPokemon])

    const onBattleEvent = useCallback((event: BattleEvent) => {
        switch (event.type) {
            case BattleEventType.Start:
                setGameState(GameState.Battle);
                break;
            case BattleEventType.MyPokemonFaint:
                // 戰鬥還在進行中，不改變狀態
                break;
            case BattleEventType.AllMyPokemonFainted:
                setGameState(GameState.Searching);
                break;
            case BattleEventType.WildPokemonFaint:
                setGameState(GameState.Searching);
                break;
            case BattleEventType.Escaped:
                setGameState(GameState.Searching);
                break;
        }
    }, [])

    const handleBattleStart = useCallback(async () => {
        console.log("Battle Start!");
        
        // 1. 先切換狀態讓 UI Render 出 BattleControl
        onBattleEvent({
            type: BattleEventType.Start,
            state: 'ongoing',
        });

        // 2. 等待 React Render 完成 (確保 dialogBoxRef 已經掛載)
        // 使用輪詢 (Polling) 方式等待 Ref 準備好，比固定 setTimeout 更穩定
        let attempts = 0;
        while (!dialogBoxRef.current && attempts < 40) { // Timeout after 2s
            await new Promise(r => setTimeout(r, 50));
            attempts++;
        }

        // 3. 顯示文字
        await dialogBoxRef.current?.setText("A Wild Pokemon appear!! ")
        
        console.log("Start initializing BattleControl...");
        console.log("My Pokemon:", myPokemonRef.current);
    },[dialogBoxRef, onBattleEvent])

    const handleAllMyPokemonFainted = useCallback(async () => {
        await dialogBoxRef.current?.setText(`All of your Pokémon have fainted!`)
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


    // 內部 Helper 不需包裝 Queue，因為它們是被外部包裝過的方法呼叫的
    const handleAttackFromOpponent = useCallback(async (move: PokemonMove) => {
        if (opponentPokemonRef.current == undefined) {
            throw new Error(" no opponent Pokemon")
        }

        // 1. Decrement PP for the move used by opponent Pokemon
        opponentPokemonHandler.decrementPP(move);

        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackFromOpponent()
        
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const remainingHp = await myPokemonHandler.hited(opponentPokemonRef.current, move);
        
        if (remainingHp === 0) {
            handleMyPokemonFaint();
        }

        return remainingHp;
    }, [battleCanvasRef, handleMyPokemonFaint, myPokemonHandler, opponentPokemonHandler]);

    const handleAttackToOpponent = useCallback(async (move: PokemonMove) => {
        if (myPokemonRef.current == undefined) {
            throw new Error(" no opponent Pokemon")
        }
        // 1. Decrement PP for the move used by my Pokemon
        myPokemonHandler.decrementPP(move);
        
        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackToOpponent()
        
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const remainingHp = await opponentPokemonHandler.hited(myPokemonRef.current, move);
        
        if (remainingHp === 0) {
            handleOpponentPokemonFaint();
        }

        return remainingHp;
    }, [opponentPokemonHandler, battleCanvasRef, handleOpponentPokemonFaint, myPokemonHandler]);

    const handleOnAttack = useCallback(async (myPokemonMove: PokemonMove) => {
        // 使用 queue.execute 包裝整個回合邏輯
        await queue.execute(async () => {
            if (opponentPokemonRef.current == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                console.warn("Opponent is missing, attack aborted.");
                return;
            }
            if (myPokemonRef.current == undefined) {
                return;
            }
            
            // 速度判斷與攻擊順序邏輯
            if (myPokemonRef.current.stats.speed >= opponentPokemonRef.current.stats.speed) {
                // 我方先攻
                const opponentHp = await handleAttackToOpponent(myPokemonMove);
                
                // 如果對方還活著，對方反擊
                if (opponentHp > 0) {
                    const opponentMove = opponentPokemonHandler.randomMove();
                    await handleAttackFromOpponent(opponentMove);
                }
            } else {
                // 對方先攻
                const opponentMove = opponentPokemonHandler.randomMove();
                const myHp = await handleAttackFromOpponent(opponentMove);
                
                // 如果我方還活著，我方反擊
                if (myHp > 0) {
                    await handleAttackToOpponent(myPokemonMove);
                }
            }
        });
    }, [handleAttackFromOpponent, handleAttackToOpponent, opponentPokemonHandler, queue]);


    const handleThrowBall = useCallback(async (ballDao: PokeBallDao) => {
        await queue.execute(async () => {
            if (opponentPokemonRef.current == undefined) {
                return;
            }
            const currentOpponentPokemon = opponentPokemonRef.current;
            
            // 扣除道具
            vscode.postMessage({
                command: MessageType.RemoveItem,
                item: ballDao,
                count: 1
            });

            // 執行丟球邏輯
            const caught = await opponentPokemonHandler.throwBall(ballDao);

            if (caught) {
                // Wait for "Caught" animation
                currentOpponentPokemon.caughtBall = ballDao.apiName;
                vscode.postMessage({
                    command: MessageType.Catch,
                    text: `Caught ${currentOpponentPokemon.name} (Lv.${currentOpponentPokemon.level})!`,
                    pokemon: currentOpponentPokemon,
                });
                onBattleEvent({
                    type: BattleEventType.WildPokemonFaint,
                    state: 'finish',
                });
            } else {
                // 沒抓到，對方攻擊
                const opponentMove = opponentPokemonHandler.randomMove();
                await handleAttackFromOpponent(opponentMove);
            }
        });
    }, [opponentPokemonHandler, onBattleEvent, handleAttackFromOpponent, queue]);

    const handleUseItem = useCallback(async (item: ItemDao) => {
        await queue.execute(async () => {
            // 1. Send message to extension to consume item
            vscode.postMessage({
                command: MessageType.RemoveItem,
                item: item,
                count: 1
            });

            // 2. Apply effect
            if (item.effect && item.effect.healHp) {
                await myPokemonHandler.heal(item.effect.healHp);
                await dialogBoxRef.current?.setText(`Used ${item.name}!`);
                await dialogBoxRef.current?.setText(`Restored ${item.effect.healHp} HP!`);
            } else {
                await dialogBoxRef.current?.setText(`Used ${item.name}!`);
            }

            // 3. Opponent turn
            // 只有在戰鬥中且對方存在才反擊
            if (opponentPokemonRef.current && opponentPokemonRef.current.currentHp && opponentPokemonRef.current.currentHp > 0) {
                const opponentMove = opponentPokemonHandler.randomMove();
                await handleAttackFromOpponent(opponentMove);
            }
        });
    }, [myPokemonHandler, dialogBoxRef, opponentPokemonHandler, handleAttackFromOpponent, queue]);

    const handleRunAway = useCallback(async () => {
        await queue.execute(async () => {
            battleCanvasRef.current?.handleRunAway()
            await dialogBoxRef.current?.setText("Got away safely!");
            onBattleEvent({
                type: BattleEventType.Escaped,
                state: 'finish',
            });
        });
    }, [queue, battleCanvasRef, dialogBoxRef, onBattleEvent]);

    const handleSwitchMyPokemon = useCallback(async (newPokemon: PokemonDao) => {
        await queue.execute(async () => {
             // 確保換上的不是同一隻 (雖然 UI 層可能擋掉了，但這裡再防一次)
             if(newPokemon.uid === myPokemonRef.current?.uid) return;

            // 1. 執行切換動畫與邏輯
            battleCanvasRef.current?.handleSwitchPokemon()
            await myPokemonHandler.switchPokemon(newPokemon);
            
            // 2. 對方攻擊 (換人會被打)
            // 檢查對方是否還活著 (雖通常換人時對方都在)
            if (opponentPokemonRef.current) {
                const opponentMove = opponentPokemonHandler.randomMove();
                await handleAttackFromOpponent(opponentMove);
            }
        });
    }, [battleCanvasRef, myPokemonHandler, opponentPokemonHandler, handleAttackFromOpponent, queue]);

    const handleStart = useCallback(async (gameState: GameState, encounterResult: EncounterResult) => {
        await queue.execute(async () => {
            if (gameState === GameState.WildAppear) {
                if (!opponentPokemonRef.current) {
                    opponentPokemonHandler.newEncounter(encounterResult);
                }

                if(myPokemonRef.current !== undefined ) {
                    await handleBattleStart();

                    // 要先等開始才能設定
                    battleCanvasRef.current?.handleStart(encounterResult.biomeType)
                }else{
                    handleAllMyPokemonFainted();
                }
            }else{
                opponentPokemonHandler.resetPokemon();
            }
        });
    }, [battleCanvasRef, handleAllMyPokemonFainted, handleBattleStart, opponentPokemonHandler, queue])

    useEffect(() => {
        vscode.postMessage({
            command: MessageType.UpdatePartyPokemon,
            pokemon: myPokemon,
        });
    }, [myPokemon])

    useMessageSubscription<PokemonDao[]>(MessageType.PartyData, async (message) => {
        const newParty = message.data ?? [];
        setParty(newParty);
        if (gameState === GameState.Searching) {
            if( !myPokemonRef.current ) {
                 for (const pkmn of newParty) {
                    if (pkmn.currentHp && pkmn.currentHp > 0) {
                        await myPokemonHandler.switchPokemon(pkmn);
                        break;
                    }
                }
            }
            return;
        }
    });

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
            handleUseItem,
            handleRunAway,
            handleSwitchMyPokemon,
            handleStart
        }
    ]
}