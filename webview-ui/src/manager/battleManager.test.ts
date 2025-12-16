import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BattleManager } from './battleManager';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { PokemonDao, PokemonStateAction } from '../../../src/dataAccessObj/pokemon';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { vscode } from '../utilities/vscode';
import { BattleControlHandle } from '../frame/BattleControl';
import { BattleCanvasHandle } from '../frame/VBattleCanvas';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { PokeBallDao } from '../../../src/dataAccessObj/pokeBall';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { EncounterResult } from '../../../src/core/EncounterHandler';

// Mock dependencies
vi.mock('../utilities/vscode', () => ({
    vscode: {
        postMessage: vi.fn(),
    },
}));

vi.mock('../utilities/SequentialExecutor', () => {
    return {
        SequentialExecutor: class {
            execute = vi.fn().mockImplementation(async (fn) => await fn());
        }
    };
});

vi.mock('../utilities/ExperienceCalculator', () => ({
    ExperienceCalculator: {
        calculateExpGain: vi.fn().mockReturnValue(100),
    },
}));

// Mock useMessageSubscription
const mockSubscribe = vi.fn();
vi.mock('../store/messageStore', () => ({
    useMessageSubscription: () => mockSubscribe,
}));

// Mock usePokemonState
const mockMyPokemonHandler = {
    newEncounter: vi.fn(),
    throwBall: vi.fn(),
    hited: vi.fn(),
    randomMove: vi.fn(),
    resetPokemon: vi.fn(),
    switchPokemon: vi.fn(),
    heal: vi.fn(),
    decrementPP: vi.fn(),
    increaseExp: vi.fn(),
};

const mockOpponentPokemonHandler = {
    newEncounter: vi.fn(),
    throwBall: vi.fn(),
    hited: vi.fn(),
    randomMove: vi.fn(),
    resetPokemon: vi.fn(),
    switchPokemon: vi.fn(),
    heal: vi.fn(),
    decrementPP: vi.fn(),
    increaseExp: vi.fn(),
};

let usePokemonStateCallCount = 0;
vi.mock('../hook/usePokemonState', () => ({
    usePokemonState: () => {
        usePokemonStateCallCount++;
        if (usePokemonStateCallCount % 2 !== 0) {
            return {
                pokemon: { uid: 'my-poke', name: 'Pikachu', currentHp: 100, stats: { speed: 100 } },
                pokemonState: { action: PokemonStateAction.None },
                handler: mockMyPokemonHandler,
            };
        } else {
            return {
                pokemon: { uid: 'opp-poke', name: 'Charmander', currentHp: 100, stats: { speed: 90 } },
                pokemonState: { action: PokemonStateAction.None },
                handler: mockOpponentPokemonHandler,
            };
        }
    },
}));

