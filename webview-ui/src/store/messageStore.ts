import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { vscode } from '../utilities/vscode';
import { BiomeData } from '../../../src/dataAccessObj/BiomeData';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { BoxPayload, PokeDexPayload } from '../../../src/dataAccessObj/MessagePayload';
import { AchievementStatistics } from '../../../src/utils/AchievementCritiria';
import { GameStateData } from '../../../src/dataAccessObj/gameStateData';

// ============================================================
// Type Definitions
// ============================================================


/** VS Code 訊息的基本結構 */
export interface VSCodeMessage<T = unknown> {
    type: MessageType;
    data?: T;
    [key: string]: unknown;
}

/** 訂閱者回調函數類型 */
export type MessageSubscriber<T = unknown> = (message: VSCodeMessage<T>) => void;

/** Store 中的資料參考 */
export interface StoreRefs {
    bag: ItemDao[] | undefined;
    party: PokemonDao[] | undefined;
    box: BoxPayload | undefined;
    userInfo: UserDao | undefined;
    gameStateData: GameStateData | undefined;
    biome: BiomeData | undefined;
    pokeDex: PokeDexPayload | undefined;
    achievements: AchievementStatistics | undefined;
}

/** MessageStore Context 的值類型 */
export interface MessageStoreContextValue {
    /** 訂閱特定類型的訊息 */
    subscribe: <T = unknown>(type: MessageType, callback: MessageSubscriber<T>) => () => void;
    /** 訂閱所有訊息 */
    subscribeAll: <T = unknown>(callback: MessageSubscriber<T>) => () => void;
    /** 手動發送訊息給訂閱者（用於測試或內部觸發） */
    notify: <T = unknown>(message: VSCodeMessage<T>) => void;
    /** 初始化 store，註冊 VS Code 訊息監聯 */
    init: () => void;
    /** 取得當前儲存的資料參考 */
    getRefs: () => StoreRefs;
    /** 更新特定資料參考 */
    setRef: <K extends keyof StoreRefs>(key: K, value: StoreRefs[K]) => void;
    /** 檢查是否已初始化完成 */
    isInitialized: () => InitializedStateType;
}

// ============================================================
// MessageStore Class (Observer Pattern Implementation)
// ============================================================

export const InitializedState = {
    UnStart: 'unstart',
    Initializing: 'initializing',
    finished: 'finished',
} as const;

type InitializedStateType = typeof InitializedState[keyof typeof InitializedState];

class MessageStore {
    private initTimerRef: NodeJS.Timeout | null = null;
    /** 按訊息類型分類的訂閱者 Map */
    private subscribers: Map<MessageType, Set<MessageSubscriber>> = new Map();
    /** 訂閱所有訊息的訂閱者 */
    private allSubscribers: Set<MessageSubscriber> = new Set();
    /** 資料參考儲存 */
    private refs: StoreRefs = {
        bag: undefined,
        party: undefined,
        box: undefined,
        userInfo: undefined,
        gameStateData: undefined,
        biome: undefined,
        pokeDex: undefined,
        achievements: undefined,
    };
    /** 是否已初始化 */
    private initialized: InitializedStateType = InitializedState.UnStart;
    /** 訊息處理器參考（用於清理） */
    private messageHandler: ((event: MessageEvent) => void) | null = null;

    /**
     * 訂閱特定類型的訊息
     * @param type 訊息類型
     * @param callback 回調函數
     * @returns 取消訂閱的函數
     */
    subscribe<T = unknown>(type: MessageType, callback: MessageSubscriber<T>): () => void {
        if (!this.subscribers.has(type)) {
            this.subscribers.set(type, new Set());
        }
        this.subscribers.get(type)!.add(callback as MessageSubscriber);
        
        // 返回取消訂閱函數
        return () => {
            this.subscribers.get(type)?.delete(callback as MessageSubscriber);
        };
    }

    /**
     * 訂閱所有類型的訊息
     * @param callback 回調函數
     * @returns 取消訂閱的函數
     */
    subscribeAll<T = unknown>(callback: MessageSubscriber<T>): () => void {
        this.allSubscribers.add(callback as MessageSubscriber);
        return () => {
            this.allSubscribers.delete(callback as MessageSubscriber);
        };
    }

