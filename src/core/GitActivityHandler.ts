import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { JoinPokemonManager } from '../manager/joinPokemonManager';
import { ExperienceCalculator } from '../utils/ExperienceCalculator';
import { BagManager } from '../manager/bagsManager';

import itemData from '../data/items.json';
import { ItemDao } from '../dataAccessObj/item';
import { UserDaoManager } from '../manager/userDaoManager';

const itemDataMap = itemData as Record<string, ItemDao>;

const execAsync = promisify(exec);

export class GitActivityHandler {
    private static instance: GitActivityHandler;
    private watchers: vscode.FileSystemWatcher[] = [];
    private lastHeadHashes: Map<string, string> = new Map(); // workspaceFolder -> commitHash
    private partyManager: JoinPokemonManager | undefined;
    private bagManager: BagManager| undefined;
    private userDaoManager: UserDaoManager| undefined;
    
    // 使用 EventEmitter 來支援多個監聽者
    private _onDidProcessCommit = new vscode.EventEmitter<void>();
    public readonly onDidProcessCommit = this._onDidProcessCommit.event;

    private constructor() {}

    public static getInstance(): GitActivityHandler {
        if (!GitActivityHandler.instance) {
            GitActivityHandler.instance = new GitActivityHandler();
        }
        return GitActivityHandler.instance;
    }

