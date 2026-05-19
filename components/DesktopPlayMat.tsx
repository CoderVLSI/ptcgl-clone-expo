import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
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
    cardWidth: number;
}> = ({ card, isPlayer, selectedCardId, highlightTargets, onPress, cardWidth }) => {
    const cardHeight = cardWidth * 1.4;
    const ringSize = Math.max(cardWidth, cardHeight) * 1.55;

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
                        isHighlighted={selectedCardId === card.id || (!!(isPlayer && highlightTargets))}
                        onPress={() => onPress?.(card.id)}
                    />
                    <HpBar card={card} />
                    <EnergyDots card={card} />
                    <StatusBadge card={card} />
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

/** Prize card stack */
const PrizeBlock: React.FC<{ count: number }> = ({ count }) => (
    <View style={sideStyles.block}>
        <View style={sideStyles.prizeStack}>
            {[...Array(Math.min(count, 3))].map((_, i) => (
                <View key={i} style={[sideStyles.prizeFace, { bottom: i * 3, right: i * 2, opacity: 1 - i * 0.2 }]} />
            ))}
        </View>
        <Text style={sideStyles.count}>{count}</Text>
        <Text style={sideStyles.label}>Prizes</Text>
    </View>
);
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
    prizeStack: { width: 36, height: 50, position: 'relative', marginBottom: 2 },
    prizeFace: {
        position: 'absolute', width: 28, height: 40, borderRadius: 4,
        backgroundColor: '#2A1A4A', borderWidth: 1, borderColor: '#6B4A9B',
    },
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
    playerHand = [],
    selectedHandCardId,
    onHandCardPress,
    onHandCardLongPress,
}) => {
    const { width: GAME_WIDTH } = useGameDimensions();

    // Card sizes — active card slightly larger than bench
    const cardBase = Math.min(GAME_WIDTH, 520);
    const activeCardWidth = Math.floor(cardBase * 0.185);
    const benchSlotSize = Math.floor(cardBase * 0.115);

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
                {/* Left side — opponent deck/prizes */}
                <View style={styles.sidePanel}>
                    <DeckPileBlock count={opponentDeckCount} label="Deck" />
                    <View style={styles.sideSpacer} />
                    <PrizeBlock count={opponentPrizeCount} />
                    <Text style={styles.handCount}>🃏 {opponentHandCount}</Text>
                </View>

                {/* Center — opponent bench (top) + active (bottom) */}
                <View style={styles.centerZone}>
                    {/* Opponent bench — near the divider line, facing player */}
                    <View style={styles.opponentBenchArea}>
                        <Text style={styles.benchLabel}>BENCH</Text>
                        {renderBench(opponentBench, false)}
                    </View>

                    {/* Opponent active — at the bottom of their half */}
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

            {/* ── DIVIDER ── */}
            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerBall}>
                    <View style={styles.dividerBallCenter} />
                </View>
                <View style={styles.dividerLine} />
            </View>

            {/* ── PLAYER HALF (blue zone) ── */}
            <View style={styles.playerHalf}>
                {/* Left side — player deck/prizes */}
                <View style={styles.sidePanel}>
                    <DeckPileBlock count={playerDeckCount} label="Deck" />
                    <View style={styles.sideSpacer} />
                    <PrizeBlock count={playerPrizeCount} />
                </View>

                {/* Center — player active (top) + bench (bottom) */}
                <View style={styles.centerZone}>
                    {/* Player active — at the top of their half */}
                    <View style={styles.activeZone}>
                        <ActiveSlot
                            card={playerActive}
                            isPlayer
                            selectedCardId={selectedCardId}
                            highlightTargets={highlightTargets}
                            onPress={handlePlayerActive}
                            cardWidth={activeCardWidth}
                        />
                    </View>

                    {/* Player bench — near the bottom */}
                    <View style={styles.playerBenchArea}>
                        <Text style={styles.benchLabel}>BENCH</Text>
                        {renderBench(playerBench, true)}
                    </View>
                </View>

                {/* Right side — empty or extra info */}
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
                                    isHighlighted={selectedHandCardId === card.id}
                                />
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>
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

    // ── divider ──
    divider: {
        height: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A0A14',
        zIndex: 10,
    },
    dividerLine: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    dividerBall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0A0A14',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -16,
    },
    dividerBallCenter: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
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
        height: 110,
        backgroundColor: '#0D1A2E',
        borderTopWidth: 2,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    handContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
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
        transform: [{ translateY: -10 }],
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
});

export default DesktopPlayMat;
