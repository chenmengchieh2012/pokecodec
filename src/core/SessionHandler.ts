import * as vscode from 'vscode';
import { UserDaoManager } from '../manager/userDaoManager';

export class SessionHandler {
    private static instance: SessionHandler;
    private startTime: number;
    private accumulatedTime: number;
    private isFocused: boolean;
    private intervalId: NodeJS.Timeout | undefined;
    private readonly SAVE_INTERVAL = 60000; // Save every minute
    private readonly userDaoManager: UserDaoManager |undefined;

    private constructor() {
        this.userDaoManager = UserDaoManager.getInstance();
        const userDao = this.userDaoManager.getUserInfo();
        this.accumulatedTime = userDao.playtime || 0;
        this.startTime = Date.now();
        this.isFocused = vscode.window.state.focused;
        this.startTracking();
    }

    public static initialize(context: vscode.ExtensionContext): SessionHandler {
        if (!SessionHandler.instance) {
            SessionHandler.instance = new SessionHandler();
        }
        return SessionHandler.instance;
    }

    public static getInstance(): SessionHandler {
        if (!SessionHandler.instance) {
            throw new Error('SessionHandler not initialized');
        }
        return SessionHandler.instance;
    }

    private startTracking() {
        // Listen for window focus changes
        vscode.window.onDidChangeWindowState((state) => {
            this.handleWindowStateChange(state.focused);
        });

        // Periodic save to ensure data isn't lost on crash
        this.intervalId = setInterval(() => {
            this.savePlaytime();
        }, this.SAVE_INTERVAL);
    }

    private handleWindowStateChange(focused: boolean) {
        if (focused) {
            // Window gained focus, reset start time for this session segment
            this.startTime = Date.now();
            this.isFocused = true;
        } else {
            // Window lost focus
            // Important: Calculate and save BEFORE setting isFocused to false
            // This ensures 'diff' is calculated correctly in savePlaytime
            this.savePlaytime();
            this.isFocused = false;
        }
    }

    public getPlaytime(): number {
        let currentSession = 0;
        if (this.isFocused) {
            currentSession = Date.now() - this.startTime;
        }
        return this.accumulatedTime + currentSession;
    }

    public savePlaytime() {
        let diff = 0;
        // Update accumulated time before saving if currently focused
        if (this.isFocused) {
            const now = Date.now();
            diff = now - this.startTime;
            this.accumulatedTime += diff;
            this.startTime = now; // Reset start time
        }

        // Save to user data
        if (this.accumulatedTime > 0) {
            if(this.userDaoManager) {
                // 這裡的邏輯是：每分鐘獲得 5 元
                // 但我們不能用 accumulatedTime (總時間) 來算，否則會重複給錢
                // 應該只針對「這次新增的時間 (diff)」來給錢
                const moneyEarned = (5 * diff) / (60 * 1000); 
                this.userDaoManager.updatePlaytimeAndMoney(this.accumulatedTime, moneyEarned);
            }
        }
    }

    public clear() {
        this.accumulatedTime = 0;
        this.startTime = Date.now();
        this.isFocused = vscode.window.state.focused;
    }

    public dispose() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
