import React, { useState, useEffect } from 'react';
import styles from './VBagBox.module.css';
import { ItemDao } from '../dataAccessObj/item';
import { PokemonDao } from '../dataAccessObj/pokemon';
import { vscode } from '../utilities/vscode';
import { PartyGridInModal } from '../model/PartyGridInModal';

export const VBagBox: React.FC = () => {
    const [activePocket, setActivePocket] = useState<'medicine' | 'balls' >('balls');
    const [items, setItems] = useState<ItemDao[]>([]);
    const [party, setParty] = useState<PokemonDao[]>([]);
    
    // selectedItem: 當前準備使用的道具 (觸發使用模式)
    // previewItem: 當前游標懸停/點擊查看說明的道具
    const [selectedItem, setSelectedItem] = useState<ItemDao | null>(null);
    const [previewItem, setPreviewItem] = useState<ItemDao | null>(null);

    useEffect(() => {
        vscode.postMessage({ command: 'getBag' });
        vscode.postMessage({ command: 'getParty' });
        
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'bagData') {
                setItems(message.data);
            } else if (message.type === 'partyData') {
                setParty(message.data);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const filteredItems = items.filter(item => item.pocket === activePocket);

    const getBagIconUrl = (apiName: string) => {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${apiName}.png`;
    };

    // 點擊處理：
    // 1. 如果是藥品 -> 進入選擇模式 (selectedItem)
    // 2. 如果是其他 -> 僅預覽資訊 (previewItem)
    const handleSlotClick = (item: ItemDao) => {
        if (item.pocket === 'medicine') {
            setSelectedItem(item);
            setPreviewItem(item); 
        } else {
            setSelectedItem(null); // 取消使用模式
            setPreviewItem(item);  // 顯示說明
        }
    };

    const handleUseItem = (pokemonUid: string) => {
        if (!selectedItem) return;
        vscode.postMessage({ 
            command: 'useItemInBag', 
            item: selectedItem,
            pokemonUid: pokemonUid
        });
        if (selectedItem.count <= 1) {
            setSelectedItem(null);
            setPreviewItem(null);
        }
    };

    return (
        <div className={styles.bagContainer}>
            {/* 1. 分類標籤 */}
            <div className={styles.pocketNav}>
                <div 
                    className={`${styles.pocketTab} ${activePocket === 'medicine' ? styles.active : ''}`} 
                    onClick={() => { setActivePocket('medicine'); setSelectedItem(null); setPreviewItem(null); }}
                >
                    MEDICINE
                </div>
                <div 
                    className={`${styles.pocketTab} ${activePocket === 'balls' ? styles.active : ''}`} 
                    onClick={() => { setActivePocket('balls'); setSelectedItem(null); setPreviewItem(null); }}
                >
                    BALLS
                </div>
            </div>

            {/* 2. 道具網格 */}
            <div className={styles.bagGrid}>
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        className={`${styles.bagSlot} ${selectedItem?.id === item.id || previewItem?.id === item.id ? styles.selected : ''}`}
                        onClick={() => handleSlotClick(item)}
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
            </div>

            {/* 4. 道具使用彈窗 (Modal) */}
            {selectedItem && (
                <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>USE: {selectedItem.name}</div>
                            <button className={styles.closeBtn} onClick={() => setSelectedItem(null)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <PartyGridInModal 
                                party={party} 
                                onPokemonClick={(pokemon) => handleUseItem(pokemon.uid)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};