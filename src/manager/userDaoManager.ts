import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor'; 
import { UserDao } from '../dataAccessObj/userData';
import GlobalStateKey from '../utils/GlobalStateKey';

export class UserDaoManager {
    private static instance: UserDaoManager;
    // 記憶體快取 (只供讀取與 UI 顯示)
    private userDao: UserDao = { money: 0 };
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.USER_DATA;
    
    private saveQueue = new SequentialExecutor();

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    public static getInstance(): UserDaoManager {
        if (!UserDaoManager.instance) {
            throw new Error("UserDaoManager not initialized. Call initialize() first.");
        }
        return UserDaoManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): UserDaoManager {
        UserDaoManager.instance = new UserDaoManager(context);
        return UserDaoManager.instance;
    }

    public reload() {
        const data = this.context.globalState.get<UserDao>(this.STORAGE_KEY);
        if (data) {
            this.userDao = { ...this.userDao, ...data };
        }
    }

    public getUserInfo(): UserDao {
        return { ...this.userDao }; // 回傳複製品以防外部修改
    }

    public setStarter(starter: 'pikachu' | 'eevee'): void {
        this.userDao.starter = starter;
        this.context.globalState.update(this.STORAGE_KEY, this.userDao);
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (data: UserDao) => UserDao): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. 從硬碟讀取最新資料
            const storedData = this.context.globalState.get<UserDao>(this.STORAGE_KEY) || { money: 0 };
            // 合併預設值 (防止資料欄位缺失)

            // 2. 執行修改
            const newData = modifier(storedData);

            // 3. 寫回硬碟
            await this.context.globalState.update(this.STORAGE_KEY, newData);

            // 4. 更新記憶體快取
            this.userDao = newData;
        });
    }

    /**
     * 更新金錢
     * @returns true 成功, false 餘額不足
     */
    public async updateMoney(amount: number): Promise<boolean> {
        let success = false;

        await this.performTransaction((data) => {
            if (data.money + amount >= 0) {
                data.money += amount;
                success = true;
            } else {
                success = false;
            }
            return data;
        });

        return success;
    }

    public async setMoney(amount: number): Promise<void> {
        await this.performTransaction((data) => {
            data.money = amount;
            return data;
        });
    }

    public async clear(): Promise<void> {
        this.context.globalState.update(this.STORAGE_KEY, { money: 50000 });
        this.userDao = { money: 50000 };
    }
}