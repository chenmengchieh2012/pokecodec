import React, { useCallback, useEffect, useRef } from "react";
import { BattleControlHandle } from "../frame/BattleControl";
import { BattleCanvasHandle } from "../frame/VBattleCanvas";
import { PokemonStateHandler, usePokemonState } from "../hook/usePokemonState";
import { InitializedState, useInitializationState, useMessageSubscription } from "../store/messageStore";
import { SequentialExecutor } from "../utilities/SequentialExecutor";
import { vscode } from "../utilities/vscode";
// import { EncounterResult } from "../../../src/core/EncounterHandler";
import { BiomeType } from "../../../src/dataAccessObj/BiomeData";
import { DifficultyModifiers } from "../../../src/dataAccessObj/DifficultyData";
import { BattleEvent, BattleEventType, GameState } from "../../../src/dataAccessObj/GameState";
import { BattleMode, GameStateData } from "../../../src/dataAccessObj/gameStateData";
import { ItemDao } from "../../../src/dataAccessObj/item";
import { AddItemPayload, RecordEncounterPayload, SetGameStateDataPayload, UpdateDefenderPokemonUidPayload, UpdateOpponentsInPartyPayload, UpdateOpponentPokemonUidPayload, UpdatePartyPokemonPayload } from "../../../src/dataAccessObj/MessagePayload";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { PokeDexEntryStatus } from "../../../src/dataAccessObj/PokeDex";
import { getGenById, PokemonDao, PokemonStateAction } from "../../../src/dataAccessObj/pokemon";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { ExperienceCalculator } from "../../../src/utils/ExperienceCalculator";
import { GetEmptyMoveEffectResult, MoveEffectResult } from "../../../src/utils/MoveEffectCalculator";
import { ITEM_HP_TREE_BERRY_NAMES, ITEM_PP_TREE_BERRY_NAMES, ITEM_STATUS_TREE_BERRY_NAMES } from "../utilities/ItemName";
import { CapitalizeFirstLetter } from "../utilities/util";
import { BattleRecorder } from "./battleRecorder";

import itemData from '../../../src/data/items.json';
import { RecordItemActionPayload } from "../../../src/utils/AchievementCritiria";
import { ItemEffectStrategy } from "../../../src/utils/ItemEffectStrategy";
const itemDataMap = itemData as unknown as Record<string, ItemDao>;

const BONUS_ITEM_OPPONENT_LEVEL_THRESHOLD = 60;


export interface BattleManagerMethod {
    handleOnAttack: (myPokemonMove: PokemonMove) => Promise<void>,
    handleThrowBall: (ballDao: PokeBallDao) => Promise<void>,
    handleUseItem: (pokemon: PokemonDao, item: ItemDao, targetMove?: PokemonMove) => Promise<void>,
    handleRunAway: () => Promise<void>,
    handleSwitchMyPokemon: (newPokemon: PokemonDao) => Promise<void>,
    setOpponentParty: (party: PokemonDao[]) => void,
}

export interface BattleManagerProps {
    dialogBoxRef: React.RefObject<BattleControlHandle | null>
    battleCanvasRef: React.RefObject<BattleCanvasHandle | null>
    defaultOpponentPokemon?: PokemonDao;
}

export interface BattleManagerState {
    myPokemon?: PokemonDao,
    opponentPokemon?: PokemonDao,
    myParty: PokemonDao[],
    opponentParty: PokemonDao[],
    gameState: GameState,
    battleMode: BattleMode | undefined,
    mutex: boolean,
}

