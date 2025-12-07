import React, { useState } from 'react';
import styles from './VBagBox.module.css';

export interface BagItem {
    id: number;
    name: string; // 顯示名稱
    apiName: string; // 用於 PokeAPI 的 slug (例如: super-potion)
    count: number;
    category: 'items' | 'balls' | 'key';
    description?: string;
}

interface VBagBoxProps {
    items: BagItem[];
}

export const VBagBox: React.FC<VBagBoxProps> = ({ items }) => {
    const [activePocket, setActivePocket] = useState<'items' | 'balls' | 'key'>('items');

    // 篩選當前口袋的道具
    const filteredItems = items.filter(item => item.category === activePocket);

    // 新增：取得道具 Icon
    const getBagIconUrl = (apiName: string) => {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${apiName}.png`;
    };

    return (
        <div className={styles.bagContainer}>
            
            {/* 1. 分類標籤 (現在變得很扁) */}
            <div className={styles.pocketNav}>
                <div className={`${styles.pocketTab} ${activePocket === 'items' ? styles.active : ''}`} onClick={() => setActivePocket('items')}>ITEMS</div>
                <div className={`${styles.pocketTab} ${activePocket === 'balls' ? styles.active : ''}`} onClick={() => setActivePocket('balls')}>BALLS</div>
                <div className={`${styles.pocketTab} ${activePocket === 'key' ? styles.active : ''}`} onClick={() => setActivePocket('key')}>KEY</div>
            </div>

            {/* 2. 道具網格 (佔滿中間) */}
            <div className={styles.bagGrid}>
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        className={styles.bagSlot}
                    >
                        <img 
                            src={getBagIconUrl(item.apiName)} 
                            alt={item.name}
                            className={styles.bagItemIcon}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png'; }}
                        />
                        <div className={styles.bagItemCount}>x{item.count}</div>
                    </div>
                ))}
                {/* 填充一些空格讓 Grid 看起來不那麼空 (選用) */}
                    {Array.from({ length: Math.max(0, 12 - filteredItems.length) }).map((_, idx) => (
                    <div key={`empty-${idx}`} style={{ opacity: 0.1, border: '2px dashed #000', borderRadius: 4 }}></div>
                ))}
            </div>
        </div>
    );
};
