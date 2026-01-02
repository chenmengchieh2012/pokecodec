import * as vscode from 'vscode';
import { UserDaoManager } from './userDaoManager';
import { BagManager } from './bagsManager';
import itemData from '../data/items.json';
import { ItemDao } from '../dataAccessObj/item';
import GlobalStateKey from '../utils/GlobalStateKey';

const itemDataMap = itemData as unknown as Record<string, ItemDao>;

export class MigrationManager {
    private static instance: MigrationManager;

    private constructor(
        private context: vscode.ExtensionContext,
        private userDaoManager: UserDaoManager,
        private bagManager: BagManager
    ) {}

    public static initialize(
        context: vscode.ExtensionContext,
        userDaoManager: UserDaoManager,
        bagManager: BagManager
    ): MigrationManager {
        if (!MigrationManager.instance) {
            MigrationManager.instance = new MigrationManager(context, userDaoManager, bagManager);
        }
        return MigrationManager.instance;
    }

    public static getInstance(): MigrationManager {
        if (!MigrationManager.instance) {
            throw new Error("MigrationManager not initialized. Call initialize() first.");
        }
        return MigrationManager.instance;
    }

    public async checkAndPerformMigrations() {
        // 🔥 版本遷移邏輯 (0.0.1 -> 0.0.2)
        // 如果不是首次執行 (是舊用戶) 且尚未執行過此遷移
        const isFirstRunCheck = this.context.globalState.get(GlobalStateKey.IS_FIRST_RUN, true);
        const hasMigratedTo002 = this.context.globalState.get<boolean>(GlobalStateKey.HAS_MIGRATED_TO_002, false);

        if (!isFirstRunCheck && !hasMigratedTo002) {
            console.log('[Extension] Performing migration to version 0.0.2 (Economy Reset)');
            
            // 1. 重設金錢為 5000
            const currentMoney = await this.userDaoManager.resetMoney(5000);
            console.log(`[Migration] User money reset from ${currentMoney} to 5000.`);
            
            // 2. 發送補償道具
            // 10顆超級球 (great-ball), 10個傷藥 (potion), 10個好傷藥 (super-potion), 5個活力碎片 (revive)
            const compensationItems = [
                { item: itemDataMap['poke-ball'], count: 10 },
                { item: itemDataMap['super-ball'], count: 10 },
                { item: itemDataMap['great-ball'], count: 5 },
                { item: itemDataMap['potion'], count: 10 },
                { item: itemDataMap['super-potion'], count: 10 },
                { item: itemDataMap['ether'], count: 10 },
                { item: itemDataMap['revive'], count: 5 }
            ];
            
            for (const { item, count } of compensationItems) {
                if (item) {
                    await this.bagManager.add(item, count);
                }
            }
            
            vscode.window.showInformationMessage('Pokemon Extension Updated! Economy reset to $5000. Compensation items added to your bag.');
            
            // 標記遷移已完成
            await this.context.globalState.update(GlobalStateKey.HAS_MIGRATED_TO_002, true);
        }
        
        // 更新當前版本號
        const currentVersion = this.context.extension.packageJSON.version;
        await this.context.globalState.update(GlobalStateKey.EXTENSION_VERSION, currentVersion);
    }

    reset() {
        this.context.globalState.update(GlobalStateKey.HAS_MIGRATED_TO_002, false);
        this.context.globalState.update(GlobalStateKey.EXTENSION_VERSION, '0.0.1');
        this.context.globalState.update(GlobalStateKey.IS_FIRST_RUN, false);
    }
}
