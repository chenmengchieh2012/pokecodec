import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameState } from '../../../src/dataAccessObj/GameState';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokeBallDao } from '../../../src/dataAccessObj/pokeBall';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { BattleControlHandle } from '../frame/BattleControl';
import { BattleCanvasHandle } from '../frame/VBattleCanvas';
import { BattleManager } from './battleManager';

// Mock dependencies
const { mockPostMessage, mockUsePokemonState, mockUseMessageSubscription } = vi.hoisted(() => ({
    mockPostMessage: vi.fn(),
    mockUsePokemonState: vi.fn(),
    mockUseMessageSubscription: vi.fn(),
}));

vi.mock('../utilities/vscode', () => ({
    vscode: {
        postMessage: (...args: unknown[]) => mockPostMessage(...args),
    }
}));

vi.mock('../hook/usePokemonState', () => ({
    usePokemonState: (...args: unknown[]) => mockUsePokemonState(...args),
    PokemonStateHandler: {}, // Type only
}));

vi.mock('../store/messageStore', () => ({
    useMessageSubscription: (type: unknown, callback: unknown) => {
        mockUseMessageSubscription(type, callback);
    }
}));

vi.mock('./battleRecorder', () => ({
    BattleRecorder: () => ({
        onBattleAction: vi.fn(),
        onCatch: vi.fn(),
        onBattleFinished: vi.fn(),
    })
}));

vi.mock('./itemRecorder', () => ({
    ItemRecorder: () => ({
        onItemAction: vi.fn(),
    })
}));

vi.mock('../utilities/SequentialExecutor', () => {
    return {
        SequentialExecutor: class {
            async execute(fn: () => Promise<void>) {
                await fn();
            }
        }
    }
});

