
/**
 * 電腦綁定狀態資料結構
 * 用於手機同步功能的綁定管理
 */
export interface DeviceBindState {
    /** 綁定狀態 */
    isLock: boolean;
    /** 綁定紀錄序號（增量序號） */
    lockId: number;
    /** 上次解除綁定的序號（增量序號） */
    lastUnlockId: number;
    /** 2FA 金鑰（用於產生 TOTP） */
    twoFactorSecret: string;
    /** 2FA 最後驗證時間（用於防止重複使用） */
    twoFactorLastVerified: number;
}