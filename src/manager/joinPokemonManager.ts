import * as vscode from 'vscode';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import GlobalStateKey from '../utils/GlobalStateKey';
import { GlobalMutex } from '../utils/GlobalMutex';
import { DeviceBindState } from '../dataAccessObj/DeviceBindState';
import { TwoFACertificate } from '../utils/TwoFACertificate';



export class JoinPokemonManager {
    private static instance: JoinPokemonManager;
    // 記憶體快取
    private party: PokemonDao[] = [];
    private deviceBindState: DeviceBindState;
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.PARTY_DATA;
    private readonly DEVICE_BIND_STATE_KEY = GlobalStateKey.DEVICE_BIND_STATE;
    private readonly MAX_PARTY_SIZE = 6;

    private saveQueue: SequentialExecutor;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.saveQueue = new SequentialExecutor(new GlobalMutex(context, 'party.lock'));
        this.deviceBindState = this._getDefaultDeviceBindState();
        this._loadFromDisk();
    }

    private _getDefaultDeviceBindState(): DeviceBindState {
        return {
            isLock: false,
            lockId: 0,
            lastUnlockId: 0,
            twoFactorSecret: '',
            twoFactorLastVerified: 0,
        };
    }

    public static getInstance(): JoinPokemonManager {
        if (!JoinPokemonManager.instance) {
            throw new Error("JoinPokemonManager not initialized. Call initialize() first.");
        }
        return JoinPokemonManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): JoinPokemonManager {
        JoinPokemonManager.instance = new JoinPokemonManager(context);
        return JoinPokemonManager.instance;
    }

    private _loadFromDisk() {
        const data = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY);
        if (data) {
            this.party = data;
        } else {
            this.party = [];
        }

        const bindState = this.context.globalState.get<DeviceBindState>(this.DEVICE_BIND_STATE_KEY);
        if (bindState) {
            this.deviceBindState = bindState;
        } else {
            this.deviceBindState = this._getDefaultDeviceBindState();
        }
    }

    public async reload() {
        await this.saveQueue.execute(async () => {
            this._loadFromDisk();
        });
    }

    public getAll(): PokemonDao[] {
        return [...this.party];
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: (party: PokemonDao[]) => PokemonDao[]): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 1. Read
            const currentParty = this.context.globalState.get<PokemonDao[]>(this.STORAGE_KEY) || [];
            
            // 2. Modify
            const newParty = modifier(currentParty);

            // 3. Write
            await this.context.globalState.update(this.STORAGE_KEY, newParty);

            // 4. Update Cache
            this.party = newParty;
        });
    }

    public async add(pokemon: PokemonDao): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            // 在 Transaction 內部檢查長度，確保絕對不會超過上限
            if (party.length < this.MAX_PARTY_SIZE) {
                party.push(pokemon);
                success = true;
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async remove(uid: string): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            const index = party.findIndex(p => p.uid === uid);
            if (index !== -1) {
                party.splice(index, 1);
                success = true;
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async swap(index1: number, index2: number): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            if (index1 >= 0 && index1 < party.length && 
                index2 >= 0 && index2 < party.length) {
                const temp = party[index1];
                party[index1] = party[index2];
                party[index2] = temp;
                success = true;
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async reorder(uids: string[]): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            // Create a map for quick lookup
            const partyMap = new Map(party.map(p => [p.uid, p]));
            const newParty: PokemonDao[] = [];
            
            // Reconstruct party based on uids order
            for (const uid of uids) {
                const pokemon = partyMap.get(uid);
                if (pokemon) {
                    newParty.push(pokemon);
                    partyMap.delete(uid);
                }
            }
            
            // Append any remaining pokemon (shouldn't happen if uids are correct, but for safety)
            for (const pokemon of partyMap.values()) {
                newParty.push(pokemon);
            }

            if (newParty.length === party.length) {
                // Replace content of party array
                party.length = 0;
                party.push(...newParty);
                success = true;
            }
            
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async update(pokemons: PokemonDao[]): Promise<boolean> {
        let success = false;
        await this.performTransaction((party) => {
            for (const pokemon of pokemons) {
                const index = party.findIndex(p => p.uid === pokemon.uid);
                if (index !== -1) {
                    party[index] = pokemon;
                    success = true;
                }
            }
            return JSON.parse(JSON.stringify(party));
        });
        return success;
    }

    public async clear(): Promise<void> {
        await this.resetBindState();
        await this.performTransaction(() => {
            return [];
        });
    }

    // ==================== Device Bind State Methods ====================

    /**
     * 取得目前的綁定狀態
     */
    public getDeviceBindState(): DeviceBindState {
        return { ...this.deviceBindState };
    }

    /**
     * 檢查是否已綁定
     */
    public isDeviceLocked(): boolean {
        return this.deviceBindState.isLock;
    }

    /**
     * 執行綁定（上鎖）
     * @returns 新的綁定序號
     */
    public async lock(newLockId: number): Promise<number> {
        this.deviceBindState = {
            ...this.deviceBindState,
            isLock: true,
            lockId: newLockId,
        };
        await this._saveDeviceBindState();
        return newLockId;
    }

    /**
     * 解除綁定（解鎖）
     * @returns 解除綁定的序號
     */
    public async unlock(): Promise<number> {
        const currentLockId = this.deviceBindState.lockId;
        this.deviceBindState = {
            ...this.deviceBindState,
            isLock: false,
            lastUnlockId: currentLockId,
        };
        await this._saveDeviceBindState();
        return currentLockId;
    }

    /**
     * 強制重置綁定狀態（用於強制解鎖場景）
     */
    public async resetBindState(): Promise<void> {
        this.deviceBindState = this._getDefaultDeviceBindState();
        await this._saveDeviceBindState();
    }

    // MARK: 測試用，僅重置版本資訊
    public async resetOnlyVersion(version: number): Promise<void> {
        await this.saveQueue.execute(async () => {
            const bindState = this.context.globalState.get<DeviceBindState>(this.DEVICE_BIND_STATE_KEY);
            if (bindState) {
                const newBindState = {
                    ...bindState,
                    lockId: version,
                    lastUnlockId: version,
                };
                await this.context.globalState.update(this.DEVICE_BIND_STATE_KEY, newBindState);
                this.deviceBindState = newBindState;
            }
        });
    }

    // ==================== 2FA Methods ====================

    /**
     * 取得或產生 2FA Secret
     * 如果尚未綁定且沒有 Secret，會產生一個新的
     */
    public async getOrGenerateTwoFactorSecret(): Promise<string> {
        if (this.deviceBindState.twoFactorSecret) {
            return this.deviceBindState.twoFactorSecret;
        }
        
        // 只有在未鎖定狀態下才能產生新的 Secret
        if (!this.deviceBindState.isLock) {
            const newSecret = TwoFACertificate.generateSecret();
            this.deviceBindState = {
                ...this.deviceBindState,
                twoFactorSecret: newSecret
            };
            await this._saveDeviceBindState();
            return newSecret;
        }
        
        throw new Error("Device is locked but no 2FA secret found.");
    }

    /**
     * 驗證 2FA Token
     * @param token 使用者輸入的 6 位數驗證碼
     */
    public async verifyTwoFactor(token: string): Promise<boolean> {
        if (!this.deviceBindState.twoFactorSecret) {
            return false;
        }

        const result = TwoFACertificate.verifyTokenWithState(
            this.deviceBindState.twoFactorSecret,
            token,
            this.deviceBindState.twoFactorLastVerified
        );

        if (result.isValid && result.newCounter) {
            this.deviceBindState = {
                ...this.deviceBindState,
                twoFactorLastVerified: result.newCounter
            };
            await this._saveDeviceBindState();
            return true;
        }

        return false;
    }

    /**
     * 匯入資料
     */
    public async importData(party: PokemonDao[], secret: string, lockId: number): Promise<void> {
        await this.saveQueue.execute(async () => {
            // Update Party
            await this.context.globalState.update(this.STORAGE_KEY, party);
            this.party = party;

            // Update Bind State
            this.deviceBindState = {
                ...this.deviceBindState,
                twoFactorSecret: secret,
                lockId: lockId,
                // 匯入後保持解鎖狀態，等待使用者手動鎖定或驗證
                isLock: false 
            };
            await this.context.globalState.update(this.DEVICE_BIND_STATE_KEY, this.deviceBindState);
        });
    }

    /**
     * 儲存綁定狀態到磁碟
     */
    private async _saveDeviceBindState(): Promise<void> {
        await this.saveQueue.execute(async () => {
            await this.context.globalState.update(this.DEVICE_BIND_STATE_KEY, this.deviceBindState);
        });
    }
}