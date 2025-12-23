import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class GlobalMutex {
    private lockFilePath: string;
    private isLocked: boolean = false;
    private retryInterval: number = 100; // ms
    private maxRetries: number = 50; // 5 seconds max wait

    constructor(context: vscode.ExtensionContext, lockName: string = 'global.lock') {
        // Ensure storage path exists
        if (!context.globalStorageUri) {
             // Fallback or throw? If globalStorageUri is not defined (older VS Code?), we can't lock globally easily.
             // But for modern VS Code it should be there.
             // We can try to use extension path but that's not writable usually.
             // Let's assume it exists.
             throw new Error("Global storage URI not available");
        }
        const storagePath = context.globalStorageUri.fsPath;
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true });
        }
        this.lockFilePath = path.join(storagePath, lockName);
    }

    public async acquire(): Promise<void> {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                // 'wx' flag fails if file exists (atomic create)
                fs.writeFileSync(this.lockFilePath, '', { flag: 'wx' });
                this.isLocked = true;
                return;
            } catch (error: any) {
                if (error.code === 'EEXIST') {
                    // Lock exists, wait and retry
                    await new Promise(resolve => setTimeout(resolve, this.retryInterval));
                    retries++;
                    
                    // Check for stale locks
                    this.checkStaleLock();
                } else {
                    throw error;
                }
            }
        }
        throw new Error(`Could not acquire lock after ${this.maxRetries} retries.`);
    }

    public release(): void {
        if (this.isLocked) {
            try {
                fs.unlinkSync(this.lockFilePath);
            } catch (e) {
                // Ignore if already deleted
            }
            this.isLocked = false;
        }
    }
    
    private checkStaleLock() {
        try {
            const stats = fs.statSync(this.lockFilePath);
            const now = Date.now();
            if (now - stats.mtimeMs > 10000) { // 10 seconds stale
                try {
                    fs.unlinkSync(this.lockFilePath);
                } catch (e) {}
            }
        } catch (e) {
            // File might be gone already
        }
    }
}
