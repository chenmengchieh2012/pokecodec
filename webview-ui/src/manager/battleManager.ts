import React, { useCallback, useEffect, useRef } from "react";
import { PokemonStateHandler, usePokemonState } from "../hook/usePokemonState";
import { vscode } from "../utilities/vscode";
import { BattleCanvasHandle } from "../frame/VBattleCanvas";
import { BattleControlHandle } from "../frame/BattleControl";
import { SequentialExecutor } from "../utilities/SequentialExecutor";
import { useMessageSubscription } from "../store/messageStore";
import { EncounterResult } from "../../../src/core/EncounterHandler";
import { ItemDao } from "../../../src/dataAccessObj/item";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { getGenById, PokemonDao, PokemonState } from "../../../src/dataAccessObj/pokemon";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { BattleEvent, BattleEventType, GameState } from "../../../src/dataAccessObj/GameState";
import { ExperienceCalculator } from "../utilities/ExperienceCalculator";
import { PokeDexEntryStatus } from "../../../src/dataAccessObj/PokeDex";
import { CapitalizeFirstLetter } from "../utilities/util";
import { BattleRecorder } from "./battleRecorder";
import { BiomeType } from "../../../src/dataAccessObj/BiomeData";
import { ItemRecorder } from "./itemRecorder";
import { GetEmptyMoveEffectResult, MoveEffectResult } from "../../../src/utils/MoveEffectCalculator";

export interface BattleManagerMethod {
    handleOnAttack: (myPokemonMove: PokemonMove) => Promise<void>,
    handleThrowBall: (ballDao: PokeBallDao) => Promise<void>,
    handleUseItem: (item: ItemDao, targetMove?: PokemonMove) => Promise<void>,
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

    // Refs for BattleRecorder and internal logic
    const myPokemonRef = React.useRef<PokemonDao>(myPokemon);
    const opponentPokemonRef = React.useRef<PokemonDao>(opponentPokemon);
    const myPartyRef = React.useRef<PokemonDao[]>(myParty);
    const battleBiomeRecorderRef = React.useRef<BiomeType>(BiomeType.None);
    const runAttemptsRef = useRef<number>(0);

    // Update refs when state changes
    useEffect(() => {
        myPokemonRef.current = myPokemon;
    }, [myPokemon]);

    useEffect(() => {
        opponentPokemonRef.current = opponentPokemon;
    }, [opponentPokemon]);

    useEffect(() => {
        myPartyRef.current = myParty;
    }, [myParty]);

    const battleRecorderRef = BattleRecorder({
        myPokemonRef: myPokemonRef,
        opponentPokemonRef: opponentPokemonRef,
        myPartyRef: myPartyRef,
        battleBiomeRef: battleBiomeRecorderRef,
    });

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