describe('BattleManager', () => {
    let mockDialogBoxRef: React.RefObject<BattleControlHandle>;
    let mockBattleCanvasRef: React.RefObject<BattleCanvasHandle>;

    beforeEach(() => {
        vi.clearAllMocks();
        usePokemonStateCallCount = 0;

        mockDialogBoxRef = {
            current: {
                setText: vi.fn().mockResolvedValue(undefined),
                openPartyMenu: vi.fn(),
            } as unknown as BattleControlHandle,
        };

        mockBattleCanvasRef = {
            current: {
                handleMyPokemonFaint: vi.fn(),
                handleOpponentPokemonFaint: vi.fn(),
                handleAttackFromOpponent: vi.fn(),
                handleAttackToOpponent: vi.fn(),
                handleRunAway: vi.fn(),
                handleSwitchPokemon: vi.fn(),
                handleStart: vi.fn(),
            } as unknown as BattleCanvasHandle,
        };
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [state] = result.current;
        expect(state.gameState).toBe(GameState.Searching);
        expect(state.myPokemon?.name).toBe('Pikachu');
        expect(state.opponentPokemon?.name).toBe('Charmander');
    });

    it('handles battle start', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;
        const encounterResult = {
            pokemon: { uid: 'wild-poke', name: 'Bulbasaur' } as PokemonDao,
            biomeType: 'grassland',
            isShiny: false,
        } as unknown as EncounterResult;

        await act(async () => {
            await methods.handleStart(GameState.WildAppear, encounterResult);
        });

        expect(mockBattleCanvasRef.current.handleStart).toHaveBeenCalledWith('grassland');
        expect(mockDialogBoxRef.current.setText).toHaveBeenCalledWith("A Wild Pokemon appear!! ");
    });

    it('handles attack sequence (player faster)', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;
        const myMove = { name: 'Thunderbolt', pp: 10 } as unknown as PokemonMove;
        
        // Mock hited to return remaining HP
        mockOpponentPokemonHandler.hited.mockResolvedValue({ newHp: 50, damageResult: { damage: 10, effectiveness: 1, isCritical: false } });
        mockMyPokemonHandler.hited.mockResolvedValue({ newHp: 80, damageResult: { damage: 10, effectiveness: 1, isCritical: false } });
        mockOpponentPokemonHandler.randomMove.mockReturnValue({ name: 'Scratch' });

        await act(async () => {
            await methods.handleOnAttack(myMove);
        });

        // Player attacks first
        expect(mockMyPokemonHandler.decrementPP).toHaveBeenCalledWith(myMove);
        expect(mockBattleCanvasRef.current.handleAttackToOpponent).toHaveBeenCalled();
        expect(mockOpponentPokemonHandler.hited).toHaveBeenCalled();

        // Opponent attacks back
        expect(mockOpponentPokemonHandler.decrementPP).toHaveBeenCalled();
        expect(mockBattleCanvasRef.current.handleAttackFromOpponent).toHaveBeenCalled();
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
    });

    it('handles throw ball (caught)', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;
        const ball = { apiName: 'poke-ball', name: 'Poke Ball' } as unknown as PokeBallDao;

        mockOpponentPokemonHandler.throwBall.mockResolvedValue(true);

        await act(async () => {
            await methods.handleThrowBall(ball);
        });

        expect(vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.RemoveItem,
            item: ball,
        }));
        expect(vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.Catch,
        }));
    });

    it('handles throw ball (escaped)', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;
        const ball = { apiName: 'poke-ball', name: 'Poke Ball' } as unknown as PokeBallDao;

        mockOpponentPokemonHandler.throwBall.mockResolvedValue(false);
        mockOpponentPokemonHandler.randomMove.mockReturnValue({ name: 'Scratch' });
        mockMyPokemonHandler.hited.mockResolvedValue({ newHp: 90, damageResult: { damage: 10 } });

        await act(async () => {
            await methods.handleThrowBall(ball);
        });

        // Opponent attacks after escape
        expect(mockBattleCanvasRef.current.handleAttackFromOpponent).toHaveBeenCalled();
    });

    it('handles use item (potion)', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;
        const potion = { name: 'Potion', effect: { healHp: 20 } } as unknown as ItemDao;

        mockOpponentPokemonHandler.randomMove.mockReturnValue({ name: 'Scratch' });
        mockMyPokemonHandler.hited.mockResolvedValue({ newHp: 90, damageResult: { damage: 10 } });

        await act(async () => {
            await methods.handleUseItem(potion);
        });

        expect(vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.RemoveItem,
            item: potion,
        }));
        expect(mockMyPokemonHandler.heal).toHaveBeenCalledWith(20);
        
        // Opponent attacks
        expect(mockBattleCanvasRef.current.handleAttackFromOpponent).toHaveBeenCalled();
    });

    it('handles run away', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;

        await act(async () => {
            await methods.handleRunAway();
        });

        expect(mockBattleCanvasRef.current.handleRunAway).toHaveBeenCalled();
        expect(mockDialogBoxRef.current.setText).toHaveBeenCalledWith("Got away safely!");
    });

    it('handles switch pokemon', async () => {
        const { result } = renderHook(() => BattleManager({
            dialogBoxRef: mockDialogBoxRef,
            battleCanvasRef: mockBattleCanvasRef,
        }));

        const [, methods] = result.current;
        const newPokemon = { uid: 'new-poke', name: 'Squirtle' } as unknown as PokemonDao;

        mockOpponentPokemonHandler.randomMove.mockReturnValue({ name: 'Scratch' });
        mockMyPokemonHandler.hited.mockResolvedValue({ newHp: 90, damageResult: { damage: 10 } });

        await act(async () => {
            await methods.handleSwitchMyPokemon(newPokemon);
        });

        expect(mockBattleCanvasRef.current.handleSwitchPokemon).toHaveBeenCalled();
        expect(mockMyPokemonHandler.switchPokemon).toHaveBeenCalledWith(newPokemon);
        
        // Opponent attacks
        expect(mockBattleCanvasRef.current.handleAttackFromOpponent).toHaveBeenCalled();
    });
});