import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import styles from './DialogBox.module.css';
import { SequentialExecutor } from '../utilities/SequentialExecutor';
// 請確認路徑正確，或直接將 class 貼在檔案下方

export interface DialogBoxHandle {
    setText: (text: string) => Promise<void>;
}

export const DialogBox = forwardRef<DialogBoxHandle, unknown>((_ , ref) => {
    // 我們只需要控制顯示在畫面上的文字，不再需要 "target text" 狀態
    const [displayedText, setDisplayedText] = useState("");
    
    // 初始化佇列執行器 (保持 ref 穩定)
    const queue = useRef(new SequentialExecutor());
    
    // 用來處理「組件卸載後」避免 setState 的旗標
    const isMounted = useRef(false);
    
    // 用來追蹤最新的請求 ID，防止舊的計時器覆蓋新的操作
    const latestRequestId = useRef(0);
    // 用來儲存計時器，以便取消
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => { 
            isMounted.current = false;
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, []);

    /**
     * 核心動畫邏輯：打字機效果
     * 回傳 Promise，直到打字完成且停留一段時間後才 Resolve
     */
    const typeTextAnimation = async (fullText: string) => {
        // 1. 清空文字 (如果需要的話，或者直接從空字串開始)
        setDisplayedText(""); 
        
        const startTime = Date.now();
        const msPerChar = 30; // 設定每個字的顯示時間 (毫秒)，越小越快

        while (true) {
            if (!isMounted.current) return;

            const now = Date.now();
            const elapsed = now - startTime;
            
            // 根據經過時間計算應該顯示多少字
            const charCount = Math.floor(elapsed / msPerChar) + 1;
            
            if (charCount >= fullText.length) {
                setDisplayedText(fullText);
                break;
            }

            setDisplayedText(fullText.slice(0, charCount));
            
            // 使用 requestAnimationFrame 讓動畫更流暢，並避免 setTimeout 的延遲累積
            await new Promise(r => requestAnimationFrame(r));
        }

        // 3. (選擇性) 打完字後，給予一點「閱讀時間」再結束這個 Task
        // 這樣下一段文字才不會瞬間接上來
        await new Promise(r => setTimeout(r, 50));
    };

    useImperativeHandle(ref, () => ({
        setText: async (newText: string) => {
            const requestId = ++latestRequestId.current;

            // 1. 如果有新的文字請求進來，立刻取消之前的「回復預設文字」計時器
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
                resetTimerRef.current = null;
            }

            // 2. 將「打字任務」加入佇列
            await queue.current.execute(async () => {
                await typeTextAnimation(newText);
            });

            // 3. 只有當這是「最新」的請求，且文字不是預設文字時，才設定計時器
            if (requestId === latestRequestId.current && newText !== "What will you do?") {
                resetTimerRef.current = setTimeout(() => {
                    // 再次確認是否仍為最新請求 (雖然 clearTimeout 應該已經處理了大部分情況)
                    if (requestId === latestRequestId.current) {
                        queue.current.execute(async () => {
                            if(isMounted.current) await typeTextAnimation("What will you do?");
                        });
                    }
                }, 2000);
            }
        }
    }), [queue]);


    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {displayedText}
                <span className={styles.cursor}></span>
            </div>
        </div>
    );
});