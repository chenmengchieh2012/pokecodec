import * as vscode from 'vscode';
// 記得引入你的 SequentialExecutor
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { ItemDao } from '../dataAccessObj/item';
import GlobalStateKey from '../utils/GlobalStateKey';


export class BagManager {
    // this.items 變成只是一個「快取」，用於快速回傳給 UI，但不參與寫入邏輯
    private items: ItemDao[] = [];
    private context: vscode.ExtensionContext;
    private readonly STORAGE_KEY = GlobalStateKey.BAG_DATA;
    
    private saveQueue = new SequentialExecutor();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.reload(); // 初始化快取
    }

    /**
     * 從硬碟讀取最新資料到記憶體 (更新快取)
     */
    public reload() {
        const data = this.context.globalState.get<ItemDao[]>(this.STORAGE_KEY);
        if (data) {
            this.items = data.map(item => ({
                ...item,
                count: item.count || 0 
            }));
        } else {
            this.items = [];
        }
    }

    /**
     * 取得目前快取的資料 (給 UI 顯示用，唯讀)
     */
    public getAll(): ItemDao[] {
        // 回傳複製品以防外部直接修改
        return [...this.items];
    }

    public getItem(itemId: string | number): ItemDao | undefined {
        return this.items.find(i => i.id === itemId || i.apiName === itemId);
    }

    // =========================================================
    //  核心修改：將所有「寫入」操作改為 Transaction (交易) 模式
    // =========================================================

    /**
     * 通用的交易處理器
     * 1. 排隊
     * 2. 讀取最新 GlobalState
     * 3. 執行修改邏輯
     * 4. 寫回 GlobalState
     * 5. 更新本地快取
     */
    private async performTransaction(
        modifier: (currentItems: ItemDao[]) => ItemDao[]
    ): Promise<void> {
        await this.saveQueue.execute(async () => {
            // A. 【讀取】先從硬碟拿最新資料，確保不會覆蓋別人的修改
            let currentData = this.context.globalState.get<ItemDao[]>(this.STORAGE_KEY) || [];
            
            // 資料正規化 (防呆)
            currentData = currentData.map(item => ({...item, count: item.count || 0}));

            // B. 【修改】執行傳進來的修改邏輯
            const newData = modifier(currentData);

            // C. 【寫入】存回硬碟
            // (這時候因為我们在 Queue 裡面，這段期間不會有其他人插隊)
            await this.context.globalState.update(this.STORAGE_KEY, newData);
            // D. 【更新快取】讓記憶體跟上最新狀態
            this.items = newData;
        });
    }

    /**
     * 新增道具
     */
    public async add(item: ItemDao, addSize?: number): Promise<void> {
        await this.performTransaction((currentItems) => {
            // 這裡的邏輯針對 currentItems (最新資料) 操作
            const existingItem = currentItems.find(i => 
                (item.apiName && i.apiName === item.apiName) || 
                (i.id === item.id)
            );
            
            const quantityToAdd = addSize !== undefined ? addSize : (item.count || 1);
            
            if (existingItem) {
                existingItem.count += quantityToAdd;
                return currentItems;
            } else {
                return [...currentItems, {...item, count: quantityToAdd}];
            }
        });
    }

    /**
     * 使用道具
     */
    public async useItem(itemId: string | number, count: number = 1): Promise<boolean> {
        let success = false;

        await this.performTransaction((currentItems) => {
            const index = currentItems.findIndex(i => i.id === itemId || i.apiName === itemId);
            
            if (index !== -1) {
                const currentQty = currentItems[index].count || 0;
                if (currentQty >= count) {
                    currentItems[index].count = currentQty - count;
                    
                    if (currentItems[index].count === 0) {
                        currentItems.splice(index, 1);
                    }
                    success = true; // 標記成功
                }
                return currentItems;
            } else {
                return currentItems;
            }
        });

        return success;
    }
}