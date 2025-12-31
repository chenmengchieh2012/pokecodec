import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BagManager } from './bagsManager';
import { PokemonBoxManager } from './pokeBoxManager';
import { JoinPokemonManager } from './joinPokemonManager';
import { UserDaoManager } from './userDaoManager';
import { GameStateManager } from './gameStateManager';
import { PokeDexManager } from './pokeDexManager';
import { AchievementManager } from './AchievementManager';
import { DifficultyManager } from './DifficultyManager';

export class SessionLockManager implements vscode.Disposable {
    private static instance: SessionLockManager;
    private readonly context: vscode.ExtensionContext;
    private readonly sessionId: string;
    private readonly lockFilePath: string;
    private _isLockedByMe: boolean = false;
    private readonly _onDidLockStatusChange = new vscode.EventEmitter<boolean>();
    public readonly onDidLockStatusChange = this._onDidLockStatusChange.event;
    private watcher: fs.FSWatcher | undefined;
    private debounceTimer: any;
    private pollingTimer: NodeJS.Timeout | undefined;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // Create a unique ID for this session
        this.sessionId = vscode.env.sessionId + '-' + Date.now();
        
        // Ensure global storage path exists
        if (!fs.existsSync(context.globalStorageUri.fsPath)) {
            fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
        }
        this.lockFilePath = path.join(context.globalStorageUri.fsPath, 'session.lock');
        
        console.log('[SessionLockManager] Initialized with sessionId:', this.sessionId);
        console.log('[SessionLockManager] Lock file path:', this.lockFilePath);
    }

    public static getInstance(context?: vscode.ExtensionContext): SessionLockManager {
        if (!SessionLockManager.instance) {
            if (!context) {
                throw new Error("SessionLockManager not initialized");
            }
            SessionLockManager.instance = new SessionLockManager(context);
        }
        return SessionLockManager.instance;
    }

    public async start() {
        console.log('[SessionLockManager] Started monitoring (File Watcher Mode).');
        
        // 1. Setup Watcher
        this.setupWatcher();

        // 2. Try to acquire lock immediately if focused
        if (vscode.window.state.focused) {
            this.tryAcquireLock();
        } else {
            // If not focused, just check current status
            await this.checkLockFile();
        }

        // 3. Listen for window focus changes
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                this.tryAcquireLock();
            }
        });

        // 4. Start polling as a safety net
        this.startPolling();
    }

    public stop() {
        console.log('[SessionLockManager] Stopped monitoring.');
        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }
        this.stopPolling();
    }

    private startPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }
        // Check every 2 seconds to ensure state consistency
        this.pollingTimer = setInterval(async () => {
            await this.checkLockFile();
        }, 2000);
    }

    private stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }
    }

    public dispose() {
        this.stop();
        this._onDidLockStatusChange.dispose();
    }

    public isLockedByMe(): boolean {
        return this._isLockedByMe;
    }

    public async tryAcquireLock() {
        if (!vscode.window.state.focused) {
            return;
        }
        console.log('[SessionLockManager] Writing lock file...');
        try {
            fs.writeFileSync(this.lockFilePath, this.sessionId, 'utf8');
            // Writing triggers the watcher, but we also check immediately to reduce latency
            await this.checkLockFile();
        } catch (error) {
            console.error('[SessionLockManager] Failed to write lock file:', error);
        }
    }

    private setupWatcher() {
        try {
            // Ensure file exists before watching
            if (!fs.existsSync(this.lockFilePath)) {
                fs.writeFileSync(this.lockFilePath, '', 'utf8');
            }

            const lockDir = path.dirname(this.lockFilePath);
            // Watch directory instead of file to handle atomic writes/renames correctly
            this.watcher = fs.watch(lockDir, (eventType, filename) => {
                if (!filename || filename === 'session.lock') {
                    if (this.debounceTimer) {
                        clearTimeout(this.debounceTimer);
                    }
                    this.debounceTimer = setTimeout(async () => {
                        await this.checkLockFile();
                    }, 100);
                }
            });
        } catch (error) {
            console.error('[SessionLockManager] Failed to setup watcher:', error);
        }
    }

    private async checkLockFile() {
        try {
            if (!fs.existsSync(this.lockFilePath)) {
                this.updateStatus(false, 'File missing');
                return;
            }
            const content = fs.readFileSync(this.lockFilePath, 'utf8');
            const isMe = content === this.sessionId;
            await this.updateStatus(isMe, content);
        } catch (error) {
            console.error('[SessionLockManager] Error reading lock file:', error);
        }
    }

    private async updateStatus(isLockedByMe: boolean, currentLockContent: string) {
        if (this._isLockedByMe !== isLockedByMe) {
            this._isLockedByMe = isLockedByMe;
            
            console.log(`[SessionLockManager] Status Changed: ${isLockedByMe ? 'Acquired' : 'Lost'} (Lock Content: ${currentLockContent.substring(0, 20)}...)`);
            
            if (isLockedByMe) {
                console.log('[SessionLockManager] Lock acquired. Reloading all managers...');
                await this.reloadAllManagers();
            }

            this._onDidLockStatusChange.fire(this._isLockedByMe);
        }
    }

    private async reloadAllManagers() {
        try {
            console.log('[SessionLockManager] Starting to reload all managers...');
            await Promise.all([
                BagManager.getInstance().reload(),
                PokemonBoxManager.getInstance().reload(),
                JoinPokemonManager.getInstance().reload(),
                UserDaoManager.getInstance().reload(),
                GameStateManager.getInstance().reload(),
                PokeDexManager.getInstance().reload(),
                AchievementManager.getInstance().reload(),
                DifficultyManager.getInstance().reload()
            ]);
            console.log('[SessionLockManager] All managers reloaded successfully.');
        } catch (error) {
            console.error('[SessionLockManager] Error reloading managers:', error);
        }
    }
}
