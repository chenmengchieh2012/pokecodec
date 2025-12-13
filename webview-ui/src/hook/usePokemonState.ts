import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { v4 as uuidv4 } from "uuid";
import { initialPokemonState, PokemonStateAction, type PokemonDao, type PokemonState, type PokemonStats } from "../dataAccessObj/pokemon"
import type { PokeBallDao } from "../dataAccessObj/pokeBall";
import type { PokemonMove, PokemonMoveDAO } from "../dataAccessObj/pokeMove";
import { BattleControlHandle } from "../frame/BattleControl";
import { EncounterResult } from "../../../src/core/EncounterHandler";

export interface PokemonStateHandler {
    newEncounter: (encounterResult: EncounterResult) => void;
    throwBall: (ballDao: PokeBallDao) => Promise<boolean>;
    hited: (pokemon: PokemonDao, move: PokemonMove) => Promise<number>;
    randomMove: () => PokemonMove;
    resetPokemon: () => void;
    switchPokemon: (pokemon: PokemonDao) => Promise<void>;
    heal: (amount: number) => Promise<void>;
    decrementPP: (move: PokemonMove) => void;
}

export interface UsePokemonStateProps{
    defaultPokemonState?: PokemonState;
    defaultPokemon: PokemonDao|undefined;
}

