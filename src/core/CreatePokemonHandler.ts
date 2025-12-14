import { randomUUID } from "crypto";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonDao, PokemonStats } from "../dataAccessObj/pokemon";
import { PokemonMove } from "../dataAccessObj/pokeMove";
export const PokemonFactory = {
    createWildPokemonInstance: async (pokemonEncounterData: PokeEncounterData): Promise<PokemonDao> => {
        // 從資料庫取得寶可夢基本資料
        const finalPokemonId = pokemonEncounterData.id;
        const depth = pokemonEncounterData.minDepth;
        return await fetch(`https://pokeapi.co/api/v2/pokemon/${finalPokemonId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        }).then(async (pokemonData: any) => {

            // 根據深度調整等級 (簡單範例，實際邏輯可更複雜)
            const level = Math.min(5 + depth * 2, 100);
            
            // Nature
            const natures = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
            const nature = natures[Math.floor(Math.random() * natures.length)];


            // Ability
            const abilities = pokemonData.abilities;
            const randomAbility = abilities.length > 0 
                ? abilities[Math.floor(Math.random() * abilities.length)].ability.name 
                : 'Unknown';
            const ability = randomAbility.charAt(0).toUpperCase() + randomAbility.slice(1);

            
            const iv: PokemonStats = {
                hp: Math.floor(Math.random() * 32),
                attack: Math.floor(Math.random() * 32),
                defense: Math.floor(Math.random() * 32),
                specialAttack: Math.floor(Math.random() * 32),
                specialDefense: Math.floor(Math.random() * 32),
                speed: Math.floor(Math.random() * 32),
            };

            const baseState: PokemonStats = {
                hp: 0,
                attack: 0,
                defense: 0,
                specialAttack: 0,
                specialDefense: 0,
                speed: 0,
            };
            
            // Basic IVs
            for( const stat of pokemonData.stats ) {
                const base = stat.base_stat;
                // Simplified stat formula
                if( stat.stat.name === 'hp' ) {
                    baseState.hp = Math.floor(((base * 2 + iv.hp) * level) / 100) + level + 10;
                } else if( stat.stat.name === 'speed' ) {
                    baseState.speed = Math.floor((((base * 2 + iv.speed) * level) / 100) + 5);
                } else if( stat.stat.name === 'attack' ) {
                    baseState.attack = Math.floor((((base * 2 + iv.attack) * level) / 100) + 5);
                } else if( stat.stat.name === 'defense' ) {
                    baseState.defense = Math.floor((((base * 2 + iv.defense) * level) / 100) + 5);
                } else if( stat.stat.name === 'special-attack' ) {
                    baseState.specialAttack = Math.floor((((base * 2 + iv.specialAttack) * level) / 100) + 5);
                } else if( stat.stat.name === 'special-defense' ) {
                    baseState.specialDefense = Math.floor((((base * 2 + iv.specialDefense) * level) / 100) + 5);
                }
            }

            const ev : PokemonStats = {
                hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
            };

            const allMoves: PokemonMove[] = pokemonData.moves.map((moveInfo: any) => ({
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

            const gender = (pokemonData.gender_rate === -1) ? 'Genderless' :
                (Math.random() * 8 < pokemonData.gender_rate) ? 'Female' : 'Male';

            // 生成隨機 height, weight
            const height = pokemonData.height; // 以 dm 為單位
            const weight = pokemonData.weight; // 以 hg 為單位

            const isShiny = Math.random() < 0.5;
            
            // 建立寶可夢實例
            const pokemonInstance: PokemonDao = {
                uid: randomUUID(),
                id: finalPokemonId,
                name: pokemonData.name.toUpperCase(),
                currentHp: baseState.hp, 
                maxHp: baseState.hp,

                stats: baseState,
                iv: iv,
                ev: ev,

                types: pokemonData.types.map((t: any) => t.type.name),
                gender: gender,
                nature: nature,
                ability: ability,
                height: height,
                weight: weight,
                baseExp: pokemonData.base_experience,
                currentExp: 0,
                toNextLevelExp: Math.floor( (4 * Math.pow(level,3)) / 5 ), // 簡化經驗值計算
                isShiny: isShiny,

                originalTrainer: 'Wild',
                caughtDate: Date.now(),
                caughtBall: 'None',
                level: level,

                pokemonMoves: allMoves.slice(0, 4), // 只選前四招
            };

            return pokemonInstance;
        });
    }
};