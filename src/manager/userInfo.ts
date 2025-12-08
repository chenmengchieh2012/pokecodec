import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor'; 

export interface UserDao {
    money: number;
    name?: string;
    // Future fields...
}

export class UserInfoManager {
    // 記憶體快取 (只供讀取與 UI 顯示)
    private userInfo: UserDao = { money: 50000 };
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-user-info';
    
    private saveQueue = new SequentialExecutor();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    public reload() {
        const data = this.context.globalState.get<UserDao>(this.STORAGE_KEY);
        if (data) {
            this.userInfo = { ...this.userInfo, ...data };
        }
    }

    public getUserInfo(): UserDao {
        return { ...this.userInfo }; // 回傳複製品以防外部修改
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (data: UserDao) => void): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. 從硬碟讀取最新資料
            const storedData = this.context.globalState.get<UserDao>(this.STORAGE_KEY);
            // 合併預設值 (防止資料欄位缺失)
            const currentData: UserDao = { 
                money: 50000, 
                ...storedData 
            };

            // 2. 執行修改
            modifier(currentData);

            // 3. 寫回硬碟
            await this.context.globalState.update(this.STORAGE_KEY, currentData);

            // 4. 更新記憶體快取
            this.userInfo = currentData;
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
        });

        return success;
    }

    public async setMoney(amount: number): Promise<void> {
        await this.performTransaction((data) => {
            data.money = amount;
        });
    }
}