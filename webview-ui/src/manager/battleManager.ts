import React, { useCallback, useRef } from "react";
import { BattleControlHandle } from "../frame/BattleControl";
import { BattleCanvasHandle } from "../frame/VBattleCanvas";
import { BattlePokemonFactory, RoundCheckResult } from "../hook/BattlePokemon";
import { InitializedState, messageStore, useMessageSubscription } from "../store/messageStore";
import { SequentialExecutor } from "../utilities/SequentialExecutor";
import { vscode } from "../utilities/vscode";
// import { EncounterResult } from "../../../src/core/EncounterHandler";
import { BiomeType } from "../../../src/dataAccessObj/BiomeData";
import { DifficultyModifiers } from "../../../src/dataAccessObj/DifficultyData";
import { BattleEvent, BattleEventType, GameState } from "../../../src/dataAccessObj/GameState";
import { BattleMode, GameStateData } from "../../../src/dataAccessObj/gameStateData";
import { ItemDao } from "../../../src/dataAccessObj/item";
import { AddItemPayload, RecordEncounterPayload, SetGameStateDataPayload, UpdateDefenderPokemonUidPayload, UpdateOpponentPokemonUidPayload, UpdateOpponentsInPartyPayload, UpdatePartyPokemonPayload } from "../../../src/dataAccessObj/MessagePayload";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import { PokeBallDao } from "../../../src/dataAccessObj/pokeBall";
import { PokeDexEntryStatus } from "../../../src/dataAccessObj/PokeDex";
import { getDialogName, getGenById, PokemonDao } from "../../../src/dataAccessObj/pokemon";
import { PokemonMove } from "../../../src/dataAccessObj/pokeMove";
import { ExperienceCalculator } from "../../../src/utils/ExperienceCalculator";
import { ITEM_HP_TREE_BERRY_NAMES, ITEM_PP_TREE_BERRY_NAMES, ITEM_STATUS_TREE_BERRY_NAMES } from "../utilities/ItemName";
import { CapitalizeFirstLetter } from "../utilities/util";
import { BattleRecorder } from "./battleRecorder";

import itemData from '../../../src/data/items.json';
import { BattleActions } from "./battleManagerHook/BattleActions";
import useSyncedState from "./battleManagerHook/useSyncedState";
const itemDataMap = itemData as unknown as Record<string, ItemDao>;

const BONUS_ITEM_OPPONENT_LEVEL_THRESHOLD = 60;


export interface BattleManagerMethod {
    handleOnAttack: (myPokemonMove: PokemonMove) => Promise<void>,
    handleThrowBall: (ballDao: PokeBallDao) => Promise<void>,
    handleUseItem: (pokemon: PokemonDao, item: ItemDao, targetMove?: PokemonMove) => Promise<void>,
    handleRunAway: () => Promise<void>,
    handleSwitchMyPokemon: (newPokemon: PokemonDao) => Promise<void>,
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
    const [opponentParty, setOpponentParty, opponentPartyRef] = useSyncedState<PokemonDao[]>([]);
    const [processingCount, setProcessingCount ] = useSyncedState<number>(0);
    const [gameStateData, setGameStateData, gameStateDataRef] = useSyncedState<GameStateData | undefined>(undefined);
    const [myParty, setMyParty, myPartyRef] = useSyncedState<PokemonDao[]>([]);
    