    const onBattleEvent = useCallback(async (event: BattleEvent) => {
        switch (event.type) {
            case BattleEventType.RoundFinish:{ 
                await queue.execute(async () => {
                    await myPokemonHandler.onRoundFinish();
                    await opponentPokemonHandler.onRoundFinish();
                    const myPokemonFainted = myPokemonRef.current?.currentHp === 0;
                    const opponentPokemonFainted = opponentPokemonRef.current?.currentHp === 0;
                    if( opponentPokemonFainted ) {
                        battleCanvasRef.current?.handleOpponentPokemonFaint()
                        const expGain = ExperienceCalculator.calculateExpGain(opponentPokemonRef.current!);
                        myPokemonHandler.increaseExp(expGain);
                        await dialogBoxRef.current?.setText(`${opponentPokemonRef.current?.name.toUpperCase()} fainted!`);
                        await dialogBoxRef.current?.setText(`Gained ${expGain} EXP!`);
                        console.log("[BattleManager] Opponent Fainted");
                        event.state = 'finish';
                    }

                    if( myPokemonFainted ) {
                        await dialogBoxRef.current?.setText(`${myPokemonRef.current?.name.toUpperCase()} fainted!`);
                        battleCanvasRef.current?.handleMyPokemonFaint()
                        const filterMyParty = myPartyRef.current.filter(p => p.uid !== myPokemonRef.current?.uid && p.currentHp > 0);
                        if(filterMyParty.length === 0) {
                            await dialogBoxRef.current?.setText(`All of your Pokémon have fainted!`);
                            console.log("[BattleManager] All My Pokemon Fainted");
                            event.state = 'finish';
                        } else {
                            await dialogBoxRef.current?.openPartyMenu();
                        }
                    }

                    vscode.postMessage({
                        command: MessageType.UpdatePartyPokemon,
                        pokemon: myPokemonRef.current,
                    });
                });
                break; 
            }
            case BattleEventType.Start:{
                break;
            }
            case BattleEventType.MyPokemonFaint:
                break;
            case BattleEventType.WildPokemonCatched:{ 
                await queue.execute(async () => {
                    const catchedPokemon = opponentPokemonRef.current;
                    if(catchedPokemon == undefined) {
                        return
                    }
                    const gen = getGenById(catchedPokemon.id)
                    if(gen != undefined) {
                        vscode.postMessage({
                            command: MessageType.UpdatePokeDex,
                            pokemonId: catchedPokemon.id,
                            status: PokeDexEntryStatus.Caught,
                            gen: gen,
                        })
                    }
                    battleBiomeRecorderRef.current = BiomeType.None;
                });
                break; 
            }
            case BattleEventType.WildPokemonFaint:
            case BattleEventType.Escaped:
            case BattleEventType.AllMyPokemonFainted:{
                break; 
            }
        }

        switch (event.state) {
            case 'ongoing':
                setGameState(GameState.Battle);
                break;
            case 'finish':{
                console.log("[BattleManager] Battle Finished Event:", event.state);
                const catchedPokemon = opponentPokemonRef.current;
                if(catchedPokemon == undefined) {
                    console.warn("No opponent Pokemon found on battle end.", event.state);
                    return
                }
                const gen = getGenById(catchedPokemon.id)
                if(gen != undefined) {
                    vscode.postMessage({
                        command: MessageType.UpdatePokeDex,
                        pokemonId: catchedPokemon.id,
                        status: PokeDexEntryStatus.Seen,
                        gen: gen,
                    })
                }
                battleBiomeRecorderRef.current = BiomeType.None;
                battleRecorderRef.onBattleFinished()
                setGameState(GameState.Searching);
                break; 
            }
        }
    }, [battleCanvasRef, battleRecorderRef, dialogBoxRef, myPokemonHandler, opponentPokemonHandler, queue])

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

    // const handleAllMyPokemonFainted = useCallback(async () => {
    //     await dialogBoxRef.current?.setText(`All of your Pokémon have fainted!`)
    //     onBattleEvent({
    //         type: BattleEventType.AllMyPokemonFainted,
    //         state: 'finish',
    //     });
    // }, [dialogBoxRef, onBattleEvent]);


    // const handleMyPokemonFaint = useCallback(async () => {
    //     battleCanvasRef.current?.handleMyPokemonFaint()
    //     dialogBoxRef.current?.openPartyMenu();
    //     myPokemonHandler.updateAilment('fainted');
    //     onBattleEvent({
    //         type: BattleEventType.MyPokemonFaint,
    //         state: 'ongoing'
    //     });
    // }, [battleCanvasRef, dialogBoxRef, myPokemonHandler, onBattleEvent]);


    // const handleOpponentPokemonFaint = useCallback(() => {
    //     battleCanvasRef.current?.handleOpponentPokemonFaint()

    //     const expGain = ExperienceCalculator.calculateExpGain(opponentPokemonRef.current!);
       
    //     myPokemonHandler.increaseExp(expGain);

    //     onBattleEvent({
    //         type: BattleEventType.WildPokemonFaint,
    //         state: 'finish',
    //     });
    // }, [battleCanvasRef, myPokemonHandler, onBattleEvent]);


