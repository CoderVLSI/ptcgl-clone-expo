import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
} from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';
import StadiumZone from './StadiumZone';
import useGameDimensions from '../hooks/useGameDimensions';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ENERGY_COLORS: Record<string, string> = {
    fire: '#C04808', water: '#2060C0', grass: '#3A8A30',
    lightning: '#C8A000', psychic: '#A040A0', fighting: '#C03028',
    darkness: '#403830', metal: '#6870A0', fairy: '#EE99AC',
    dragon: '#7038F8', colorless: '#888888',
};

const STATUS_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
    poisoned:  { emoji: '☠', color: '#9B59B6', label: 'PSN' },
    burned:    { emoji: '🔥', color: '#E74C3C', label: 'BRN' },
    asleep:    { emoji: '💤', color: '#3498DB', label: 'SLP' },
    paralyzed: { emoji: '⚡', color: '#F1C40F', label: 'PAR' },
    confused:  { emoji: '💫', color: '#E67E22', label: 'CNF' },
};

const getHpBarColor = (ratio: number) =>
    ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FFC107' : '#F44336';

// ─── interface ────────────────────────────────────────────────────────────────

interface DesktopPlayMatProps {
    opponentActive?: CardType;
    opponentBench: CardType[];
    playerActive?: CardType;
    playerBench: CardType[];
    onCardPress?: (cardId: string) => void;
    onBenchCardPress?: (cardId: string) => void;
    selectedCardId?: string;
    highlightTargets?: boolean;
    stadium?: CardType;
    stadiumOwner?: 'player' | 'opponent';
    opponentDeckCount?: number;
    opponentHandCount?: number;
    opponentPrizeCount?: number;
    playerDeckCount?: number;
    playerPrizeCount?: number;
    playerDiscard?: CardType[];
    opponentDiscard?: CardType[];
    onPlayerRetreat?: () => void;
    isPlayerTurn?: boolean;
    // Player hand — shown inside the mat
    playerHand?: CardType[];
    selectedHandCardId?: string;
    onHandCardPress?: (card: CardType) => void;
    onHandCardLongPress?: (card: CardType) => void;
}

// ─── sub-components ───────────────────────────────────────────────────────────

const HpBar: React.FC<{ card: CardType }> = ({ card }) => {
    const hp = card.hp ?? 100;
    const dmg = card.damageCounters ?? 0;
    const remaining = Math.max(0, hp - dmg);
    const ratio = remaining / hp;
    return (
        <View style={hpStyles.track}>
            <View style={[hpStyles.fill, { width: `${ratio * 100}%` as any, backgroundColor: getHpBarColor(ratio) }]} />
            <Text style={hpStyles.label}>{remaining}/{hp}</Text>
        </View>
    );
};
const hpStyles = StyleSheet.create({
    track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.5)', marginTop: 4, overflow: 'hidden', position: 'relative' },
    fill: { height: 8, borderRadius: 4 },
    label: { position: 'absolute', right: 0, top: -1, fontSize: 9, color: '#fff', fontWeight: 'bold', paddingHorizontal: 2 },
});

const EnergyDots: React.FC<{ card: CardType }> = ({ card }) => {
    if (!card.attachedEnergy?.length) return null;
    const shown = card.attachedEnergy.slice(0, 6);
    const extra = card.attachedEnergy.length - 6;
    return (
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            {shown.map((e, i) => (
                <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ENERGY_COLORS[e] ?? '#888' }} />
            ))}
            {extra > 0 && <Text style={{ fontSize: 9, color: '#aaa' }}>+{extra}</Text>}
        </View>
    );
};

const StatusBadge: React.FC<{ card: CardType }> = ({ card }) => {
    if (!card.statusCondition) return null;
    const cfg = STATUS_CONFIG[card.statusCondition];
    if (!cfg) return null;
    return (
        <View style={{ backgroundColor: cfg.color + 'CC', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3, alignSelf: 'center' }}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>{cfg.emoji} {cfg.label}</Text>
        </View>
    );
};

