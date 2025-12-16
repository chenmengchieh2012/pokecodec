import React, { useCallback, useImperativeHandle, useState } from 'react';
import { PartyGridInModal } from '../model/PartyGridInModal';
import { PokemonMoveModal } from '../model/PokemonMoveModal';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { SHOP_ITEM_FULL_MEDICINE_NAMES, SHOP_ITEMS_HP_MEDICINE_NAMES, SHOP_ITEMS_PP_MEDICINE_NAMES } from '../utilities/ItemName';
import { vscode, resolveAssetUrl } from '../utilities/vscode';
import styles from './VBagBox.module.css';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { EmeraldTabPanel } from './EmeraldTabPanel';

export const VBagBox: React.FC = () => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultBagItems = messageStore.getRefs().bag || [];
    const [activePocket, setActivePocket] = useState<'medicine' | 'balls' >('balls');
    const [items, setItems] = useState<ItemDao[]>(defaultBagItems);

    const ItemUseModalRef = React.useRef<ItemUserModalHandler>(null);

    useMessageSubscription<ItemDao[]>(MessageType.BagData, (message) => {
        setItems(message.data ?? []);
    });

    const filteredItems = items.filter(item => item.pocket === activePocket);

    const getBagIconUrl = (apiName: string) => {
        return resolveAssetUrl(`./sprites/items/${apiName}.png`);
    };

    const handleSlotClick = (item: ItemDao) => {
        if (ItemUseModalRef.current) {
            if (item.pocket === 'medicine') {
                ItemUseModalRef.current.setSelectedItem(item);
            } else {
                ItemUseModalRef.current.setSelectedItem(null); // 取消使用模式
            }
        }
    }
    

    return (
        <EmeraldTabPanel
            tabs={[
                {
                    label: 'MEDICINE',
                    onClick: () => setActivePocket('medicine'),
                    isActive: activePocket === 'medicine'
                },
                {
                    label: 'BALLS',
                    onClick: () => setActivePocket('balls'),
                    isActive: activePocket === 'balls'
                }
            ]}
        >
            {/* 2. 道具網格 */}
            <div className={styles.bagGrid}>
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        className={`${styles.bagSlot}`}
                        onClick={() => handleSlotClick(item)}
                    >
                        <img 
                            src={getBagIconUrl(item.apiName)} 
                            alt={item.name}
                            className={styles.bagItemIcon}
                            onError={(e) => { (e.target as HTMLImageElement).src = resolveAssetUrl('./sprites/items/potion.png'); }}
                        />
                        <div className={styles.bagItemCount}>x{item.totalSize}</div>
                    </div>
                ))}
            </div>

            {/* 4. 道具使用彈窗 (Modal) */}
            <ItemUseModal ref={ItemUseModalRef}/>
        </EmeraldTabPanel>
    );
};

interface ItemUserModalHandler {
    setSelectedItem: (item: ItemDao | null) => void;
}

interface ItemUseModalProps {
    onClose?: () => void;
}


const MedicineExtendType = { 
    None: "none",
    PP: "pp",
    HP: "hp"
} as const;
type MedicineType = typeof MedicineExtendType[keyof typeof MedicineExtendType];

const ExtendModelType = {
    SelectPokemon: "select_pokemon",
    SelectMove: "select_move",
} as const

type ExtendModelType = typeof ExtendModelType[keyof typeof ExtendModelType];

const ItemUseModalFlow = {
    [MedicineExtendType.None]: [],
    [MedicineExtendType.HP]: [],
    [MedicineExtendType.PP]: [ExtendModelType.SelectMove],
}


const ItemUseModal = React.forwardRef<ItemUserModalHandler, ItemUseModalProps>((_props, ref) => {
    
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultParty = messageStore.getRefs().party || [];
    
    const [ medicineType, setMedicineType] = useState<MedicineType>(MedicineExtendType.None);
    const [ modelShow, setModelShow ] = useState<ExtendModelType>(ExtendModelType.SelectPokemon);
    
    const [ selectedItem, setSelectedItem ] = useState<ItemDao | null>(null);
    const [ selectedPokemon, setSelectedPokemon] = useState<PokemonDao | null>(null);
    const [ party, setParty ] = useState<PokemonDao[]>(defaultParty);


    useImperativeHandle(ref, () => ({
        setSelectedItem(item: ItemDao | null) {
            if (item === null) {
                setSelectedItem(null);
                setMedicineType(MedicineExtendType.None);
                return;
            } else if(item.pocket === 'medicine') {
                if(
                    SHOP_ITEMS_HP_MEDICINE_NAMES.includes(item.apiName) ||
                    SHOP_ITEM_FULL_MEDICINE_NAMES.includes(item.apiName)
                ){
                    setMedicineType(MedicineExtendType.HP);
                }

                if(SHOP_ITEMS_PP_MEDICINE_NAMES.includes(item.apiName)){
                    setMedicineType(MedicineExtendType.PP);
                }
                setModelShow(ExtendModelType.SelectPokemon);
                setSelectedItem(item);
            } else {
                setSelectedItem(null); // 取消使用模式
            }
        }
    }));

    const usingMedicine = useCallback((pokemonUid: string, moveId?: number) => {
        if (!selectedItem) return;
        vscode.postMessage({ 
            command: MessageType.UseMedicineInBag, 
            item: selectedItem,
            pokemonUid: pokemonUid,
            moveId: moveId
        });
    }, [selectedItem]);

    const handlePokemonSelect = useCallback((pokemonUid: string) => {
        if (!selectedItem) return;
        
        const pokemon = party.find(p => p.uid === pokemonUid);
        if (!pokemon) return;

        const extendId = ItemUseModalFlow[medicineType][0];

        if (!extendId) {
            usingMedicine(pokemonUid);
            setSelectedItem(null);
            return;
        }

        if (extendId === ExtendModelType.SelectMove) {
            setSelectedPokemon(pokemon);
            setModelShow(ExtendModelType.SelectMove);
            return;
        }


    },[selectedItem, party, medicineType, usingMedicine]);

    const handleMoveSelect = (pokemon: PokemonDao, moveId: number) => {
        if (!selectedItem) return;
        const pokemonUsingItem = party.find(p => p.uid === pokemon.uid);

        if (!pokemonUsingItem) return;

        usingMedicine(pokemon.uid, moveId);
        setSelectedItem(null);
    };


    useMessageSubscription<PokemonDao[]>(MessageType.PartyData, (message) => {
        setParty(message.data ?? []);
    });


    return <>
    {selectedItem && <div className={styles.modalOverlay} onClick={() => { setSelectedItem(null); }}>
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                    {`USE: ${selectedItem?.name}`}
                </div>
                <button className={styles.closeBtn} onClick={() => { setSelectedItem(null); }}>×</button>
            </div>
            <div className={styles.modalBody}>
                {modelShow === ExtendModelType.SelectPokemon && 
                <PartyGridInModal 
                    party={party} 
                    onPokemonClick={(pokemon) => handlePokemonSelect(pokemon.uid)} />
                }
                {modelShow === ExtendModelType.SelectMove && 
                <PokemonMoveModal 
                    selectedPokemon={selectedPokemon} 
                    onMoveSelect={( pokemon,move) => handleMoveSelect(pokemon, move)} />
                }
            </div>
        </div>
    </div>
    }
    </>
})