describe('BattleManager', () => {
    let mockDialogRef: React.RefObject<BattleControlHandle>;
    let mockBattleCanvasRef: React.RefObject<BattleCanvasHandle>;
    let mockSetText: ReturnType<typeof vi.fn>;
    let mockOpenPartyMenu: ReturnType<typeof vi.fn>;
    
    // Mock Handlers
    let mockMyPokemonHandler: any;
    let mockOpponentPokemonHandler: any;

    const mockMyPokemon: PokemonDao = {
        uid: 'my-uid',
        id: 25,
        name: 'Pikachu',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        stats: { hp: 20, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 10 },
        pokemonMoves: [
            { name: 'Thunder Shock', pp: 30, maxPp: 30 } as unknown as PokemonMove,
        ],
        ailment: 'healthy',
    } as unknown as PokemonDao;

    const mockOpponentPokemon: PokemonDao = {
        uid: 'opponent-uid',
        id: 1,
        name: 'Bulbasaur',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        stats: { hp: 20, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 9 }, // Slower
        pokemonMoves: [
            { name: 'Tackle', pp: 30, maxPp: 30 } as unknown as PokemonMove,
        ],
        ailment: 'healthy',
    } as unknown as PokemonDao;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSetText = vi.fn().mockResolvedValue(undefined);
        mockOpenPartyMenu = vi.fn().mockResolvedValue(undefined);
        mockDialogRef = {
            current: {
                setText: mockSetText,
                openPartyMenu: mockOpenPartyMenu,
            } as unknown as BattleControlHandle
        };

        mockBattleCanvasRef = {
            current: {
                handleAttackFromOpponent: vi.fn(),
                handleAttackToOpponent: vi.fn(),
                handleMyPokemonFaint: vi.fn(),
                handleOpponentPokemonFaint: vi.fn(),
                handleThrowBallPhase: vi.fn(),
                handleRunAway: vi.fn(),
                handleSwitchPokemon: vi.fn(),
                handleStart: vi.fn(),
            } as unknown as BattleCanvasHandle
        };

        mockMyPokemonHandler = {
            onRoundFinish: vi.fn(),
            increaseExp: vi.fn(),
            resetPokemon: vi.fn(),
            hited: vi.fn().mockResolvedValue({ newHp: 15, moveEffectResult: { damage: 5, effectiveness: 1, isCritical: false } }),
            useMoveEffect: vi.fn(),
            decrementPP: vi.fn(),
            getBattleState: vi.fn().mockReturnValue({}),
            heal: vi.fn(),
            restorePp: vi.fn(),
            updateAilment: vi.fn(),
            switchPokemon: vi.fn(),
        };

        mockOpponentPokemonHandler = {
            onRoundFinish: vi.fn(),
            resetPokemon: vi.fn(),
            hited: vi.fn().mockResolvedValue({ newHp: 15, moveEffectResult: { damage: 5, effectiveness: 1, isCritical: false } }),
            useMoveEffect: vi.fn(),
            decrementPP: vi.fn(),
            getBattleState: vi.fn().mockReturnValue({}),
            randomMove: vi.fn().mockReturnValue(mockOpponentPokemon.pokemonMoves[0]),
            throwBall: vi.fn().mockResolvedValue(false),
            newEncounter: vi.fn(),
        };

        let callCount = 0;
        mockUsePokemonState.mockImplementation(() => {
            const result = callCount % 2 === 0 
                ? { pokemon: mockMyPokemon, handler: mockMyPokemonHandler }
                : { pokemon: mockOpponentPokemon, handler: mockOpponentPokemonHandler };
            callCount++;
            return result;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes correctly', () => {
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [state, ] = result.current;

        expect(state.myPokemon).toBe(mockMyPokemon);
        expect(state.opponentPokemon).toBe(mockOpponentPokemon);
        expect(state.gameState).toBe(GameState.Searching);
    });

    it('handleOnAttack: my pokemon is faster', async () => {
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [, methods] = result.current;

        const myMove = mockMyPokemon.pokemonMoves[0];
        
        await act(async () => {
            await methods.handleOnAttack(myMove);
        });

        // My pokemon attacks first
        expect(mockOpponentPokemonHandler.hited).toHaveBeenCalled();
        expect(mockBattleCanvasRef.current?.handleAttackToOpponent).toHaveBeenCalled();
        
        // Opponent attacks back
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
        expect(mockBattleCanvasRef.current?.handleAttackFromOpponent).toHaveBeenCalled();
    });

    it('handleOnAttack: opponent is faster', async () => {
        // Setup opponent faster
        const fastOpponent = { ...mockOpponentPokemon, stats: { ...mockOpponentPokemon.stats, speed: 20 } };
        
        let callCount = 0;
        mockUsePokemonState.mockImplementation(() => {
            const result = callCount % 2 === 0 
                ? { pokemon: mockMyPokemon, handler: mockMyPokemonHandler }
                : { pokemon: fastOpponent, handler: mockOpponentPokemonHandler };
            callCount++;
            return result;
        });

        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        const myMove = mockMyPokemon.pokemonMoves[0];

        await act(async () => {
            await methods.handleOnAttack(myMove);
        });

        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
        expect(mockOpponentPokemonHandler.hited).toHaveBeenCalled();
    });

    it('handleThrowBall: success', async () => {
        mockOpponentPokemonHandler.throwBall.mockResolvedValue(true);
        
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        const ball = { apiName: 'poke-ball', name: 'Poke Ball' } as PokeBallDao;

        await act(async () => {
            await methods.handleThrowBall(ball);
        });

        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.RemoveItem,
            item: ball
        }));
        expect(mockOpponentPokemonHandler.throwBall).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.Catch
        }));
    });

    it('handleThrowBall: failure', async () => {
        mockOpponentPokemonHandler.throwBall.mockResolvedValue(false);
        
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        const ball = { apiName: 'poke-ball', name: 'Poke Ball' } as PokeBallDao;

        await act(async () => {
            await methods.handleThrowBall(ball);
        });

        expect(mockOpponentPokemonHandler.throwBall).toHaveBeenCalled();
        // Opponent should attack
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
    });

    it('handleUseItem: heal hp', async () => {
        const item = { name: 'Potion', effect: { healHp: 20 } } as ItemDao;
        // Mock my pokemon damaged
        const damagedPokemon = { ...mockMyPokemon, currentHp: 10 };
        
        let callCount = 0;
        mockUsePokemonState.mockImplementation(() => {
            const result = callCount % 2 === 0 
                ? { pokemon: damagedPokemon, handler: mockMyPokemonHandler }
                : { pokemon: mockOpponentPokemon, handler: mockOpponentPokemonHandler };
            callCount++;
            return result;
        });

        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        await act(async () => {
            await methods.handleUseItem(item);
        });

        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.RemoveItem,
            item: item
        }));
        expect(mockMyPokemonHandler.heal).toHaveBeenCalledWith(20);
        // Opponent attacks
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
    });

    it('handleRunAway: success', async () => {
        // Mock Math.random to ensure success if formula doesn't guarantee it
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        // But the code has a formula. Let's make my speed very high.
        const fastPokemon = { ...mockMyPokemon, stats: { ...mockMyPokemon.stats, speed: 999 } };
        
        let callCount = 0;
        mockUsePokemonState.mockImplementation(() => {
            const result = callCount % 2 === 0 
                ? { pokemon: fastPokemon, handler: mockMyPokemonHandler }
                : { pokemon: mockOpponentPokemon, handler: mockOpponentPokemonHandler };
            callCount++;
            return result;
        });

        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        await act(async () => {
            await methods.handleRunAway();
        });

        expect(mockBattleCanvasRef.current?.handleRunAway).toHaveBeenCalled();
        expect(mockSetText).toHaveBeenCalledWith("Got away safely!");
    });

    it('handleSwitchMyPokemon', async () => {
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        const newPokemon = { ...mockMyPokemon, uid: 'new-uid', name: 'Charmander' };

        await act(async () => {
            await methods.handleSwitchMyPokemon(newPokemon);
        });

        expect(mockBattleCanvasRef.current?.handleSwitchPokemon).toHaveBeenCalled();
        expect(mockMyPokemonHandler.switchPokemon).toHaveBeenCalledWith(newPokemon);
        // Opponent attacks
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
    });

    it('handleRunAway: failure', async () => {
        // Mock opponent very fast to ensure failure
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const fastOpponent = { ...mockOpponentPokemon, stats: { ...mockOpponentPokemon.stats, speed: 999 } };
        
        let callCount = 0;
        mockUsePokemonState.mockImplementation(() => {
            const result = callCount % 2 === 0 
                ? { pokemon: mockMyPokemon, handler: mockMyPokemonHandler }
                : { pokemon: fastOpponent, handler: mockOpponentPokemonHandler };
            callCount++;
            return result;
        });

        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        await act(async () => {
            await methods.handleRunAway();
        });

        expect(mockSetText).toHaveBeenCalledWith("Can't escape!");
        // Opponent attacks
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
    });
});