    const checkAilmentBeforeAttack = useCallback(async (attacker: PokemonDao, attackerHandler: PokemonStateHandler, attackerMove: PokemonMove): Promise<boolean> => {
        // 0. 異常狀態影響
        if (attacker.ailment === 'paralysis') {
            const rand = Math.random();
            if (rand < 0.25) {
                await dialogBoxRef.current?.setText(`${attacker.name.toUpperCase()} is paralyzed! It can't move!`);
                return false;
            }
        }

        if (attacker.ailment === 'sleep' && attackerMove.name !== 'snore' && attackerMove.name !== 'sleep talk') {
            await dialogBoxRef.current?.setText(`${attacker.name.toUpperCase()} is fast asleep!`);
            return false;
        }
        
        if (attacker.ailment === 'freeze' && attackerMove.name !== 'thaw') {
            await dialogBoxRef.current?.setText(`${attacker.name.toUpperCase()} is frozen solid! It can't move!`);
            return false;
        }

        if (attackerHandler.getBattleState().flinched) {
            await dialogBoxRef.current?.setText(`${attacker.name} flinched and couldn't move!`);
            return false;
        }


        if (attackerHandler.getBattleState().confused) {
            const rand = Math.random();
            if (rand < 0.5) {
                await dialogBoxRef.current?.setText(`${attacker.name} is confused! It hurt itself in its confusion!`);
                const decreasedHp = Math.floor(attacker.currentHp / 8);
                attackerHandler.heal(decreasedHp);
            }
            return false;
        }

        return true;
    }, [dialogBoxRef]);

    // 內部 Helper 不需包裝 Queue，因為它們是被外部包裝過的方法呼叫的
    const handleAttackFromOpponent = useCallback(async (move: PokemonMove):
        Promise<{moveEffectResult: MoveEffectResult; remainingHp: number}> => {
        if (opponentPokemonRef.current == undefined) {
            throw new Error(" no opponent Pokemon")
        }

        const canAttack = await checkAilmentBeforeAttack(opponentPokemonRef.current, opponentPokemonHandler, move);
        if (!canAttack) {
            return {moveEffectResult: GetEmptyMoveEffectResult(), remainingHp: myPokemonRef.current ? myPokemonRef.current.currentHp : 0};
        }

        // 1. Decrement PP for the move used by opponent Pokemon
        opponentPokemonHandler.decrementPP(move);

        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackFromOpponent()
        
        await dialogBoxRef.current?.setText(`${opponentPokemonRef.current.name.toUpperCase()} used ${move.name.toUpperCase()}!`);
        
        const attackerState = opponentPokemonHandler.getBattleState();
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const {newHp: remainingHp, moveEffectResult} = await myPokemonHandler.hited(opponentPokemonRef.current, attackerState, move);
        
        
        // 4. 屬性相剋文字提示
        if (moveEffectResult.effectiveness >= 2.0) {
            await dialogBoxRef.current?.setText("It's super effective!");
        } else if (moveEffectResult.effectiveness > 0 && moveEffectResult.effectiveness < 1.0) {
            await dialogBoxRef.current?.setText("It's not very effective...");
        } else if (moveEffectResult.effectiveness === 0) {
            await dialogBoxRef.current?.setText("It had no effect...");
        }

        // 5. 爆擊文字提示
        if (moveEffectResult.isCritical) {
            await dialogBoxRef.current?.setText("A critical hit!");
        }

        // 6. 檢查是否昏厥
        // if (remainingHp === 0) {
        //     await dialogBoxRef.current?.setText(`${myPokemonRef.current?.name.toUpperCase()} fainted!`);
        //     handleMyPokemonFaint();
        // }

        // 7. 攻擊狀態調整
        myPokemonHandler.useMoveEffect(moveEffectResult);
        opponentPokemonHandler.useMoveEffect(moveEffectResult);

        return {moveEffectResult,remainingHp};
    }, [battleCanvasRef, checkAilmentBeforeAttack, dialogBoxRef, myPokemonHandler, opponentPokemonHandler]);

