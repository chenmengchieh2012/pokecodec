import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { JoinPokemonManager } from '../manager/joinPokemonManager';
import { MessageType } from '../dataAccessObj/messageType';

const execAsync = promisify(exec);

export class GitActivityHandler {
    private static instance: GitActivityHandler;
    private watchers: vscode.FileSystemWatcher[] = [];
    private lastHeadHashes: Map<string, string> = new Map(); // workspaceFolder -> commitHash
    private partyManager: JoinPokemonManager | undefined;

    private constructor() {}

    public static getInstance(): GitActivityHandler {
        if (!GitActivityHandler.instance) {
            GitActivityHandler.instance = new GitActivityHandler();
        }
        return GitActivityHandler.instance;
    }

    public initialize() {
        this.partyManager = JoinPokemonManager.getInstance();

        // 監聽 workspace 資料夾變化 (例如使用者新增/移除專案資料夾)
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.setupWatchers();
        });

        // 初始設定
        this.setupWatchers();
    }

    public dispose() {
        this.watchers.forEach(w => w.dispose());
        this.watchers = [];
    }

    private async setupWatchers() {
        // 清除舊的 watchers
        this.dispose();

        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            return;
        }

        for (const folder of folders) {
            const gitPath = path.join(folder.uri.fsPath, '.git');
            
            // 檢查 .git 是否存在
            if (!fs.existsSync(gitPath)) {
                continue;
            }

            // 紀錄初始 HEAD Hash
            await this.updateLastHeadHash(folder.uri.fsPath);

            // 建立 Watcher 監聽 .git/HEAD 和 .git/refs/heads/**
            // 這樣無論是切換分支還是 Commit，通常都會觸發
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(folder, '.git/{HEAD,refs/heads/**}')
            );

            watcher.onDidChange(() => this.handleGitChange(folder.uri.fsPath));
            watcher.onDidCreate(() => this.handleGitChange(folder.uri.fsPath));
            
            this.watchers.push(watcher);
            console.log(`[GitActivityHandler] Watching .git in ${folder.uri.fsPath}`);
        }
    }

    private async updateLastHeadHash(folderPath: string) {
        try {
            const { stdout } = await execAsync('git rev-parse HEAD', { cwd: folderPath });
            const currentHash = stdout.trim();
            this.lastHeadHashes.set(folderPath, currentHash);
            return currentHash;
        } catch (error) {
            console.warn(`[GitActivityHandler] Failed to get HEAD hash for ${folderPath}`, error);
            return null;
        }
    }

    private async handleGitChange(folderPath: string) {
        const oldHash = this.lastHeadHashes.get(folderPath);
        const newHash = await this.updateLastHeadHash(folderPath);

        if (newHash && oldHash && newHash !== oldHash) {
            // Hash 改變了，代表有新的 Commit (或是切換分支，或是 Pull)
            // 我們需要進一步檢查這是不是一個新的 Commit
            // 簡單起見，我們假設只要 HEAD 變了且不是切換分支造成的，就是一次 Commit 活動
            // 為了更精確，我們可以檢查 git log -1 的時間是否很近

            console.log(`[GitActivityHandler] Git change detected in ${folderPath}. ${oldHash} -> ${newHash}`);
            
            await this.processCommit(folderPath, newHash);
        }
    }

    private async processCommit(folderPath: string, commitHash: string) {
        try {
            // 取得 Commit 詳細資訊：Hash, Author Name, Subject, Insertions, Deletions
            // --numstat 格式: insertions deletions filename
            // 這裡我們只取總結
            const { stdout } = await execAsync(`git show --stat --format="%H|%an|%s" ${commitHash}`, { cwd: folderPath });
            
            // 解析輸出 (git show --stat 的輸出比較雜，這裡簡化處理)
            // 更好的方式是用 git log -1 --shortstat
            const { stdout: statOutput } = await execAsync(`git log -1 --shortstat --format="%H|%an|%s" ${commitHash}`, { cwd: folderPath });
            
            // Output format example:
            // <hash>|<author>|<subject>
            //  1 file changed, 1 insertion(+), 1 deletion(-)
            
            const lines = statOutput.trim().split('\n');
            if (lines.length < 2) return;

            const [metaInfo, statsLine] = lines;
            const [hash, author, message] = metaInfo.split('|');

            // 解析 statsLine
            // e.g. " 1 file changed, 12 insertions(+), 5 deletions(-)"
            const insertionsMatch = statsLine.match(/(\d+) insertion/);
            const deletionsMatch = statsLine.match(/(\d+) deletion/);

            const insertions = insertionsMatch ? parseInt(insertionsMatch[1]) : 0;
            const deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;
            const linesChanged = insertions + deletions;

            // 簡單的 Bug Fix 判定
            const isBugFix = /fix|bug|resolve|issue|error|crash/i.test(message);

            console.log(`[GitActivityHandler] Commit processed:`, {
                hash, author, message, linesChanged, isBugFix
            });

            // TODO: 更新寶可夢數據
            // 這裡我們需要存取 GameStateManager 來更新隊伍中的寶可夢
            this.updatePokemonStats(folderPath, {
                linesChanged,
                isBugFix,
                commitHash: hash
            });

        } catch (error) {
            console.error(`[GitActivityHandler] Error processing commit:`, error);
        }
    }

    private updatePokemonStats(repoPath: string, data: { linesChanged: number, isBugFix: boolean, commitHash: string }) {
        if (!this.partyManager) return;
        
        const party = this.partyManager.getAll();

        if (party.length === 0) return;

        // 簡單邏輯：隊伍中的第一隻寶可夢 (帶頭大哥) 獲得經驗
        // 或者全部都加？這裡先只加第一隻
        const leader = party[0];
        
        if (!leader.codingStats) {
            leader.codingStats = {
                caughtRepo: 'Unknown',
                favoriteLanguage: 'Unknown',
                linesOfCode: 0,
                bugsFixed: 0,
                commits: 0,
                coffeeConsumed: 0
            };
        }

        // 更新數據
        leader.codingStats.commits += 1;
        leader.codingStats.linesOfCode += data.linesChanged;
        if (data.isBugFix) {
            leader.codingStats.bugsFixed += 1;
        }

        // 如果還沒有紀錄 Repo，就紀錄一下
        if (leader.codingStats.caughtRepo === 'Unknown') {
            leader.codingStats.caughtRepo = path.basename(repoPath);
        }

        // 儲存更新
        this.partyManager.update(leader);
        
        // 通知前端更新 (可選，如果前端有即時顯示這些數據)
        // vscode.postMessage(...) // 這邊是在 Extension Host，需要透過 Webview Panel 傳送
        // 暫時先不傳，等打開介面時會自動讀取最新資料
        
        console.log(`[GitActivityHandler] Updated Pokemon ${leader.name} stats!`, leader.codingStats);
        
        // 可以在這裡觸發一些遊戲事件，例如升級、進化檢查等
        // ...
    }
}
