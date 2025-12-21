import { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VHPBlock, VHPBlockHandle, VHPBlockAnimation } from './HPBlock';
import type { PokemonDao } from '../../../src/dataAccessObj/pokemon';

// Mock Pokemon Data
const mockPokemon: PokemonDao = {
    name: "Pikachu",
    gender: "Male",
    level: 5,
    currentHp: 50,
    maxHp: 50,
    currentExp: 0,
    toNextLevelExp: 100,
    // Add other required fields with dummy values if necessary, 
    // but based on the component, these seem to be the only ones used.
    id: 25,
    types: ["electric"],
    stats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    uid: "uuid-123",
    isShiny: false,
    originalTrainer: "Ash",
    nature: "Hardy",
    ability: "Static",
    iv: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    height: 0,
    weight: 0,
    baseExp: 0,
    caughtDate: 0,
    caughtBall: '',
    pokemonMoves: [],
    isHiddenAbility: false,
    isLegendary: false,
    isMythical: false,
    ailment: 'healthy'
};

describe('VHPBlock', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders nothing when pokemonData is undefined', () => {
        const { container } = render(<VHPBlock />);
        expect(container.firstChild).toBeNull();
    });

    it('renders basic pokemon info correctly', () => {
        render(<VHPBlock pokemonData={mockPokemon} />);
        
        expect(screen.getByText("Pikachu")).toBeDefined();
        expect(screen.getByText("Lv5")).toBeDefined();
        expect(screen.getByText("♂")).toBeDefined();
    });

    it('renders correct gender color for Female', () => {
        const femalePokemon = { ...mockPokemon, gender: "Female" as const };
        render(<VHPBlock pokemonData={femalePokemon} />);
        
        const genderSymbol = screen.getByText("♀");
        expect(genderSymbol.style.color).toBe('rgb(240, 128, 48)'); // #F08030 converted to rgb
    });

    it('renders HP bar with correct width and Green color for high HP', () => {
        const { container } = render(<VHPBlock pokemonData={mockPokemon} />);
        
        const hpBarFill = container.querySelector('div[class*="hp-bar-fill"]') as HTMLElement;
        expect(hpBarFill).toBeDefined();
        expect(hpBarFill.style.width).toBe('100%');
        expect(hpBarFill.style.backgroundColor).toBe('var(--hp-green)');
    });

    it('renders HP bar with Yellow color for medium HP (<= 50%)', () => {
        const mediumHpPokemon = { ...mockPokemon, currentHp: 25, maxHp: 50 }; // 50%
        const { container } = render(<VHPBlock pokemonData={mediumHpPokemon} />);
        
        const hpBarFill = container.querySelector('div[class*="hp-bar-fill"]') as HTMLElement;
        expect(hpBarFill.style.width).toBe('50%');
        expect(hpBarFill.style.backgroundColor).toBe('var(--hp-yellow)');
    });

    it('renders HP bar with Red color for low HP (<= 20%)', () => {
        const lowHpPokemon = { ...mockPokemon, currentHp: 10, maxHp: 50 }; // 20%
        const { container } = render(<VHPBlock pokemonData={lowHpPokemon} />);
        
        const hpBarFill = container.querySelector('div[class*="hp-bar-fill"]') as HTMLElement;
        expect(hpBarFill.style.width).toBe('20%');
        expect(hpBarFill.style.backgroundColor).toBe('var(--hp-red)');
    });

    it('renders player specific info (HP text and EXP bar) when isPlayer is true', () => {
        const playerPokemon = { ...mockPokemon, currentExp: 50, toNextLevelExp: 100 };
        const { container } = render(<VHPBlock pokemonData={playerPokemon} isPlayer={true} />);
        
        // Check HP Text
        expect(screen.getByText("50 / 50")).toBeDefined();

        // Check EXP Bar
        const expFill = container.querySelector('div[class*="exp-fill"]') as HTMLElement;
        expect(expFill).toBeDefined();
        expect(expFill.style.width).toBe('50%');
    });

    it('does not render player specific info when isPlayer is false', () => {
        const { container } = render(<VHPBlock pokemonData={mockPokemon} isPlayer={false} />);
        
        // Check HP Text absence (using queryByText which returns null if not found)
        expect(screen.queryByText("50 / 50")).toBeNull();

        // Check EXP Bar absence
        const expFill = container.querySelector('div[class*="exp-fill"]');
        expect(expFill).toBeNull();
    });

    it('triggers catch animation via ref', async () => {
        const ref = createRef<VHPBlockHandle>();
        const { container } = render(<VHPBlock ref={ref} pokemonData={mockPokemon} />);
        
        const hud = container.querySelector('div[class*="hud"]');
        expect(hud?.className).not.toContain('anim-catch');

        await act(async () => {
            ref.current?.triggerCatchAnimation(VHPBlockAnimation.Catch);
        });

        expect(hud?.className).toContain('anim-catch');

        // Fast forward past animation duration (2000ms)
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        expect(hud?.className).not.toContain('anim-catch');
    });
});
