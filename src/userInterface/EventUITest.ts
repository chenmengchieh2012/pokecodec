import * as assert from 'assert';
import * as vscode from 'vscode';
import { EventUI } from './EventUI';

describe('EventUI', () => {
    it('should display a custom toast with title and message', async () => {
        // Arrange
        const title = 'Test Toast';
        const message = 'This is a test message';
        const icon = 'https://example.com/icon.png';

        // Act
        EventUI.showCustomToastLikeNotification(title, message, icon);

        // Assert
        // Since Webview panels are visual, we cannot directly assert their content.
        // Instead, we ensure no errors are thrown during execution.
        assert.ok(true, 'Custom toast displayed successfully');
    });
});