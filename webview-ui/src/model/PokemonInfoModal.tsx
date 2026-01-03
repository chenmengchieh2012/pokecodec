import React, { useImperativeHandle, useState } from 'react';
import styles from './PokemonInfoModal.module.css';
import { getBallUrl } from '../utilities/util';
import { EvolutionTrigger, getName, PokemonDao, RawPokemonData } from '../../../src/dataAccessObj/pokemon';
import { PokemonMove } from '../../../src/dataAccessObj/pokeMove';
import { resolveAssetUrl, vscode } from '../utilities/vscode';
import pokemonGen1Data from '../../../src/data/pokemonGen1.json';
import { MessageType } from '../../../src/dataAccessObj/messageType';
import { UpdatePartyPokemonPayload } from '../../../src/dataAccessObj/MessagePayload';
import { PokemonTypeIcon } from '../utilities/pokemonTypeIcon';
import { EvolutionModal } from './EvolutionModal';
import { LearnableMoveListModal } from './LearnableMoveListModal';
import { GiFemale, GiMale } from 'react-icons/gi';
import { MdQrCode } from 'react-icons/md';
import { QRCodeHelper } from '../utilities/QRCodeHelper';
import { BindBoxPayload, TransferPokemon } from '../../../src/dataAccessObj/BindPayload';

const IconClose = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
);


interface PokemonInfoModalProps {
    isInParty: boolean;
    pokemon: PokemonDao;
    onClose: () => void;
    onAction: (pokemon: PokemonDao) => void;
    actionLabel: string;
}

