import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePokemonState } from './usePokemonState';
import { PokemonStateAction, PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { EncounterResult } from '../../../src/core/EncounterHandler';
import { HitHpCalculator } from '../../../src/utils/hitHpCalculator';
import { ExperienceCalculator } from '../utilities/ExperienceCalculator';
import { BattleControlHandle } from '../frame/BattleControl';
import { PokeBallDao } from '../../../src/dataAccessObj/pokeBall';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';

// Mock dependencies
vi.mock('../../../src/utils/hitHpCalculator', () => ({
    HitHpCalculator: {
        calculateDamage: vi.fn(),
    }
}));

vi.mock('../utilities/ExperienceCalculator', () => ({
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

    it('initializes with default pokemon and state', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        expect(result.current.pokemon).toEqual(mockPokemon);
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.None);
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
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.None);
        expect(mockSetText).toHaveBeenCalledWith('Go! Bulbasaur!');
    });

    it('handles newEncounter', () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: undefined,
            defaultPokemonState: undefined
        }));

        const encounterResult = { pokemon: mockPokemon, isShiny: false } as unknown as EncounterResult;

        act(() => {
            result.current.handler.newEncounter(encounterResult);
        });

        expect(result.current.pokemon).toEqual(mockPokemon);
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.None);
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

        // Mock Math.random to return > 0.4 (success)
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        let success;
        await act(async () => {
            success = await result.current.handler.throwBall(mockBall);
        });

        expect(success).toBe(true);
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.Caught);
        expect(mockSetText).toHaveBeenCalledWith('POKé BALL!!!');
        expect(mockSetText).toHaveBeenCalledWith('All right! Pikachu was caught!');
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
            success = await result.current.handler.throwBall(mockBall);
        });

        expect(success).toBe(false);
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.Escaped);
        expect(mockSetText).toHaveBeenCalledWith('Darn! The POKéMON broke free!');
    });

    it('handles hited (taking damage)', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const attacker = { ...mockPokemon, name: 'Attacker' };
        const move = { name: 'Tackle', power: 40 } as PokemonMove;
        const damageResult = { damage: 5, isCritical: false, typeEffectiveness: 1 };

        (HitHpCalculator.calculateDamage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(damageResult);

        await act(async () => {
            await result.current.handler.hited(attacker, move);
        });

        expect(result.current.pokemon?.currentHp).toBe(15); // 20 - 5
        expect(HitHpCalculator.calculateDamage).toHaveBeenCalledWith(attacker, mockPokemon, move);
    });

    it('handles hited (fainting)', async () => {
        const { result } = renderHook(() => usePokemonState(mockDialogRef, {
            defaultPokemon: mockPokemon,
            defaultPokemonState: { action: PokemonStateAction.None }
        }));

        const attacker = { ...mockPokemon, name: 'Attacker' };
        const move = { name: 'Hyper Beam', power: 150 } as PokemonMove;
        const damageResult = { damage: 25, isCritical: false, typeEffectiveness: 1 }; // More than 20 HP

        (HitHpCalculator.calculateDamage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(damageResult);

        await act(async () => {
            await result.current.handler.hited(attacker, move);
        });

        expect(result.current.pokemon?.currentHp).toBe(0);
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.Fainted);
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
        expect(result.current.pokemonState.action).toBe(PokemonStateAction.None);
    });
});
