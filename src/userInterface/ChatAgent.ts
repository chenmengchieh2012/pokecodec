import * as vscode from 'vscode';
import { EventUI } from './EventUI';

export class ChatAgent {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public init() {
        this.registerCommands();
    }

    private registerCommands() {
        const disposableToastCommand = vscode.commands.registerCommand('pokecodec.showCustomToast', () => {
            const title = 'Triggered Toast';
            const message = 'This toast was triggered via command!';
            const icon = 'https://example.com/icon.png';
            EventUI.showCustomToastLikeNotification(title, message, icon);
        });

        this.context.subscriptions.push(disposableToastCommand);
    }

}
