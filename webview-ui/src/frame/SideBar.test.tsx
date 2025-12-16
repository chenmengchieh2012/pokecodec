import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MenuSideBar, MenuSideBarItem } from './SideBar';

describe('MenuSideBar', () => {
    const mockOnActive = vi.fn();

    const mockItems: MenuSideBarItem[] = [
        {
            activeTab: 'tab1',
            onActive: mockOnActive,
            Icons: <span data-testid="icon-1">Icon 1</span>,
        },
        {
            activeTab: 'tab2',
            onActive: mockOnActive,
            Icons: <span data-testid="icon-2">Icon 2</span>,
        },
    ];

    it('renders all sidebar items', () => {
        render(<MenuSideBar barItems={mockItems} />);
        
        expect(screen.getByTestId('icon-1')).toBeDefined();
        expect(screen.getByTestId('icon-2')).toBeDefined();
        expect(screen.getByTitle('tab1')).toBeDefined();
        expect(screen.getByTitle('tab2')).toBeDefined();
    });

    it('calls onActive when an item is clicked', () => {
        render(<MenuSideBar barItems={mockItems} />);
        
        const item1 = screen.getByTitle('tab1');
        fireEvent.click(item1);

        expect(mockOnActive).toHaveBeenCalledWith('tab1');
    });

    it('updates active state on click', () => {
        render(<MenuSideBar barItems={mockItems} />);
        
        const item1 = screen.getByTitle('tab1');
        const item2 = screen.getByTitle('tab2');

        // Initial state: neither might be active (or empty string is default)
        // The component initializes tabOnClick to ''
        
        // Click item 1
        fireEvent.click(item1);
        
        // Check if item 1 has active class
        // Note: We assume the CSS module transforms 'active' to something containing 'active'
        // or we check if the class list changed.
        expect(item1.className).toMatch(/active/);
        expect(item2.className).not.toMatch(/active/);

        // Click item 2
        fireEvent.click(item2);
        
        expect(item2.className).toMatch(/active/);
        expect(item1.className).not.toMatch(/active/);
    });

    it('handles independent onActive callbacks', () => {
        const onActive1 = vi.fn();
        const onActive2 = vi.fn();

        const items: MenuSideBarItem[] = [
            { activeTab: 't1', onActive: onActive1, Icons: <span>1</span> },
            { activeTab: 't2', onActive: onActive2, Icons: <span>2</span> },
        ];

        render(<MenuSideBar barItems={items} />);

        fireEvent.click(screen.getByTitle('t1'));
        expect(onActive1).toHaveBeenCalledWith('t1');
        expect(onActive2).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTitle('t2'));
        expect(onActive2).toHaveBeenCalledWith('t2');
    });
});
