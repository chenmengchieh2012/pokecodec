import * as vscode from 'vscode';

export interface UserDao {
    money: number;
    name?: string;
    // Future fields can be added here (e.g., badges, playTime)
}

export class UserInfoManager {
    // Default state
    private userInfo: UserDao = { 
        money: 3000 
    };
    
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = 'pokemon-user-info';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload();
    }

    /**
     * Load data from global state
     */
    public reload() {
        const data = this.context.globalState.get<UserDao>(this.STORAGE_KEY);
        if (data) {
            // Merge with default to ensure new fields are handled if added later
            this.userInfo = { ...this.userInfo, ...data };
        }
    }

    /**
     * Save data to global state
     */
    private async save() {
        await this.context.globalState.update(this.STORAGE_KEY, this.userInfo);
    }

    public getUserInfo(): UserDao {
        return this.userInfo;
    }

    /**
     * Add or subtract money
     * @param amount Positive to add, negative to subtract
     * @returns true if successful, false if insufficient funds
     */
    public async updateMoney(amount: number): Promise<boolean> {
        if (this.userInfo.money + amount < 0) {
            return false;
        }
        this.userInfo.money += amount;
        await this.save();
        return true;
    }

    public async setMoney(amount: number): Promise<void> {
        this.userInfo.money = amount;
        await this.save();
    }
}
