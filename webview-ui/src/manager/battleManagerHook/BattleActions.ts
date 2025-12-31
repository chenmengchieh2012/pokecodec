import React, { useCallback, useRef } from "react";
import { BattleEvent, BattleEventType } from "../../../../src/dataAccessObj/GameState";
import { ItemDao } from "../../../../src/dataAccessObj/item";
import { MessageType } from "../../../../src/dataAccessObj/messageType";
import { PokeBallDao } from "../../../../src/dataAccessObj/pokeBall";
import { getDialogName, getGenById, PokemonDao, PokemonStateAction } from "../../../../src/dataAccessObj/pokemon";
import { PokemonMove } from "../../../../src/dataAccessObj/pokeMove";
import { RecordItemActionPayload } from "../../../../src/utils/AchievementCritiria";
import { ItemEffectStrategy } from "../../../../src/utils/ItemEffectStrategy";
import { GetEmptyMoveEffectResult, MoveEffectResult } from "../../../../src/utils/MoveEffectCalculator";
import { BattleControlHandle } from "../../frame/BattleControl";
import { BattleCanvasHandle } from "../../frame/VBattleCanvas";
import { BattlePokemon, PokemonHitAction } from "../../hook/BattlePokemon";
import { vscode } from "../../utilities/vscode";

import { DifficultyModifiers } from "../../../../src/dataAccessObj/DifficultyData";
import { BattleMode } from "../../../../src/dataAccessObj/gameStateData";
import { useMessageSubscription } from "../../store/messageStore";
import { BattleRecorderHandler } from "../battleRecorder";
import { BiomeType } from "../../../../src/dataAccessObj/BiomeData";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface UseBattleActionsProps {
    dialogBoxRef: React.RefObject<BattleControlHandle | null>;
    battleCanvasRef: React.RefObject<BattleCanvasHandle | null>;
    battleRecorder: BattleRecorderHandler;
    onBattleEvent: (event: BattleEvent) => Promise<void>;
}

