import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import styles from "./BattleControl.module.css";
import { DialogBox, type DialogBoxHandle } from "./DialogBox";
import { PartyGridInModal } from "../model/PartyGridInModal";
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { ItemDao } from '../../../src/dataAccessObj/item';
import { PokeBallDao } from '../../../src/dataAccessObj/pokeBall';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonTypeIcon } from '../utilities/pokemonTypeIcon';
import { CapitalizeFirstLetter } from '../utilities/util';
import { SHOP_ITEMS_BALL_NAMES, SHOP_ITEMS_HP_MEDICINE_NAMES, SHOP_ITEMS_PP_MEDICINE_NAMES, SHOP_ITEMS_REVIVE_NAMES, SHOP_ITEMS_STATUS_MEDICINE_NAMES, SHOP_ITEM_FULL_MEDICINE_NAMES } from '../utilities/ItemName';
import { BattleMode } from '../../../src/dataAccessObj/gameStateData';
export interface BattleControlHandle extends DialogBoxHandle {
    openPartyMenu: () => void;
}

interface BattleControlProps {
    mutex: boolean;
    battleMode?: BattleMode;
    myPokemon?: PokemonDao;
    myParty: PokemonDao[];
    handleOnAttack: (move: PokemonMove) => void;
    handleThrowBall: (ball: PokeBallDao) => void;
    handleUseItem: (pokemon: PokemonDao, item: ItemDao, targetMove?: PokemonMove) => void;
    handleRunAway: () => void;
    handleSwitchMyPokemon: (pokemon: PokemonDao) => void;
}

