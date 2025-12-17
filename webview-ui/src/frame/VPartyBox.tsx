import { useState } from 'react';
import styles from './VPartyBox.module.css';
import { vscode, resolveAssetUrl } from '../utilities/vscode';
import { PokemonInfoModal } from '../model/PokemonInfoModal';
import { getBallUrl } from '../utilities/util';
import { useMessageStore, useMessageSubscription } from '../store/messageStore';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { PokemonDao } from '../../../src/dataAccessObj/pokemon';


export const VPartyBox = () => {
    const messageStore = useMessageStore(); // 確保訂閱生效
    const defaultParty = messageStore.getRefs().party || [];
    const [party, setParty] = useState<PokemonDao[]>(defaultParty);
    const [selectedPokemon, setSelectedPokemon] = useState<PokemonDao | null>(null);
    
    useMessageSubscription<PokemonDao[]>(MessageType.PartyData, (message) => {
        const partyDataPayload: PokemonDao[]| undefined = message.data;
        setParty(partyDataPayload ?? []);
        if (selectedPokemon && partyDataPayload) {
            const updatedPokemon = partyDataPayload.find(p => p.uid === selectedPokemon.uid) || null;
            setSelectedPokemon(updatedPokemon);
        }
    });



    const getHpBg = (current: number, max: number) => {
        const r = current / max;
        if (r <= 0.2) return styles.hpRed;
        if (r <= 0.5) return styles.hpYellow;
        return styles.hpGreen;
    };

    const getHpColorVar = (className: string) => {
        if (className === styles.hpRed) return '#F85838';
        if (className === styles.hpYellow) return '#F8B050';
        return '#58D080';
    };

    const onPokemonClick = (pokemon: PokemonDao)=>{
        setSelectedPokemon(pokemon);
    }


    const handleRemoveFromParty = (pokemon: PokemonDao) => {
        vscode.postMessage({ command: MessageType.RemoveFromParty, uid: pokemon.uid });
        if (selectedPokemon?.uid === pokemon.uid) setSelectedPokemon(null);
    };

    return (
        <div className={styles.partyGrid}>
            {party.map((pokemon) => {
                const ballType = pokemon.caughtBall ? pokemon.caughtBall : 'poke-ball'; 
                console.log("pokemon.caughtBall",pokemon.caughtBall, ballType)
                return (
                    <div 
                        key={pokemon.uid}
                        className={styles.ballSlot}
                        onClick={() => onPokemonClick(pokemon)}
                    >
                        {/* --- 常駐大預覽卡 + 小球 --- */}
                        <div className={styles.previewCard}>
                            {pokemon.isShiny && <div className={styles.shinyMark}>✨</div>}
                            <img 
                                src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${pokemon.id}.png`)}
                                alt={pokemon.name}
                                className={styles.previewIcon}
                            />
                            {/* 迷你 HP 條 */}
                            <div className={styles.miniHpBar}>
                                <div 
                                    className={styles.miniHpFill}
                                    style={{ 
                                        width: `${(pokemon.currentHp / pokemon.maxHp) * 100}%`,
                                        backgroundColor: getHpColorVar(getHpBg(pokemon.currentHp, pokemon.maxHp))
                                    }}
                                />
                            </div>
                        </div>
                        
                        {/* 下方小球 */}
                        <img 
                            src={getBallUrl(ballType)} 
                            alt="Ball" 
                            className={styles.ballBase}
                        />
                    </div>
                );
            })}
            
            {/* 補滿 6 個空格 */}
            {Array.from({ length: Math.max(0, 6 - party.length) }).map((_, idx) => (
                <div key={`empty-${idx}`} className={styles.emptySlot}>
                    <div className={styles.emptyPreview}></div>
                    <div className={styles.emptyBall}></div>
                </div>
            ))}

            {/* Popup Modal for Pokemon Details */}
            {selectedPokemon && (
                <PokemonInfoModal 
                    isInParty={true}
                    pokemon={selectedPokemon}
                    onClose={() => setSelectedPokemon(null)}
                    onAction={handleRemoveFromParty}
                    actionLabel="DEPOSIT"
                />
            )}
        </div>
    );
};