    public initialize() {
        this.partyManager = JoinPokemonManager.getInstance();
        this.bagManager = BagManager.getInstance();
        this.userDaoManager = UserDaoManager.getInstance();

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
            // 使用 LC_ALL=C 強制輸出英文，避免語系問題導致解析失敗
            const { stdout: statOutput } = await execAsync(`git log -1 --shortstat --format="%H|%an|%s" ${commitHash}`, { 
                cwd: folderPath,
                env: { ...process.env, LC_ALL: 'C' }
            });
            
            // Output format example:
            // <hash>|<author>|<subject>
            // 
            //  1 file changed, 1 insertion(+), 1 deletion(-)
            
            // 過濾掉空行，確保我們拿到的是有內容的行
            const lines = statOutput.trim().split('\n').filter(line => line.trim().length > 0);
            if (lines.length < 2) return;

            const metaInfo = lines[0];
            // 統計資訊通常在最後一行
            const statsLine = lines[lines.length - 1]; 
            
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

            /**  
             * 根據 commit 資訊來更新寶可夢的經驗值或其他屬性
            */
            // 這裡我們需要存取 GameStateManager 來更新隊伍中的寶可夢
            this.updatePokemonStats(folderPath, {
                linesChanged,
                isBugFix,
                commitHash: hash
            });

            /**
             * 隨機發放道具給玩家
             * 根據 commit 的規模 (linesChanged) 來決定發放機率
             */

            this.giveItemsToPlayer(folderPath, linesChanged);

            /**
             * 給予玩家遊戲幣獎勵
             */
            this.giveMoneyToPlayer(folderPath, linesChanged);

            // 觸發事件通知所有監聽者
            this._onDidProcessCommit.fire();

        } catch (error) {
            console.error(`[GitActivityHandler] Error processing commit:`, error);
        }
    }

    private giveMoneyToPlayer(folderPath: string, linesChanged: number) {
        const userInfo = this.userDaoManager?.getUserInfo();
        // 根據 linesChanged 給予玩家遊戲幣
        if (!userInfo) return;

        const moneyEarned = Math.max(1, Math.floor(linesChanged / 10)); // 每 10 行程式碼給 1 遊戲幣
        // 最高給予 100 遊戲幣
        const cappedMoney = Math.min(moneyEarned, 100);
        this.userDaoManager?.updateMoney(cappedMoney);
        console.log(`[GitActivityHandler] Given ${cappedMoney} money to player for coding effort.`);
        vscode.window.showInformationMessage(`You earned ${cappedMoney} PokéDollars for your coding effort!`);
    }

    private giveItemsToPlayer(folderPath: string, linesChanged: number) {
        // 根據 linesChanged 決定給予道具的機率
        // 這裡我們簡單設定：每 50 行程式碼，有 10% 機率獲得一個小道具

        const chance = Math.min(0.2, (linesChanged / 50) * 0.1); // 最多 20% 機率

        let givenItem: ItemDao | null = null;
        if (Math.random() < chance) {
            // 隨機選擇一個道具給玩家
            const TMPrefix = "tm";
            const allTMApiName = [ ...Array.from({length: 50}, (_, i) => {
                const num = (i + 1).toString().padStart(2, '0');
                return `${TMPrefix}${num}`;
            })]; // 假設有 50 個 TM 道具

            const HMPrefix = "hm";
            const allHMApiName = [ ...Array.from({length: 8}, (_, i) => {
                const num = (i + 1).toString().padStart(2, '0');
                return `${HMPrefix}${num}`;
            })];

            
            const myBagItems = this.bagManager?.getAll() || [];
            const ownedTMSet = new Set(
                myBagItems
                    .filter(item => item.apiName.startsWith(TMPrefix))
                    .map(item => item.apiName)
            );
            const availableMachines = [...allTMApiName,...allHMApiName].filter(tmName => !ownedTMSet.has(tmName));

            if (availableMachines.length === 0) {
                console.log("[GitActivityHandler] Player already owns all TMs. No item given.");
                return;
            }

            const rarityWeightedList = [
                ...availableMachines.filter((_, idx) => idx < 10).flatMap(tm => [tm, tm, tm]), // Common TMs (first 10) x3
                ...availableMachines.filter((_, idx) => idx >= 10 && idx < 30).flatMap(tm => [tm, tm]), // Uncommon TMs (next 20) x2
                ...availableMachines.filter((_, idx) => idx >= 30) // Rare TMs (last 20) x1
            ];

            const randomIndex = Math.floor(Math.random() * rarityWeightedList.length);
            const selectedItemName = rarityWeightedList[randomIndex];
            givenItem = itemDataMap[selectedItemName];
            if(!givenItem){
                console.warn(`[GitActivityHandler] Item data not found for ${selectedItemName}`);
            }
        }else{
            const balls = ['poke_ball', 'great_ball', 'ultra_ball'];
            const medicalItems = ['potion', 'super_potion', 'hyper_potion', 'full_restore', 'revive'];

            // poke_ball * 3, great_ball *2, ultra_ball *1
            // potion *3, super_potion *2, hyper_potion *1, full_restore *1, revive *1
            const rarityWeightedList = [
                ...balls.flatMap((ball, idx) => {
                    if (ball === 'poke_ball') return [ball, ball, ball];
                    if (ball === 'great_ball') return [ball, ball];
                    return [ball];
                }),
                ...medicalItems.flatMap((item, idx) => {
                    if (item === 'potion') return [item, item, item];
                    if (item === 'super_potion') return [item, item];
                    return [item];
                })
            ];
            const randomIndex = Math.floor(Math.random() * rarityWeightedList.length);
            const selectedBallName = rarityWeightedList[randomIndex];
            givenItem = itemDataMap[selectedBallName];
        }

        if (givenItem){
            // 將道具加入玩家背包
            this.bagManager?.add(givenItem, 1);
            console.log(`[GitActivityHandler] Given item ${givenItem.name} to player for coding effort.`);
            vscode.window.showInformationMessage(`You received a ${givenItem.name} for your coding effort!`);
        }
    }

    private updatePokemonStats(repoPath: string, data: { linesChanged: number, isBugFix: boolean, commitHash: string }) {
        if (!this.partyManager) return;
        
        const newParty = JSON.parse(JSON.stringify(this.partyManager.getAll()));

        if (newParty.length === 0) return;

        // 紀錄codingStats在PokemonDao中
        for(let modifyPokemon of newParty) {


            /**
             * 更新寶可夢的經驗值與等級
             */
            const expGain = Math.max(1, Math.floor(data.linesChanged / newParty.length)); // 每隻寶可夢分得的經驗值
            modifyPokemon.currentExp = (modifyPokemon.currentExp || 0) + expGain;
            modifyPokemon = ExperienceCalculator.addExperience(modifyPokemon, expGain);
            console.log(`[GitActivityHandler] Gave ${expGain} EXP to Pokemon ${modifyPokemon.name}. New EXP: ${modifyPokemon.currentExp}, Level: ${modifyPokemon.level}`);


            /**
             * 更新寶可夢的 codingStats 統計數據
             */
            if (!modifyPokemon.codingStats) {
                modifyPokemon.codingStats = {
                    caughtRepo: 'Unknown',
                    favoriteLanguage: 'Unknown',
                    linesOfCode: 0,
                    bugsFixed: 0,
                    commits: 0,
                    coffeeConsumed: 0
                };
            }
            // 更新數據
            modifyPokemon.codingStats.commits += 1;
            modifyPokemon.codingStats.linesOfCode += data.linesChanged;
            if (data.isBugFix) {
                modifyPokemon.codingStats.bugsFixed += 1;
            }
            // 儲存更新
            this.partyManager.update(modifyPokemon);
            console.log(`[GitActivityHandler] Updated Pokemon ${modifyPokemon.name} stats!`, modifyPokemon.codingStats);
       
        }

    }
}
