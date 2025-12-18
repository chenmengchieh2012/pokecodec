import React, { useCallback, useImperativeHandle, useState } from 'react';
import { PartyGridInModal } from '../model/PartyGridInModal';
import { PokemonMoveModal } from '../model/PokemonMoveModal';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { ItemUITag, ItemUiTagItemsMap, SHOP_ITEM_EVOLUTION_NAMES, SHOP_ITEM_FULL_MEDICINE_NAMES, SHOP_ITEMS_HP_MEDICINE_NAMES, SHOP_ITEMS_PP_MEDICINE_NAMES } from '../utilities/ItemName';
import { vscode, resolveAssetUrl } from '../utilities/vscode';
import styles from './VBagBox.module.css';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { EvolutionTrigger, PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { EmeraldTabPanel } from './EmeraldTabPanel';
import itemDaoData from '../../../src/data/items.json';
import { EvolutionModal } from '../model/EvolutionModal';


const itemDaoDataMap = itemDaoData as unknown as Record<string, ItemDao>;


export const VBagBox: React.FC = () => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultBagItems = messageStore.getRefs().bag || [];
    const [activeTag, setActiveTag] = useState<ItemUITag>(ItemUITag.Medicine);
    const [items, setItems] = useState<ItemDao[]>(defaultBagItems);

    const ItemUseModalRef = React.useRef<ItemUserModalHandler>(null);

    useMessageSubscription<ItemDao[]>(MessageType.BagData, (message) => {
        setItems(message.data ?? []);
    });

    const filteredItems = items.filter(item => ItemUiTagItemsMap[activeTag].includes(item.apiName));

    const getBagIconUrl = (apiName: string) => {
        return resolveAssetUrl(`./sprites/items/${apiName}.png`);
    };

    const handleSlotClick = (item: ItemDao) => {
        if (ItemUseModalRef.current) {
            if (item.pocket === 'medicine') {
                ItemUseModalRef.current.setSelectedItem(item);
            } else if(item.pocket === 'items') {
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
                    label: ItemUITag.Medicine,
                    onClick: () => setActiveTag(ItemUITag.Medicine),
                    isActive: activeTag === ItemUITag.Medicine
                },
                {
                    label: ItemUITag.Balls,
                    onClick: () => setActiveTag(ItemUITag.Balls),
                    isActive: activeTag === ItemUITag.Balls
                },
                {
                    label: ItemUITag.Evolution,
                    onClick: () => setActiveTag(ItemUITag.Evolution),
                    isActive: activeTag === ItemUITag.Evolution
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
    HP: "hp",
    Evolution: "evolution"
} as const;
type MedicineType = typeof MedicineExtendType[keyof typeof MedicineExtendType];

const ExtendModalType = {
    SelectPokemon: "select_pokemon",
    SelectMove: "select_move",
    SelectEvolution: "select_evolution"
} as const

type ExtendModalType = typeof ExtendModalType[keyof typeof ExtendModalType];

const ItemUseModalFlow = {
    [MedicineExtendType.None]: [],
    [MedicineExtendType.HP]: [],
    [MedicineExtendType.PP]: [ExtendModalType.SelectMove],
    [MedicineExtendType.Evolution]: [ExtendModalType.SelectEvolution],
}


const ItemUseModal = React.forwardRef<ItemUserModalHandler, ItemUseModalProps>((_props, ref) => {
    
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultParty = messageStore.getRefs().party || [];
    
    const [ medicineType, setMedicineType] = useState<MedicineType>(MedicineExtendType.None);
    const [ modalShow, setModalShow ] = useState<ExtendModalType>(ExtendModalType.SelectPokemon);
    
    const [ selectedItem, setSelectedItem ] = useState<ItemDao | null>(null);
    const [ selectedPokemon, setSelectedPokemon] = useState<PokemonDao | null>(null);
    const [ disabledPartyUids, setDisabledPartyUids ] = useState<string[]>([]);
    const [ party, setParty ] = useState<PokemonDao[]>(defaultParty);


    // Removed useEffect that synchronously sets state when selectedItem changes

    useImperativeHandle(ref, () => ({
        setSelectedItem(item: ItemDao | null) {
            if (item === null) {
                setSelectedItem(null);
                setMedicineType(MedicineExtendType.None);
                setModalShow(ExtendModalType.SelectPokemon);
                setDisabledPartyUids([]);
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

                setModalShow(ExtendModalType.SelectPokemon);
                setSelectedItem(item);
            } else if(item.pocket === 'items'){
                if(SHOP_ITEM_EVOLUTION_NAMES.includes(item.apiName)){
                    setMedicineType(MedicineExtendType.Evolution);
                    setDisabledPartyUids(party.filter(p=>{
                        const rawItemInfo = itemDaoDataMap[item.apiName];
                        if( rawItemInfo.effect?.evolutionCriteria !== undefined ) {
                            const criteria = rawItemInfo.effect.evolutionCriteria;
                            // 檢查是否能進化
                            console.log("[VBagBox] Checking evolution for:", p.name, "with criteria:", criteria);
                            if( criteria.targetPokemon?.includes(p.name) ) {
                                return false; // 可進化，啟用
                            } else {
                                return true; // 無法進化，禁用
                            }
                        } else {
                            return true; // 無法進化，禁用
                        }
                    }).map(p=>p.uid));
                    setModalShow(ExtendModalType.SelectPokemon);
                    setSelectedItem(item);
                }
            } else {
                setSelectedItem(null); // 取消使用模式
                setMedicineType(MedicineExtendType.None);
                setModalShow(ExtendModalType.SelectPokemon);
                setDisabledPartyUids([]);
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

        if (extendId === ExtendModalType.SelectMove) {
            setSelectedPokemon(pokemon);
            setModalShow(ExtendModalType.SelectMove);
            return;
        }


        if (extendId === ExtendModalType.SelectEvolution) {
            const rawItemInfo = itemDaoDataMap[selectedItem.apiName];
            if( rawItemInfo.effect?.evolutionCriteria !== undefined ) {
                const criteria = rawItemInfo.effect.evolutionCriteria;
                // 檢查是否能進化
                console.log("[VBagBox] Proceeding to evolution for:", pokemon.name);
                if( criteria.targetPokemon?.includes(pokemon.name) ) {
                    setSelectedPokemon(pokemon);
                    setModalShow(ExtendModalType.SelectEvolution);
                    return;
                } else {
                    // 無法進化
                    setSelectedItem(null);
                    return;
                }
            } else {
                // 無法進化
                setSelectedItem(null);
                return;
            }
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
                {modalShow === ExtendModalType.SelectPokemon && 
                <PartyGridInModal 
                    party={party} 
                    disabledPartyUids={disabledPartyUids}
                    onPokemonClick={(pokemon) => handlePokemonSelect(pokemon.uid)} />
                }
                {modalShow === ExtendModalType.SelectMove && 
                <PokemonMoveModal 
                    selectedPokemon={selectedPokemon} 
                    onMoveSelect={( pokemon,move) => handleMoveSelect(pokemon, move)} />
                }
                {modalShow === ExtendModalType.SelectEvolution && selectedPokemon &&
                <EvolutionModal 
                    trigger={EvolutionTrigger.UseItem}
                    item={selectedItem}
                    pokemon={selectedPokemon}
                    onClose={()=>{ setSelectedItem(null)}}
                />
                }
            </div>
        </div>
    </div>
    }
    </>
})