export const usePokemonState = (dialogRef : React.RefObject<BattleControlHandle|null>, props: UsePokemonStateProps) => {
    const [ pokemon, setPokemon ] = useState<PokemonDao | undefined>(props.defaultPokemon ? props.defaultPokemon : undefined);
    const [ pokemonState, setPokemonState ] = useState<PokemonState>(props.defaultPokemonState ? props.defaultPokemonState : initialPokemonState())
    
    // 使用 ref 來保存最新的 pokemonState，以便在 useCallback 中使用而不觸發依賴更新
    const pokemonRef = useRef(pokemon);
    useEffect(() => {
        pokemonRef.current = pokemon;
    }, [pokemon]);

    const handleSwitchPokemon = useCallback(async (pokemon: PokemonDao) => {
        setPokemon(pokemon);
        setPokemonState({action: PokemonStateAction.None});
        await dialogRef.current?.setText(`Go! ${pokemon.name}!`);
    }, [dialogRef]);

    const handleThrowBall = useCallback(async (ballDao: PokeBallDao) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
        // Implement the logic for throwing a ball here
        console.log(`Throwing a ${ballDao.apiName} with catch rate modifier of ${ballDao.catchRateModifier}`);
        setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Catching }));
        await dialogRef.current?.setText(`POKé BALL!!!`);
        await dialogRef.current?.setText("...");
        await sleep(500);
        await dialogRef.current?.setText("... ...");
        await sleep(500);
        await dialogRef.current?.setText("... ... ...");
        await sleep(500);

        const isSuccess = Math.random() > 0.4; // 60% 捕獲率
        if (isSuccess) {
            setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Caught }));
            await dialogRef.current?.setText(`All right! ${currentPokemon.name} was caught!`);
        } else {
            setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Escaped }));
            await dialogRef.current?.setText(`Darn! The POKéMON broke free!`);
        }
        return isSuccess;
    }, [dialogRef]);

    const handleHited = useCallback(async (pokemon: PokemonDao, move: PokemonMove) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) {
            throw new Error("No pokemon available for random move selection.");
        }
        // 傷害計算公式 (引入攻防數值)
        let damage = 0;
        if (move.power) {
            const defender = currentPokemon;
            const attack = pokemon.stats.attack;
            const defense = defender.stats.defense;
            
            // ((2 * Level / 5 + 2) * Power * A / D) / 50 + 2
            const levelFactor = (2 * pokemon.level / 5) + 2;
            const statRatio = attack / defense;
            const baseDamage = ((levelFactor * move.power * statRatio) / 50) + 2;
            
            // Random factor (0.85 - 1.00)
            const random = (Math.floor(Math.random() * 16) + 85) / 100;
            
            damage = Math.floor(baseDamage * random);

            // 至少造成 1 點傷害
            if (damage < 1) damage = 1;
        }
 
        // 判斷是否瀕死並設定對話
        const currentHp = currentPokemon.currentHp;
        let newHp = currentHp;
        
        if (currentHp - damage <= 0) {
            await dialogRef.current?.setText(`${pokemon.name} fainted!`);
        } else {
            const damageText = damage > 0 ? ` (damage: ${damage})` : '';
            await dialogRef.current?.setText(`${pokemon.name} used ${move.name}${damageText}!`);
        }

        if (damage > 0) {
            newHp = Math.max(0, currentHp - damage);
            if(newHp == 0){
                await dialogRef.current?.setText(`${currentPokemon.name} fainted!`);
                
            }
            setPokemon(prev=>{
                if(!prev){
                    return prev;
                }
                return {
                    ...prev,
                    currentHp: newHp
                }
            })
            if (newHp === 0) {
                setPokemonState(prev => ({ ...prev, action: PokemonStateAction.Fainted }));
            }
        }
        return newHp;
    }, [dialogRef]);

    const handleNewEncounter = useCallback(async (encounterResult: EncounterResult) => {
        const finalPokemonId = encounterResult.pokemon?.id ? encounterResult.pokemon.id : Math.floor(Math.random() * 151) + 1; // 隨機 1-151
        fetch(`https://pokeapi.co/api/v2/pokemon/${finalPokemonId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        }).then(pokemonData => {
            // 生成隨機數值
            const level = Math.floor(Math.random() * 50) + 1;

            const allMoves: PokemonMove[] = pokemonData.moves.map((moveInfo: PokemonMoveDAO) => ({
                id: 0,
                name: moveInfo.move.name.toUpperCase(),
                // 擴大判定範圍，讓更多招式擁有攻擊力 (包含 machine, tutor 等)
                power: ['level-up', 'machine', 'tutor'].includes(moveInfo.version_group_details[0].move_learn_method.name) ? 40 + Math.floor(Math.random() * 61) : null,
                type: 'NORMAL', // 簡化處理，全部設為一般屬性
                accuracy: 100,
                pp: 20,
                maxPP: 20,
                effect: ''
            }));

            const pokemonMoves = allMoves.sort(() => 0.5 - Math.random()).slice(0, 4); // 隨機選擇 4 招
            
            // Generate IVs
            const iv: PokemonStats = {
                hp: Math.floor(Math.random() * 32),
                attack: Math.floor(Math.random() * 32),
                defense: Math.floor(Math.random() * 32),
                specialAttack: Math.floor(Math.random() * 32),
                specialDefense: Math.floor(Math.random() * 32),
                speed: Math.floor(Math.random() * 32),
            };

            // EVs (wild pokemon usually have 0 EVs)
            const ev: PokemonStats = {
                hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
            };

            // Nature
            const natures = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
            const nature = natures[Math.floor(Math.random() * natures.length)];

            // Ability
            const abilities = pokemonData.abilities;
            const randomAbility = abilities.length > 0 
                ? abilities[Math.floor(Math.random() * abilities.length)].ability.name 
                : 'Unknown';
            const ability = randomAbility.charAt(0).toUpperCase() + randomAbility.slice(1);

            let hp = 0;
            let speed = 0;
            let attack = 0;
            let defense = 0;
            let specialAttack = 0;
            let specialDefense = 0;

            for( const stat of pokemonData.stats ) {
                const base = stat.base_stat;
                // Simplified stat formula
                if( stat.stat.name === 'hp' ) {
                    hp = Math.floor(((base * 2 + iv.hp) * level) / 100) + level + 10;
                } else if( stat.stat.name === 'speed' ) {
                    speed = Math.floor((((base * 2 + iv.speed) * level) / 100) + 5);
                } else if( stat.stat.name === 'attack' ) {
                    attack = Math.floor((((base * 2 + iv.attack) * level) / 100) + 5);
                } else if( stat.stat.name === 'defense' ) {
                    defense = Math.floor((((base * 2 + iv.defense) * level) / 100) + 5);
                } else if( stat.stat.name === 'special-attack' ) {
                    specialAttack = Math.floor((((base * 2 + iv.specialAttack) * level) / 100) + 5);
                } else if( stat.stat.name === 'special-defense' ) {
                    specialDefense = Math.floor((((base * 2 + iv.specialDefense) * level) / 100) + 5);
                }
            }

            const stats: PokemonStats = { hp, attack, defense, specialAttack, specialDefense, speed };

            interface PokemonType {
                type: {
                    name: string;
                };
            }
            const types = pokemonData.types.map((t: PokemonType) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1));
            const height = pokemonData.height;
            const weight = pokemonData.weight;
            const baseExp = pokemonData.base_experience;
            const isShiny = encounterResult.isShiny; // 1% chance of shiny

            setPokemon({
                uid: `${pokemonData.id}-${uuidv4()}`,
                id: pokemonData.id,
                name: pokemonData.name.toUpperCase(),
                level,
                currentHp: hp,
                maxHp: hp,
                stats,
                iv,
                ev,
                types,
                gender: Math.random() > 0.5 ? 'Male' : 'Female',
                nature,
                ability,
                height,
                weight,
                baseExp,
                currentExp: 0,
                toNextLevelExp: Math.pow(level + 1, 3), // Simplified exp curve
                isShiny,
                originalTrainer: 'Wild',
                caughtDate: Date.now(),
                caughtBall: 'None',
                pokemonMoves: pokemonMoves,
            })
            // 先設定基礎資料
            setPokemonState({
                action: PokemonStateAction.None
            });
            return pokemonData;
        })
    }, []);

    const handleRandomMove = useCallback(() => {
        if (!pokemonRef.current) {
            throw new Error("No pokemon available for random move selection.");
        }
        const moves = pokemonRef.current.pokemonMoves;
        const randomIndex = Math.floor(Math.random() * moves.length);
        return moves[randomIndex];
    }, []);

    const handleResetPokemon = useCallback(() => {
        setPokemon(undefined);
        setPokemonState({
            action: PokemonStateAction.None
        });
    }, []);

    const handleHeal = useCallback(async (amount: number) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        const maxHp = currentPokemon.maxHp || currentPokemon.stats.hp;
        const currentHp = currentPokemon.currentHp ?? maxHp;
        const newHp = Math.min(maxHp, currentHp + amount);

        setPokemon(prev => prev ? { ...prev, currentHp: newHp } : undefined);
    }, []);

    const handleDecrementPP = useCallback((move: PokemonMove) => {
        const currentPokemon = pokemonRef.current;
        if (!currentPokemon) return;

        // Find the move and decrement its PP
        const updatedMoves = currentPokemon.pokemonMoves.map(m => {
            if (m.name === move.name && m.pp > 0) {
                return { ...m, pp: m.pp - 1 };
            }
            return m;
        });

        setPokemon(prev => prev ? { ...prev, pokemonMoves: updatedMoves } : undefined);
    }, []);

    const handler: PokemonStateHandler = useMemo(() => ({
        newEncounter: handleNewEncounter,
        throwBall: handleThrowBall,
        hited: handleHited,
        randomMove: handleRandomMove,
        switchPokemon: handleSwitchPokemon,
        resetPokemon: handleResetPokemon,
        heal: handleHeal,
        decrementPP: handleDecrementPP
    }), [handleNewEncounter, handleThrowBall, handleHited, handleRandomMove, handleSwitchPokemon, handleResetPokemon, handleHeal, handleDecrementPP]);

    return {
        pokemon,
        pokemonState,
        handler: handler
    }
}