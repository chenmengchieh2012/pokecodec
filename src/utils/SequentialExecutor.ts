// utils/SequentialExecutor.ts

import { GlobalMutex } from './GlobalMutex';

/**
 * 用於確保非同步任務按順序執行 (防止 Race Condition)
 * 適用於：檔案寫入、GlobalState 更新、API 呼叫等不允許併發的操作
 */
export class SequentialExecutor {
    // 永遠指向「佇列中最後一個任務」的 Promise
    private _lastPromise: Promise<void> = Promise.resolve();
    private mutex?: GlobalMutex;

    constructor(mutex?: GlobalMutex) {
        this.mutex = mutex;
    }

    /**
     * 將一個非同步任務加入佇列
     * @param task 一個回傳 Promise 的函式
     * @returns 該任務原本的 Promise 結果
     */
    public execute<T>(task: () => Promise<T>): Promise<T> {
        // 1. 等待上一個任務完成 (無論成功或失敗) 之後，再執行這次的 task
        const currentTaskPromise = this._lastPromise.then(async () => {
            if (this.mutex) {
                await this.mutex.acquire();
            }
            try {
                return await task();
            } finally {
                if (this.mutex) {
                    this.mutex.release();
                }
            }
        });

        // 2. 更新指標：將 _lastPromise 指向這次的任務
        // 重要：必須 catch 錯誤，否則如果這次任務失敗，會導致整個佇列卡死 (Rejected 狀態)
        this._lastPromise = currentTaskPromise.then(() => {}).catch(() => {});

        // 3. 回傳這次任務的 Promise 給呼叫者，讓呼叫者可以 await 這次的結果
        return currentTaskPromise;
    }
}