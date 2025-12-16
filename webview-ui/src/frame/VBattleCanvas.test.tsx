import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VBattleCanvas, BattleCanvasHandle } from './VBattleCanvas';
import { PokemonDao, PokemonState, PokemonStateAction } from '../../../src/dataAccessObj/pokemon';
import { BiomeType } from '../../../src/dataAccessObj/BiomeData';

// Mock dependencies
vi.mock('../utilities/vscode', () => ({
    resolveAssetUrl: (path: string) => `mock-url/${path}`,
}));

vi.mock('./HPBlock', () => ({
    VHPBlock: ({ pokemonData, isPlayer }: { pokemonData: PokemonDao, isPlayer: boolean }) => (
        <div data-testid={`hp-block-${isPlayer ? 'player' : 'opponent'}`}>
            {pokemonData ? pokemonData.name : 'No Pokemon'}
        </div>
    ),
}));

// Mock CSS modules
vi.mock('./VBattleCanvas.module.css', () => ({
    default: {
        'battle-scene': 'battle-scene',
        'battle-background': 'battle-background',
        'opponent-hud': 'opponent-hud',
        'opponent-container': 'opponent-container',
        'pokemon-wrapper': 'pokemon-wrapper',
        'grass-base': 'grass-base',
        'pokemon-sprite': 'pokemon-sprite',
        'player-container': 'player-container',
        'my-pokemon-wrapper': 'my-pokemon-wrapper',
        'my-grass-base': 'my-grass-base',
        'my-pokemon-sprite': 'my-pokemon-sprite',
        'my-hud': 'my-hud',
        'shiny-sparkle': 'shiny-sparkle',
        'anim-shiny': 'anim-shiny',
        'anim-faint': 'anim-faint',
        'anim-enter-player': 'anim-enter-player',
        'anim-enter-enemy': 'anim-enter-enemy',
        'shake': 'shake',
        'flash-sprite': 'flash-sprite',
        'grassland': 'grassland',
        'water-beach': 'water-beach',
        'flash-effect': 'flash-effect',
        'flash-active': 'flash-active',
        'anim-run': 'anim-run',
    },
}));

describe('VBattleCanvas', () => {
    const mockMyPokemon: PokemonDao = {
        uid: 'my-poke-1',
        id: 25,
        name: 'Pikachu',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        isShiny: false,
    } as unknown as PokemonDao;

    const mockOpponentPokemon: PokemonDao = {
        uid: 'opp-poke-1',
        id: 1,
        name: 'Bulbasaur',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        isShiny: false,
    } as unknown as PokemonDao;

    const mockState: PokemonState = {
        action: PokemonStateAction.None,
    };

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders player and opponent pokemon', () => {
        render(
            <VBattleCanvas
                myPokemon={mockMyPokemon}
                myPokemonState={mockState}
                opponentPokemon={mockOpponentPokemon}
                opponentPokemonState={mockState}
            />
        );

        expect(screen.getByTestId('hp-block-player').textContent).toContain('Pikachu');
        expect(screen.getByTestId('hp-block-opponent').textContent).toContain('Bulbasaur');
        
        const playerImg = screen.getByAltText('my pokemon') as HTMLImageElement;
        const opponentImg = screen.getByAltText('opponent pokemon') as HTMLImageElement;

        expect(playerImg.src).toContain('mock-url/sprites/pokemon/back/25.gif');
        expect(opponentImg.src).toContain('mock-url/sprites/pokemon/normal/1.gif');
    });

    it('renders shiny opponent correctly', () => {
        const shinyOpponent = { ...mockOpponentPokemon, isShiny: true };
        
        const { container } = render(
            <VBattleCanvas
                myPokemon={mockMyPokemon}
                myPokemonState={mockState}
                opponentPokemon={shinyOpponent}
                opponentPokemonState={mockState}
            />
        );

        const opponentImg = screen.getByAltText('opponent pokemon') as HTMLImageElement;
        expect(opponentImg.src).toContain('mock-url/sprites/pokemon/shiny/1.gif');

        // Fast forward to trigger shiny animation (800ms delay)
        act(() => {
            vi.advanceTimersByTime(800);
        });

        // Check for sparkles
        const sparkles = container.getElementsByClassName('shiny-sparkle');
        expect(sparkles.length).toBeGreaterThan(0);
    });

    it('handles imperative animations', async () => {
        const ref = React.createRef<BattleCanvasHandle>();
        const { container } = render(
            <VBattleCanvas
                ref={ref}
                myPokemon={mockMyPokemon}
                myPokemonState={mockState}
                opponentPokemon={mockOpponentPokemon}
                opponentPokemonState={mockState}
            />
        );

        // Test handleStart
        act(() => {
            ref.current?.handleStart(BiomeType.Grassland);
            vi.advanceTimersByTime(50); // Opacity transition
        });
        
        const bg = container.getElementsByClassName('battle-background')[0];
        expect(bg.className).toContain('grassland');

        // Test handleMyPokemonFaint
        act(() => {
            ref.current?.handleMyPokemonFaint();
        });
        const playerContainer = container.getElementsByClassName('player-container')[0];
        expect(playerContainer.className).toContain('anim-faint');

        // Test handleOpponentPokemonFaint
        act(() => {
            ref.current?.handleOpponentPokemonFaint();
        });
        const opponentContainer = container.getElementsByClassName('opponent-container')[0];
        expect(opponentContainer.className).toContain('anim-faint');
        
        // Test handleRunAway
        await act(async () => {
            const promise = ref.current?.handleRunAway();
            vi.advanceTimersByTime(1000);
            await promise;
        });
        expect(playerContainer.className).toContain('anim-run');
    });
    
    it('falls back to icon on image error', () => {
        render(
            <VBattleCanvas
                myPokemon={mockMyPokemon}
                myPokemonState={mockState}
                opponentPokemon={mockOpponentPokemon}
                opponentPokemonState={mockState}
            />
        );

        const opponentImg = screen.getByAltText('opponent pokemon');
        fireEvent.error(opponentImg);
        
        expect((opponentImg as HTMLImageElement).src).toContain('mock-url/sprites/pokemon/icon/1.png');
    });
});
