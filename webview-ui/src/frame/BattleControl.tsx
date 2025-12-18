import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
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
export interface BattleControlHandle extends DialogBoxHandle {
    openPartyMenu: () => void;
}

interface BattleControlProps {
    myPokemon?: PokemonDao;
    myParty: PokemonDao[];
    handleOnAttack: (move: PokemonMove) => void;
    handleThrowBall: (ball: PokeBallDao) => void;
    handleUseItem: (item: ItemDao) => void;
    handleRunAway: () => void;
    handleSwitchMyPokemon: (pokemon: PokemonDao) => void;
}

export const BattleControl = forwardRef<BattleControlHandle, BattleControlProps>(({
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
    const dialogBoxRef = useRef<DialogBoxHandle>(null);

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
        }
    }));

    const isExpanded = menuState !== 'main';

    const onAttackClick = (move: PokemonMove) => {
        setMenuState('main');
        handleOnAttack(move);
    };

    const onPokemonClick = (pokemon: PokemonDao) => {
        if(pokemon.currentHp <= 0) return; // 不能選擇已經昏厥的寶可夢
        if (handleSwitchMyPokemon) {
            setMenuState('main');
            handleSwitchMyPokemon(pokemon);
        }
    };

    const onItemClick = (item: ItemDao) => {
        setMenuState('main');
        if (item.category === 'PokeBalls') {
            // Adapt ItemDao to PokeBallDao
            // Assuming catchRateMultiplier is in effect
            const catchRate = item.effect?.catchRateMultiplier || 1;
            handleThrowBall({
                ...item,
                category: item.category,
                catchRateModifier: catchRate
            });
        } else if (item.category === 'Medicine') {
            handleUseItem(item);
        } else {
            // Other items not supported yet in battle
            console.log("Item not supported in battle yet:", item.name);
        }
    };

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
                                onClick={() => onAttackClick(move)}
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
                            className={styles['menu-btn-outer']} 
                            onClick={() => setMenuState('moves')}
                        >
                            <div className={styles['menu-btn-inner']}>
                                FIGHT
                            </div>
                        </button>

                        {/* BAG */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={() => setMenuState('bag')}
                        >
                            <div className={styles['menu-btn-inner']}>
                                BAG
                            </div>
                        </button>

                        {/* POKÉMON */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={() => setMenuState('party')}
                        >
                            <div className={styles['menu-btn-inner']}>
                                POKÉMON
                            </div>
                        </button>

                        {/* RUN */}
                        <button 
                            className={styles['menu-btn-outer']} 
                            onClick={handleRunAway}
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