    /**
     * 通知所有相關訂閱者
     * @param message VS Code 訊息
     */
    notify<T = unknown>(message: VSCodeMessage<T>): void {
        const type = message.type;
        
        // 更新內部資料參考
        this.updateRefs(message);
        
        // 通知特定類型的訂閱者
        if (this.subscribers.has(type)) {
            this.subscribers.get(type)!.forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error(`[MessageStore] Error in subscriber for type "${type}":`, error);
                }
            });
        }
        
        // 通知訂閱所有訊息的訂閱者
        this.allSubscribers.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('[MessageStore] Error in all-subscriber:', error);
            }
        });
    }

    /**
     * 根據訊息類型更新內部資料參考
     */
    private updateRefs<T = unknown>(message: VSCodeMessage<T>): void {
        switch (message.type) {
            case MessageType.BagData:
                this.refs.bag = (message.data as ItemDao[]) ?? undefined;
                break;
            case MessageType.PartyData:
                this.refs.party = (message.data as PokemonDao[]) ?? undefined;
                break;
            case MessageType.BoxData:
                this.refs.box = (message.data as BoxPayload) ?? undefined;
                break;
            case MessageType.PokeDexData:
                this.refs.pokeDex = (message.data as PokeDexPayload) ?? undefined;
                break;
            case MessageType.UserData:
                this.refs.userInfo = (message.data as UserDao) ?? undefined;
                break;
            case MessageType.GameStateData:
                this.refs.gameStateData = (message.data as GameStateData) ?? undefined;
                break;
            case MessageType.BiomeData:
                this.refs.biome = (message.data as BiomeData) ?? undefined;
                break;
            case MessageType.AchievementsData:
                this.refs.achievements = (message.data as AchievementStatistics) ?? undefined;
                break;
            default:
                // 非資料更新類型，無需更新 refs
                break;
        }
    }

    /**
     * 初始化 store，開始監聽來自 VS Code 的訊息
     */
    init(): void {
        if (this.initialized !== InitializedState.UnStart) {
            console.warn('[MessageStore] Already initialized');
            return;
        }
        this.initialized = InitializedState.Initializing;

        this.messageHandler = (event: MessageEvent) => {
            // console.log('[MessageStore] Received message from VS Code:', event.data);
            // console.log('[MessageStore] Current Refs:', this.refs);
            // console.log('[MessageStore] Current Initialized State:', this.initialized);
            const message = event.data as VSCodeMessage;
            if (message && message.type) {
                if( this.initialized === InitializedState.Initializing ){
                    this.updateRefs(message);
                }else{
                    this.notify(message);
                }
                
                if( this.refs.bag !== undefined &&
                    this.refs.party !== undefined &&
                    this.refs.box !== undefined &&
                    this.refs.userInfo !== undefined &&
                    this.refs.gameStateData !== undefined && 
                    this.refs.biome !== undefined &&
                    this.refs.pokeDex !== undefined &&
                    this.refs.achievements !== undefined &&
                    this.initialized === InitializedState.Initializing ){
                        this.initialized = InitializedState.finished;
                        console.log('[MessageStore] Initialization finished');
                        if (this.initTimerRef) {
                            console.log('[MessageStore] InitTimer cleared');
                            clearInterval(this.initTimerRef);
                        }
                        this.initTimerRef = null;
                        // 初始化完成後，通知所有訂閱者當前資料
                        this.notifyAllCurrentData();
                }
            }
        };

        window.addEventListener('message', this.messageHandler);

        
        this.requestAllData();
        this.initTimerRef = setInterval(() => {
            console.log('[MessageStore] Periodic data request to VS Code');
            this.requestAllData();
        }, 1000); // 每 1 秒請求一次，保持資料同步

        console.log('[MessageStore] Initialized and listening for VS Code messages');
    }


    private requestAllData(): void {
       // 1. 請求使用者資訊 (金錢)
        vscode.postMessage({ command: MessageType.GetUserInfo });
        // 2. 請求背包資訊
        vscode.postMessage({ command: MessageType.GetBag });
        // 3. 請求夥伴資訊
        vscode.postMessage({ command: MessageType.GetParty });
        // 4. 請求盒子資訊
        vscode.postMessage({ command: MessageType.GetBox });
        // 5. 請求遊戲狀態
        vscode.postMessage({ command: MessageType.GetGameStateData });
        // 6. 請求更新地形狀態
        vscode.postMessage({ command: MessageType.GetBiome });
        // 7. 請求圖鑑資料
        vscode.postMessage({ command: MessageType.GetPokeDex });
        // 8. 請求成就資料
        vscode.postMessage({ command: MessageType.GetAchievements });
    }

    /**
     * 通知所有訂閱者當前儲存的資料（用於初始化完成後）
     */
    private notifyAllCurrentData(): void {
        if (this.refs.bag !== undefined) {
            this.notify({ type: MessageType.BagData, data: this.refs.bag });
        }
        if (this.refs.party !== undefined) {
            this.notify({ type: MessageType.PartyData, data: this.refs.party });
        }
        if (this.refs.box !== undefined) {
            this.notify({ type: MessageType.BoxData, data: this.refs.box });
        }
        if (this.refs.userInfo !== undefined) {
            this.notify({ type: MessageType.UserData, data: this.refs.userInfo });
        }
        if (this.refs.gameStateData !== undefined) {
            this.notify({ type: MessageType.GameStateData, data: this.refs.gameStateData });
        }
        if (this.refs.pokeDex !== undefined) {
            this.notify({ type: MessageType.PokeDexData, data: this.refs.pokeDex });
        }
        if (this.refs.biome !== undefined) {
            this.notify({ type: MessageType.BiomeData, data: this.refs.biome });
        }
        if (this.refs.achievements !== undefined) {
            this.notify({ type: MessageType.AchievementsData, data: this.refs.achievements });
        }
    }

    /**
     * 銷毀 store，移除事件監聽
     */
    destroy(): void {
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
            this.messageHandler = null;
        }
        this.subscribers.clear();
        this.allSubscribers.clear();
        this.initialized = InitializedState.UnStart;
        console.log('[MessageStore] Destroyed');
    }

    /**
     * 取得當前儲存的資料參考
     */
    getRefs(): StoreRefs {
        return this.refs;
    }

    /**
     * 設定特定資料參考
     */
    setRef<K extends keyof StoreRefs>(key: K, value: StoreRefs[K]): void {
        this.refs[key] = value;
    }

    /**
     * 檢查是否已初始化
     */
    isInitialized(): InitializedStateType {
        return this.initialized;
    }
}

