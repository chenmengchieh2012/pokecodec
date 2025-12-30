import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BattlePokemonFactory } from './BattlePokemon';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { MoveEffectCalculator } from '../../../src/utils/MoveEffectCalculator';
import { ExperienceCalculator } from '../../../src/utils/ExperienceCalculator';
import { PokeBallDao } from '../../../src/dataAccessObj/pokeBall';

// Mock dependencies
vi.mock('../../../src/utils/MoveEffectCalculator', () => ({
    MoveEffectCalculator: {
        calculateEffect: vi.fn(),
    }
}));

vi.mock('../../../src/utils/ExperienceCalculator', () => ({
    ExperienceCalculator: {
        addExperience: vi.fn(),
    }
}));

describe('BattlePokemonFactory', () => {
    const mockPokemon: PokemonDao = {
        uid: 'test-uid',
        id: 25,
        name: 'Pikachu',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        stats: { hp: 20, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 10 },
        pokemonMoves: [
            { id: 1, name: 'Thunder Shock', pp: 30, maxPp: 30 } as unknown as PokemonMove,
            { id: 2, name: 'Quick Attack', pp: 30, maxPp: 30 } as unknown as PokemonMove
        ],
        isShiny: false,
        exp: 0,
        types: ['electric'],
        ailment: 'healthy'
    } as unknown as PokemonDao;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with undefined pokemon', () => {
        const { result } = renderHook(() => BattlePokemonFactory());
        expect(result.current.pokemon).toBeUndefined();
    });

    it('should set pokemon and sync state', () => {
        const { result } = renderHook(() => BattlePokemonFactory());

        act(() => {
            result.current.setPokemon(mockPokemon);
            result.current.syncState();
        });

        expect(result.current.pokemon).toEqual(mockPokemon);
    });

    it('should handle taking damage (hited)', () => {
        const { result } = renderHook(() => BattlePokemonFactory());
        
        // Setup pokemon
        act(() => {
            result.current.setPokemon(mockPokemon);
            result.current.syncState();
        });

        // Mock damage calculation
        const mockDamage = 5;
        vi.mocked(MoveEffectCalculator.calculateEffect).mockReturnValue({
            damage: mockDamage,
            effectiveness: 1,
            isCritical: false,
            isHit: true,
            ailment: undefined,
            flinched: false,
            confused: false,
            attackerStatChanges: undefined,
            defenderStatChanges: undefined
        });

        const attacker = { ...mockPokemon, name: 'Attacker' };
        const move = mockPokemon.pokemonMoves[0];
        const attackerBuffs = result.current.getBattleState();

        act(() => {
            result.current.hited(attacker, attackerBuffs, move);
            result.current.syncState();
        });

        expect(result.current.pokemon?.currentHp).toBe(15); // 20 - 5
    });

    it('should handle throwing a ball', () => {
        const { result } = renderHook(() => BattlePokemonFactory());
        
        act(() => {
            result.current.setPokemon(mockPokemon);
            result.current.syncState();
        });

        const mockBall: PokeBallDao = {
            id: 'poke-ball',
            name: 'Poke Ball',
            catchRateModifier: 1,
            price: 200,
            description: 'A device for catching wild Pokemon.',
            apiName: 'poke-ball'
        } as unknown as PokeBallDao;

        // Mock Math.random to ensure catch success
        const originalRandom = Math.random;
        Math.random = vi.fn(() => 0); 

        let success = false;
        act(() => {
            success = result.current.throwBall(mockBall, 0);
            result.current.syncState();
        });

        expect(success).toBe(true);
        expect(result.current.pokemon?.caughtBall).toBe('poke-ball');

        Math.random = originalRandom;
    });

    it('should handle experience gain and level up', () => {
        const { result } = renderHook(() => BattlePokemonFactory());
        
        act(() => {
            result.current.setPokemon(mockPokemon);
            result.current.syncState();
        });

        const leveledUpPokemon = { ...mockPokemon, level: 6 };
        vi.mocked(ExperienceCalculator.addExperience).mockReturnValue(leveledUpPokemon);

        act(() => {
            const { isLevelUp } = result.current.increaseExp(100);
            result.current.syncState();
            expect(isLevelUp).toBe(true);
        });

        expect(result.current.pokemon?.level).toBe(6);
    });

    it('should reset pokemon', () => {
        const { result } = renderHook(() => BattlePokemonFactory());
        
        act(() => {
            result.current.setPokemon(mockPokemon);
            result.current.syncState();
        });

        expect(result.current.pokemon).toBeDefined();

        act(() => {
            result.current.resetPokemon();
            result.current.syncState();
        });

        expect(result.current.pokemon).toBeUndefined();
    });
});