export const BattleControl = forwardRef<BattleControlHandle, BattleControlProps>(({
    mutex,
    battleMode,
    myPokemon,
    myParty,
    handleOnAttack,
    handleThrowBall,
    handleUseItem,
    handleRunAway,
    handleSwitchMyPokemon,
}, ref) => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultBagItems = messageStore.getRefs().bag || [];
    const [menuState, setMenuState] = useState<'main' | 'moves' | 'party' | 'bag'>('main');
    const [bagItems, setBagItems] = useState<ItemDao[]>(defaultBagItems);
    const [selectedItem, setSelectedItem] = useState<ItemDao | null>(null);
    const selectedPokemonRef = useRef<PokemonDao | null>(null);
    const dialogBoxRef = useRef<DialogBoxHandle>(null);
    const disabledPartyUids = useMemo<string[]>(() => {
        let newDisabledPartyUids: string[] = [];
        if (menuState === 'party') {
            if (selectedItem !== undefined && selectedItem !== null) {
                if (
                    SHOP_ITEMS_HP_MEDICINE_NAMES.includes(selectedItem.apiName) ||
                    SHOP_ITEMS_STATUS_MEDICINE_NAMES.includes(selectedItem.apiName) ||
                    SHOP_ITEM_FULL_MEDICINE_NAMES.includes(selectedItem.apiName)
                ) {
                    newDisabledPartyUids = myParty.filter(p => p.ailment === 'fainted').map(p => p.uid);
                } else if (SHOP_ITEMS_PP_MEDICINE_NAMES.includes(selectedItem.apiName)) {
                    newDisabledPartyUids = myParty.filter(p => p.ailment === 'fainted').map(p => p.uid);
                } else if (SHOP_ITEMS_REVIVE_NAMES.includes(selectedItem.apiName)) {
                    newDisabledPartyUids = myParty.filter(p => p.currentHp > 0).map(p => p.uid);
                }
            } else {
                newDisabledPartyUids = myParty.filter(p => p.ailment === 'fainted').map(p => p.uid);
            }
        }
        return newDisabledPartyUids;
    }, [menuState, myParty, selectedItem]);

    // 訂閱背包資料訊息
    useMessageSubscription<ItemDao[]>(MessageType.BagData, (message) => {
        setBagItems(message.data ?? []);
    });

    useImperativeHandle(ref, () => ({
        setText: async (text: string) => {
            await dialogBoxRef.current?.setText(text);
        },
        openPartyMenu: () => {
            setMenuState('party');
            console.log("openPartyMenu called", myParty);
        }
    }));


    const isExpanded = menuState !== 'main';

    const onMoveClick = (move: PokemonMove) => {
        if (selectedPokemonRef.current && selectedItem) {
            // Using PP medicine on selected move
            handleUseItem(selectedPokemonRef.current, selectedItem, move);
            reset();
            return;
        } else {
            setMenuState('main');
            handleOnAttack(move);
            reset();
            return;
        }
    };

    const reset = () => {
        setMenuState('main');
        setSelectedItem(null);
        selectedPokemonRef.current = null;
        // setDisabledPartyUids([]); // Removed because disabledPartyUids is now derived via useMemo
    }

    const onPokemonClick = (pokemon: PokemonDao) => {
        if (selectedItem) {
            const effectedItems = [...SHOP_ITEMS_HP_MEDICINE_NAMES, ...SHOP_ITEMS_STATUS_MEDICINE_NAMES, ...SHOP_ITEM_FULL_MEDICINE_NAMES, ...SHOP_ITEMS_REVIVE_NAMES];
            if (effectedItems.includes(selectedItem.apiName)) {
                handleUseItem(pokemon, selectedItem);
                reset();
                return;
            }

            if (SHOP_ITEMS_PP_MEDICINE_NAMES.includes(selectedItem.apiName)) {
                setMenuState('moves');
                selectedPokemonRef.current = pokemon;
                return;
            }
        } else if (handleSwitchMyPokemon) {
            if (pokemon.currentHp <= 0) return; // 不能選擇已經昏厥的寶可夢
            handleSwitchMyPokemon(pokemon);
            reset();
        }
    };

    const onItemClick = (item: ItemDao) => {
        if (SHOP_ITEMS_BALL_NAMES.includes(item.apiName)) {
            if (battleMode === BattleMode.Trainer) {
                // Cannot throw balls in trainer battle
                console.log("Cannot throw Poké Balls in Trainer Battle");
                reset();
                return;
            }
            // Adapt ItemDao to PokeBallDao
            // Assuming catchRateMultiplier is in effect
            const catchRate = item.effect?.catchRateMultiplier || 1;
            handleThrowBall({
                ...item,
                category: item.category,
                catchRateModifier: catchRate
            });
            reset();
        } else if (SHOP_ITEMS_HP_MEDICINE_NAMES.includes(item.apiName) || SHOP_ITEMS_STATUS_MEDICINE_NAMES.includes(item.apiName) || SHOP_ITEM_FULL_MEDICINE_NAMES.includes(item.apiName)) {
            setSelectedItem(item);
            setMenuState('party')
        } else if (SHOP_ITEMS_PP_MEDICINE_NAMES.includes(item.apiName)) {
            setSelectedItem(item);
            setMenuState('party')
        } else if (SHOP_ITEMS_REVIVE_NAMES.includes(item.apiName)) {
            setSelectedItem(item);
            setMenuState('party')
        } else {
            setMenuState('main');
            // Other items not supported yet in battle
            console.log("Item not supported in battle yet:", item.apiName);
            reset();
        }
    };

    const isDisableFightButton = useMemo(() => {
        return mutex || myPokemon?.ailment === 'fainted';
    }, [mutex, myPokemon]);

    const isDisableRunButton = useMemo(() => {
        return mutex || battleMode === BattleMode.Trainer;
    }, [mutex, battleMode]);

    return (
        <div className={styles['console-area']}>
            {/* 左側面板 */}
            <div className={`${styles['dialog-box-wrapper']} ${isExpanded ? styles['wrapper-expanded'] : ''}`}>
                <div className={styles['dialog-layer']}>
                    <DialogBox ref={dialogBoxRef} />
                </div>

                {menuState === 'moves' && (
                    <div className={styles['move-select-overlay-container']}>
                        <div className={styles['move-select-overlay-content']}>
                            {myPokemon?.pokemonMoves.map((move) => (
                                <button
                                    key={"move-" + move.name}
                                    className={styles['move-btn']}
                                    onClick={() => onMoveClick(move)}
                                    disabled={move.pp <= 0}
                                >
                                    <div className={styles['move-name']}>
                                        <PokemonTypeIcon type={move.type} size={10} className={styles['move-type-icon']} />
                                        {move.name.toUpperCase()}
                                    </div>
                                    <div className={styles['move-info-row']}>
                                        <span className={styles['move-pp']}>PP {move.pp}/{move.maxPP}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {menuState === 'party' && (

                    <div className={styles['move-select-overlay-container']}>
                        <PartyGridInModal
                            party={myParty}
                            disabledPartyUids={disabledPartyUids}
                            onPokemonClick={onPokemonClick}
                        />
                    </div>
                )}

                {menuState === 'bag' && (
                    <div className={styles['move-select-overlay-container']}>
                        <div className={styles['move-select-overlay-content']} style={{ padding: 0, display: 'block', background: '#f0f0f0' }}>
                            <div className={styles['bag-container']}>
                                {/* PokeBalls Section */}
                                <div className={styles['bag-section']}>
                                    <div className={styles['bag-section-title']}>POKÉ BALLS</div>
                                    <div className={styles['bag-grid']}>
                                        {bagItems.filter(item => item.category === 'PokeBalls' || item.pocket === 'balls').map((item) => (
                                            <button
                                                key={item.id}
                                                className={styles['bag-item-btn']}
                                                onClick={() => onItemClick(item)}
                                                title={CapitalizeFirstLetter(item.name)}
                                            >
                                                {item.spriteUrl && <img src={item.spriteUrl} alt={item.name} className={styles['bag-item-icon']} />}
                                                <div className={styles['bag-item-badge']}>{item.totalSize}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Medicine Section */}
                                <div className={styles['bag-section']}>
                                    <div className={styles['bag-section-title']}>MEDICINE</div>
                                    <div className={styles['bag-grid']}>
                                        {bagItems.filter(item => item.category === 'Medicine' || item.pocket === 'medicine').map((item) => (
                                            <button
                                                key={item.id}
                                                className={styles['bag-item-btn']}
                                                onClick={() => onItemClick(item)}
                                                title={CapitalizeFirstLetter(item.name)}
                                            >
                                                {item.spriteUrl && <img src={item.spriteUrl} alt={item.name} className={styles['bag-item-icon']} />}
                                                <div className={styles['bag-item-badge']}>{item.totalSize}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {bagItems.length === 0 && (
                                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '10px', color: '#666' }}>Bag is empty</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}




            </div>

            {/* 右側面板：雙層 DIV 架構更新 */}
            <div className={`
                    ${styles['battle-menu']} 
                    ${menuState !== 'main' ? styles['battle-menu-single'] : ''}
                `}>
                {menuState !== 'main' ? (
                    <button
                        className={styles['cancel-btn-outer']}
                        onClick={() => setMenuState('main')}
                    >
                        <div className={styles['cancel-btn-inner']}>
                            CANCEL
                        </div>
                    </button>
                ) : (
                    <>
                        {/* FIGHT */}
                        <button
                            className={`${styles['menu-btn-outer']} ${isDisableFightButton ? styles['disabled'] : ''}`}
                            onClick={() => setMenuState('moves')}
                            disabled={isDisableFightButton}
                        >
                            <div className={styles['menu-btn-inner']}>
                                FIGHT
                            </div>
                        </button>

                        {/* BAG */}
                        <button
                            className={`${styles['menu-btn-outer']} ${mutex ? styles['disabled'] : ''}`}
                            onClick={() => setMenuState('bag')}
                            disabled={mutex}
                        >
                            <div className={styles['menu-btn-inner']}>
                                BAG
                            </div>
                        </button>

                        {/* POKÉMON */}
                        <button
                            className={`${styles['menu-btn-outer']} ${mutex ? styles['disabled'] : ''}`}
                            onClick={() => setMenuState('party')}
                            disabled={mutex}
                        >
                            <div className={styles['menu-btn-inner']}>
                                POKÉMON
                            </div>
                        </button>

                        {/* RUN */}
                        <button
                            className={`${styles['menu-btn-outer']} ${isDisableRunButton ? styles['disabled'] : ''}`}
                            onClick={handleRunAway}
                            disabled={isDisableRunButton}
                        >
                            <div className={styles['menu-btn-inner']}>
                                RUN
                            </div>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});