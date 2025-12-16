import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VBagBox } from './VBagBox';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { vscode } from '../utilities/vscode';

// Mock dependencies
vi.mock('../utilities/vscode', () => ({
    vscode: {
        postMessage: vi.fn(),
    },
    resolveAssetUrl: (path: string) => path,
}));

vi.mock('../model/PartyGridInModal', () => ({
    PartyGridInModal: ({ onPokemonClick }: { onPokemonClick: (p: PokemonDao) => void }) => (
        <div data-testid="party-grid">
            <button onClick={() => onPokemonClick({ uid: 'poke-1' } as PokemonDao)}>Select Pokemon 1</button>
        </div>
    ),
}));

vi.mock('../model/PokemonMoveModal', () => ({
    PokemonMoveModal: ({ onMoveSelect }: { onMoveSelect: (p: PokemonDao, m: number) => void }) => (
        <div data-testid="move-modal">
            <button onClick={() => onMoveSelect({ uid: 'poke-1' } as PokemonDao, 1)}>Select Move 1</button>
        </div>
    ),
}));

// Mock store
const mockBagItems: ItemDao[] = [
    { id: 1, name: 'Potion', apiName: 'potion', pocket: 'medicine', totalSize: 5, description: 'Heals HP' } as unknown as ItemDao,
    { id: 2, name: 'Poke Ball', apiName: 'poke-ball', pocket: 'balls', totalSize: 10, description: 'Catches Pokemon' } as unknown as ItemDao,
    { id: 3, name: 'Ether', apiName: 'ether', pocket: 'medicine', totalSize: 2, description: 'Restores PP' } as unknown as ItemDao,
];

const mockParty: PokemonDao[] = [
    { uid: 'poke-1', name: 'Pikachu' } as unknown as PokemonDao,
];

// Mock useMessageStore and useMessageSubscription
const mockSubscribe = vi.fn();
vi.mock('../store/messageStore', () => ({
    useMessageStore: () => ({
        getRefs: () => ({
            bag: mockBagItems,
        }),
    }),
    useMessageSubscription: (type: string, callback: (msg: { data: PokemonDao[] }) => void) => {
        React.useEffect(() => {
            if (type === MessageType.PartyData) {
                 callback({ data: mockParty });
            }
        }, [type, callback]);
        return mockSubscribe;
    },
}));

describe('VBagBox', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders tabs and defaults to BALLS pocket', () => {
        render(<VBagBox />);
        
        const medicineTab = screen.getByText('MEDICINE');
        const ballsTab = screen.getByText('BALLS');
        
        expect(medicineTab).toBeDefined();
        expect(ballsTab).toBeDefined();
        
        // Check active class (assuming CSS module works or we check class name)
        // Since we can't easily check CSS module class names without setup, we check behavior.
        // Default is 'balls', so Poke Ball should be visible, Potion should not.
        
        expect(screen.getByText('x10')).toBeDefined(); // Poke Ball count
        expect(screen.queryByText('x5')).toBeNull(); // Potion count
    });

    it('switches pockets when tabs are clicked', () => {
        render(<VBagBox />);
        
        const medicineTab = screen.getByText('MEDICINE');
        
        fireEvent.click(medicineTab);
        
        // Now Potion (x5) should be visible, Poke Ball (x10) should not
        expect(screen.getByText('x5')).toBeDefined();
        expect(screen.queryByText('x10')).toBeNull();
    });

    it('opens modal when clicking a medicine item (Potion)', () => {
        render(<VBagBox />);
        
        // Switch to medicine
        fireEvent.click(screen.getByText('MEDICINE'));
        
        // Click Potion (first item in medicine)
        // We need to find the slot. The text 'x5' is inside the slot.
        const potionSlot = screen.getByText('x5').closest('div[class*="bagSlot"]');
        expect(potionSlot).toBeDefined();
        
        fireEvent.click(potionSlot!);
        
        // Modal should open showing PartyGridInModal
        expect(screen.getByTestId('party-grid')).toBeDefined();
        expect(screen.getByText('USE: Potion')).toBeDefined();
    });

    it('sends UseMedicineInBag message when pokemon is selected for HP medicine', () => {
        render(<VBagBox />);
        
        // Open Potion modal
        fireEvent.click(screen.getByText('MEDICINE'));
        const potionSlot = screen.getByText('x5').closest('div[class*="bagSlot"]');
        fireEvent.click(potionSlot!);
        
        // Select Pokemon
        const selectBtn = screen.getByText('Select Pokemon 1');
        fireEvent.click(selectBtn);
        
        expect(vscode.postMessage).toHaveBeenCalledWith({
            command: MessageType.UseMedicineInBag,
            item: expect.objectContaining({ name: 'Potion' }),
            pokemonUid: 'poke-1',
            moveId: undefined,
        });
    });

    it('switches to Move Selection when clicking a PP medicine item (Ether)', () => {
        render(<VBagBox />);
        
        // Switch to medicine
        fireEvent.click(screen.getByText('MEDICINE'));
        
        // Click Ether (x2)
        const etherSlot = screen.getByText('x2').closest('div[class*="bagSlot"]');
        fireEvent.click(etherSlot!);
        
        // Modal opens
        expect(screen.getByText('USE: Ether')).toBeDefined();
        
        // Select Pokemon
        const selectBtn = screen.getByText('Select Pokemon 1');
        fireEvent.click(selectBtn);
        
        // Should now show PokemonMoveModal instead of sending message immediately
        expect(screen.getByTestId('move-modal')).toBeDefined();
    });

    it('sends UseMedicineInBag message with moveId when move is selected', () => {
        render(<VBagBox />);
        
        // Open Ether modal -> Select Pokemon -> Select Move
        fireEvent.click(screen.getByText('MEDICINE'));
        const etherSlot = screen.getByText('x2').closest('div[class*="bagSlot"]');
        fireEvent.click(etherSlot!);
        
        fireEvent.click(screen.getByText('Select Pokemon 1'));
        
        // Now in move selection
        const selectMoveBtn = screen.getByText('Select Move 1');
        fireEvent.click(selectMoveBtn);
        
        expect(vscode.postMessage).toHaveBeenCalledWith({
            command: MessageType.UseMedicineInBag,
            item: expect.objectContaining({ name: 'Ether' }),
            pokemonUid: 'poke-1',
            moveId: 1,
        });
    });
});
