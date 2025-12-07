import React, { useState, useEffect } from 'react';
import styles from './VShop.module.css';
import { vscode } from '../utilities/vscode';
import { ItemDao, adaptPokeApiItem, PokeApiItem } from '../dataAccessObj/item';

// 預設商店販售的商品列表 (可以擴充)
const SHOP_ITEMS_API_NAMES = [
    'poke-ball', 'great-ball', 'ultra-ball',
    'potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore',
    'revive', 'antidote', 'paralyze-heal', 'burn-heal', 'ice-heal', 'awakening', 'full-heal'
];

const IconBuy = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg}>
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
);

const IconSell = () => (
    <svg viewBox="0 0 24 24" className={styles.tabSvg}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.15-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.33 0 2.3-.6 2.3-1.64 0-.96-.55-1.78-4.51-2.65-3.09-.71-4.12-2.13-4.12-3.82 0-1.85 1.28-3.35 3.11-3.75V3h2.67v1.9c1.81.42 2.97 1.64 3.11 3.23h-1.96c-.11-1.01-1.14-1.55-2.37-1.55-1.39 0-2.18.77-2.18 1.69 0 .95.57 1.58 4.43 2.52 3.13.76 4.36 2.06 4.36 3.98 0 1.84-1.11 3.44-3.39 3.92z"/>
    </svg>
);