    const handleAttackToOpponent = useCallback(async (move: PokemonMove) : Promise<{moveEffectResult: MoveEffectResult; remainingHp: number}>    => {
        if (myPokemonRef.current == undefined) {
            throw new Error(" no opponent Pokemon")
        }

        const canAttack = await checkAilmentBeforeAttack(myPokemonRef.current, myPokemonHandler, move);
        if (!canAttack) {
            return {moveEffectResult: GetEmptyMoveEffectResult(), remainingHp: opponentPokemonRef.current ? opponentPokemonRef.current.currentHp : 0};
        }

        // 1. Decrement PP for the move used by my Pokemon
        myPokemonHandler.decrementPP(move);
        
        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackToOpponent()
        
        await dialogBoxRef.current?.setText(`${myPokemonRef.current?.name.toUpperCase()} used ${move.name}!`);
        
        const attackerState = myPokemonHandler.getBattleState();
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const {newHp: remainingHp, moveEffectResult} = await opponentPokemonHandler.hited(myPokemonRef.current, attackerState, move);
        
        
        // 4. 屬性相剋文字提示
        if (moveEffectResult.effectiveness >= 2.0) {
            await dialogBoxRef.current?.setText("It's super effective!");
        } else if (moveEffectResult.effectiveness > 0 && moveEffectResult.effectiveness < 1.0) {
            await dialogBoxRef.current?.setText("It's not very effective...");
        } else if (moveEffectResult.effectiveness === 0) {
            await dialogBoxRef.current?.setText("It had no effect...");
        }

        // 5. 爆擊文字提示
        if (moveEffectResult.isCritical) {
            await dialogBoxRef.current?.setText("A critical hit!");
        }

        // 6. 檢查是否昏厥
        // if (remainingHp === 0) {
        //     await dialogBoxRef.current?.setText(`${opponentPokemonRef.current?.name.toUpperCase()} fainted!`);
        //     handleOpponentPokemonFaint();
        // }

        // 7. 攻擊狀態調整
        myPokemonHandler.useMoveEffect(moveEffectResult);
        opponentPokemonHandler.useMoveEffect(moveEffectResult);

        return {moveEffectResult,remainingHp};
    }, [checkAilmentBeforeAttack, myPokemonHandler, battleCanvasRef, dialogBoxRef, opponentPokemonHandler]);

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
            console.log(`[BattleManager] Speeding to attack. My Speed: ${myPokemonRef.current.stats.speed}, Opponent Speed: ${opponentPokemonRef.current.stats.speed}`);
            let myMoveEffectResult = undefined;
            let opponentMoveEffectResult = undefined;
            const opponentMove = opponentPokemonHandler.randomMove();

            let myPokemonSpeed = myPokemonRef.current.stats.speed;
            let opponentPokemonSpeed = opponentPokemonRef.current.stats.speed;

            // 冰凍狀態影響速度
            if (myPokemonRef.current.ailment === 'paralysis') {
               myPokemonSpeed = Math.floor(myPokemonSpeed * 0.75);
            }   
            if (opponentPokemonRef.current.ailment === 'paralysis') {
               opponentPokemonSpeed = Math.floor(opponentPokemonSpeed * 0.75);
            }

            // 速度判斷與攻擊順序邏輯
            if (myPokemonSpeed >= opponentPokemonSpeed) {
                // 我方先攻
                const {moveEffectResult: _opponentMoveEffectResult, remainingHp: opponentRemainingHp} = await handleAttackToOpponent(myPokemonMove);
                opponentMoveEffectResult = _opponentMoveEffectResult;
                // 如果對方還活著，對方反擊
                if (opponentRemainingHp > 0) {
                    await handleAttackFromOpponent(opponentMove);
                }
            } else {
                // 對方先攻
                const {moveEffectResult: _myMoveEffectResult, remainingHp: myRemainingHp} = await handleAttackFromOpponent(opponentMove);
                myMoveEffectResult = _myMoveEffectResult;
                // 如果我方還活著，我方反擊
                if (myRemainingHp > 0) {
                    await handleAttackToOpponent(myPokemonMove);
                }
            }
            battleRecorderRef.onBattleAction(
                false,
                myMoveEffectResult,
                opponentMoveEffectResult,
                myPokemonMove,
                opponentMove,
            )

