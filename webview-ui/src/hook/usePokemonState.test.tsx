import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PokeBallDao } from '../../../src/dataAccessObj/pokeBall';
import { PokemonDao, PokemonStateAction } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { BattlePokemonState, MoveEffectCalculator, MoveEffectResult } from '../../../src/utils/MoveEffectCalculator';
import { BattleControlHandle } from '../frame/BattleControl';
import { usePokemonState } from './usePokemonState';
import { ExperienceCalculator } from '../../../src/utils/ExperienceCalculator';

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

describe('usePokemonState', () => {
    let mockDialogRef: React.RefObject<BattleControlHandle>;
    let mockSetText: ReturnType<typeof vi.fn>;

    const mockPokemon: PokemonDao = {
        uid: 'test-uid',
        id: 25,
        name: 'Pikachu',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        stats: { hp: 20, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 10 },
        pokemonMoves: [
            { name: 'Thunder Shock', pp: 30, maxPp: 30 } as unknown as PokemonMove,
            { name: 'Quick Attack', pp: 30, maxPp: 30 } as unknown as PokemonMove
        ],
        isShiny: false,
        exp: 0,
        types: ['electric']
    } as unknown as PokemonDao;

    beforeEach(() => {
        mockSetText = vi.fn().mockResolvedValue(undefined);
        mockDialogRef = {
            current: {
                setText: mockSetText,
            } as unknown as BattleControlHandle
        };
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with default pokemon and state', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        expect(result.current.pokemon).toEqual(mockPokemon);
    });

    it('handles switchPokemon', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: undefined,
            defaultPokemonState: undefined
        }));

        const newPokemon = { ...mockPokemon, name: 'Bulbasaur' };

        await act(async () => {
            await result.current.handler.switchPokemon(newPokemon);
        });

        expect(result.current.pokemon).toEqual(newPokemon);
        expect(mockSetText).toHaveBeenCalledWith('Go! BULBASAUR!');
    });

    it('handles throwBall success', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const mockBall: PokeBallDao = {
            id: 1,
            name: 'Poke Ball',
            apiName: 'poke-ball',
            catchRateModifier: 1,
            price: 200,
            sellPrice: 100,
            pocket: 'balls',
            totalSize: 1,
            description: 'A device for catching wild Pokemon.',
            isConsumable: true
        } as unknown as PokeBallDao;

        // Mock Math.random to return small value (success)
        vi.spyOn(Math, 'random').mockReturnValue(0.1);

        let success;
        await act(async () => {
            success = await result.current.handler.throwBall(true, mockBall, 1, () => { });
        });

        expect(success).toBe(true);
        expect(mockSetText).toHaveBeenCalledWith('POKé BALL!!!');
        expect(mockSetText).toHaveBeenCalledWith('All right! PIKACHU was caught!');
    });

    it('handles throwBall failure', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const mockBall: PokeBallDao = {
            id: 1,
            name: 'Poke Ball',
            apiName: 'poke-ball',
            catchRateModifier: 1,
            price: 200,
            sellPrice: 100,
            pocket: 'balls',
            totalSize: 1,
            description: 'A device for catching wild Pokemon.',
            isConsumable: true
        } as unknown as PokeBallDao;

        // Mock Math.random to return <= 0.4 (failure)
        vi.spyOn(Math, 'random').mockReturnValue(0.3);

        let success;
        await act(async () => {
            success = await result.current.handler.throwBall(true, mockBall, 1, () => { });
        });

        expect(success).toBe(false);
        expect(mockSetText).toHaveBeenCalledWith('Darn! The POKéMON broke free!');
    });

    it('handles hited (taking damage)', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const attacker = { ...mockPokemon, name: 'Attacker' };
        const attackerBuffs: BattlePokemonState = {
            effectStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
            flinched: false, confused: false
        };
        const move = { name: 'Tackle', power: 40 } as PokemonMove;
        const damageResult: MoveEffectResult = {
            damage: 5, isCritical: false, effectiveness: 1, isHit: true, flinched: false, ailment: undefined
        };

        (MoveEffectCalculator.calculateEffect as unknown as ReturnType<typeof vi.fn>).mockReturnValue(damageResult);

        await act(async () => {
            await result.current.handler.hited(attacker, attackerBuffs, move);
        });

        expect(result.current.pokemon?.currentHp).toBe(15); // 20 - 5
        expect(MoveEffectCalculator.calculateEffect).toHaveBeenCalled();
    });

    it('handles hited (fainting)', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const attacker = { ...mockPokemon, name: 'Attacker' };
        const attackerBuffs: BattlePokemonState = {
            effectStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
            flinched: false, confused: false
        };
        const move = { name: 'Hyper Beam', power: 150 } as PokemonMove;
        const damageResult: MoveEffectResult = {
            damage: 25, isCritical: false, effectiveness: 1, isHit: true, flinched: false, ailment: undefined
        }; // More than 20 HP

        (MoveEffectCalculator.calculateEffect as unknown as ReturnType<typeof vi.fn>).mockReturnValue(damageResult);

        await act(async () => {
            await result.current.handler.hited(attacker, attackerBuffs, move);
        });

        expect(result.current.pokemon?.currentHp).toBe(0);
    });

    it('handles heal', async () => {
        const damagedPokemon = { ...mockPokemon, currentHp: 10 };
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: damagedPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        await act(async () => {
            await result.current.handler.heal(5);
        });

        expect(result.current.pokemon?.currentHp).toBe(15);

        await act(async () => {
            await result.current.handler.heal(100); // Overheal
        });

        expect(result.current.pokemon?.currentHp).toBe(20); // Max HP
    });

    it('handles decrementPP', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const move = mockPokemon.pokemonMoves[0];

        act(() => {
            result.current.handler.decrementPP(move);
        });

        expect(result.current.pokemon?.pokemonMoves[0].pp).toBe(29);
    });

    it('handles increaseExp', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const leveledUpPokemon = { ...mockPokemon, level: 6, exp: 100 };
        (ExperienceCalculator.addExperience as unknown as ReturnType<typeof vi.fn>).mockReturnValue(leveledUpPokemon);

        act(() => {
            result.current.handler.increaseExp(50);
        });

        expect(ExperienceCalculator.addExperience).toHaveBeenCalledWith(mockPokemon, 50);
        expect(result.current.pokemon).toEqual(leveledUpPokemon);
    });

    it('handles randomMove', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const move = result.current.handler.randomMove();
        expect(mockPokemon.pokemonMoves).toContainEqual(move);
    });

    it('handles resetPokemon', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        act(() => {
            result.current.handler.resetPokemon();
        });

        expect(result.current.pokemon).toBeUndefined();
    });
});