    const mutex = processingCount > 0;
    const myBattlePokemon = BattlePokemonFactory();
    const opponentBattlePokemon = BattlePokemonFactory();
    const battleRecorder = BattleRecorder();
    const difficultyModifiersRef = useRef<DifficultyModifiers | undefined>(undefined);

   
    const initialize = useCallback(async (newParty: PokemonDao[]) => {
        // 沒有寶可夢就不處理
        if(newParty.length === 0){
            if( myBattlePokemon.pokemon != undefined ){
                // 只有沒有隊伍了才重設出場寶可夢
                myBattlePokemon.resetPokemon();
            }
            return false;
        }
        // 有寶可夢隊伍，更新隊伍資料
        // myPartyRef.current = newParty;
        setMyParty(newParty);

        // 全部暈倒
        const myAllPokemonFaint = newParty.every(p => p.ailment === 'fainted');
        if(myAllPokemonFaint){
            // 全部暈倒，重設出場寶可夢
            myBattlePokemon.setPokemon(newParty[0]);
            return false;
        }
        const myPokemon = myBattlePokemon.pokemonRef.current;
        let autoSwitch = false;
        if(myPokemon == undefined){
            // 自動換第一隻還活著的寶可夢出場v
            autoSwitch = true;
        }else{
            // 已有出場寶可夢，檢查是否還在隊伍中
            const isInParty = newParty.findIndex(p => p.uid === myPokemon.uid && p.ailment !== 'fainted') >= 0;
            if(!isInParty){
                autoSwitch = true;
            }
            
            // 檢查是否暈倒
            const isfainted = myPokemon.ailment === 'fainted';
            if(isfainted){
                autoSwitch = true;
            }
        }
        if(autoSwitch){
            // 如果在戰鬥中且有出戰寶可夢(只是暈倒)，則不自動切換，交由 PartyData 的邏輯處理(跳出選單)
            const isInBattle = gameStateDataRef.current?.state === GameState.Battle;
            const hasCurrentPokemon = myBattlePokemon.pokemonRef.current !== undefined;
            if (isInBattle && hasCurrentPokemon) {
                console.log("[BattleManager] In Battle and Pokemon fainted, skipping auto-switch to allow menu.");
                return;
            }

            // 自動換第一隻還活著的寶可夢出場
            for (const pkmn of newParty) {
                if (pkmn.currentHp && pkmn.currentHp > 0) {
                    console.log("[BattleManager] Switching to first healthy Pokemon in party for Searching state:", pkmn.name.toUpperCase());
                    myBattlePokemon.setPokemon(pkmn);
                    myBattlePokemon.syncState();
                    await dialogBoxRef.current?.setText(`Go! ${getDialogName(pkmn)}!`);
                    break;
                }
            }
        }

    }, [setMyParty, myBattlePokemon, dialogBoxRef, gameStateDataRef]);

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
    }, [queue, setProcessingCount])

    // const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const addPokemonExpAndAddGift = useCallback(async (needUpdateMyPokemons: PokemonDao[]) => {
        const expMultiplier = difficultyModifiersRef.current?.expMultiplier || 1.0;
        const expGain = ExperienceCalculator.calculateExpGain(opponentBattlePokemon.pokemonRef.current!, expMultiplier);
        
        // 六隻都要增加經驗值，不只是出戰的那隻
        // 後面五隻增加經驗值為第一隻的一半70%
        for (let i = 0; i < myPartyRef.current.length; i++) {
            const partyPokemon = myPartyRef.current[i];
            const isCurrentPokemon = partyPokemon.uid === myBattlePokemon.pokemonRef.current?.uid;
            if(!isCurrentPokemon){
                const partyPokemonExpGain = Math.floor(expGain * 0.7);
                const updatedPokemon = ExperienceCalculator.addExperience(partyPokemon, partyPokemonExpGain);
                needUpdateMyPokemons.push(updatedPokemon);
            }else{
                const {isLevelUp} = myBattlePokemon.increaseExp(expGain);
                myBattlePokemon.syncState();
                if(isLevelUp){
                    await dialogBoxRef.current?.setText(`${CapitalizeFirstLetter(getDialogName(myBattlePokemon.pokemonRef.current!))} leveled up to Lv${myBattlePokemon.pokemonRef.current!.level}!`);
                }
            }
        }
        // 額外物品掉落機制，
        if(opponentBattlePokemon.pokemonRef.current && opponentBattlePokemon.pokemonRef.current?.level > BONUS_ITEM_OPPONENT_LEVEL_THRESHOLD){
            const opponentLevel = opponentBattlePokemon.pokemonRef.current.level;
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
        
        await dialogBoxRef.current?.setText(`${opponentBattlePokemon.pokemonRef.current ? getDialogName(opponentBattlePokemon.pokemonRef.current).toUpperCase() : '???'} fainted!`);
        await dialogBoxRef.current?.setText(`Gained ${expGain} EXP!`);
        console.log("[BattleManager] Opponent Fainted");

    }, [opponentBattlePokemon.pokemonRef, dialogBoxRef, myPartyRef, myBattlePokemon]);

    const handleRoundCheckResult = useCallback(async (pokemonName: string, result: RoundCheckResult) => {
        if (result.isWakedUp) {
            await dialogBoxRef.current?.setText(`${pokemonName} woke up!`);
        } else if (result.isSleeping) {
            await dialogBoxRef.current?.setText(`${pokemonName} is fast asleep.`);
        }

        if (result.isFreezeRecovered) {
            await dialogBoxRef.current?.setText(`${pokemonName} thawed out!`);
        } else if (result.isFreeze) {
            await dialogBoxRef.current?.setText(`${pokemonName} is frozen solid!`);
        }

        if (result.isParalysisRecovered) {
             await dialogBoxRef.current?.setText(`${pokemonName} is cured of paralysis!`);
        }
        
        if (result.isPoisoned) {
            await dialogBoxRef.current?.setText(`${pokemonName} is hurt by poison!`);
        }
        
        if (result.isBurned) {
            await dialogBoxRef.current?.setText(`${pokemonName} is hurt by its burn!`);
        }
    }, [dialogBoxRef]);

    const onBattleFinish = useCallback(async (finishType: 'caught' | 'escaped' | 'fainted') => {
        
        // 更新圖鑑狀態
        const finishedOpponent = opponentBattlePokemon.pokemonRef.current;
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

        // 遭遇結束
        console.log("[BattleManager] gameStateDataRef...",gameStateDataRef.current);
        if (gameStateDataRef.current?.battleMode === 'wild' && opponentBattlePokemon.pokemonRef.current != undefined) {
            let battleResult: 'win' | 'lose' | 'flee' = opponentBattlePokemon.pokemonRef.current.ailment === 'fainted' ? 'win' : 'lose';
            if (finishType === 'caught') {
                battleResult = 'win';
            } else if (finishType === 'escaped') {
                battleResult = 'flee';
            } else if (finishType === 'fainted') {
                battleResult = 'lose';
            }
            const payload: RecordEncounterPayload = {
                record: {
                    pokemonId: opponentBattlePokemon.pokemonRef.current.id,
                    pokemonName: opponentBattlePokemon.pokemonRef.current.name,
                    pokemonCatchRate: 0, // 後台填寫
                    pokemonEncounterRate: 0, // 後台填寫
                    wasAttempted: false, // catchAttemptsRef.current > 0,
                    wasCaught: finishType === 'caught',
                    catchAttempts: 0, // catchAttemptsRef.current,
                    battleResult: battleResult,
                    remainingHpPercent: myBattlePokemon.pokemonRef.current ? myBattlePokemon.pokemonRef.current.currentHp / myBattlePokemon.pokemonRef.current.stats.hp : 0,
                    playerFainted: myBattlePokemon.pokemonRef.current ? myBattlePokemon.pokemonRef.current.ailment === 'fainted' : false,
                    isShiny: opponentBattlePokemon.pokemonRef.current?.isShiny || false,
                    biomeType: gameStateDataRef.current?.encounterResult?.biomeType || BiomeType.None,
                }
            }
            // 發送訊息到後台記錄戰鬥結果
            // 給難度調整模組使用
            vscode.postMessage({
                command: MessageType.RecordEncounter,
                ...payload,
            });

            // 通知 BattleRecorder 戰鬥結束
            // 給 AchievementManager 使用
            battleRecorder.onBattleFinished(
                myBattlePokemon.pokemonRef.current, 
                opponentBattlePokemon.pokemonRef.current, 
                myPartyRef.current
            )

        //    await new Promise(r => setTimeout(r, 500));
            
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
        }
        // 訓練家戰鬥結束
        else if(gameStateDataRef.current?.battleMode === 'trainer'){
            const totalCount = opponentPartyRef.current.length;
            const opponentPokemonFaint = opponentPartyRef.current
                .filter(p=>(p.ailment === 'fainted'));
            console.log(`[BattleManager] Trainer Battle Check: Fainted ${opponentPokemonFaint.length}`);
            let trainerTalk = ""
            if (totalCount === opponentPokemonFaint.length) {
                console.log("[BattleManager] All trainer pokemon fainted, unlocking next level");
                vscode.postMessage({
                    command: MessageType.UnlockNextLevel,
                });
                trainerTalk = gameStateDataRef.current?.trainerData?.dialog.lose || "";
            }else{
                await dialogBoxRef.current?.setText(`You lost to Trainer ${gameStateDataRef.current?.trainerData?.name}!`);
                await dialogBoxRef.current?.setText(`${gameStateDataRef.current?.trainerData?.dialog.win}`);
                // 等待 1 秒讓玩家看完對話
                await new Promise(r => setTimeout(r, 1000));
                
                trainerTalk = gameStateDataRef.current?.trainerData?.dialog.win || "";
            }
            await dialogBoxRef.current?.setText(`You defeated Trainer ${gameStateDataRef.current?.trainerData?.name}!`);
            await dialogBoxRef.current?.setText(`${trainerTalk}`);
            // 等待 1 秒讓玩家看完對話
            await new Promise(r => setTimeout(r, 1000));
            
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
        }

        
    }, [battleRecorder, dialogBoxRef, gameStateDataRef, myBattlePokemon.pokemonRef, myPartyRef, opponentBattlePokemon.pokemonRef, opponentPartyRef]);

    const onBattleEvent = useCallback(async (event: BattleEvent) => {
        console.log("[BattleManager] onBattleEvent:", event.type);
        const needUpdateMyPokemons: PokemonDao[] = [];
        switch (event.type) {
            case BattleEventType.RoundFinish: {
                const myRoundCheckResult = myBattlePokemon.roundCheck();
                const opponentRoundCheckResult = opponentBattlePokemon.roundCheck();
               
                myBattlePokemon.syncState();
                opponentBattlePokemon.syncState();

                if (myBattlePokemon.pokemonRef.current) {
                    await handleRoundCheckResult(getDialogName(myBattlePokemon.pokemonRef.current).toUpperCase(), myRoundCheckResult);
                }
                if (opponentBattlePokemon.pokemonRef.current) {
                    await handleRoundCheckResult(getDialogName(opponentBattlePokemon.pokemonRef.current).toUpperCase(), opponentRoundCheckResult);
                }

                const opponentPokemonFainted = opponentBattlePokemon.pokemonRef.current?.currentHp === 0;
                if (opponentPokemonFainted) {
                    battleCanvasRef.current?.handleOpponentPokemonFaint()
                    await addPokemonExpAndAddGift(needUpdateMyPokemons)
                }
                break;
            }
            case BattleEventType.WildPokemonCatched: {
                await addPokemonExpAndAddGift(needUpdateMyPokemons)
                onBattleFinish('caught');
                break;
            }
            case BattleEventType.Escaped:
                onBattleFinish('escaped');
                break;
            case BattleEventType.UnKnownError:
                onBattleFinish('fainted');
                break;
        }


        // 更新我的寶可夢資料
        needUpdateMyPokemons.push(myBattlePokemon.pokemonRef.current!);
        if (myBattlePokemon.pokemonRef.current !== undefined) {
            const updatePartyPokemonPayload: UpdatePartyPokemonPayload = {
                pokemons: needUpdateMyPokemons,
            }
            vscode.postMessage({
                command: MessageType.UpdatePartyPokemon,
                ...updatePartyPokemonPayload,
            });
        }
        // 更新對手的寶可夢資料
        if (opponentBattlePokemon.pokemonRef.current !== undefined) {
            const updateOpponentsInPartyPayload: UpdateOpponentsInPartyPayload = {
                opponentPokemons: [opponentBattlePokemon.pokemonRef.current],
            }
            vscode.postMessage({
                command: MessageType.UpdateOpponentsInParty,
                ...updateOpponentsInPartyPayload,
            });
        }

        setOpponentParty(prevParty => prevParty.map(p => {
            if (p.uid === opponentBattlePokemon.pokemonRef.current?.uid) {
                return opponentBattlePokemon.pokemonRef.current!;
            } else {
                return p;
            }
        }));
    }, [battleCanvasRef, myBattlePokemon, opponentBattlePokemon, setOpponentParty, addPokemonExpAndAddGift, onBattleFinish, handleRoundCheckResult])
    

    const {
        handleMyHitLogic,
        handleThrowBallLogic,
        handleUseItemLogic,
        handleRunAwayLogic,
        handleSwitchMyPokemonLogic,
        reset: battleActionReset,
    } = BattleActions({
        dialogBoxRef,
        battleCanvasRef,
        battleRecorder,
        onBattleEvent,
    });

    const resetAll = useCallback(() => {
        console.log("[BattleManager] Resetting all battle states.");
        if (opponentBattlePokemon) {
            opponentBattlePokemon.resetPokemon();
            opponentBattlePokemon.syncState();
        }
        if (opponentParty.length > 0) {
            setOpponentParty([]); 
        }
        if (gameStateData !== undefined) {
            setGameStateData(undefined);
        }
        if (myPartyRef.current.length > 0) {
            myBattlePokemon.setPokemon(myPartyRef.current[0]);
            myBattlePokemon.syncState();
        }
        battleActionReset();
        setProcessingCount(0);
    }, [battleActionReset, gameStateData, myBattlePokemon, myPartyRef, opponentBattlePokemon, opponentParty.length, setGameStateData, setOpponentParty, setProcessingCount]);


    const handleOnAttack = useCallback((myPokemonMove: PokemonMove) => {
        return doAction(async () => handleMyHitLogic(opponentBattlePokemon, myBattlePokemon, myPokemonMove));
    }, [doAction, handleMyHitLogic, myBattlePokemon, opponentBattlePokemon]);

    const handleThrowBall = useCallback((ballDao: PokeBallDao) => {
        const battleMode = gameStateDataRef.current?.battleMode || 'wild';
        const biomeType = gameStateDataRef.current?.encounterResult?.biomeType || BiomeType.None;
        return doAction(async () => handleThrowBallLogic(battleMode, biomeType,myBattlePokemon, opponentBattlePokemon , ballDao));
    }, [doAction, gameStateDataRef, handleThrowBallLogic, myBattlePokemon, opponentBattlePokemon]);

    const handleUseItem = useCallback((pokemon: PokemonDao, item: ItemDao, targetMove?: PokemonMove) => {
        return doAction(async () => handleUseItemLogic(myBattlePokemon,opponentBattlePokemon,pokemon, item, targetMove));
    }, [doAction, handleUseItemLogic, myBattlePokemon, opponentBattlePokemon]);

    const handleRunAway = useCallback(() => {
        return doAction(async () => handleRunAwayLogic(myBattlePokemon, opponentBattlePokemon));
    }, [doAction, handleRunAwayLogic, myBattlePokemon, opponentBattlePokemon]);

    const handleSwitchMyPokemon = useCallback((newPokemon: PokemonDao) => {
        return doAction(async () => handleSwitchMyPokemonLogic(myBattlePokemon,opponentBattlePokemon, newPokemon));
    }, [doAction, handleSwitchMyPokemonLogic, myBattlePokemon, opponentBattlePokemon]);

    const initializeBattle = useCallback(async (newGameStateData: GameStateData) => {
        try {

            console.log("[BattleManager] Initializing opponent Pokemon for battle:", newGameStateData.opponentParty);
            // 1. 設定對手寶可夢
            const opponentPokemon = newGameStateData.opponentParty?.find(p => p.uid === newGameStateData.opponentPokemonUid);
            if (!opponentPokemon) {
                console.error("No encounter result provided for battle start.");
                throw new Error("No encounter result provided for battle start.");
            }
            if (!opponentBattlePokemon.pokemonRef.current || opponentBattlePokemon.pokemonRef.current.uid !== opponentPokemon.uid) {
                opponentBattlePokemon.setPokemon(opponentPokemon);
                opponentBattlePokemon.syncState();
            }

            // 2. 設定對手隊伍
            setOpponentParty(newGameStateData.opponentParty || []);

            // 3. 設定我方寶可夢
            if(myBattlePokemon.pokemonRef.current == undefined){
                throw new Error("My Pokemon is undefined during battle initialization.");
            }

            // 3.1 如果我方出戰寶可夢不是目前的，則切換
            if (myBattlePokemon.pokemonRef.current.uid !== newGameStateData.defenderPokemonUid) {
                const myPokemon = myPartyRef.current.find(p => p.uid === newGameStateData.defenderPokemonUid);
                if (!myPokemon) {
                    console.error("Defender Pokemon UID not found in my party:", newGameStateData.defenderPokemonUid);
                    throw new Error("Defender Pokemon UID not found in my party.");
                }
                myBattlePokemon.setPokemon(myPokemon);
                myBattlePokemon.syncState();
            }
        } catch (error) {
            console.error("Error during battle initialization:", error);
            throw error;
        }
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

    }, [battleCanvasRef, dialogBoxRef, gameStateDataRef, myBattlePokemon, myPartyRef, opponentBattlePokemon, setOpponentParty])

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
            
            // 重置對方隊伍與寶可夢狀態
            resetAll()

        }
        if (newGameState?.state === GameState.Searching) {
            console.log("[BattleManager] GameStateData indicates Searching state:", newGameState);
            opponentBattlePokemon.resetPokemon();
            return;
        } else if (newGameState?.state === GameState.Battle) {
            gameStateDataRef.current = newGameState;
            console.log("[BattleManager] GameStateData indicates Battle state:", newGameState);
            doAction(async () => {
                const newstate = messageStore.getRefs().gameStateData
                setGameStateData(newstate);
                console.log("[BattleManager] Initialization finished, setting my first Pokemon in party.");
                console.log("[BattleManager] Retrieved GameStateData:", newstate);
                console.log("[BattleManager] Retrieved opponentBattlePokemon:", opponentBattlePokemon.pokemonRef.current);
                console.log("[BattleManager] Retrieved myParty:", messageStore.getRefs().party);
                difficultyModifiersRef.current = messageStore.getRefs().difficultyModifiers
                if( newstate === undefined ){
                    return;
                }
                // 如果是從暫停恢復戰鬥，雙方寶可夢都已存在
                if (newstate.opponentParty && newstate.opponentParty.length > 0 &&
                    newstate.opponentPokemonUid && newstate.defenderPokemonUid 
                    && (opponentBattlePokemon.pokemonRef.current == undefined || 
                        opponentParty.length === 0 )
                ) {
                    await initialize(messageStore.getRefs().party || []);
                    await initializeBattle(newstate);
                    // 更新 GameStateData，確保 extension 端同步
                    const payload: SetGameStateDataPayload = {
                        gameStateData: {
                            ...newstate,
                            state: GameState.Battle,
                        }
                    };
                    console.log("[BattleManager] Updating GameStateData to Battle:", payload);

                    vscode.postMessage({
                        command: MessageType.SetGameStateData,
                        ...payload
                    });
                    await dialogBoxRef.current?.setText("Battle Resumed!");
                }

            });
            
            return;
        } else if (newGameState?.state === GameState.WildAppear || newGameState?.state === GameState.TrainerAppear) {
            // 新的野生遭遇或訓練家遭遇
            doAction(async () => {
                if (newGameState.defenderPokemonUid !== undefined) {
                    const newstate = messageStore.getRefs().gameStateData
                    setGameStateData(newstate);
                    await initialize(messageStore.getRefs().party || []);
                    await initializeBattle(newGameState);
                    difficultyModifiersRef.current = messageStore.getRefs().difficultyModifiers
                    console.log("Start initializing BattleControl...");

                    // 更新 GameStateData，確保 extension 端同步
                    const payload: SetGameStateDataPayload = {
                        gameStateData: {
                            ...newGameState,
                            state: GameState.Battle,
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
                    const opponentPokemonName = opponentBattlePokemon.pokemonRef.current ? getDialogName(opponentBattlePokemon.pokemonRef.current).toUpperCase() : "???";
                    const myPokemonName = myBattlePokemon.pokemonRef.current ? getDialogName(myBattlePokemon.pokemonRef.current).toUpperCase() : "???";
                    await dialogBoxRef.current?.setText(`A wild ${opponentPokemonName} appeared!`);
                    await dialogBoxRef.current?.setText(`Go! ${myPokemonName}!`);
                } else {
                    console.error("No defendPokemon provided for WildAppear state.");
                    // 這裡不應該出現沒有我方寶可夢的情況
                    onBattleEvent({
                        type: BattleEventType.UnKnownError,
                    });
                }
            });
        } else {
            onBattleEvent({
                type: BattleEventType.UnKnownError,
            });
        }
    }, () => messageStore.isInitialized() === InitializedState.finished);

    useMessageSubscription<PokemonDao[]>(MessageType.PartyData, async (message) => {
        doAction(async () => {
            const newParty = message.data ?? [];
            myPartyRef.current = newParty;
            setMyParty(newParty);
            const currentState = gameStateDataRef.current?.state;
            if (currentState === GameState.Battle) {
                // 每次RoundFinish後會Update
                // Update 後檢查是否還有下一輪
                // 檢查我方出戰寶可夢是否暈倒

                const myCurrentPokemon = myBattlePokemon.pokemonRef.current
                if (myCurrentPokemon && myCurrentPokemon.ailment === 'fainted') {
                    battleCanvasRef.current?.handleMyPokemonFaint()
                    await dialogBoxRef.current?.setText(`${getDialogName(myCurrentPokemon).toUpperCase()} fainted!`);
                    // 我的寶可夢暈倒了，檢查隊伍中是否還有其他可用的寶可夢
                    const filterMyParty = myPartyRef.current.filter(p => p.uid !== myCurrentPokemon?.uid && p.currentHp > 0);
                    console.log("[BattleManager] Fainted Pokemon detected, available party:", filterMyParty);
                    if (filterMyParty.length === 0) {
                        // 沒有可用的寶可夢了，戰鬥結束
                        await dialogBoxRef.current?.setText(`All of your Pokémon have fainted!`);
                        console.log("[BattleManager] All My Pokemon Fainted");
                        await onBattleFinish('fainted')
                        return;
                    } else {
                        // 有可用的寶可夢，打開選單讓玩家選擇
                        await dialogBoxRef.current?.openPartyMenu();
                    }
                }

                // 更新我方出戰寶可夢 UID
                if (myBattlePokemon.pokemonRef.current != undefined) {
                    const updateDefenderPokemonUidPayload: UpdateDefenderPokemonUidPayload = {
                        pokemonUid: myBattlePokemon.pokemonRef.current?.uid,
                    }
                    vscode.postMessage({
                        command: MessageType.UpdateDefenderPokemonUid,
                        ...updateDefenderPokemonUidPayload
                    });
                }


                // 檢查對方出戰寶可夢是否暈倒
                const opponentCurrentPokemon = opponentBattlePokemon.pokemonRef.current
                if (opponentCurrentPokemon && opponentCurrentPokemon.ailment === 'fainted') {
                    // 對方的寶可夢暈倒了，檢查隊伍中是否還有其他可用的寶可夢
                    battleCanvasRef.current?.handleOpponentPokemonFaint()
                    await dialogBoxRef.current?.setText(`${getDialogName(opponentCurrentPokemon).toUpperCase()} fainted!`);
                    const filterOpponentParty = opponentPartyRef.current.filter(p => p.uid !== opponentCurrentPokemon?.uid && p.currentHp > 0);
                    console.log("[BattleManager] Opponent Fainted Pokemon detected, available party:", filterOpponentParty);
                    if (filterOpponentParty.length === 0) {
                        // 沒有可用的寶可夢了，戰鬥結束
                        await dialogBoxRef.current?.setText(`All of opponent's Pokémon have fainted!`);
                        console.log("[BattleManager] All Opponent Pokemon Fainted");
                        await onBattleFinish('fainted')
                        return;
                    } else {
                        // 有可用的寶可夢，對方自動換下一隻
                        const nextOpponent = filterOpponentParty[0];
                        await dialogBoxRef.current?.setText(`Opponent sent out ${getDialogName(nextOpponent).toUpperCase()}!`);

                        // 切換對方寶可夢
                        opponentBattlePokemon.setPokemon(nextOpponent);
                        opponentBattlePokemon.syncState();
                        await dialogBoxRef.current?.setText(`GO! ${getDialogName(nextOpponent).toUpperCase()}!`);
                        // 播放對方換人動畫
                        battleCanvasRef.current?.handleOpponentSwitchPokemon();
                        console.log("[BattleManager] Opponent switched to:", nextOpponent.name);   
                    }
                }

                // 更新對方出戰寶可夢 UID
                if (opponentBattlePokemon.pokemonRef.current != undefined) {
                    const updateOpponentPokemonUidPayload: UpdateOpponentPokemonUidPayload = {
                        pokemonUid: opponentBattlePokemon.pokemonRef.current.uid,
                    }
                    vscode.postMessage({
                        command: MessageType.UpdateOpponentPokemonUid,
                        ...updateOpponentPokemonUidPayload
                    });
                }
            }
        });
    });

    return [
        {
            myPokemon: myBattlePokemon.pokemonRef.current,
            opponentPokemon: opponentBattlePokemon.pokemonRef.current,
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
        }
    ]
}