            onBattleEvent({
                type: BattleEventType.RoundFinish,
                state: 'ongoing',
            });

        });
    }, [battleRecorderRef, handleAttackFromOpponent, handleAttackToOpponent, opponentPokemonHandler, queue]);


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
                    text: `Caught ${currentOpponentPokemon.name.toUpperCase()} (Lv.${currentOpponentPokemon.level})!`,
                    pokemon: currentOpponentPokemon,
                });
                battleRecorderRef.onCatch()
                onBattleEvent({
                    type: BattleEventType.WildPokemonCatched,
                    state: 'finish',
                });
            } else {
                // 沒抓到，對方攻擊
                const opponentMove = opponentPokemonHandler.randomMove();
                const {moveEffectResult: opponentMoveEffectResult} = await handleAttackFromOpponent(opponentMove);
                battleRecorderRef.onBattleAction(
                    false,
                    undefined,
                    opponentMoveEffectResult,
                    undefined,
                    opponentMove,
                )
                onBattleEvent({
                    type: BattleEventType.RoundFinish,
                    state: 'ongoing',
                });
            }
        });
    }, [queue, opponentPokemonHandler, onBattleEvent, handleAttackFromOpponent, battleRecorderRef]);

    const handleUseItem = useCallback(async (item: ItemDao, focusMove?: PokemonMove) => {
        await queue.execute(async () => {
            if( myPokemonRef.current == undefined) {
                throw new Error(" no my Pokemon")
            }
            // 1. Send message to extension to consume item
            vscode.postMessage({
                command: MessageType.RemoveItem,
                item: item,
                count: 1
            });

            let isUseless = true;
            await dialogBoxRef.current?.setText(`Used ${CapitalizeFirstLetter(item.name)}!`);

            // 2. Apply effect
            
            // Heal HP (Fixed)
            if (item.effect && item.effect.healHp) {
                if(myPokemonRef.current.currentHp < myPokemonRef.current.maxHp) {
                    await myPokemonHandler.heal(item.effect.healHp);
                    await dialogBoxRef.current?.setText(`Restored ${item.effect.healHp} HP!`);
                    isUseless = false;
                }
            }

            // Heal HP (Percent)
            if (item.effect && item.effect.healHpPercent) {
                 if(myPokemonRef.current.currentHp < myPokemonRef.current.maxHp) {
                    const healAmount = Math.floor(myPokemonRef.current.maxHp * (item.effect.healHpPercent / 100));
                    await myPokemonHandler.heal(healAmount);
                    await dialogBoxRef.current?.setText(`Restored HP!`);
                    isUseless = false;
                }
            }

            // Restore PP
            if(item.effect && item.effect.restorePp) {
                if(focusMove == undefined) {
                    // If no move specified, maybe it's an item that restores all moves? 
                    // For now, throw error as per original logic if we expect a move.
                    // But if it's not useless yet (e.g. Full Restore used on healthy PP), we shouldn't crash.
                    // However, UI shouldn't allow selecting PP item without move.
                    // Let's assume if focusMove is missing, we skip PP restore.
                } else {
                    const currentMove = myPokemonRef.current.pokemonMoves.find(m => m.name === focusMove.name);
                    if(currentMove && currentMove.pp < currentMove.maxPP) {
                        await myPokemonHandler.restorePp(focusMove, item.effect.restorePp);
                        await dialogBoxRef.current?.setText(`Restored PP!`);
                        isUseless = false;
                    }
                }
            }

            // Heal Status
            if (item.effect && item.effect.healStatus) {
                const currentAilment = myPokemonRef.current.ailment;
                const healTargets = item.effect.healStatus;
                
                if (currentAilment && currentAilment !== 'healthy' && (healTargets.includes('all') || healTargets.includes(currentAilment))) {
                    await myPokemonHandler.updateAilment('healthy');
                    await dialogBoxRef.current?.setText(`${myPokemonRef.current.name} was cured of ${currentAilment}!`);
                    isUseless = false;
                }
            }

            if (isUseless) {
                await dialogBoxRef.current?.setText(`But it had no effect!`);
            }

            // 3. Opponent turn
            // 只有在戰鬥中且對方存在才反擊
            if (opponentPokemonRef.current && opponentPokemonRef.current.currentHp && opponentPokemonRef.current.currentHp > 0) {
                const opponentMove = opponentPokemonHandler.randomMove();
                await handleAttackFromOpponent(opponentMove);
            }

            ItemRecorder().onItemAction('use', item, 1, isUseless);

            onBattleEvent({
                type: BattleEventType.RoundFinish,
                state: 'ongoing',
            });
        });
    }, [queue, dialogBoxRef, onBattleEvent, myPokemonHandler, opponentPokemonHandler, handleAttackFromOpponent]);

    const handleRunAway = useCallback(async () => {
        await queue.execute(async () => {

            // 1. 嘗試逃跑成功率計算
            if(myPokemonRef.current == undefined || opponentPokemonRef.current == undefined) {
                throw new Error(" no opponent Pokemon or my Pokemon")
            }

            const mySpeed = myPokemonRef.current.stats.speed;
            const opponentSpeed = opponentPokemonRef.current.stats.speed;
            
            runAttemptsRef.current += 1;
            const attempts = runAttemptsRef.current;

            // Formula: F = (A * 128 / B) + 30 * C
            // A = My Speed, B = Opponent Speed (mod 256), C = Attempts
            // If F > 255, escape guaranteed.
            
            let success = false;
            // Gen 3/4 Formula
            const f = ((mySpeed * 128) / (opponentSpeed % 256 || 1)) + (30 * attempts);
            
            if (f > 255) {
                success = true;
            } else {
                const random = Math.floor(Math.random() * 256);
                success = random < f;
            }

            if (success) {
                battleCanvasRef.current?.handleRunAway()
                await dialogBoxRef.current?.setText("Got away safely!");
                onBattleEvent({
                    type: BattleEventType.Escaped,
                    state: 'finish',
                });
            } else {
                await dialogBoxRef.current?.setText("Can't escape!");
                // Opponent attacks
                const opponentMove = opponentPokemonHandler.randomMove();
                const {moveEffectResult: opponentMoveEffectResult} = await handleAttackFromOpponent(opponentMove);
                battleRecorderRef.onBattleAction(
                    false,
                    undefined,
                    opponentMoveEffectResult,
                    undefined,
                    opponentMove,
                )
            }
        });
    }, [queue, battleCanvasRef, dialogBoxRef, onBattleEvent, opponentPokemonHandler, handleAttackFromOpponent, battleRecorderRef]);

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
                const {moveEffectResult: opponentMoveEffectResult} = await handleAttackFromOpponent(opponentMove);
                battleRecorderRef.onBattleAction(
                    true,
                    undefined,
                    opponentMoveEffectResult,
                    undefined,
                    opponentMove,
                )
            }

            onBattleEvent({
                type: BattleEventType.RoundFinish,
                state: 'ongoing',
            });
        });
    }, [queue, battleCanvasRef, myPokemonHandler, onBattleEvent, opponentPokemonHandler, handleAttackFromOpponent, battleRecorderRef]);

    // 這個function 不用 onBattleEvent 包起來，因為它本身就是被包起來的方法呼叫的
    const handleStart = useCallback(async (gameState: GameState, encounterResult: EncounterResult) => {
        await queue.execute(async () => {
            if (gameState === GameState.WildAppear) {
                if (!opponentPokemonRef.current) {
                    opponentPokemonHandler.newEncounter(encounterResult);
                }
                battleBiomeRecorderRef.current = encounterResult.biomeType;

                if(myPokemonRef.current !== undefined ) {
                    await handleBattleStart();

                    // 要先等開始才能設定
                    battleCanvasRef.current?.handleStart(encounterResult.biomeType)
                }else{
                    onBattleEvent({
                        type: BattleEventType.AllMyPokemonFainted,
                        state: 'finish',
                    });
                }
            }else{
                opponentPokemonHandler.resetPokemon();
            }
        });
    }, [battleCanvasRef, handleBattleStart, onBattleEvent, opponentPokemonHandler, queue])

    useMessageSubscription<PokemonDao[]>(MessageType.PartyData, async (message) => {
        const newParty = message.data ?? [];
        setParty(newParty);
        if (gameState === GameState.Searching) {
            console.log("[BattleManager] gogoing to update myPokemon due to PartyData received.");
            
            if(newParty.length === 0){
                await myPokemonHandler.resetPokemon();
                return;
            }

            // 自動換第一隻還活著的寶可夢出場
            for (const pkmn of newParty) {
                if (pkmn.currentHp && pkmn.currentHp > 0) {

                    // 不是同一隻才換，不然會無限迴圈
                    // if (myPokemon?.uid !== pkmn.uid) { 
                        console.log("[BattleManager] Switching to first healthy Pokemon in party:", pkmn.name.toUpperCase());
                        await myPokemonHandler.switchPokemon(pkmn);
                    // }
                    
                    break;
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