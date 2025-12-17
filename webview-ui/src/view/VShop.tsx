import { useState, useEffect } from 'react';
import styles from './VShop.module.css';
import { vscode } from '../utilities/vscode';
import { SHOP_ITEM_FULL_MEDICINE_NAMES, SHOP_ITEMS_BALL_NAMES, SHOP_ITEMS_HP_MEDICINE_NAMES, SHOP_ITEMS_PP_MEDICINE_NAMES } from '../utilities/ItemName';
import { useMessageSubscription, messageStore } from '../store/messageStore';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { MenuSideBar } from '../frame/SideBar';
import { ItemDao, PokeApiItem, adaptPokeApiItem } from '../../../src/dataAccessObj/item';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { EmeraldTabPanel } from '../frame/EmeraldTabPanel';

// Status items 'revive', 'antidote', 'paralyze-heal', 'burn-heal', 'ice-heal', 'sleep-heal', 'awakening', 'full-heal'
// Default shop item list (can be extended)

const SHOP_ITEMS_MEDICINE_NAMES = [
    ...SHOP_ITEMS_HP_MEDICINE_NAMES,
    ...SHOP_ITEMS_PP_MEDICINE_NAMES,
    ...SHOP_ITEM_FULL_MEDICINE_NAMES,
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
    // Use lazy initialization to initialize state
    const [money, setMoney] = useState<number>(() => messageStore.getRefs().userInfo?.money ?? 0);
    const [bagItems, setBagItems] = useState<ItemDao[]>(() => messageStore.getRefs().bag ?? []);
    const [shopItems, setShopItems] = useState<ItemDao[]>([]);
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [selectedItem, setSelectedItem] = useState<ItemDao | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const [actionTab, setActionTab] = useState<'medicine' | 'ball'>('medicine');

    // 初始化：載入商店商品
    useEffect(() => {
        // 載入商店商品 (這裡模擬從 API 抓取並轉換)
        const loadShopItems = async () => {
            const items: ItemDao[] = [];
            for (const name of [...SHOP_ITEMS_MEDICINE_NAMES, ...SHOP_ITEMS_BALL_NAMES]) {
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
    }, []);

    // 訂閱訊息（只有在初始化完成後才會收到通知）
    useMessageSubscription<UserDao>(MessageType.UserData, (message) => {
        setMoney(message.data?.money ?? 0);
    });

    useMessageSubscription<ItemDao[]>(MessageType.BagData, (message) => {
        setBagItems(message.data ?? []);
    });

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
                if (selectedItem && newQty <= selectedItem.totalSize) {
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
                    command: MessageType.UpdateMoney, 
                    amount: -totalPrice 
                });
                // 2. 加道具
                vscode.postMessage({ 
                    command: MessageType.AddItem, 
                    item: selectedItem,
                    count: quantity 
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
                command: MessageType.UpdateMoney, 
                amount: totalPrice 
            });
            // 2. 扣道具
            vscode.postMessage({ 
                command: MessageType.RemoveItem, 
                item: selectedItem,
                count: quantity 
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
        <div className={styles.emeraldContainer}>
            {/* Sidebar */}
            <MenuSideBar barItems={[
                {
                    activeTab: 'buy',
                    onActive: () => setMode('buy'),
                    Icons: <IconBuy />
                },
                {
                    activeTab: 'sell',
                    onActive: () => setMode('sell'),
                    Icons: <IconSell />
                }
            ]}/>
            {/* Main Content */}
            <div className={styles.scrollArea}>
                <EmeraldTabPanel 
                    tabs={[
                        {
                            label: 'Medicine',
                            onClick: () => setActionTab('medicine'),
                            isActive: actionTab === 'medicine'
                        },
                        {
                            label: 'Balls',
                            onClick: () => setActionTab('ball'),
                            isActive: actionTab === 'ball'
                        }
                    ]}
                    actions={[
                        {
                            label: `$${money}`,
                            onClick: () => {}
                        }
                    ]}            
                    >
                    <div className={styles.itemGrid}>
                        {displayItems
                            .filter(item => 
                                actionTab === 'medicine' ? item.pocket === 'medicine' : item.pocket === 'balls'
                            )
                            .map(item => (
                                <div 
                                    key={item.id} 
                                    className={styles.itemCard}
                                    onClick={() => handleItemClick(item)}
                                    title={item.name}
                                >
                                    {mode === 'sell' && <div className={styles.itemCount}>{item.totalSize}</div>}
                                    <img src={item.spriteUrl} alt={item.name} className={styles.itemIcon} />
                                    <div className={styles.itemInfo}>
                                        <div className={styles.itemName}>{item.name}</div>
                                        <div className={styles.itemPrice}>
                                            ${mode === 'buy' ? item.price : item.sellPrice}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                        {displayItems.filter(item => 
                                actionTab === 'medicine' ? item.pocket === 'medicine' : item.pocket === 'balls'
                            ).length === 0 && (
                            <div style={{ padding: 20, textAlign: 'center', color: '#7f8c8d', width: '100%', gridColumn: '1 / -1' }}>
                                {mode === 'buy' ? 'Loading Shop...' : 'Your Bag is Empty'}
                            </div>
                        )}
                    </div>
                </EmeraldTabPanel>
            </div>

            {/* Transaction Dialog */}
            {isDialogOpen && selectedItem && (
                <div className={styles.dialogOverlay} onClick={() => setIsDialogOpen(false)}>
                    <div className={styles.dialogBox} onClick={e => e.stopPropagation()}>
                        <div className={styles.dialogHeader}>
                            <img src={selectedItem.spriteUrl} alt={selectedItem.name} className={styles.dialogIcon} />
                            <div className={styles.headerInfo}>
                                <div className={styles.headerTopRow}>
                                    <div className={styles.itemNameLarge}>{selectedItem.name}</div>
                                    <span className={styles.unitPrice}>
                                        ${quantity * (mode === 'buy' ? selectedItem.price : selectedItem.sellPrice)}
                                    </span>
                                </div>
                                <div className={styles.headerBottomRow}>
                                    <span className={styles.dialogType}>{mode === 'buy' ? 'BUY' : 'SELL'}</span>
                                    <div className={styles.quantityControl}>
                                        <button 
                                            className={styles.qtyBtn} 
                                            onClick={() => handleQuantityChange(-1)}
                                            disabled={quantity <= 1}
                                        >−</button>
                                        <div className={styles.qtyDisplay}>
                                            <span className={styles.qtyValue}>{quantity}</span>
                                        </div>
                                        <button 
                                            className={styles.qtyBtn} 
                                            onClick={() => handleQuantityChange(1)}
                                            disabled={mode === 'buy' ? (quantity * selectedItem.price > money) : (quantity >= selectedItem.totalSize)}
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.actionButtons}>
                            <button className={styles.cancelBtn} onClick={() => setIsDialogOpen(false)}>CANCEL</button>
                            <button 
                                className={styles.confirmBtn} 
                                onClick={handleConfirm}
                                disabled={mode === 'buy' && money < (selectedItem.price * quantity)}
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
