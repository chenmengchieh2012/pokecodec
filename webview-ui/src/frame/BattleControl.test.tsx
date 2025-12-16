import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BattleControl } from './BattleControl';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';

// Mock dependencies
vi.mock('../store/messageStore', () => ({
    useMessageStore: vi.fn(() => ({
        getRefs: () => ({ bag: [] })
    })),
    useMessageSubscription: vi.fn()
}));

vi.mock('./DialogBox', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    DialogBox: React.forwardRef((_props, ref) => {
        React.useImperativeHandle(ref, () => ({
            setText: vi.fn()
        }));
        return <div data-testid="dialog-box">Dialog Box</div>;
    })
}));

vi.mock('../model/PartyGridInModal', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PartyGridInModal: ({ onPokemonClick }: { onPokemonClick: (p: any) => void }) => (
        <div data-testid="party-grid">
            <button onClick={() => onPokemonClick({ uid: 'test-poke-2', currentHp: 100 })}>
                Switch Pokemon
            </button>
        </div>
    )
}));

// Mock Data
const mockMove: PokemonMove = {
    id: 1,
    name: 'Thunder Shock',
    type: 'Electric',
    power: 40,
    accuracy: 100,
    pp: 30,
    maxPP: 30,
    effect: ''
};

const mockPokemon: PokemonDao = {
    uid: 'test-uid',
    id: 25,
    name: 'Pikachu',
    level: 5,
    currentHp: 20,
    maxHp: 20,
    stats: { hp: 20, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 10 },
    iv: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['electric'],
    pokemonMoves: [mockMove],
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    codingStats: {
        caughtRepo: 'test-repo',
        favoriteLanguage: 'TypeScript',
        linesOfCode: 100,
        bugsFixed: 10,
        commits: 50,
        coffeeConsumed: 5
    },
    caughtDate: Date.now(),
    isShiny: false,
    originalTrainer: 'Ash',
    caughtBall: 'poke-ball',
    gender: 'Male',
    nature: 'Hardy',
    ability: 'Static',
    height: 0.4,
    weight: 6.0,
    baseExp: 112,
    currentExp: 0,
    toNextLevelExp: 100
};

describe('BattleControl', () => {
    const mockHandlers = {
        handleOnAttack: vi.fn(),
        handleThrowBall: vi.fn(),
        handleUseItem: vi.fn(),
        handleRunAway: vi.fn(),
        handleSwitchMyPokemon: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders main menu buttons correctly', () => {
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('FIGHT')).toBeDefined();
        expect(screen.getByText('BAG')).toBeDefined();
        expect(screen.getByText('POKÉMON')).toBeDefined();
        expect(screen.getByText('RUN')).toBeDefined();
    });

    it('opens move selection when FIGHT is clicked', () => {
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        fireEvent.click(screen.getByText('FIGHT'));
        expect(screen.getByText('Thunder Shock')).toBeDefined();
    });

    it('calls handleOnAttack when a move is selected', () => {
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        fireEvent.click(screen.getByText('FIGHT'));
        fireEvent.click(screen.getByText('Thunder Shock'));

        expect(mockHandlers.handleOnAttack).toHaveBeenCalledWith(mockMove);
    });

    it('calls handleRunAway when RUN is clicked', () => {
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        fireEvent.click(screen.getByText('RUN'));
        expect(mockHandlers.handleRunAway).toHaveBeenCalled();
    });

    it('opens party menu when POKEMON is clicked', () => {
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        fireEvent.click(screen.getByText('POKÉMON'));
        expect(screen.getByTestId('party-grid')).toBeDefined();
    });

    it('calls handleSwitchMyPokemon when a pokemon is selected from party', () => {
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        fireEvent.click(screen.getByText('POKÉMON'));
        fireEvent.click(screen.getByText('Switch Pokemon'));

        expect(mockHandlers.handleSwitchMyPokemon).toHaveBeenCalled();
    });

    it('opens bag menu when BAG is clicked', () => {
        // We need to mock the bag items in the store or via the subscription
        // For this test, we'll assume the component renders the bag UI when state changes
        render(
            <BattleControl
                myPokemon={mockPokemon}
                myParty={[mockPokemon]}
                {...mockHandlers}
            />
        );

        fireEvent.click(screen.getByText('BAG'));
        // Since we mocked the store to return empty bag, we might see "Empty" or similar if implemented
        // Or we can check if the back button exists which implies we are in a submenu
        expect(screen.getByText('CANCEL')).toBeDefined();
    });
});