/** Centered active-Pokémon slot with decorative ring */
const ActiveSlot: React.FC<{
    card?: CardType;
    isPlayer?: boolean;
    selectedCardId?: string;
    highlightTargets?: boolean;
    onPress?: (id: string) => void;
    onRetreat?: () => void;
    isPlayerTurn?: boolean;
    cardWidth: number;
}> = ({ card, isPlayer, selectedCardId, highlightTargets, onPress, onRetreat, isPlayerTurn, cardWidth }) => {
    const cardHeight = cardWidth * 1.4;
    const ringSize = Math.max(cardWidth, cardHeight) * 1.55;
    const canRetreat = isPlayer && isPlayerTurn && onRetreat && card && (card.attachedEnergy?.length ?? 0) >= (card.retreatCost ?? 0);

    return (
        <View style={activeStyles.wrapper}>
            {/* decorative Poké Ball ring */}
            <View style={[activeStyles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
                <View style={[activeStyles.ringDivider, { top: ringSize / 2 - 1 }]} />
                <View style={[activeStyles.ringCenter, { marginTop: ringSize / 2 - 14 }]} />
            </View>

            {card ? (
                <View style={activeStyles.cardWrapper}>
                    <Card
                        card={card}
                        size={cardWidth}
                        isHighlighted={selectedCardId === card.id || (!!(isPlayer && highlightTargets))}
                        onPress={() => onPress?.(card.id)}
                    />
                    <HpBar card={card} />
                    <EnergyDots card={card} />
                    <StatusBadge card={card} />
                    {isPlayer && onRetreat && isPlayerTurn && (
                        <TouchableOpacity
                            style={[activeStyles.retreatBtn, !canRetreat && activeStyles.retreatBtnDisabled]}
                            onPress={canRetreat ? onRetreat : undefined}
                            disabled={!canRetreat}
                        >
                            <Text style={activeStyles.retreatBtnText}>↩ Retreat</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={[activeStyles.empty, { width: cardWidth, height: cardHeight }]}>
                    <Text style={activeStyles.emptyText}>{isPlayer ? 'YOUR\nACTIVE' : 'OPP\nACTIVE'}</Text>
                </View>
            )}
        </View>
    );
};
const activeStyles = StyleSheet.create({
    wrapper: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    ring: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(0,0,0,0.12)',
        alignItems: 'center',
    },
    ringDivider: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
    ringCenter: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
    },
    cardWrapper: { alignItems: 'center' },
    empty: {
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed',
        borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    },
    emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', fontWeight: 'bold' },
    retreatBtn: {
        marginTop: 5, paddingHorizontal: 10, paddingVertical: 3,
        backgroundColor: '#2a5fa8', borderRadius: 8, borderWidth: 1, borderColor: '#5599ee',
    },
    retreatBtnDisabled: {
        backgroundColor: '#333', borderColor: '#555',
    },
    retreatBtnText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
});

/** A single bench slot */
const BenchSlot: React.FC<{
    card?: CardType;
    index: number;
    slotSize: number;
    selectedCardId?: string;
    highlightTargets?: boolean;
    onPress?: (id: string) => void;
    isPlayer?: boolean;
}> = ({ card, index, slotSize, selectedCardId, highlightTargets, onPress, isPlayer }) => (
    <View style={[benchStyles.slot, { width: slotSize + 8, alignItems: 'center' }]}>
        {card ? (
            <View style={{ alignItems: 'center' }}>
                <Card
                    card={card}
                    isSmall
                    size={slotSize}
                    isHighlighted={selectedCardId === card.id || !!(isPlayer && highlightTargets)}
                    onPress={() => onPress?.(card.id)}
                />
                <HpBar card={card} />
            </View>
        ) : (
            <View style={[benchStyles.empty, { width: slotSize, height: slotSize * 1.4 }]} />
        )}
    </View>
);
const benchStyles = StyleSheet.create({
    slot: { alignItems: 'center', paddingHorizontal: 4 },
    empty: {
        borderRadius: 6, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed',
        opacity: 0.5,
    },
});

/** Deck pile shown on the side */
const DeckPileBlock: React.FC<{ count: number; label: string }> = ({ count, label }) => (
    <View style={sideStyles.block}>
        <View style={sideStyles.deckVisual}>
            <View style={[sideStyles.deckLayer, { bottom: 4, right: -4 }]} />
            <View style={[sideStyles.deckLayer, { bottom: 2, right: -2 }]} />
            <View style={sideStyles.deckTop}>
                <Text style={sideStyles.deckIcon}>🎴</Text>
            </View>
        </View>
        <Text style={sideStyles.count}>{count}</Text>
        <Text style={sideStyles.label}>{label}</Text>
    </View>
);

/** Discard pile — shows top card face, clickable */
const DiscardPileBlock: React.FC<{ cards: CardType[]; onPress: () => void }> = ({ cards, onPress }) => {
    const top = cards[cards.length - 1];
    return (
        <TouchableOpacity style={sideStyles.block} onPress={onPress} activeOpacity={0.7}>
            <View style={sideStyles.discardVisual}>
                {top?.imageUrl ? (
                    <Image source={{ uri: top.imageUrl }} style={sideStyles.discardTopImage} resizeMode="cover" />
                ) : (
                    <View style={sideStyles.discardEmpty}>
                        <Text style={sideStyles.discardEmptyIcon}>🗑</Text>
                    </View>
                )}
                <View style={sideStyles.discardBadge}>
                    <Text style={sideStyles.discardBadgeText}>{cards.length}</Text>
                </View>
            </View>
            <Text style={sideStyles.label}>DISCARD</Text>
        </TouchableOpacity>
    );
};

/** Prize cards shown as a 2×3 grid (face-down if remaining, empty slot if taken) */
const PrizeBlock: React.FC<{ count: number; total?: number }> = ({ count, total = 6 }) => {
    const COLS = 2;
    const ROWS = 3;
    const cardW = 26;
    const cardH = 36;
    return (
        <View style={sideStyles.block}>
            <Text style={sideStyles.label}>PRIZES</Text>
            <View style={{ flexDirection: 'column', gap: 3, marginTop: 2 }}>
                {[...Array(ROWS)].map((_, row) => (
                    <View key={row} style={{ flexDirection: 'row', gap: 3 }}>
                        {[...Array(COLS)].map((_, col) => {
                            const idx = row * COLS + col;
                            const filled = idx < count;
                            return (
                                <View
                                    key={col}
                                    style={[
                                        sideStyles.prizeCard,
                                        { width: cardW, height: cardH },
                                        filled ? sideStyles.prizeCardFilled : sideStyles.prizeCardEmpty,
                                    ]}
                                >
                                    {filled && (
                                        <>
                                            <View style={sideStyles.prizeCardInner} />
                                            <Text style={sideStyles.prizeStar}>★</Text>
                                        </>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
            <Text style={[sideStyles.count, { marginTop: 3 }]}>{count} left</Text>
        </View>
    );
};
const sideStyles = StyleSheet.create({
    block: { alignItems: 'center', gap: 2 },
    deckVisual: { width: 36, height: 50, position: 'relative', marginBottom: 2 },
    deckLayer: {
        position: 'absolute', width: 32, height: 44, borderRadius: 4,
        backgroundColor: '#1A3A6B', borderWidth: 1, borderColor: '#2A5A9B',
    },
    deckTop: {
        position: 'absolute', bottom: 0, left: 0, width: 32, height: 44,
        borderRadius: 4, backgroundColor: '#1A2E5A', borderWidth: 1,
        borderColor: '#4A7DCC', justifyContent: 'center', alignItems: 'center',
    },
    deckIcon: { fontSize: 16 },
    prizeCard: {
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    prizeCardFilled: {
        backgroundColor: '#2A1A4A',
        borderWidth: 1,
        borderColor: '#8B5CF6',
    },
    prizeCardEmpty: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderStyle: 'dashed',
    },
    prizeCardInner: {
        position: 'absolute',
        top: 3, left: 3, right: 3, bottom: 3,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.4)',
    },
    prizeStar: {
        fontSize: 11,
        color: 'rgba(167,139,250,0.8)',
        fontWeight: 'bold',
    },
    discardVisual: {
        width: 36, height: 50, borderRadius: 4, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
        marginBottom: 2, position: 'relative',
    },
    discardTopImage: { width: '100%', height: '100%' },
    discardEmpty: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    discardEmptyIcon: { fontSize: 16 },
    discardBadge: {
        position: 'absolute', top: 2, right: 2,
        backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6,
        paddingHorizontal: 3, paddingVertical: 1,
    },
    discardBadgeText: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
    count: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
    label: { fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── main component ───────────────────────────────────────────────────────────

export const DesktopPlayMat: React.FC<DesktopPlayMatProps> = ({
    opponentActive,
    opponentBench,
    playerActive,
    playerBench,
    onCardPress,
    onBenchCardPress,
    selectedCardId,
    highlightTargets = false,
    stadium,
    stadiumOwner,
    opponentDeckCount = 0,
    opponentHandCount = 0,
    opponentPrizeCount = 0,
    playerDeckCount = 0,
    playerPrizeCount = 0,
    playerDiscard = [],
    opponentDiscard = [],
    onPlayerRetreat,
    isPlayerTurn = false,
    playerHand = [],
    selectedHandCardId,
    onHandCardPress,
    onHandCardLongPress,
}) => {
    const { width: GAME_WIDTH } = useGameDimensions();
    const [discardModal, setDiscardModal] = useState<{ visible: boolean; cards: CardType[]; title: string }>({
        visible: false, cards: [], title: '',
    });

    // Card sizes tuned to fit within each half zone (~220px tall each)
    // active: ~75px wide → 105px tall, bench: ~50px wide → 70px tall
    const cardBase = Math.min(GAME_WIDTH, 520);
    const activeCardWidth = Math.floor(cardBase * 0.145);   // ~75px
    const benchSlotSize = Math.floor(cardBase * 0.096);     // ~50px
    const handCardWidth = Math.floor(cardBase * 0.13);      // ~68px

    const handlePlayerBench = (id: string) =>
        onBenchCardPress ? onBenchCardPress(id) : onCardPress?.(id);

    const handlePlayerActive = () => {
        if (playerActive) {
            if (onBenchCardPress && highlightTargets) onBenchCardPress(playerActive.id);
            else onCardPress?.(playerActive.id);
        }
    };

    // Bench row renderer (shared between player/opponent)
    const renderBench = (bench: CardType[], isPlayer: boolean) => (
        <View style={styles.benchRow}>
            {[...Array(5)].map((_, i) => (
                <BenchSlot
                    key={i}
                    card={bench[i]}
                    index={i}
                    slotSize={benchSlotSize}
                    selectedCardId={selectedCardId}
                    highlightTargets={isPlayer ? highlightTargets : false}
                    onPress={isPlayer ? handlePlayerBench : onCardPress}
                    isPlayer={isPlayer}
                />
            ))}
        </View>
    );

    return (
        <View style={styles.root}>
            {/* ── OPPONENT HALF (red zone) ── */}
            <View style={styles.opponentHalf}>
                {/* Left side — opponent deck + discard + prizes */}
                <View style={styles.sidePanel}>
                    <DeckPileBlock count={opponentDeckCount} label="Deck" />
                    <DiscardPileBlock
                        cards={opponentDiscard}
                        onPress={() => setDiscardModal({ visible: true, cards: opponentDiscard, title: "Opponent's Discard" })}
                    />
                    <View style={styles.sideSpacer} />
                    <PrizeBlock count={opponentPrizeCount} />
                    <Text style={styles.handCount}>🃏 {opponentHandCount}</Text>
                </View>

                {/* Center — opponent bench (top) + active (bottom) */}
                <View style={styles.centerZone}>
                    <View style={styles.opponentBenchArea}>
                        <Text style={styles.benchLabel}>BENCH</Text>
                        {renderBench(opponentBench, false)}
                    </View>
                    <View style={styles.activeZone}>
                        <ActiveSlot
                            card={opponentActive}
                            selectedCardId={selectedCardId}
                            onPress={onCardPress}
                            cardWidth={activeCardWidth}
                        />
                    </View>
                </View>

                {/* Right side — stadium */}
                <View style={styles.sidePanel}>
                    {stadium ? (
                        <View style={styles.stadiumWrapper}>
                            <StadiumZone stadium={stadium} stadiumOwner={stadiumOwner} />
                        </View>
                    ) : (
                        <View style={styles.stadiumEmpty}>
                            <Text style={styles.stadiumEmptyText}>STADIUM</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── THIN BORDER between halves (no black bar) ── */}
            <View style={styles.halfBorder} />

            {/* ── PLAYER HALF (blue zone) ── */}
            <View style={styles.playerHalf}>
                {/* Left side — player deck + discard + prizes */}
                <View style={styles.sidePanel}>
                    <DeckPileBlock count={playerDeckCount} label="Deck" />
                    <DiscardPileBlock
                        cards={playerDiscard}
                        onPress={() => setDiscardModal({ visible: true, cards: playerDiscard, title: 'Your Discard' })}
                    />
                    <View style={styles.sideSpacer} />
                    <PrizeBlock count={playerPrizeCount} />
                </View>

                {/* Center — player active (top) + bench (bottom) */}
                <View style={styles.centerZone}>
                    <View style={styles.activeZone}>
                        <ActiveSlot
                            card={playerActive}
                            isPlayer
                            selectedCardId={selectedCardId}
                            highlightTargets={highlightTargets}
                            onPress={handlePlayerActive}
                            onRetreat={onPlayerRetreat}
                            isPlayerTurn={isPlayerTurn}
                            cardWidth={activeCardWidth}
                        />
                    </View>
                    <View style={styles.playerBenchArea}>
                        <Text style={styles.benchLabel}>BENCH</Text>
                        {renderBench(playerBench, true)}
                    </View>
                </View>

                {/* Right side — empty */}
                <View style={styles.sidePanel} />
            </View>

            {/* ── PLAYER HAND (full width strip at the very bottom) ── */}
            <View style={styles.handStrip}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.handContent}
                >
                    {playerHand.length === 0 ? (
                        <View style={styles.emptyHandPlaceholder}>
                            <Text style={styles.emptyHandText}>No cards in hand</Text>
                        </View>
                    ) : (
                        playerHand.map((card, i) => (
                            <TouchableOpacity
                                key={card.id}
                                onPress={() => onHandCardPress?.(card)}
                                onLongPress={() => onHandCardLongPress?.(card)}
                                style={[
                                    styles.handCard,
                                    i > 0 && { marginLeft: -18 },
                                    selectedHandCardId === card.id && styles.handCardSelected,
                                ]}
                            >
                                <Card
                                    card={card}
                                    isSmall
                                    size={handCardWidth}
                                    isHighlighted={selectedHandCardId === card.id}
                                />
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* ── DISCARD PILE MODAL ── */}
            <Modal
                visible={discardModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setDiscardModal(d => ({ ...d, visible: false }))}
            >
                <TouchableOpacity
                    style={styles.discardOverlay}
                    activeOpacity={1}
                    onPress={() => setDiscardModal(d => ({ ...d, visible: false }))}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.discardModalBox} onPress={() => {}}>
                        <View style={styles.discardModalHeader}>
                            <Text style={styles.discardModalTitle}>{discardModal.title}</Text>
                            <Text style={styles.discardModalCount}>{discardModal.cards.length} cards</Text>
                            <TouchableOpacity onPress={() => setDiscardModal(d => ({ ...d, visible: false }))}>
                                <Text style={styles.discardModalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.discardModalGrid}>
                            {discardModal.cards.length === 0 ? (
                                <Text style={styles.discardModalEmpty}>No cards in discard pile</Text>
                            ) : (
                                [...discardModal.cards].reverse().map((card, i) => (
                                    <View key={`${card.id}-${i}`} style={styles.discardModalCard}>
                                        <Card card={card} isSmall size={70} />
                                        <Text style={styles.discardModalCardName} numberOfLines={1}>{card.name}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'column',
    },

    // ── opponent half (red) ──
    opponentHalf: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#8B2020',
    },

    // ── player half (blue) ──
    playerHalf: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#1A3060',
    },

    // ── side panels (deck, prizes, stadium) ──
    sidePanel: {
        width: 80,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 8,
    },
    sideSpacer: { flex: 1 },
    handCount: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },

    // ── center zone (active + bench) ──
    centerZone: {
        flex: 1,
        flexDirection: 'column',
    },

    // ── active zone ──
    activeZone: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── bench areas ──
    opponentBenchArea: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    playerBenchArea: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    benchRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 4,
    },
    benchLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: 2,
        marginBottom: 4,
    },

    // ── thin border between halves ──
    halfBorder: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },

    // ── stadium ──
    stadiumWrapper: {
        transform: [{ scale: 0.75 }],
    },
    stadiumEmpty: {
        width: 56,
        height: 78,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stadiumEmptyText: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.25)',
        fontWeight: 'bold',
        letterSpacing: 1,
    },

    // ── player hand strip ──
    handStrip: {
        height: 120,
        backgroundColor: '#0D1A2E',
        borderTopWidth: 2,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    handContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        minWidth: '100%',
    },
    handCard: {
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    handCardSelected: {
        transform: [{ translateY: -12 }],
        zIndex: 10,
    },
    emptyHandPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 200,
    },
    emptyHandText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontStyle: 'italic',
    },

    // ── discard pile modal ──
    discardOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    discardModalBox: {
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
        width: 380,
        maxHeight: 520,
    },
    discardModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        gap: 8,
    },
    discardModalTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
    discardModalCount: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    discardModalClose: {
        fontSize: 18,
        color: '#888',
        paddingHorizontal: 4,
    },
    discardModalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: 8,
    },
    discardModalCard: {
        alignItems: 'center',
        width: 70,
    },
    discardModalCardName: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 3,
        textAlign: 'center',
        maxWidth: 70,
    },
    discardModalEmpty: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontStyle: 'italic',
        padding: 20,
    },
});

export default DesktopPlayMat;
