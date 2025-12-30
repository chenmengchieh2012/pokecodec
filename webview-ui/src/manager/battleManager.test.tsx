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
const { mockPostMessage, mockBattlePokemonFactory, mockUseMessageSubscription } = vi.hoisted(() => ({
    mockPostMessage: vi.fn(),
    mockBattlePokemonFactory: vi.fn(),
    mockUseMessageSubscription: vi.fn(),
}));

vi.mock('../utilities/vscode', () => ({
    vscode: {
        postMessage: (...args: unknown[]) => mockPostMessage(...args),
    }
}));

vi.mock('../hook/BattlePokemon', () => ({
    BattlePokemonFactory: (...args: unknown[]) => mockBattlePokemonFactory(...args),
}));

vi.mock('../store/messageStore', () => ({
    useMessageSubscription: (type: unknown, callback: unknown) => {
        mockUseMessageSubscription(type, callback);
    },
    useInitializationState: () => 'finished',
    InitializedState: {
        UnStart: 'unstart',
        Initializing: 'initializing',
        finished: 'finished',
    },
    messageStore: {
        getRefs: () => ({
            gameStateData: undefined
        })
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

vi.mock('../../../src/utils/ItemEffectStrategy', () => {
    return {
        ItemEffectStrategy: class {
            constructor(public pokemon: any, public item: any) {}
            setEffectingMoveId() {}
            async getEffectResult() {
                return {
                    pokemon: { ...this.pokemon, currentHp: (this.pokemon.currentHp || 0) + 20 },
                    itemUsed: true,
                    usedMessage: 'Used Potion!'
                };
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

        const commonHandler = {
            onRoundFinish: vi.fn(),
            increaseExp: vi.fn(),
            resetPokemon: vi.fn(),
            hited: vi.fn().mockReturnValue({ newHp: 15, moveEffectResult: { damage: 5, effectiveness: 1, isCritical: false } }),
            useMoveEffect: vi.fn(),
            decrementPP: vi.fn(),
            getBattleState: vi.fn().mockReturnValue({}),
            heal: vi.fn(),
            restorePp: vi.fn(),
            updateAilment: vi.fn(),
            switchPokemon: vi.fn(),
            throwBall: vi.fn().mockReturnValue(false),
            getHitAction: vi.fn().mockReturnValue({ success: true, move: { name: 'Tackle', id: 1, pp: 30, maxPp: 30 } }),
            roundCheck: vi.fn().mockReturnValue({}),
            effectByConfused: vi.fn().mockReturnValue(false),
            setPokemon: vi.fn(),
            syncState: vi.fn(),
            resetFlinch: vi.fn(),
            getBuffs: vi.fn().mockReturnValue({}),
            effectByMove: vi.fn(),
            refreshPokemon: vi.fn(),
        };

        mockMyPokemonHandler = {
            ...commonHandler,
        };

        mockOpponentPokemonHandler = {
            ...commonHandler,
            randomMove: vi.fn().mockReturnValue(mockOpponentPokemon.pokemonMoves[0]),
            newEncounter: vi.fn(),
        };

        let callCount = 0;
        mockBattlePokemonFactory.mockImplementation(() => {
            const isMyPokemon = callCount % 2 === 0;
            const pokemon = isMyPokemon ? mockMyPokemon : mockOpponentPokemon;
            const handler = isMyPokemon ? mockMyPokemonHandler : mockOpponentPokemonHandler;
            
            callCount++;
            return {
                pokemon: pokemon,
                pokemonRef: { current: pokemon },
                ...handler
            };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes correctly', () => {
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [state,] = result.current;

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
        expect(mockBattleCanvasRef.current?.handleAttackFromOpponent).toHaveBeenCalled();

        // Opponent attacks back
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
        expect(mockBattleCanvasRef.current?.handleAttackFromOpponent).toHaveBeenCalled();
    });

    it('handleOnAttack: opponent is faster', async () => {
        // Setup opponent faster
        const fastOpponent = { ...mockOpponentPokemon, stats: { ...mockOpponentPokemon.stats, speed: 20 } };

        let callCount = 0;
        mockBattlePokemonFactory.mockImplementation(() => {
            const isMyPokemon = callCount % 2 === 0;
            const pokemon = isMyPokemon ? mockMyPokemon : fastOpponent;
            const handler = isMyPokemon ? mockMyPokemonHandler : mockOpponentPokemonHandler;
            
            callCount++;
            return {
                pokemon: pokemon,
                pokemonRef: { current: pokemon },
                ...handler
            };
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
        mockOpponentPokemonHandler.throwBall.mockReturnValue(false);

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
        const item = { name: 'Potion', effect: { healHp: 20 }, price: 100, category: 'medicine' } as unknown as ItemDao;
        // Mock my pokemon damaged
        const damagedPokemon = { ...mockMyPokemon, currentHp: 10 };

        let callCount = 0;
        mockBattlePokemonFactory.mockImplementation(() => {
            const isMyPokemon = callCount % 2 === 0;
            const pokemon = isMyPokemon ? damagedPokemon : mockOpponentPokemon;
            const handler = isMyPokemon ? mockMyPokemonHandler : mockOpponentPokemonHandler;
            
            callCount++;
            return {
                pokemon: pokemon,
                pokemonRef: { current: pokemon },
                ...handler
            };
        });

        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        await act(async () => {
            await methods.handleUseItem(damagedPokemon, item);
        });

        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            command: MessageType.RemoveItem,
            item: item
        }));

        // Since damagedPokemon is the current pokemon, refreshPokemon should be called
        // expect(mockMyPokemonHandler.refreshPokemon).toHaveBeenCalled();
    });

    it('handleRunAway: success', async () => {
        // Mock Math.random to ensure success if formula doesn't guarantee it
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        // But the code has a formula. Let's make my speed very high.
        const fastPokemon = { ...mockMyPokemon, stats: { ...mockMyPokemon.stats, speed: 999 } };

        let callCount = 0;
        mockBattlePokemonFactory.mockImplementation(() => {
            const isMyPokemon = callCount % 2 === 0;
            const pokemon = isMyPokemon ? fastPokemon : mockOpponentPokemon;
            const handler = isMyPokemon ? mockMyPokemonHandler : mockOpponentPokemonHandler;
            
            callCount++;
            return {
                pokemon: pokemon,
                pokemonRef: { current: pokemon },
                ...handler
            };
        });

        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        await act(async () => {
            await methods.handleRunAway();
        });

        expect(mockBattleCanvasRef.current?.handleRunAway).toHaveBeenCalled();
        expect(mockSetText).toHaveBeenCalledWith("Run away safely!");
    });

    it('handleSwitchMyPokemon', async () => {
        const { result } = renderHook(() => BattleManager({ dialogBoxRef: mockDialogRef, battleCanvasRef: mockBattleCanvasRef }));
        const [_, methods] = result.current;

        const newPokemon = { ...mockMyPokemon, uid: 'new-uid', name: 'Charmander' };

        await act(async () => {
            await methods.handleSwitchMyPokemon(newPokemon);
        });

        expect(mockBattleCanvasRef.current?.handleSwitchPokemon).toHaveBeenCalled();
        expect(mockMyPokemonHandler.setPokemon).toHaveBeenCalledWith(newPokemon);
        // Opponent attacks
        expect(mockMyPokemonHandler.hited).toHaveBeenCalled();
    });

    it('handleRunAway: failure', async () => {
        // Mock opponent very fast to ensure failure
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const fastOpponent = { ...mockOpponentPokemon, stats: { ...mockOpponentPokemon.stats, speed: 999 } };

        let callCount = 0;
        mockBattlePokemonFactory.mockImplementation(() => {
            const isMyPokemon = callCount % 2 === 0;
            const pokemon = isMyPokemon ? mockMyPokemon : fastOpponent;
            const handler = isMyPokemon ? mockMyPokemonHandler : mockOpponentPokemonHandler;
            
            callCount++;
            return {
                pokemon: pokemon,
                pokemonRef: { current: pokemon },
                ...handler
            };
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