export const BattleManager = ({ dialogBoxRef, battleCanvasRef }: BattleManagerProps): [BattleManagerState, BattleManagerMethod] => {
    const initializationState = useInitializationState();
    console.log("[BattleManager] Initializing BattleManager...",initializationState);
    const [opponentParty, setOpponentParty] = React.useState<PokemonDao[]>([]);
    const [processingCount, setProcessingCount] = React.useState<number>(0);
    const [gameStateData, setGameStateData] = React.useState<GameStateData | undefined>(undefined);
    const [myParty, setMyParty] = React.useState<PokemonDao[]>([]);
    
    const mutex = processingCount > 0;
    const { pokemon: myPokemon, handler: myPokemonHandler } = usePokemonState(dialogBoxRef, { defaultPokemon: undefined });
    const { pokemon: opponentPokemon, handler: opponentPokemonHandler } = usePokemonState(dialogBoxRef, { defaultPokemon: undefined });
    
    // Refs for BattleRecorder and internal logic
    const myPokemonRef = React.useRef<PokemonDao>(myPokemon);
    const opponentPokemonRef = React.useRef<PokemonDao>(opponentPokemon);
    const myPartyRef = React.useRef<PokemonDao[]>(myParty);
    const opponentPartyRef = React.useRef<PokemonDao[]>(opponentParty);
    const gameStateDataRef = React.useRef<GameStateData | undefined>(gameStateData);
    // const encounterResultRef = React.useRef<EncounterResult | undefined>(undefined);
    const runAttemptsRef = useRef<number>(0);
    const catchAttemptsRef = useRef<number>(0);
    const difficultyModifiersRef = useRef<DifficultyModifiers | undefined>(undefined);

    // Update refs when state changes
    useEffect(() => {
        myPokemonRef.current = myPokemon;
    }, [myPokemon]);

    useEffect(() => {
        opponentPokemonRef.current = opponentPokemon;
    }, [opponentPokemon]);

    useEffect(()=>{
        myPartyRef.current = myParty;
    },[myParty])

    useEffect(() => {
        opponentPartyRef.current = opponentParty;
    }, [opponentParty]);

    useEffect(()=>{
        gameStateDataRef.current = gameStateData;
    },[gameStateData]);

    const battleRecorderRef = BattleRecorder({
        myPokemonRef: myPokemonRef,
        opponentPokemonRef: opponentPokemonRef,
        myPartyRef: myPartyRef,
    });

    const checkMyPokemonIsReady = useCallback(async (newParty: PokemonDao[]): Promise<boolean> => {
        if(myPokemonRef.current == undefined){
            if (newParty.length === 0) {
                return false;
            }
            // 自動換第一隻還活著的寶可夢出場v
            for (const pkmn of newParty) {
                if (pkmn.currentHp && pkmn.currentHp > 0) {
                    console.log("[BattleManager] Switching to first healthy Pokemon in party for Searching state:", pkmn.name.toUpperCase());
                    myPokemonHandler.switchPokemon(pkmn);
                    myPokemonRef.current = pkmn;
                    break;
                }
            }
            return true
        }else{
            if( newParty.length === 0 ){
                myPokemonHandler.resetPokemon();
                return false;
            }else{
                const currentPkmnInParty = newParty.find(p => p.uid === myPokemonRef.current?.uid);
                if(currentPkmnInParty == undefined || currentPkmnInParty.currentHp === 0){
                    for (const pkmn of newParty) {
                        if (pkmn.currentHp && pkmn.currentHp > 0) {
                            console.log("[BattleManager] Switching to first healthy Pokemon in party for Searching state:", pkmn.name.toUpperCase());
                            myPokemonHandler.switchPokemon(pkmn);
                            myPokemonRef.current = pkmn;
                            break;
                        }
                    }
                }else if(myPokemonRef.current.id !== currentPkmnInParty.id){
                    myPokemonHandler.switchPokemon(currentPkmnInParty);
                }
                return true
            }
        }
    }, [myPokemonHandler]);

    const resetAll = useCallback(() => {
        console.log("[BattleManager] Resetting all battle states.");
        if (opponentPokemonRef.current) {
            opponentPokemonHandler.resetPokemon();
        }
        if (opponentParty.length > 0) {
            setOpponentParty([]); 
        }
        if (gameStateData !== undefined) {
            setGameStateData(undefined);
        }
        setProcessingCount(0);
        runAttemptsRef.current = 0;
        catchAttemptsRef.current = 0;
    }, [gameStateData, opponentParty.length, opponentPokemonHandler]);

    useEffect(() => {
        if (initializationState === InitializedState.finished) {
            checkMyPokemonIsReady(myPartyRef.current)
            return;
        }
    }, [checkMyPokemonIsReady, initializationState]);

    // 1. 初始化 SequentialExecutor
    // 使用 useRef 確保在整個 Component 生命週期中只有這一個 Queue
    const queue = useRef(new SequentialExecutor()).current;

    const doAction = useCallback(async (fn: (...args: unknown[]) => Promise<void>) => {
        setProcessingCount(prev => {
            return prev + 1;
        });
        try {
            await queue.execute(async () => {
                await fn();
            });
        } finally {
            setProcessingCount(prev => Math.max(0, prev - 1));
        }
    }, [queue])

    // const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const onBattleEvent = useCallback(async (event: BattleEvent) => {
        console.log("[BattleManager] onBattleEvent:", event.state, event.type);
        const needUpdateMyPokemons: PokemonDao[] = [];
        switch (event.type) {
            case BattleEventType.RoundFinish: {
                await myPokemonHandler.onRoundFinish();
                await opponentPokemonHandler.onRoundFinish();
                const myPokemonFainted = myPokemonRef.current?.currentHp === 0;
                const opponentPokemonFainted = opponentPokemonRef.current?.currentHp === 0;
                if (opponentPokemonFainted) {
                    battleCanvasRef.current?.handleOpponentPokemonFaint()
                    const expMultiplier = difficultyModifiersRef.current?.expMultiplier || 1.0;
                    const expGain = ExperienceCalculator.calculateExpGain(opponentPokemonRef.current!, expMultiplier);
                    
                    // 六隻都要增加經驗值，不只是出戰的那隻
                    // 後面五隻增加經驗值為第一隻的一半70%
                    for (let i = 0; i < myPartyRef.current.length; i++) {
                        const partyPokemon = myPartyRef.current[i];
                        const isCurrentPokemon = partyPokemon.uid === myPokemonRef.current?.uid;
                        if(!isCurrentPokemon){
                            const partyPokemonExpGain = Math.floor(expGain * 0.7);
                            const updatedPokemon = ExperienceCalculator.addExperience(partyPokemon, partyPokemonExpGain);
                            needUpdateMyPokemons.push(updatedPokemon);
                        }else{
                            myPokemonHandler.increaseExp(expGain);
                        }
                    }
                    // 額外物品掉落機制，
                    if(opponentPokemonRef.current && opponentPokemonRef.current?.level > BONUS_ITEM_OPPONENT_LEVEL_THRESHOLD){
                        const opponentLevel = opponentPokemonRef.current.level;
                        const ITEM_TREE_BERRY_NAMES = [...ITEM_HP_TREE_BERRY_NAMES, ...ITEM_PP_TREE_BERRY_NAMES, ...ITEM_STATUS_TREE_BERRY_NAMES];
                        const randIndexOfBerry = Math.floor(Math.random() * ITEM_TREE_BERRY_NAMES.length);
                        const droppedBerryName = ITEM_TREE_BERRY_NAMES[randIndexOfBerry];
                        const extraBonusNumber = Math.floor((opponentLevel - BONUS_ITEM_OPPONENT_LEVEL_THRESHOLD) / 10); // 每10級增加一顆
                        const droupNumber = Math.floor(Math.random() * extraBonusNumber) + 1; // 1 or 2
                        const berryItem: ItemDao = itemDataMap[droppedBerryName];
                        await dialogBoxRef.current?.setText(`Opponent dropped ${droupNumber} ${CapitalizeFirstLetter(droppedBerryName.replace(/-/g, ' '))}(s)!`);
                        const payload: AddItemPayload = {
                            item: berryItem,
                            count: droupNumber,
                        }
                        vscode.postMessage({
                            command: MessageType.AddItem,
                            ...payload,
                        });
                    }
                    
                    await dialogBoxRef.current?.setText(`${opponentPokemonRef.current?.name.toUpperCase()} fainted!`);
                    await dialogBoxRef.current?.setText(`Gained ${expGain} EXP!`);
                    console.log("[BattleManager] Opponent Fainted");

                    // 檢查對方是否還有可用的寶可夢
                    const faintedOpponentUid = opponentPokemonRef.current?.uid;
                    const remainingOpponentParty = opponentPartyRef.current.filter(
                        p => p.uid !== faintedOpponentUid && p.ailment != 'fainted'
                    );

                    if (remainingOpponentParty.length > 0) {
                        // 對方還有寶可夢，派出下一隻
                        await dialogBoxRef.current?.setText(`${opponentPokemon?.name.toUpperCase()} fainted!`);
                        event.state = 'ongoing';
                    } else {
                        // 對方沒有寶可夢了，戰鬥結束
                        await dialogBoxRef.current?.setText(`You defeated all opponent's Pokémon!`);
                        console.log("[BattleManager] All opponent Pokemon fainted, battle finished");
                        event.state = 'finish';
                    }
                }

                if (myPokemonFainted) {
                    await dialogBoxRef.current?.setText(`${myPokemonRef.current?.name.toUpperCase()} fainted!`);
                    battleCanvasRef.current?.handleMyPokemonFaint()
                }
                break;
            }
            case BattleEventType.MyPokemonFaint:
                break;
            case BattleEventType.WildPokemonCatched: {
                const catchedPokemon = opponentPokemonRef.current;
                if (catchedPokemon == undefined) {
                    return
                }
                const gen = getGenById(catchedPokemon.id)
                if (gen != undefined) {
                    vscode.postMessage({
                        command: MessageType.Catch,
                        text: `Caught ${catchedPokemon.name.toUpperCase()} (Lv.${catchedPokemon.level})!`,
                        pokemon: catchedPokemon,
                    });

                    battleRecorderRef.onCatch()
                }
                const expMultiplier = difficultyModifiersRef.current?.expMultiplier || 1.0;
                const expGain = ExperienceCalculator.calculateExpGain(opponentPokemonRef.current!, expMultiplier);
                myPokemonHandler.increaseExp(expGain);

                await dialogBoxRef.current?.setText(`${opponentPokemonRef.current?.name.toUpperCase()} fainted!`);
                await dialogBoxRef.current?.setText(`Gained ${expGain} EXP!`);
                break;
            }
            case BattleEventType.WildPokemonFaint:
            case BattleEventType.Escaped:
                break;
            case BattleEventType.AllMyPokemonFainted: {
                break;
            }
            case BattleEventType.UnKnownError:
                break;
        }


        // 更新我的寶可夢資料
        needUpdateMyPokemons.push(myPokemonRef.current!);
        if (myPokemonRef.current !== undefined) {
            const updatePartyPokemonPayload: UpdatePartyPokemonPayload = {
                pokemons: needUpdateMyPokemons,
            }
            vscode.postMessage({
                command: MessageType.UpdatePartyPokemon,
                ...updatePartyPokemonPayload,
            });
        }
        // 更新對手的寶可夢資料
        if (opponentPokemonRef.current !== undefined) {
            const updateOpponentsInPartyPayload: UpdateOpponentsInPartyPayload = {
                opponentPokemons: [opponentPokemonRef.current],
            }
            vscode.postMessage({
                command: MessageType.UpdateOpponentsInParty,
                ...updateOpponentsInPartyPayload,
            });
        }

        setOpponentParty(prevParty => prevParty.map(p => {
            if (p.uid === opponentPokemonRef.current?.uid) {
                return opponentPokemonRef.current!;
            } else {
                return p;
            }
        }));



        switch (event.state) {
            case 'ongoing': {
                if (opponentPokemonRef.current?.ailment === 'fainted') {
                    const remainingOpponentParty = opponentPartyRef.current.filter(
                        p => p.uid !== opponentPokemonRef.current?.uid && p.ailment != 'fainted'
                    );
                    if (remainingOpponentParty.length > 0) {
                        // 處理對方換人邏輯
                        const nextOpponent = remainingOpponentParty[0];
                        await dialogBoxRef.current?.setText(`Opponent sent out ${nextOpponent.name.toUpperCase()}!`);

                        // 切換對方寶可夢
                        await opponentPokemonHandler.switchPokemon(nextOpponent);
                        // 播放對方換人動畫
                        battleCanvasRef.current?.handleOpponentSwitchPokemon();

                        console.log("[BattleManager] Opponent switched to:", nextOpponent.name);
                    }
                }

                if (opponentPokemonRef.current != undefined) {
                    const updateOpponentPokemonUidPayload: UpdateOpponentPokemonUidPayload = {
                        pokemonUid: opponentPokemonRef.current.uid,
                    }
                    vscode.postMessage({
                        command: MessageType.UpdateOpponentPokemonUid,
                        ...updateOpponentPokemonUidPayload
                    });
                }



                if (myPokemonRef.current != undefined) {
                    const updateDefenderPokemonUidPayload: UpdateDefenderPokemonUidPayload = {
                        pokemonUid: myPokemonRef.current?.uid,
                    }
                    vscode.postMessage({
                        command: MessageType.UpdateDefenderPokemonUid,
                        ...updateDefenderPokemonUidPayload
                    });
                }

                break;
            }
            case 'finish': {
                // 進行戰鬥結束處理
                // 1. 近行 encounter record
                console.log("[BattleManager] gameStateDataRef...",gameStateDataRef.current);
                if (gameStateDataRef.current?.battleMode === 'wild' && opponentPokemonRef.current != undefined) {
                    let battleResult: 'win' | 'lose' | 'flee' = opponentPokemonRef.current.ailment === 'fainted' ? 'win' : 'lose';
                    if (event.type === BattleEventType.WildPokemonCatched) {
                        battleResult = 'win';
                    } else if (event.type === BattleEventType.Escaped) {
                        battleResult = 'flee';
                    } else if (event.type === BattleEventType.AllMyPokemonFainted) {
                        battleResult = 'lose';
                    }
                    const payload: RecordEncounterPayload = {
                        record: {
                            pokemonId: opponentPokemonRef.current.id,
                            pokemonName: opponentPokemonRef.current.name,
                            pokemonCatchRate: 0, // 後台填寫
                            pokemonEncounterRate: 0, // 後台填寫
                            wasAttempted: catchAttemptsRef.current > 0,
                            wasCaught: event.type === BattleEventType.WildPokemonCatched,
                            catchAttempts: catchAttemptsRef.current,
                            battleResult: battleResult,
                            remainingHpPercent: myPokemonRef.current ? myPokemonRef.current.currentHp / myPokemonRef.current.stats.hp : 0,
                            playerFainted: myPokemonRef.current ? myPokemonRef.current.ailment === 'fainted' : false,
                            isShiny: opponentPokemonRef.current?.isShiny || false,
                            biomeType: gameStateDataRef.current?.encounterResult?.biomeType || BiomeType.None,
                        }
                    }
                    vscode.postMessage({
                        command: MessageType.RecordEncounter,
                        ...payload,
                    });
                }


                

                console.log("[BattleManager] Battle Finished Event:", event.state);
                const finishedOpponent = opponentPokemonRef.current;
                if (finishedOpponent !== undefined) {
                    const gen = getGenById(finishedOpponent.id)
                    if (gen != undefined) {
                        const isHaveBall = finishedOpponent.caughtBall !== undefined && finishedOpponent.caughtBall !== "";
                        console.log("[BattleManager] Updating PokeDex for:", finishedOpponent.name, "Caught:", isHaveBall, finishedOpponent.caughtBall);
                        vscode.postMessage({
                            command: MessageType.UpdatePokeDex,
                            pokemonId: finishedOpponent.id,
                            status: isHaveBall ? PokeDexEntryStatus.Caught : PokeDexEntryStatus.Seen,
                            gen: gen,
                        })
                    }
                }

                const gameStateData: SetGameStateDataPayload = {
                    gameStateData: {
                        ...gameStateDataRef.current!,
                        state: GameState.Finished,
                        opponentParty: opponentPartyRef.current,
                        opponentPokemonUid: opponentPokemonRef.current ? opponentPokemonRef.current.uid : undefined,
                    }
                };
                vscode.postMessage({
                    command: MessageType.SetGameStateData,
                    ...gameStateData,
                })

                break;
            }
        }
    }, [battleCanvasRef, battleRecorderRef, dialogBoxRef, myPokemonHandler, opponentPokemon?.name, opponentPokemonHandler])


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
    const attackFromOpponent = useCallback(async (move: PokemonMove):
        Promise<{ moveEffectResult: MoveEffectResult; remainingHp: number }> => {
        if (opponentPokemonRef.current == undefined) {
            throw new Error(" no opponent Pokemon")
        }

        const canAttack = await checkAilmentBeforeAttack(opponentPokemonRef.current, opponentPokemonHandler, move);
        if (!canAttack) {
            return { moveEffectResult: GetEmptyMoveEffectResult(), remainingHp: myPokemonRef.current ? myPokemonRef.current.currentHp : 0 };
        }

        // 1. Decrement PP for the move used by opponent Pokemon
        opponentPokemonHandler.decrementPP(move);

        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackFromOpponent()

        await dialogBoxRef.current?.setText(`${opponentPokemonRef.current.name.toUpperCase()} used ${move.name.toUpperCase()}!`);

        const attackerState = opponentPokemonHandler.getBattleState();
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const { newHp: remainingHp, moveEffectResult } = await myPokemonHandler.hited(opponentPokemonRef.current, attackerState, move);

        await dialogBoxRef.current?.setText(`${opponentPokemonRef.current?.name.toUpperCase()} cause ${moveEffectResult.damage} damage!`);

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

        // 7. 攻擊狀態調整
        myPokemonHandler.useMoveEffect(moveEffectResult);
        opponentPokemonHandler.useMoveEffect(moveEffectResult);

        return { moveEffectResult, remainingHp };
    }, [battleCanvasRef, checkAilmentBeforeAttack, dialogBoxRef, myPokemonHandler, opponentPokemonHandler]);

    const attackToOpponent = useCallback(async (move: PokemonMove): Promise<{ moveEffectResult: MoveEffectResult; remainingHp: number }> => {

        if (myPokemonRef.current == undefined) {
            throw new Error(" no opponent Pokemon")
        }

        const canAttack = await checkAilmentBeforeAttack(myPokemonRef.current, myPokemonHandler, move);
        if (!canAttack) {
            return { moveEffectResult: GetEmptyMoveEffectResult(), remainingHp: opponentPokemonRef.current ? opponentPokemonRef.current.currentHp : 0 };
        }

        // 1. Decrement PP for the move used by my Pokemon
        myPokemonHandler.decrementPP(move);

        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackToOpponent()

        await dialogBoxRef.current?.setText(`${myPokemonRef.current?.name.toUpperCase()} used ${move.name}!`);

        const attackerState = myPokemonHandler.getBattleState();
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const { newHp: remainingHp, moveEffectResult } = await opponentPokemonHandler.hited(myPokemonRef.current, attackerState, move);

        await dialogBoxRef.current?.setText(`${myPokemonRef.current?.name.toUpperCase()} cause ${moveEffectResult.damage} damage!`);

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

        // 7. 攻擊狀態調整
        myPokemonHandler.useMoveEffect(moveEffectResult);
        opponentPokemonHandler.useMoveEffect(moveEffectResult);

        return { moveEffectResult, remainingHp };
    }, [checkAilmentBeforeAttack, myPokemonHandler, battleCanvasRef, dialogBoxRef, opponentPokemonHandler]);

    const handleOnAttack = useCallback(async (myPokemonMove: PokemonMove) => {
        return doAction(async () => {
            if (opponentPokemonRef.current == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                console.warn("Opponent is missing, attack aborted.");
                onBattleEvent({
                    type: BattleEventType.UnKnownError,
                    state: 'finish',
                })
                return;
            }
            if (myPokemonRef.current == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                console.warn("My Pokemon is missing, attack aborted.");
                onBattleEvent({
                    type: BattleEventType.UnKnownError,
                    state: 'finish',
                })
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
                const { moveEffectResult: _opponentMoveEffectResult, remainingHp: opponentRemainingHp } = await attackToOpponent(myPokemonMove);
                opponentMoveEffectResult = _opponentMoveEffectResult;
                // 如果對方還活著，對方反擊
                if (opponentRemainingHp > 0) {
                    await attackFromOpponent(opponentMove);
                }
            } else {
                // 對方先攻
                const { moveEffectResult: _myMoveEffectResult, remainingHp: myRemainingHp } = await attackFromOpponent(opponentMove);
                myMoveEffectResult = _myMoveEffectResult;
                // 如果我方還活著，我方反擊
                if (myRemainingHp > 0) {
                    await attackToOpponent(myPokemonMove);
                }
            }
            battleRecorderRef.onBattleAction(
                false,
                myMoveEffectResult,
                opponentMoveEffectResult,
                myPokemonMove,
                opponentMove,
            )

            await onBattleEvent({
                type: BattleEventType.RoundFinish,
                state: 'ongoing',
            });
        })
    }, [attackFromOpponent, attackToOpponent, battleRecorderRef, doAction, onBattleEvent, opponentPokemonHandler]);


    const handleThrowBall = useCallback(async (ballDao: PokeBallDao) => {
        return doAction(async () => {
            catchAttemptsRef.current += 1;
            if (opponentPokemonRef.current == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                console.warn("Opponent is missing, throw ball aborted.");
                onBattleEvent({
                    type: BattleEventType.UnKnownError,
                    state: 'finish',
                })
                return;
            }
            // 扣除道具
            vscode.postMessage({
                command: MessageType.RemoveItem,
                item: ballDao,
                count: 1
            });

            // 執行丟球邏輯
            const catchBonusPercent = difficultyModifiersRef.current?.catchBonusPercent || 1.0;
            const isCatchAble = gameStateDataRef.current?.battleMode === BattleMode.Wild;
            const caught = await opponentPokemonHandler.throwBall(isCatchAble, ballDao, catchBonusPercent, (action: PokemonStateAction) => {
                // Handle state changes if needed
                battleCanvasRef.current?.handleThrowBallPhase({
                    action: action,
                    caughtBallApiName: ballDao.apiName,
                });
            });

            if (caught) {
                // Wait for "Caught" animation
                await onBattleEvent({
                    type: BattleEventType.WildPokemonCatched,
                    state: 'finish',
                });
            } else {
                // 沒抓到，對方攻擊
                const opponentMove = opponentPokemonHandler.randomMove();
                const { moveEffectResult: opponentMoveEffectResult } = await attackFromOpponent(opponentMove);
                battleRecorderRef.onBattleAction(
                    false,
                    undefined,
                    opponentMoveEffectResult,
                    undefined,
                    opponentMove,
                )
                await onBattleEvent({
                    type: BattleEventType.RoundFinish,
                    state: 'ongoing',
                });
            }
        });
    }, [doAction, opponentPokemonHandler, battleCanvasRef, onBattleEvent, attackFromOpponent, battleRecorderRef]);

    const handleUseItem = useCallback(async (unEffectedPokemon: PokemonDao, item: ItemDao, focusMove?: PokemonMove) => {
        doAction(async () => {
            await dialogBoxRef.current?.setText(`Used ${item.name.replace(/-/g, ' ')}!`);
            if (myPokemonRef.current == undefined) {
                onBattleEvent({
                    type: BattleEventType.UnKnownError,
                    state: 'finish',
                });
                throw new Error("no my Pokemon")
            }

            const itemEffectStrategy = new ItemEffectStrategy(
                unEffectedPokemon,
                item,
            );
            if(focusMove){
                itemEffectStrategy.setEffectingMoveId(focusMove?.id);
            }
            const { pokemon: effectedPokemon, itemUsed , usedMessage } = await itemEffectStrategy.getEffectResult()
            
            if(!itemUsed){
                await dialogBoxRef.current?.setText(`But it had no effect!`);
            }else{
                // 1. 扣除道具
                vscode.postMessage({
                    command: MessageType.RemoveItem,
                    item: item,
                    count: 1
                });

                // 2. 紀錄道具使用行為
                const recordItemActionPayload: RecordItemActionPayload = {
                    action: "use",
                    item: {
                        name: item.name,
                        category: item.category,
                        price: item.price,
                    },
                    quantity: 1,
                    isUseless: itemUsed ? false : true,
                }
                vscode.postMessage({
                    command: MessageType.RecordItemAction,
                    ...recordItemActionPayload,
                });

                // 3. 更新寶可夢資料
                if(effectedPokemon.uid === myPokemonRef.current.uid){
                    await myPokemonHandler.refreshPokemon(effectedPokemon);
                }else{
                    // 不是我方出戰的寶可夢，直接更新隊伍資料
                    // 更新隊伍中的寶可夢資料
                    // 不必擔心同步問題，因為整個流程在 Queue 裡面排隊執行
                    vscode.postMessage({
                        command: MessageType.UpdatePartyPokemon,
                        pokemons: [effectedPokemon],
                    });
                }

                // 4. 顯示使用道具文字
                if(usedMessage && usedMessage.length > 0){
                    await dialogBoxRef.current?.setText(usedMessage);
                }
            }

            
            // 3. Opponent turn
            // 只有在戰鬥中且對方存在才反擊
            if (opponentPokemonRef.current && opponentPokemonRef.current.currentHp && opponentPokemonRef.current.currentHp > 0) {
                const opponentMove = opponentPokemonHandler.randomMove();
                await attackFromOpponent(opponentMove);
            }

            await onBattleEvent({
                type: BattleEventType.RoundFinish,
                state: 'ongoing',
            });
        });
    }, [doAction, onBattleEvent, dialogBoxRef, myPokemonHandler, opponentPokemonHandler, attackFromOpponent]);

    const handleRunAway = useCallback(async () => {
        doAction(async () => {
            runAttemptsRef.current += 1;
            // 1. 嘗試逃跑成功率計算
            if (myPokemonRef.current == undefined || opponentPokemonRef.current == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                onBattleEvent({
                    type: BattleEventType.UnKnownError,
                    state: 'finish',
                });
                throw new Error(" no opponent Pokemon or my Pokemon")
            }
            const mySpeed = myPokemonRef.current.stats.speed;
            const opponentSpeed = opponentPokemonRef.current.stats.speed;

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


            // Guaranteed escape if fainted
            if (myPokemonRef.current.ailment == 'fainted') {
                success = true;
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
                const { moveEffectResult: opponentMoveEffectResult } = await attackFromOpponent(opponentMove);
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
    }, [doAction, battleCanvasRef, dialogBoxRef, onBattleEvent, opponentPokemonHandler, attackFromOpponent, battleRecorderRef]);

    const handleSwitchMyPokemon = useCallback(async (newPokemon: PokemonDao) => {
        doAction(async () => {
            // 確保換上的不是同一隻 (雖然 UI 層可能擋掉了，但這裡再防一次)
            if (newPokemon.uid === myPokemonRef.current?.uid) return;

            // 1. 執行切換動畫與邏輯
            battleCanvasRef.current?.handleSwitchPokemon()
            await myPokemonHandler.switchPokemon(newPokemon);
            // 2. 對方攻擊 (換人會被打)
            // 檢查對方是否還活著 (雖通常換人時對方都在)
            if (opponentPokemonRef.current) {
                const opponentMove = opponentPokemonHandler.randomMove();
                const { moveEffectResult: opponentMoveEffectResult } = await attackFromOpponent(opponentMove);
                battleRecorderRef.onBattleAction(
                    true,
                    undefined,
                    opponentMoveEffectResult,
                    undefined,
                    opponentMove,
                )
            }

            await onBattleEvent({
                type: BattleEventType.RoundFinish,
                state: 'ongoing',
            });
        });
    }, [doAction, battleCanvasRef, myPokemonHandler, onBattleEvent, opponentPokemonHandler, attackFromOpponent, battleRecorderRef]);

    const initBattleEncounter = useCallback(async (newGameStateData: GameStateData) => {

        const opponentPokemon = newGameStateData.opponentParty?.find(p => p.uid === newGameStateData.opponentPokemonUid);
        if (!opponentPokemon) {
            console.error("No encounter result provided for battle start.");
            onBattleEvent({
                type: BattleEventType.UnKnownError,
                state: 'finish',
            });
            return;
        }
        if (!opponentPokemonRef.current) {
            await opponentPokemonHandler.switchPokemon(opponentPokemon);
        }
        console.log("[BattleManager] Initializing opponent Pokemon for battle:", newGameStateData.opponentParty);

        setOpponentParty(newGameStateData.opponentParty || []);

        if (myPokemonRef.current == undefined || newGameStateData.defenderPokemonUid == undefined) {
            console.log("[BattleManager] My Pokemon is undefined, need to initialize.");
            console.log("My Party:", myPartyRef.current);
            onBattleEvent({
                type: BattleEventType.UnKnownError,
                state: 'finish',
            });
            return;
        }

        if (!myPokemonRef.current && newGameStateData.defenderPokemonUid) {
            console.log("[BattleManager] Initializing my Pokemon for battle with UID:", newGameStateData.defenderPokemonUid);
            console.log("My Party:", myPartyRef.current);
            console.log("myPokemonRef Pokemon:", myPokemonRef.current);
            console.log("defenderPokemonUid:", newGameStateData.defenderPokemonUid);

            const newMyPokemon = myPartyRef.current.find(p => p.uid === newGameStateData.defenderPokemonUid);
            if (!newMyPokemon) {
                console.error("Defender Pokemon UID not found in my party:", newGameStateData.defenderPokemonUid);
                onBattleEvent({
                    type: BattleEventType.UnKnownError,
                    state: 'finish',
                });
                return;
            }
            await myPokemonHandler.switchPokemon(newMyPokemon);
        }
        // encounterResultRef.current = newGameStateData.encounterResult;

        // 1. 等待 React Render 完成 (確保 dialogBoxRef 已經掛載)
        // 使用輪詢 (Polling) 方式等待 Ref 準備好，比固定 setTimeout 更穩定
        let attempts = 0;
        while (!dialogBoxRef.current && !battleCanvasRef.current && attempts < 40) { // Timeout after 2s
            await new Promise(r => setTimeout(r, 50));
            attempts++;
        }

        // 2. 開始戰鬥動畫
        battleCanvasRef.current?.handleStart(gameStateDataRef.current?.encounterResult?.biomeType || BiomeType.None);
        console.log("[BattleManager] Received GameStateData for Battle:", newGameStateData);

    }, [battleCanvasRef, dialogBoxRef, myPokemonHandler, onBattleEvent, opponentPokemonHandler])


    useMessageSubscription<GameStateData>(MessageType.GameStateData, async (message) => {
        
        const newGameState = message.data;
        if( newGameState?.state == gameStateDataRef.current?.state){
            console.log("[BattleManager] Received GameStateData with same state, ignoring:", newGameState);
            return;
        }
        const previousState = gameStateDataRef.current?.state;

        // 更新遊戲狀態
        setGameStateData(newGameState);
        gameStateDataRef.current = newGameState;
        console.log("[BattleManager] Received GameStateData:", newGameState);


        if( newGameState?.state == GameState.Finished && previousState !== GameState.Finished){
            // 從戰鬥回到搜尋狀態，表示戰鬥結束，重置雙方寶可夢狀態
            // 如果是訓練家戰鬥，檢查是否解鎖下一關
            if(gameStateDataRef.current?.battleMode === 'trainer'){
                const totalCount = opponentPartyRef.current.length;
                const opponentPokemonFaint = opponentPartyRef.current
                    .filter(p=>(p.ailment === 'fainted'));
                console.log(`[BattleManager] Trainer Battle Check: Fainted ${opponentPokemonFaint.length}`);
                if (totalCount === opponentPokemonFaint.length) {
                    console.log("[BattleManager] All trainer pokemon fainted, unlocking next level");
                    vscode.postMessage({
                        command: MessageType.UnlockNextLevel,
                    });
                
                    await dialogBoxRef.current?.setText(`You defeated Trainer ${gameStateDataRef.current?.trainerData?.name}!`);
                    await dialogBoxRef.current?.setText(`${gameStateDataRef.current?.trainerData?.dialog.lose}`);
            // 等待 2 秒讓玩家看完對話
            await new Promise(r => setTimeout(r, 1000));
                }else{
                    await dialogBoxRef.current?.setText(`You lost to Trainer ${gameStateDataRef.current?.trainerData?.name}!`);
                    await dialogBoxRef.current?.setText(`${gameStateDataRef.current?.trainerData?.dialog.win}`);
            // 等待 2 秒讓玩家看完對話
            await new Promise(r => setTimeout(r, 1000));
                }
            }


            vscode.postMessage({
                command: MessageType.SetGameStateData,
                gameStateData: {
                    battleMode: undefined,
                    trainerData: undefined,
                    state: GameState.Searching,
                    encounterResult: undefined,
                    opponentParty: [],
                    defenderPokemonUid: undefined,
                    opponentPokemonUid: undefined,
                }
            });
            battleRecorderRef.onBattleFinished()
            // 重置對方隊伍與寶可夢狀態
            resetAll()

        }

        
        if (newGameState?.state === GameState.Searching) {
            console.log("[BattleManager] GameStateData indicates Searching state:", newGameState);
            // 沒辦法因為可能前台重置，這裡一定要檢查
            // if(myPartyRef.current.length > 0){
            //     checkMyPokemonIsReady(myPartyRef.current);
            // }
            // 重置對方寶可夢狀態
            opponentPokemonHandler.resetPokemon();
            return;
        } else if (newGameState?.state === GameState.Battle) {
            console.log("[BattleManager] GameStateData indicates Battle state:", newGameState);
            doAction(async () => {
                if (newGameState.opponentParty && newGameState.opponentParty.length > 0 &&
                    // 如果是從暫停恢復戰鬥，雙方寶可夢都已存在
                    newGameState.opponentPokemonUid && newGameState.defenderPokemonUid &&
                    myPokemonRef.current == undefined && opponentPokemonRef.current == undefined
                ) {
                    await initBattleEncounter(newGameState);
                    await dialogBoxRef.current?.setText("Battle Resumed!");
                }

            });

        } else if (newGameState?.state === GameState.WildAppear || newGameState?.state === GameState.TrainerAppear) {

            // 新的野生遭遇或訓練家遭遇
            doAction(async () => {
                runAttemptsRef.current = 0;
                const opponentPokemon = newGameState.opponentParty?.find(p => p.uid === newGameState.opponentPokemonUid);

                if (newGameState.defenderPokemonUid !== undefined) {
                    await initBattleEncounter(newGameState);
                    console.log("Start initializing BattleControl...");
                    console.log("My Pokemon:", myPokemonRef.current);
                    console.log("Opponent Pokemon:", opponentPokemonRef.current);


                    // 更新 GameStateData，確保 extension 端同步
                    const payload: SetGameStateDataPayload = {
                        gameStateData: {
                            battleMode: newGameState.battleMode,
                            trainerData: newGameState.trainerData,
                            state: GameState.Battle,
                            encounterResult: newGameState.encounterResult,
                            opponentParty: newGameState.opponentParty,
                            opponentPokemonUid: opponentPokemon?.uid,
                            defenderPokemonUid: newGameState.defenderPokemonUid,
                        }
                    };
                    console.log("[BattleManager] Updating GameStateData to Battle:", payload);

                    vscode.postMessage({
                        command: MessageType.SetGameStateData,
                        ...payload
                    });

                    if(newGameState.state === GameState.TrainerAppear) {
                        await dialogBoxRef.current?.setText(`Trainer ${newGameState.trainerData?.name} wants to battle!`);
                        await dialogBoxRef.current?.setText(`${newGameState.trainerData?.dialog.intro}`);
                    }

                    await dialogBoxRef.current?.setText(`A wild ${opponentPokemonRef.current?.name.toUpperCase()} appeared!`);
                    await dialogBoxRef.current?.setText(`Go! ${myPokemonRef.current?.name.toUpperCase()}!`);
                } else {
                    console.error("No defendPokemon provided for WildAppear state.");
                    // 這裡不應該出現沒有我方寶可夢的情況
                    onBattleEvent({
                        type: BattleEventType.UnKnownError,
                        state: 'finish',
                    });
                }
            });
        } else {
            opponentPokemonHandler.resetPokemon();
        }
    });

    useMessageSubscription<PokemonDao[]>(MessageType.PartyData, async (message) => {
        const newParty = message.data ?? [];
        myPartyRef.current = newParty;
        setMyParty(newParty);
        if (gameStateData?.state === GameState.Searching) {
            console.log("[BattleManager] gogoing to update myPokemon due to PartyData received.");
            // 在搜尋狀態下收到隊伍更新，檢查目前出戰寶可夢是否還能戰鬥
            // 是啟動過後的資訊了
            checkMyPokemonIsReady(newParty);
            return;
        } else if (gameStateData?.state === GameState.Battle) {
            const myCurrentPokemon = newParty.find(p => p.uid === myPokemonRef.current?.uid)
            if (myCurrentPokemon && myCurrentPokemon.ailment === 'fainted') {
                const filterMyParty = myPartyRef.current.filter(p => p.uid !== myCurrentPokemon?.uid && p.currentHp > 0);
                console.log("[BattleManager] Fainted Pokemon detected, available party:", filterMyParty);
                if (filterMyParty.length === 0) {
                    await dialogBoxRef.current?.setText(`All of your Pokémon have fainted!`);
                    console.log("[BattleManager] All My Pokemon Fainted");
                    await onBattleEvent({
                        type: BattleEventType.AllMyPokemonFainted,
                        state: 'finish',
                    });
                    return;
                } else {
                    await dialogBoxRef.current?.openPartyMenu();
                }
            }
        }
    });

    useMessageSubscription<DifficultyModifiers>(MessageType.DifficultyModifiersData, (message) => {
        console.log("[BattleManager] Received DifficultyModifiersData:", message.data);
        difficultyModifiersRef.current = message.data;
    });

    return [
        {
            myPokemon: myPokemon,
            opponentPokemon: opponentPokemon,
            myParty: myParty,
            opponentParty: opponentParty,
            battleMode: gameStateData?.battleMode,
            gameState: gameStateData?.state || GameState.Searching,
            mutex: mutex,
        },
        {
            handleOnAttack,
            handleThrowBall,
            handleUseItem,
            handleRunAway,
            handleSwitchMyPokemon,
            setOpponentParty,
        }
    ]
}