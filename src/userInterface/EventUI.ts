import * as vscode from 'vscode';

export class EventUI {
    /**
     * Show an information message
     * @param message The message to display
     * @param items Optional items to display as buttons
     */
    public static async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
        return vscode.window.showInformationMessage(message, ...items);
    }

    /**
     * Show a warning message
     * @param message The message to display
     * @param items Optional items to display as buttons
     */
    public static async showWarning(message: string, ...items: string[]): Promise<string | undefined> {
        return vscode.window.showWarningMessage(message, ...items);
    }

    /**
     * Show an error message
     * @param message The message to display
     * @param items Optional items to display as buttons
     */
    public static async showError(message: string, ...items: string[]): Promise<string | undefined> {
        return vscode.window.showErrorMessage(message, ...items);
    }

    /**
     * Show a status bar message that disposes after a timeout
     * @param message The message to display
     * @param timeoutMs Timeout in milliseconds (default 3000)
     */
    public static showStatusMessage(message: string, timeoutMs: number = 3000): void {
        vscode.window.setStatusBarMessage(message, timeoutMs);
    }

    /**
     * Show a custom toast using Webview
     * @param title The title of the toast
     * @param message The message to display
     * @param icon Optional icon URL to display
     */
    public static showCustomToastLikeNotification(title: string, message: string, icon?: string) {
        const panel = vscode.window.createWebviewPanel(
            'customToastNotification',
            '', // 不顯示標題
            vscode.ViewColumn.Beside, // 顯示在側邊
            { enableScripts: true }
        );

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background-color: transparent;
                    }
                    .notification {
                        display: flex;
                        align-items: center;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        padding: 16px;
                        max-width: 300px;
                        animation: fadeInOut 5s ease-in-out;
                    }
                    .notification img {
                        width: 40px;
                        height: 40px;
                        margin-right: 16px;
                    }
                    .notification-content {
                        display: flex;
                        flex-direction: column;
                    }
                    .notification-title {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 8px;
                    }
                    .notification-message {
                        font-size: 14px;
                        color: #555;
                    }
                    @keyframes fadeInOut {
                        0% { opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="notification">
                    ${icon ? `<img src="${icon}" alt="icon">` : ''}
                    <div class="notification-content">
                        <div class="notification-title">${title}</div>
                        <div class="notification-message">${message}</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        // 自動在 5 秒後關閉 Webview
        setTimeout(() => panel.dispose(), 5000);
    }

    
}