export const VShop = () => {
    const [money, setMoney] = useState<number>(0);
    const [bagItems, setBagItems] = useState<ItemDao[]>([]);
    const [shopItems, setShopItems] = useState<ItemDao[]>([]);
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [selectedItem, setSelectedItem] = useState<ItemDao | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    // 初始化：載入使用者金錢、背包、商店商品
    useEffect(() => {
        // 1. 請求使用者資訊 (金錢)
        vscode.postMessage({ command: 'getUserInfo' });
        // 2. 請求背包資訊
        vscode.postMessage({ command: 'getBag' });

        // 3. 載入商店商品 (這裡模擬從 API 抓取並轉換)
        const loadShopItems = async () => {
            const items: ItemDao[] = [];
            for (const name of SHOP_ITEMS_API_NAMES) {
                try {
                    const response = await fetch(`https://pokeapi.co/api/v2/item/${name}`);
                    const data: PokeApiItem = await response.json();
                    items.push(adaptPokeApiItem(data));
                } catch (error) {
                    console.error(`Failed to load item ${name}`, error);
                }
            }
            setShopItems(items);
        };
        loadShopItems();

        // 監聽 Extension 回傳的訊息
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'userData': // Changed from 'userInfo' to 'userData' to match extension
                    setMoney(message.data.money);
                    break;
                case 'bagData':
                    setBagItems(message.data);
                    break;
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleItemClick = (item: ItemDao) => {
        setSelectedItem(item);
        setQuantity(1);
        setIsDialogOpen(true);
    };

    const handleQuantityChange = (delta: number) => {
        const newQty = quantity + delta;
        if (newQty >= 1) {
            // 檢查購買上限 (金錢) 或 販賣上限 (持有數)
            if (mode === 'buy') {
                if (selectedItem && newQty * selectedItem.price <= money) {
                    setQuantity(newQty);
                }
            } else {
                if (selectedItem && newQty <= selectedItem.count) {
                    setQuantity(newQty);
                }
            }
        }
    };

    const handleConfirm = () => {
        if (!selectedItem) return;

        const totalPrice = mode === 'buy' ? selectedItem.price * quantity : selectedItem.sellPrice * quantity;

        if (mode === 'buy') {
            if (money >= totalPrice) {
                // 1. 扣錢
                vscode.postMessage({ 
                    command: 'updateMoney', 
                    amount: -totalPrice 
                });
                // 2. 加道具
                vscode.postMessage({ 
                    command: 'addItem', 
                    item: { ...selectedItem, count: quantity } 
                });
                // 更新本地顯示 (雖然 extension 會回傳，但為了即時性先扣)
                setMoney(prev => prev - totalPrice);
            } else {
                alert("Not enough money!");
            }
        } else {
            // 賣出
            // 1. 加錢
            vscode.postMessage({ 
                command: 'updateMoney', 
                amount: totalPrice 
            });
            // 2. 扣道具
            vscode.postMessage({ 
                command: 'removeItem', 
                item: { ...selectedItem, count: quantity } 
            });
             // 更新本地顯示
             setMoney(prev => prev + totalPrice);
        }

        setIsDialogOpen(false);
        setSelectedItem(null);
    };

    // 根據模式決定顯示列表
    const displayItems = mode === 'buy' ? shopItems : bagItems;

    return (
        <div className={styles.shopContainer}>
            {/* Sidebar */}
            <div className={styles.sideBar}>
                <div className={styles.tabs}>
                    <div 
                        className={`${styles.iconTab} ${mode === 'buy' ? styles.active : ''}`}
                        onClick={() => setMode('buy')}
                        title="Buy"
                    >
                        <IconBuy />
                    </div>
                    <div 
                        className={`${styles.iconTab} ${mode === 'sell' ? styles.active : ''}`}
                        onClick={() => setMode('sell')}
                        title="Sell"
                    >
                        <IconSell />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.contentWrapper}>
                <div className={styles.moneyDisplay}>
                    <span>$</span>
                    <span>{money}</span>
                </div>

                <div className={styles.contentArea}>
                    {displayItems.map(item => (
                        <div 
                            key={item.id} 
                            className={styles.itemCard}
                            onClick={() => handleItemClick(item)}
                        >
                            {mode === 'sell' && <div className={styles.itemCount}>{item.count}</div>}
                            <img src={item.spriteUrl} alt={item.name} className={styles.itemIcon} />
                            <div className={styles.itemName}>{item.name}</div>
                            <div className={styles.itemPrice}>
                                ${mode === 'buy' ? item.price : item.sellPrice}
                            </div>
                        </div>
                    ))}
                    {displayItems.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#7f8c8d', width: '100%' }}>
                            {mode === 'buy' ? 'Loading Shop...' : 'Your Bag is Empty'}
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction Dialog */}
            {isDialogOpen && selectedItem && (
                <div className={styles.dialogOverlay} onClick={() => setIsDialogOpen(false)}>
                    <div className={styles.dialogBox} onClick={e => e.stopPropagation()}>
                        <div className={styles.dialogTitle}>
                            {mode === 'buy' ? 'Buy' : 'Sell'} {selectedItem.name}
                        </div>
                        
                        <div className={styles.dialogInfo}>
                            <img src={selectedItem.spriteUrl} alt={selectedItem.name} width={40} />
                            <div>
                                <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>Price per unit</div>
                                <div style={{ fontWeight: 'bold' }}>${mode === 'buy' ? selectedItem.price : selectedItem.sellPrice}</div>
                            </div>
                        </div>

                        <div className={styles.quantityControl}>
                            <button 
                                className={styles.qtyBtn} 
                                onClick={() => handleQuantityChange(-1)}
                                disabled={quantity <= 1}
                            >-</button>
                            <div className={styles.qtyInput}>{quantity}</div>
                            <button 
                                className={styles.qtyBtn} 
                                onClick={() => handleQuantityChange(1)}
                                disabled={mode === 'buy' ? (quantity * selectedItem.price > money) : (quantity >= selectedItem.count)}
                            >+</button>
                        </div>

                        <div className={styles.totalPrice}>
                            Total: ${quantity * (mode === 'buy' ? selectedItem.price : selectedItem.sellPrice)}
                        </div>

                        <div className={styles.actionButtons}>
                            <button className={styles.cancelBtn} onClick={() => setIsDialogOpen(false)}>Cancel</button>
                            <button 
                                className={styles.confirmBtn} 
                                onClick={handleConfirm}
                                disabled={mode === 'buy' && money < (selectedItem.price * quantity)}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