// ============================================================
// Singleton Instance
// ============================================================

/** 全域單例 MessageStore */
export const messageStore = new MessageStore();

// ============================================================
// React Context
// ============================================================

const MessageStoreContext = createContext<MessageStoreContextValue | null>(null);

/** MessageStoreProvider Props */
export interface MessageStoreProviderProps {
    children: ReactNode;
    /** 是否自動初始化（預設為 true） */
    autoInit?: boolean;
}

/**
 * MessageStore Provider 組件
 * 將 MessageStore 包裝成 React Context 供子組件使用
 */
export const MessageStoreProvider: React.FC<MessageStoreProviderProps> = ({ 
    children, 
    autoInit = true 
}) => {
    // 自動初始化
    useEffect(() => {
        if (autoInit && messageStore.isInitialized() === InitializedState.UnStart) {
            messageStore.init();
        }
        
        return () => {
            // 組件卸載時不銷毀 store，因為是全域單例
            // 如果需要完全清理，可以調用 messageStore.destroy()
        };
    }, [autoInit]);

    // 使用 useMemo 建立穩定的 context value
    // 由於 messageStore 是全域單例，這些方法永遠不會改變
    const contextValue = React.useMemo<MessageStoreContextValue>(() => ({
        subscribe: <T = unknown>(type: MessageType, callback: MessageSubscriber<T>) => {
            return messageStore.subscribe(type, callback);
        },
        subscribeAll: <T = unknown>(callback: MessageSubscriber<T>) => {
            return messageStore.subscribeAll(callback);
        },
        notify: <T = unknown>(message: VSCodeMessage<T>) => {
            messageStore.notify(message);
        },
        init: () => {
            messageStore.init();
        },
        getRefs: () => {
            return messageStore.getRefs();
        },
        setRef: <K extends keyof StoreRefs>(key: K, value: StoreRefs[K]) => {
            messageStore.setRef(key, value);
        },
        isInitialized: () => {
            return messageStore.isInitialized();
        },
    }), []);

    return React.createElement(
        MessageStoreContext.Provider,
        { value: contextValue },
        children
    );
};

// ============================================================
// Custom Hooks
// ============================================================

/**
 * 取得 MessageStore Context
 * @throws 如果在 Provider 外部使用會拋出錯誤
 */
export const useMessageStore = (): MessageStoreContextValue => {
    const context = useContext(MessageStoreContext);
    if (!context) {
        throw new Error('useMessageStore must be used within a MessageStoreProvider');
    }
    return context;
};

/**
 * 訂閱特定類型訊息的 Hook
 * 會自動在組件卸載時取消訂閱
 * 
 * @param type 訊息類型
 * @param callback 回調函數
 * 
 * @example
 * ```tsx
 * useMessageSubscription(MessageType.BagData, (message) => {
 *     setItems(message.data);
 * });
 * ```
 */
export const useMessageSubscription = <T = unknown>(
    type: MessageType,
    callback: MessageSubscriber<T>
): void => {
    const { subscribe } = useMessageStore();
    const callbackRef = useRef(callback);
    
    // 更新 callback ref
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const unsubscribe = subscribe(type, (message) => {
            callbackRef.current(message as VSCodeMessage<T>);
        });
        return unsubscribe;
    }, [type, subscribe]);
};