export const PokemonInfoModal: React.FC<PokemonInfoModalProps> = ({ isInParty, pokemon, onClose, onAction, actionLabel }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'moves' | 'iv'>('stats');
    const [showEvolutionModal, setShowEvolutionModal] = useState(false);
    const editNickNameRef = React.useRef<HTMLInputElement>(null);
    const [isEditingNickName, setIsEditingNickName] = useState(false);
    const qrcodeModalRef = React.useRef<QrcodeModalHandler>(null);

    const handleGenerateQRCode = async () => {
        const transferPokemon: TransferPokemon = {
            ...pokemon,
            stats: {}, // Minimize stats
            pokemonMoves: pokemon.pokemonMoves.map(m => ({
                name: m.name,
                pp: m.pp,
                maxPP: m.maxPP
            }))
        };
        const bindPayload: BindBoxPayload = {
            type: 'box',
            secret: '', // No secret needed for QR code generation
            transferPokemons: [transferPokemon],
            lockId: 0,
            timestamp: Date.now()
        };

        try {
            const url = await QRCodeHelper.generateCompressedQRCode(bindPayload);
            qrcodeModalRef.current?.show(url);
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        }
    };

    const handleNameSave = () => {
        const editNickNameRefCurrent = editNickNameRef.current;
        if (!editNickNameRefCurrent) return;
        const editedNickName = editNickNameRefCurrent.value;
        if (editedNickName.trim() && editedNickName !== pokemon.name) {
            const newPokemon = { ...pokemon, nickname: editedNickName.trim() };
            if (isInParty) {
                const updatePartyPayload: UpdatePartyPokemonPayload = {
                    pokemons: [newPokemon]
                };
                vscode.postMessage({
                    command: MessageType.UpdatePartyPokemon,
                    ...updatePartyPayload
                });
            }
        }
        setIsEditingNickName(false);
    };

    const getEvolutionTarget = () => {
        const speciesData = (pokemonGen1Data as unknown as Record<string, RawPokemonData>)[pokemon.id.toString()];
        if (!speciesData || !speciesData.evolutions) return null;

        const levelUpEvo = speciesData.evolutions.find(evo =>
            evo.trigger === 'level-up' &&
            evo.min_level !== null &&
            pokemon.level >= evo.min_level &&
            evo.id <= 151 // Limit to Gen 1 for now
        );

        return levelUpEvo;
    };

    const evolutionTarget = getEvolutionTarget();


    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <QrcodeModal ref={qrcodeModalRef} />
            <div className={styles.summaryCard} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.summaryHeader}>
                    <span className={styles.summaryTitle}>POKéMON INFO</span>
                    <div className={styles.headerIcons}>
                        {isInParty && evolutionTarget && (
                            <button
                                className={styles.evolveTriggerBtn}
                                onClick={() => setShowEvolutionModal(true)}
                            >
                                EVOLVE!
                            </button>
                        )}
                        

                        <button className={styles.withdrawBtn} onClick={() => onAction(pokemon)}>
                            {actionLabel}
                        </button>
                        <div className={styles.iconBox} onClick={handleGenerateQRCode} title="Generate QR Code">
                            <MdQrCode size={18} />
                        </div>
                        <div className={styles.iconBox} onClick={onClose}>
                            <IconClose />
                        </div>
                    </div>
                </div>

                <div className={styles.summaryBody}>
                    {isInParty && showEvolutionModal && evolutionTarget ? (
                        <EvolutionModal
                            trigger={EvolutionTrigger.LevelUp}
                            pokemon={pokemon}
                            onClose={() => setShowEvolutionModal(false)}
                        />
                    ) : (
                        <>
                            {/* Left: Sprite & Basic Info */}
                            <div className={styles.summaryLeft}>
                                <div className={styles.spriteFrame}>
                                    <img
                                        src={getBallUrl(pokemon.caughtBall)}
                                        className={styles.expandedBallDecor}
                                        alt="ball"
                                    />
                                    <img
                                        src={resolveAssetUrl(`./sprites/pokemon/${pokemon.isShiny ? 'shiny' : 'normal'}/${pokemon.id}.gif`)}
                                        alt={pokemon.name}
                                        className={styles.summarySprite}
                                        onError={(e) => {
                                            e.currentTarget.src = resolveAssetUrl(`./sprites/pokemon/icon/${pokemon.id}.png`);
                                        }}
                                    />
                                </div>
                                <div className={styles.basicInfo}>
                                    <div className={styles.dexNo}>No.{String(pokemon.id).padStart(3, '0')}</div>
                                    {isEditingNickName ? (
                                        <input
                                            className={styles.nameInput}
                                            ref={editNickNameRef}
                                            defaultValue={pokemon.nickname || pokemon.name}
                                            onBlur={handleNameSave}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleNameSave();
                                                if (e.key === 'Escape') {
                                                    setIsEditingNickName(false);
                                                }
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <div
                                            className={styles.pkmName}
                                            onClick={() => isInParty && setIsEditingNickName(true)}
                                            title={isInParty ? "Click to rename" : ""}
                                            style={{ cursor: isInParty ? 'pointer' : 'default' }}
                                        >
                                            {pokemon.gender === 'Male' ? <GiMale /> : <GiFemale />}
                                            {getName(pokemon)}

                                        </div>
                                    )}
                                    <div className={styles.lvlBadge}>Lv.{pokemon.level} ({Math.floor((pokemon.currentExp / pokemon.toNextLevelExp) * 100)}%)</div>
                                </div>
                                <div className={styles.typesRow}>
                                    {pokemon.types.map(t => (
                                        <span key={t} className={`${styles.typeTag} ${styles[t] || ''}`}>{t}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Tabs & Stats/Moves */}
                            <div className={styles.summaryRight}>
                                <div className={styles.tabsRow}>
                                    <div
                                        className={`${styles.tab} ${activeTab === 'stats' ? styles.activeTab : ''}`}
                                        onClick={() => setActiveTab('stats')}
                                    >
                                        STATS
                                    </div>
                                    <div
                                        className={`${styles.tab} ${activeTab === 'moves' ? styles.activeTab : ''}`}
                                        onClick={() => setActiveTab('moves')}
                                    >
                                        MOVES
                                    </div>
                                    <div
                                        className={`${styles.tab} ${activeTab === 'iv' ? styles.activeTab : ''}`}
                                        onClick={() => setActiveTab('iv')}
                                    >
                                        IVs
                                    </div>
                                </div>

                                <div className={styles.tabContent}>
                                    {activeTab === 'stats' ? (
                                        <>
                                            <div className={styles.battleStats}>
                                                <div className={styles.statItem}><span>HP</span><b>{pokemon.currentHp}/{pokemon.maxHp}</b></div>
                                                <div className={styles.statItem}><span>ATK</span><b>{pokemon.stats.attack}</b></div>
                                                <div className={styles.statItem}><span>DEF</span><b>{pokemon.stats.defense}</b></div>
                                                <div className={styles.statItem}><span>SPA</span><b>{pokemon.stats.specialAttack}</b></div>
                                                <div className={styles.statItem}><span>SPD</span><b>{pokemon.stats.specialDefense}</b></div>
                                                <div className={styles.statItem}><span>SPE</span><b>{pokemon.stats.speed}</b></div>
                                                <div className={styles.statItem}><span>EXP</span><b>{pokemon.currentExp}</b></div>
                                                <div className={styles.statItem}><span>NEXT</span><b>{pokemon.toNextLevelExp}</b></div>
                                                <div className={styles.statItem}>
                                                    <span></span>
                                                    {pokemon.ailment && pokemon.ailment !== 'healthy' && (
                                                        <span className={`${styles.typeTag} ${styles.ailmentTag}`} style={{
                                                            backgroundColor:
                                                                pokemon.ailment === 'burn' ? '#F08030' :
                                                                    pokemon.ailment === 'freeze' ? '#98D8D8' :
                                                                        pokemon.ailment === 'paralysis' ? '#F8D030' :
                                                                            pokemon.ailment === 'poison' ? '#A040A0' :
                                                                                pokemon.ailment === 'sleep' ? '#8C888C' :
                                                                                    pokemon.ailment === 'fainted' ? '#C03028' : '#555',
                                                            color: '#fff',
                                                            marginLeft: '4px'
                                                        }}>
                                                            {pokemon.ailment.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.extraInfo}>
                                                <div className={styles.infoItem}>
                                                    <span>NAT.</span><span className={styles.blueText}>{pokemon.nature}</span>
                                                </div>
                                                <div className={styles.infoItem}>
                                                    <span>ABIL.</span><span className={styles.blueText}>{pokemon.ability}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : activeTab === 'moves' ? (
                                        <MoveSelector isInParty={isInParty} pokemon={pokemon} moves={pokemon.pokemonMoves} />
                                    ) : (
                                        <>
                                            <div className={styles.battleStats}>
                                                <div className={styles.statItem}><span>HP</span><b>{pokemon.iv.hp}</b></div>
                                                <div className={styles.statItem}><span>ATK</span><b>{pokemon.iv.attack}</b></div>
                                                <div className={styles.statItem}><span>DEF</span><b>{pokemon.iv.defense}</b></div>
                                                <div className={styles.statItem}><span>SPA</span><b>{pokemon.iv.specialAttack}</b></div>
                                                <div className={styles.statItem}><span>SPD</span><b>{pokemon.iv.specialDefense}</b></div>
                                                <div className={styles.statItem}><span>SPE</span><b>{pokemon.iv.speed}</b></div>
                                            </div>
                                            <div className={styles.codeDetailSection}>
                                                <div className={styles.statItem}>
                                                    <span>LINE</span><span className={styles.blueText}><b>{pokemon.codingStats?.linesOfCode}</b></span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <span>BUGS</span><span className={styles.blueText}><b>{pokemon.codingStats?.bugsFixed}</b></span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <span>COMM.</span><span className={styles.blueText}><b>{pokemon.codingStats?.commits}</b></span>
                                                </div>
                                            </div>
                                            <div className={styles.codeInfoSection}>
                                                <div className={styles.infoItem}>
                                                    <span>LANG.</span><span className={styles.blueText}>{pokemon.codingStats?.favoriteLanguage}</span>
                                                </div>
                                                <div className={styles.infoItem}>
                                                    <span>REPO.</span><span className={styles.blueText}>{pokemon.codingStats?.caughtRepo}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};



interface MoveSelectorProps {
    isInParty: boolean;
    pokemon: PokemonDao;
    moves: PokemonMove[];
}

const MoveSelector: React.FC<MoveSelectorProps> = ({ isInParty, pokemon, moves }) => {
    const [editingSlot, setEditingSlot] = useState<number | null>(null);

    const handleMoveClick = (index: number) => {
        setEditingSlot(index);
    };

    const handlePokemonChangeMoves = (selectedMove: PokemonMove) => {
        const newMove: PokemonMove = JSON.parse(JSON.stringify(selectedMove));
        if (editingSlot === null) return;
        const newPokemon = JSON.parse(JSON.stringify(pokemon));

        const newMovesList = [...moves];
        const oldMove = newMovesList[editingSlot];

        // Adjust PP based on maxPP ratio
        const ppPercent = oldMove.pp / oldMove.maxPP;
        newMove.pp = Math.floor(ppPercent * newMove.maxPP);

        newMovesList[editingSlot] = newMove;
        newPokemon.pokemonMoves = newMovesList;
        const updatePartyPayload: UpdatePartyPokemonPayload = {
            pokemons: [newPokemon]
        };
        if (isInParty) {
            vscode.postMessage({
                command: MessageType.UpdatePartyPokemon,
                ...updatePartyPayload,
            });
        }

        setEditingSlot(null);
    }

    return (
        <>
            <div className={styles.movesList}>
                {moves.length > 0 ? (
                    moves.map((move, idx) => (
                        <div
                            key={idx}
                            className={styles.moveItem}
                            onClick={() => { if (isInParty) handleMoveClick(idx); }}
                        >
                            <span className={styles.moveName}><PokemonTypeIcon className={styles.moveTypeIcon} type={move.type} />{move.name.toUpperCase()}</span>
                            <div className={styles.movePP}>PP {move.pp}/{move.maxPP}</div>
                        </div>
                    ))
                ) : (
                    <div className={styles.noMoves}>--</div>
                )}
            </div>

            {editingSlot !== null && <LearnableMoveListModal
                pokemon={pokemon}
                onSelect={handlePokemonChangeMoves}
                onCancel={() => setEditingSlot(null)}
            />}
        </>
    );
};

interface QrcodeModalHandler {
    show: (url: string) => void;
}

const QrcodeModal = React.forwardRef<QrcodeModalHandler,unknown>((_, ref) => {
    const [isShow, setShow] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        show: (url: string) => {
            setQrCodeUrl(url);
            setShow(true);
        }
    }));

    if (!isShow || !qrCodeUrl) return null;
    return <>
        <div className={styles.qrCodeOverlay}>
            <div className={styles.qrCodeContainer} onClick={e => {
                e.stopPropagation()
                setQrCodeUrl(null);
                setShow(false);
            }}>
                <img src={qrCodeUrl} alt="Pokemon QR Code" style={{maxWidth: '100%', maxHeight: '80vh'}} />
            </div>
        </div>
    </>
});