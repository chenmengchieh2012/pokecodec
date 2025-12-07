import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import styles from './DialogBox.module.css';


export interface DialogBoxHandle {
    setText: (text: string) => Promise<void>;
}

export const DialogBox = forwardRef<DialogBoxHandle, unknown>((_ , ref) => {
    const [text, setText] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const isFinishedRef = useRef(false);
    const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
        setText: async (newText: string) => {
            // 如果先前的還沒有輸出完，要先等待前面的輸出完畢才可以進行
            await new Promise<void>((resolve) => {
                const checkFinished = async () => {
                    if (isFinishedRef.current) {
                        resolve();
                    } else {
                        setTimeout(checkFinished, 50);
                    }
                };
                checkFinished();
            });

            // 設定新文字
            setText(newText);
            
            // 等待新文字輸出完畢
            return new Promise<void>((resolve) => {
                const checkNewTextFinished = async () => {
                    if (isFinishedRef.current) {
                        resolve();
                    } else {
                        setTimeout(checkNewTextFinished, 50);
                    }
                };
                // 給一點時間讓 useEffect 觸發並將 isFinishedRef 設為 false
                setTimeout(checkNewTextFinished, 100);
            });
        }
    }), []);

    useEffect(()=>{
        // 清除之前的 timeout
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }
    },[text])
  
    useEffect(() => {
        // 清除之前的 timeout
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }
        
        setDisplayedText('');
        isFinishedRef.current = false;

        if (!text) {
            isFinishedRef.current = true;
            return;
        }

        let currentIndex = 0;
        const interval = setInterval(() => {
            currentIndex++;
            setDisplayedText(text.slice(0, currentIndex));
            if (currentIndex > text.length) {
                clearInterval(interval);
                isFinishedRef.current = true;
                resetTimeoutRef.current = setTimeout(() => {
                    setText("What will you do?");
                }, 2000);
            }
            return ;
        }, 50); 

        return () => {
            clearInterval(interval);
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
                resetTimeoutRef.current = null;
            }
        };
    }, [text]);

  return (
    <div className={styles.container}>
        <div className={styles.content}>
            {displayedText}
            {text && displayedText.length < text.length && (
               <span className={styles.cursor}></span>
            )}
        </div>
    </div>
  );
});