export const BattleActions = ({
    dialogBoxRef,
    battleCanvasRef,
    battleRecorder,
    onBattleEvent,
}: UseBattleActionsProps) => {
    const runAttemptsRef = useRef<number>(0);
    const catchAttemptsRef = useRef<number>(0);
    const difficultyModifiersRef = useRef<DifficultyModifiers | undefined>(undefined);
        

    useMessageSubscription<DifficultyModifiers>(MessageType.DifficultyModifiersData, (message) => {
        console.log("[BattleManager] Received DifficultyModifiersData:", message.data);
        difficultyModifiersRef.current = message.data;
    });
    
    const checkAilmentBeforeAttack = useCallback(async (
        attacker: BattlePokemon, 
        attackerMove: PokemonMove
    ): Promise<boolean> => {
        // 0. 異常狀態影響
        const attackerPokemon = attacker.pokemon;
        if (attackerPokemon?.ailment === 'paralysis') {
            const rand = Math.random();
            if (rand < 0.25) {
                await dialogBoxRef.current?.setText(`${getDialogName(attackerPokemon)} is paralyzed! It can't move!`);
                return false;
            }
        }

        if (attackerPokemon?.ailment === 'sleep' && attackerMove.name !== 'snore' && attackerMove.name !== 'sleep talk') {
            await dialogBoxRef.current?.setText(`${getDialogName(attackerPokemon)} is fast asleep!`);
            return false;
        }

        if (attackerPokemon?.ailment === 'freeze' && attackerMove.name !== 'thaw') {
            await dialogBoxRef.current?.setText(`${getDialogName(attackerPokemon)} is frozen solid! It can't move!`);
            return false;
        }
        return true;
    }, [dialogBoxRef]);

    const attack = useCallback(async (
        fromBattlePokemon: BattlePokemon | undefined,
        toBattlePokemon: BattlePokemon | undefined,
        hitAction: PokemonHitAction
    ): Promise<{ moveEffectResult: MoveEffectResult; remainingHp: number }> => {
        if (fromBattlePokemon == undefined || toBattlePokemon == undefined) {
            throw new Error(" no opponent")
        }
        const fromPokemon = fromBattlePokemon?.pokemonRef.current;
        if (fromPokemon == undefined) {
            throw new Error(" no opponent Pokemon")
        }
        const fromPokemonName = fromPokemon.name;
        const toPokemon = toBattlePokemon?.pokemonRef.current;
        const hitMove = hitAction.move;
        if (toPokemon == undefined) {
            throw new Error(" no my Pokemon")
        }

        const canAttack = await checkAilmentBeforeAttack(fromBattlePokemon, hitMove);
        if (!canAttack) {
            return { 
                moveEffectResult: GetEmptyMoveEffectResult(), 
                remainingHp: toPokemon.currentHp
            };
        }

        let goHit = hitAction.success;
        if(!hitAction.success ){
            if(hitAction.failByConfusion){
                await dialogBoxRef.current?.setText(`${fromPokemonName} is confused! It hurt itself in its confusion!`);
                // 自傷傷害計算
                const isEffect = fromBattlePokemon.effectByConfused();
                if( isEffect ){
                    await dialogBoxRef.current?.setText(`It hurt itself!`);
                } else {
                    await dialogBoxRef.current?.setText(`But it snapped out of its confusion!`);
                    goHit = true;
                }
            }
            if(hitAction.failByFlinch){
                await dialogBoxRef.current?.setText(`${fromPokemonName} flinched and couldn't move!`);
            }
        }

        if(!goHit){
            return { 
                moveEffectResult: GetEmptyMoveEffectResult(), 
                remainingHp: toPokemon.currentHp
            };
        }

        // 1. Decrement PP for the move used by opponent Pokemon
        fromBattlePokemon.decrementPP(hitMove);
 
        // 2. 先執行攻擊動畫 (不等待)
        battleCanvasRef.current?.handleAttackFromOpponent()
        await dialogBoxRef.current?.setText(`${fromPokemonName.toUpperCase()} used ${hitMove.name.toUpperCase()}!`);
        const attackerState = fromBattlePokemon.getBattleState();
        // 3. 執行傷害計算與文字顯示 (這會等待打字機效果)
        const { newHp: remainingHp, moveEffectResult } 
            = toBattlePokemon.hited(fromPokemon, attackerState, hitMove);
        await dialogBoxRef.current?.setText(`${fromPokemonName.toUpperCase()} cause ${moveEffectResult.damage} damage!`);

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
        toBattlePokemon.effectByMove(moveEffectResult);
        fromBattlePokemon.effectByMove(moveEffectResult);

        return { moveEffectResult, remainingHp };
    }, [battleCanvasRef, checkAilmentBeforeAttack, dialogBoxRef]);

    const handleMyHitLogic = useCallback(async (
        opponent: BattlePokemon,
        defeat: BattlePokemon,
        selectedDefeatMove: PokemonMove
    ) => {
        try{
            if (opponent == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                throw new Error("Opponent is missing, attack aborted.");
            }

            if (defeat == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                throw new Error("My Pokemon is missing, attack aborted.");
            }
            const opponentPokemon = opponent.pokemonRef.current;
            const defeatPokemon = defeat.pokemonRef.current;
            if (opponentPokemon == undefined) {
                throw new Error(" no opponent Pokemon")
            }
            if (defeatPokemon == undefined) {
                throw new Error(" no my Pokemon")
            }
            let defeatPokemonSpeed = defeatPokemon.stats.speed;
            let opponentPokemonSpeed = opponentPokemon.stats.speed;
            if(defeatPokemon.ailment === 'paralysis'){
                defeatPokemonSpeed = Math.floor(defeatPokemonSpeed * 0.75);
            }
            if(opponentPokemon.ailment === 'paralysis'){
                opponentPokemonSpeed = Math.floor(opponentPokemonSpeed * 0.75);
            }
            const defeatHitAction = defeat.getHitAction(selectedDefeatMove.id);
            const opponentHitAction = opponent.getHitAction();
            // 速度判斷與攻擊順序邏輯
            const firstAttackPokemon = (defeatPokemonSpeed >= opponentPokemonSpeed) ? defeat : opponent;
            const secondAttackPokemon = (defeatPokemonSpeed >= opponentPokemonSpeed) ? opponent : defeat;
            const firstHitAction = (defeatPokemonSpeed >= opponentPokemonSpeed) ? defeatHitAction : opponentHitAction;
            const secondHitAction = (defeatPokemonSpeed >= opponentPokemonSpeed) ? opponentHitAction : defeatHitAction;
            const { moveEffectResult: firstAttackMoveEffectResult, remainingHp: remainHP } = await attack(firstAttackPokemon, secondAttackPokemon, firstHitAction);
            defeat.syncState();
            opponent.syncState();
            // 等待第一回合攻擊動畫與血量扣除完成

            if( remainHP > 0 ){
                const { moveEffectResult: secondAttackMoveEffectResult } = await attack(secondAttackPokemon, firstAttackPokemon, secondHitAction);
                defeat.syncState();
                opponent.syncState();
                battleRecorder.onBattleAction(
                    false,
                    firstAttackPokemon === defeat ? firstAttackMoveEffectResult : secondAttackMoveEffectResult,
                    firstAttackPokemon === opponent ? firstAttackMoveEffectResult : secondAttackMoveEffectResult,
                    firstAttackPokemon === defeat ? defeatHitAction.move : opponentHitAction.move,
                    firstAttackPokemon === opponent ? opponentHitAction.move : defeatHitAction.move,
                    opponentPokemon
                )
            }else{
                battleRecorder.onBattleAction(
                    false,
                    firstAttackPokemon === defeat ? firstAttackMoveEffectResult : undefined,
                    firstAttackPokemon === opponent ? firstAttackMoveEffectResult : undefined,
                    firstAttackPokemon === defeat ? defeatHitAction.move : undefined,
                    firstAttackPokemon === opponent ? opponentHitAction.move : undefined,
                    opponentPokemon
                )
            }
            onBattleEvent({
                type: BattleEventType.RoundFinish,
            });

        } catch(e){
            console.error("[BattleManager] Error in handleMyHitLogic:", e);
            onBattleEvent({
                type: BattleEventType.UnKnownError,
            })
            return;
        }
    }, [attack, onBattleEvent, battleRecorder]);

    const handleOneSidedAttackFromOpponentLogic = useCallback(async (
        defender: BattlePokemon,
        opponent: BattlePokemon,
    ) => {
        const opponentHitAction = opponent.getHitAction();
        const { moveEffectResult: opponentMoveEffectResult } = await attack(opponent, defender, opponentHitAction);
        battleRecorder.onBattleAction(
            false,
            undefined,
            opponentMoveEffectResult,
            undefined,
            opponentHitAction.move,
            opponent.pokemonRef.current
        )
    },[attack, battleRecorder])

    const handleThrowBallLogic = useCallback(async (
        battleMode: BattleMode,
        biomeType: BiomeType,
        defender: BattlePokemon,
        opponent: BattlePokemon,
        ballDao: PokeBallDao
    ) => {
        catchAttemptsRef.current += 1;
        try {
            if (opponent == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                throw new Error("Opponent is missing, throw ball aborted.");
            }
            const catchBonusPercent = difficultyModifiersRef.current?.catchBonusPercent || 1.0;
            const isCatchAble = battleMode === BattleMode.Wild;
            
            let caught = false
            if(isCatchAble){
                // 扣除道具
                vscode.postMessage({
                    command: MessageType.RemoveItem,
                    item: ballDao,
                    count: 1
                });

                // 執行丟球動畫 (不等待)
                battleCanvasRef.current?.handleThrowBallPhase({
                    action: PokemonStateAction.Catching,
                    caughtBallApiName: ballDao.apiName,
                });

                await dialogBoxRef.current?.setText(`POKé BALL!!!`);
                await dialogBoxRef.current?.setText("...").then(async ()=>{
                    await sleep(500)
                });
                await dialogBoxRef.current?.setText("... ...").then(async ()=>{
                    await sleep(500)
                });
                await dialogBoxRef.current?.setText("... ... ...").then(async ()=>{
                    await sleep(500)
                });
                caught = opponent.throwBall(ballDao, catchBonusPercent);
            }

            if (caught && isCatchAble) {
                // Wait for "Caught" animation
                battleCanvasRef.current?.handleThrowBallPhase({
                    action: PokemonStateAction.Caught,
                    caughtBallApiName: ballDao.apiName,
                });
                await dialogBoxRef.current?.setText(`All right! ${opponent.pokemonRef.current?.name.toUpperCase()} was caught!`);
                
                const catchedPokemon = opponent.pokemonRef.current;
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
                    battleRecorder.onCatch(opponent.pokemonRef.current, biomeType)
                }
                onBattleEvent({
                    type: BattleEventType.WildPokemonCatched,
                });
            } else {
                if(isCatchAble){
                    battleCanvasRef.current?.handleThrowBallPhase({
                        action: PokemonStateAction.Escaped,
                        caughtBallApiName: ballDao.apiName,
                    });
                    await dialogBoxRef.current?.setText(`Darn! The POKéMON broke free!`);
                }
                // 沒抓到，對方攻擊
                handleOneSidedAttackFromOpponentLogic(defender, opponent);
                onBattleEvent({
                    type: BattleEventType.RoundFinish,
                });
            }
        } catch (e) {
            console.error("[BattleManager] Error in handleThrowBallLogic:", e);
            onBattleEvent({
                type: BattleEventType.UnKnownError,
            })
        }
    }, [battleCanvasRef, dialogBoxRef, onBattleEvent, battleRecorder, handleOneSidedAttackFromOpponentLogic]);

    const handleUseItemLogic = useCallback(async (
        defender: BattlePokemon,
        opponent: BattlePokemon, 
        unEffectPokemon: PokemonDao,
        item: ItemDao, 
        focusMove?: PokemonMove
    ) => {
        await dialogBoxRef.current?.setText(`Used ${item.name.replace(/-/g, ' ')}!`);
        try {
            if(unEffectPokemon == undefined){
                throw new Error(" no effect Pokemon")
            }
            if(opponent == undefined){
                throw new Error(" no opponent")
            }
            const itemEffectStrategy = new ItemEffectStrategy(
                unEffectPokemon,
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

                // 2. 更新寶可夢資料
                if(effectedPokemon.uid === defender.pokemonRef.current?.uid){
                    defender.setPokemon(effectedPokemon);
                }else{
                    // 不是我方出戰的寶可夢，直接更新隊伍資料
                    // 更新隊伍中的寶可夢資料
                    // 不必擔心同步問題，因為整個流程在 Queue 裡面排隊執行
                    vscode.postMessage({
                        command: MessageType.UpdatePartyPokemon,
                        pokemons: [effectedPokemon],
                    });
                }

                // 3. 顯示使用道具文字
                if(usedMessage && usedMessage.length > 0){
                    await dialogBoxRef.current?.setText(usedMessage);
                }

                // 4. 紀錄道具使用行為
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
            }
        
            // 3. Opponent turn
            // 對方攻擊
            await handleOneSidedAttackFromOpponentLogic(defender, opponent);
            onBattleEvent({
                type: BattleEventType.RoundFinish,
            });
        } catch(e){
            console.error("[BattleManager] Error in handleUseItemLogic:", e);
            onBattleEvent({
                type: BattleEventType.UnKnownError,
            });
            return;
        }

        if (defender.pokemonRef.current == undefined) {
            onBattleEvent({
                type: BattleEventType.UnKnownError,
            });
            throw new Error("no my Pokemon")
        }
    }, [dialogBoxRef, handleOneSidedAttackFromOpponentLogic, onBattleEvent]);

    const handleRunAwayLogic = useCallback(async (
        defender: BattlePokemon,
        opponent: BattlePokemon,
    ) => {
        runAttemptsRef.current += 1;
        try{
            if (defender == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                throw new Error(" no my Pokemon")
            }
            if (opponent == undefined) {
                // 如果在排隊過程中戰鬥已經結束 (例如對方已經因為其他原因消失)，做個保護
                throw new Error(" no opponent")
            }
            const defenderPokemon = defender.pokemonRef.current;
            const opponentPokemon = opponent.pokemonRef.current;
            if (defenderPokemon == undefined) {
                throw new Error(" no my Pokemon")
            }
            if (opponentPokemon == undefined) {
                throw new Error(" no opponent Pokemon")
            }
            const attempts = runAttemptsRef.current;

            // Formula: F = (A * 128 / B) + 30 * C
            // A = My Speed, B = Opponent Speed (mod 256), C = Attempts
            // If F > 255, escape guaranteed.

            const mySpeed = defenderPokemon.stats.speed;
            const opponentSpeed = opponentPokemon.stats.speed;
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
            if (defenderPokemon.ailment == 'fainted') {
                success = true;
            }

            if (success) {
                battleCanvasRef.current?.handleRunAway()
                await dialogBoxRef.current?.setText("Run away safely!");
                onBattleEvent({
                    type: BattleEventType.Escaped,
                });
            } else {
                await dialogBoxRef.current?.setText("Can't escape!");
                // Opponent attacks
                await handleOneSidedAttackFromOpponentLogic(defender, opponent);
                onBattleEvent({
                    type: BattleEventType.RoundFinish,
                });
            }

        } catch(e){
            console.error("[BattleManager] Error in handleRunAwayLogic:", e);
            onBattleEvent({
                type: BattleEventType.UnKnownError,
            })
            return;
        }

        
    }, [battleCanvasRef, dialogBoxRef, onBattleEvent, handleOneSidedAttackFromOpponentLogic]);

    const handleSwitchMyPokemonLogic = useCallback(async (
        defender: BattlePokemon,
        opponent: BattlePokemon,
        newPokemon: PokemonDao
    ) => {
        // 確保換上的不是同一隻 (雖然 UI 層可能擋掉了，但這裡再防一次)
        if (newPokemon.uid === defender.pokemonRef.current?.uid) return;

        // 1. 執行切換動畫與邏輯
        battleCanvasRef.current?.handleSwitchPokemon()
        // 更新我方出戰寶可夢資料
        defender.setPokemon(newPokemon);
        defender.syncState();
        // 對方攻擊 (換人會被打)
        // 檢查對方是否還活著 (雖通常換人時對方都在)
        await handleOneSidedAttackFromOpponentLogic(defender, opponent);
        onBattleEvent({
            type: BattleEventType.RoundFinish,
        });

    }, [battleCanvasRef, handleOneSidedAttackFromOpponentLogic, onBattleEvent]);
    


    return {
        handleMyHitLogic,
        handleThrowBallLogic,
        handleUseItemLogic,
        handleRunAwayLogic,
        handleSwitchMyPokemonLogic,
        reset: () => {
            runAttemptsRef.current = 0;
            catchAttemptsRef.current = 0;
        },
    }
}