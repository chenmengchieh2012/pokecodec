import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DialogBox, DialogBoxHandle } from './DialogBox';

describe('DialogBox', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders initially empty', () => {
        const { container } = render(<DialogBox />);
        const contentDiv = container.querySelector('div[class*="content"]');
        expect(contentDiv?.textContent).toBe('');
    });

    it('types out text when setText is called', async () => {
        const ref = createRef<DialogBoxHandle>();
        const { container } = render(<DialogBox ref={ref} />);

        const textToType = "Hello World";
        
        await act(async () => {
            void ref.current?.setText(textToType);
        });

        // Advance time to simulate typing (50ms per char)
        // "He" -> 2 chars -> 100ms
        // We need to advance in steps to allow promises to resolve between timeouts
        await act(async () => {
            vi.advanceTimersByTime(150); 
        });
        
        const contentDiv = container.querySelector('div[class*="content"]');
        // It might be "He" or "Hel" depending on exact timing
        expect(contentDiv?.textContent).toMatch(/^He/);

        // Finish typing
        await act(async () => {
            // Advance enough times to cover the length
            for (let i = 0; i < 20; i++) {
                vi.advanceTimersByTime(60);
                await Promise.resolve(); // Flush microtasks
            }
        });

        expect(contentDiv?.textContent).toBe(textToType);
    });

    it('resets text to "What will you do?" after delay', async () => {
        const ref = createRef<DialogBoxHandle>();
        const { container } = render(<DialogBox ref={ref} />);
        const contentDiv = () => container.querySelector('div[class*="content"]');

        const textToType = "Attack!";
        
        await act(async () => {
            void ref.current?.setText(textToType);
        });

        // Finish typing "Attack!"
        await act(async () => {
            for (let i = 0; i < 15; i++) {
                vi.advanceTimersByTime(60);
                await Promise.resolve();
            }
        });
        
        expect(contentDiv()?.textContent).toBe(textToType);

        // Wait for reset timer (2000ms) + typing time for "What will you do?"
        await act(async () => {
            vi.advanceTimersByTime(2000); // Trigger reset
            // Now typing "What will you do?"
            for (let i = 0; i < 40; i++) {
                vi.advanceTimersByTime(60);
                await Promise.resolve();
            }
        });

        expect(contentDiv()?.textContent).toBe("What will you do?");
    });

    it('cancels previous reset timer when new text is set', async () => {
        const ref = createRef<DialogBoxHandle>();
        const { container } = render(<DialogBox ref={ref} />);
        const contentDiv = () => container.querySelector('div[class*="content"]');

        // 1. Set first text
        await act(async () => {
            void ref.current?.setText("First");
        });
        await act(async () => {
            for (let i = 0; i < 10; i++) {
                vi.advanceTimersByTime(60);
                await Promise.resolve();
            }
        });
        expect(contentDiv()?.textContent).toBe("First");

        // 2. Advance time partially (1000ms), not enough to trigger reset (2000ms)
        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        // 3. Set second text immediately
        await act(async () => {
            void ref.current?.setText("Second");
        });

        // 4. Advance time to finish typing "Second"
        await act(async () => {
            for (let i = 0; i < 15; i++) {
                vi.advanceTimersByTime(60);
                await Promise.resolve();
            }
        });
        expect(contentDiv()?.textContent).toBe("Second");

        // 5. Advance time past the original reset time of "First"
        await act(async () => {
            vi.advanceTimersByTime(1000); 
        });
        
        // Should still be "Second"
        expect(contentDiv()?.textContent).toBe("Second");

        // 6. Advance enough time for "Second" to reset
        await act(async () => {
            vi.advanceTimersByTime(2000); // Trigger reset for "Second"
            for (let i = 0; i < 40; i++) {
                vi.advanceTimersByTime(60);
                await Promise.resolve();
            }
        });

        expect(contentDiv()?.textContent).toBe("What will you do?");
    });
});
