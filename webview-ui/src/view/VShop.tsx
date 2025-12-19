import { useState, useMemo } from 'react';
import styles from './VShop.module.css';
import { vscode } from '../utilities/vscode';
import { ItemUITag, ItemUiTagItemsMap, SHOP_ITEM_EVOLUTION_NAMES, SHOP_ITEM_FULL_MEDICINE_NAMES, SHOP_ITEMS_BALL_NAMES, SHOP_ITEMS_HP_MEDICINE_NAMES, SHOP_ITEMS_PP_MEDICINE_NAMES } from '../utilities/ItemName';
import { useMessageSubscription, messageStore } from '../store/messageStore';
import { UserDao } from '../../../src/dataAccessObj/userData';
import { MenuSideBar } from '../frame/SideBar';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { EmeraldTabPanel } from '../frame/EmeraldTabPanel';
import ItemDaoData from '../../../src/data/items.json';
import { CapitalizeFirstLetter } from '../utilities/util';
import { ItemRecorder } from '../manager/itemRecorder';


const ItemDaoMap = ItemDaoData as unknown as Record<string, ItemDao>;

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
        <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
    </svg>
);

export const VShop = () => {
    // Use lazy initialization to initialize state
    const [money, setMoney] = useState<number>(() => messageStore.getRefs().userInfo?.money ?? 0);
    const [bagItems, setBagItems] = useState<ItemDao[]>(() => messageStore.getRefs().bag ?? []);
    const shopItems = useMemo<ItemDao[]>(() => {
        const items: ItemDao[] = [];
        for (const name of [...SHOP_ITEMS_MEDICINE_NAMES, ...SHOP_ITEMS_BALL_NAMES, ...SHOP_ITEM_EVOLUTION_NAMES]) {
            console.log("[VShop] Looking for item:", name);
            console.log("[VShop] ItemDaoMap has item:", ItemDaoMap[name]);
            if( ItemDaoMap[name] ) {
                items.push(ItemDaoMap[name]);
            }
        }
        console.log("[VShop] Shop items loaded:", items.length);
        return items;
    },[]);
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [selectedItem, setSelectedItem] = useState<ItemDao | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const [actionTab, setActionTab] = useState<ItemUITag>(ItemUITag.Medicine);


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

                ItemRecorder().onItemAction('buy', selectedItem, quantity, false);
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
                            label: ItemUITag.Medicine,
                            onClick: () => setActionTab(ItemUITag.Medicine),
                            isActive: actionTab === ItemUITag.Medicine
                        },
                        {
                            label: ItemUITag.Balls,
                            onClick: () => setActionTab(ItemUITag.Balls),
                            isActive: actionTab === ItemUITag.Balls
                        },
                        {
                            label: ItemUITag.Evolution,
                            onClick: () => setActionTab(ItemUITag.Evolution),
                            isActive: actionTab === ItemUITag.Evolution
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
                                ItemUiTagItemsMap[actionTab].includes(item.apiName)
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
                                        <div className={styles.itemName}>{CapitalizeFirstLetter(item.name)}</div>
                                        <div className={styles.itemPrice}>
                                            ${mode === 'buy' ? item.price : item.sellPrice}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                        {displayItems.filter(item => 
                                ItemUiTagItemsMap[actionTab].includes(item.apiName)
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
                            <div className={styles.headerTopRow}>
                                <div className={styles.itemNameLarge}>{CapitalizeFirstLetter(selectedItem.name)}</div>
                                <button className={styles.closeBtn} onClick={() => setIsDialogOpen(false)}>×</button>
                            </div>
                            <div className={styles.headerContent}>
                                <img src={selectedItem.spriteUrl} alt={selectedItem.name} className={styles.dialogIcon} />
                                <div className={styles.headerInfo}>
                                    <div className={styles.priceRow}>
                                        <span className={`${styles.dialogType} ${mode === 'buy' ? styles.typeBuy : styles.typeSell}`}>
                                            {mode === 'buy' ? 'BUY' : 'SELL'}
                                        </span>
                                        <span className={styles.unitPrice}>
                                            ${quantity * (mode === 'buy' ? selectedItem.price : selectedItem.sellPrice)}
                                        </span>
                                    </div>
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
