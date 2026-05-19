import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';
import StadiumZone from './StadiumZone';
import useGameDimensions from '../hooks/useGameDimensions';

const ENERGY_COLORS: Record<string, string> = {
    fire:      '#C04808',
    water:     '#2060C0',
    grass:     '#3A8A30',
    lightning: '#C8A000',
    psychic:   '#A040A0',
    fighting:  '#C03028',
    darkness:  '#403830',
    metal:     '#6870A0',
    fairy:     '#EE99AC',
    dragon:    '#7038F8',
    colorless: '#888888',
};

const STATUS_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
    poisoned:  { emoji: '☠', color: '#9B59B6', label: 'PSN' },
    burned:    { emoji: '🔥', color: '#E74C3C', label: 'BRN' },
    asleep:    { emoji: '💤', color: '#3498DB', label: 'SLP' },
    paralyzed: { emoji: '⚡', color: '#F1C40F', label: 'PAR' },
    confused:  { emoji: '💫', color: '#E67E22', label: 'CNF' },
};

interface PlayMatProps {
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
    // Extra info shown in side columns on desktop
    opponentDeckCount?: number;
    opponentHandCount?: number;
    opponentPrizeCount?: number;
    playerDeckCount?: number;
    playerPrizeCount?: number;
    // Player hand — shown inside right column on desktop
    playerHand?: CardType[];
    selectedHandCardId?: string;
    onHandCardPress?: (card: CardType) => void;
    onHandCardLongPress?: (card: CardType) => void;
}

const getHpBarColor = (ratio: number): string => {
    if (ratio > 0.5) return '#4CAF50';
    if (ratio > 0.25) return '#FFC107';
    return '#F44336';
};

export const DesktopPlayMat: React.FC<PlayMatProps> = ({
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

    const handlePlayerBenchPress = (cardId: string) => {
        if (onBenchCardPress) {
            onBenchCardPress(cardId);
        } else if (onCardPress) {
            onCardPress(cardId);
        }
    };

    const handlePlayerActivePress = () => {
        if (playerActive) {
            if (onBenchCardPress && highlightTargets) {
                onBenchCardPress(playerActive.id);
            } else if (onCardPress) {
                onCardPress(playerActive.id);
            }
        }
    };

    const renderHpBar = (card: CardType) => {
        const hp = card.hp ?? 100;
        const dmg = card.damageCounters ?? 0;
        const remaining = Math.max(0, hp - dmg);
        const ratio = remaining / hp;

        return (
            <>
                <View style={styles.hpBarTrack}>
                    <View
                        style={[
                            styles.hpBarFill,
                            {
                                width: `${ratio * 100}%`,
                                backgroundColor: getHpBarColor(ratio),
                            },
                        ]}
                    />
                </View>
                <Text style={styles.hpLabel} numberOfLines={1}>{remaining}/{hp}</Text>
            </>
        );
    };

    const renderEnergyRow = (card: CardType) => {
        if (!card.attachedEnergy || card.attachedEnergy.length === 0) return null;
        const shown = card.attachedEnergy.slice(0, 8);
        const overflow = card.attachedEnergy.length - 8;
        return (
            <View style={styles.energyRow}>
                {shown.map((energy, i) => (
                    <View
                        key={i}
                        style={[
                            styles.energyDot,
                            { backgroundColor: ENERGY_COLORS[energy] ?? '#888888' },
                        ]}
                    />
                ))}
                {overflow > 0 && (
                    <Text style={styles.energyOverflow}>+{overflow}</Text>
                )}
            </View>
        );
    };

    const renderStatusBadge = (card: CardType) => {
        if (!card.statusCondition) return null;
        const config = STATUS_CONFIG[card.statusCondition];
        if (!config) return null;
        return (
            <View
                style={[
                    styles.statusBadge,
                    { backgroundColor: config.color + 'D9' },
                ]}
            >
                <Text style={styles.statusBadgeText}>{config.emoji} {config.label}</Text>
            </View>
        );
    };

    // Bench slot size must match Card's isSmall width: min(GAME_WIDTH,520)*0.12
    const cardBase = Math.min(GAME_WIDTH, 520);
    const benchSlotSize = Math.floor(cardBase * 0.12);

    return (
        <View style={styles.container}>
            {/* Background pattern lines */}
            <View style={styles.matPattern}>
                <View style={styles.horizontalLine} />
                <View style={styles.verticalLine} />
            </View>

            {/* 3-column horizontal layout */}
            <View style={styles.columns}>

                {/* ── Left column: Opponent side ── */}
                <View style={styles.opponentColumn}>
                    {/* Opponent stats bar */}
                    <View style={styles.statsBar}>
                        <Text style={styles.statChip}>🃏 {opponentHandCount}</Text>
                        <Text style={styles.statChip}>📦 {opponentDeckCount}</Text>
                        <Text style={styles.statChip}>🏆 {opponentPrizeCount}</Text>
                    </View>

                    {/* Opponent bench — horizontal row at top */}
                    <View style={styles.benchRow}>
                        {[...Array(5)].map((_, index) => {
                            const benchCard = opponentBench[index];
                            return (
                                <View key={index} style={styles.benchSlot}>
                                    {benchCard ? (
                                        <Card
                                            card={benchCard}
                                            isSmall
                                            isHighlighted={selectedCardId === benchCard.id}
                                            onPress={() => onCardPress?.(benchCard.id)}
                                        />
                                    ) : (
                                        <View
                                            style={[
                                                styles.emptyBenchSlot,
                                                { width: benchSlotSize, height: benchSlotSize * 1.4 },
                                            ]}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* Opponent active — bigger card, centered */}
                    <View style={styles.activeArea}>
                        {opponentActive ? (
                            <View style={styles.activeCardWrapper}>
                                <Card
                                    card={opponentActive}
                                    isHighlighted={selectedCardId === opponentActive.id}
                                    onPress={() => onCardPress?.(opponentActive.id)}
                                />
                                {renderHpBar(opponentActive)}
                                {renderStatusBadge(opponentActive)}
                                {renderEnergyRow(opponentActive)}
                            </View>
                        ) : (
                            <View style={styles.emptyActiveSlot} />
                        )}
                    </View>
                </View>

                {/* ── Center column: Stadium + divider circle ── */}
                <View style={styles.centerColumn}>
                    {/* Stadium zone at top */}
                    <View style={styles.stadiumArea}>
                        <StadiumZone stadium={stadium} stadiumOwner={stadiumOwner} />
                    </View>

                    {/* Center divider circle */}
                    <View style={styles.dividerCircleWrapper}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerCircle} />
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Bottom spacer to balance layout */}
                    <View style={styles.centerBottom} />
                </View>

                {/* ── Right column: Player side ── */}
                <View style={styles.playerColumn}>
                    {/* Player active — bigger card, centered */}
                    <View style={styles.activeArea}>
                        {playerActive ? (
                            <View style={styles.activeCardWrapper}>
                                <Card
                                    card={playerActive}
                                    isHighlighted={
                                        selectedCardId === playerActive.id ||
                                        playerActive.isActive ||
                                        highlightTargets
                                    }
                                    onPress={handlePlayerActivePress}
                                />
                                {renderHpBar(playerActive)}
                                {renderStatusBadge(playerActive)}
                                {renderEnergyRow(playerActive)}
                            </View>
                        ) : (
                            <View style={styles.emptyActiveSlot} />
                        )}
                    </View>

                    {/* Player bench — horizontal row at bottom */}
                    <View style={styles.benchRow}>
                        {[...Array(5)].map((_, index) => {
                            const benchCard = playerBench[index];
                            return (
                                <View key={index} style={styles.benchSlot}>
                                    {benchCard ? (
                                        <Card
                                            card={benchCard}
                                            isSmall
                                            isHighlighted={
                                                selectedCardId === benchCard.id || highlightTargets
                                            }
                                            onPress={() => handlePlayerBenchPress(benchCard.id)}
                                        />
                                    ) : (
                                        <View
                                            style={[
                                                styles.emptyBenchSlot,
                                                { width: benchSlotSize, height: benchSlotSize * 1.4 },
                                            ]}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* Player hand strip */}
                    <View style={styles.handStrip}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.handScrollContent}
                        >
                            {playerHand.length === 0 ? (
                                <Text style={styles.emptyHandText}>No cards in hand</Text>
                            ) : (
                                playerHand.map((card, index) => (
                                    <TouchableOpacity
                                        key={card.id}
                                        onPress={() => onHandCardPress?.(card)}
                                        onLongPress={() => onHandCardLongPress?.(card)}
                                        style={[
                                            styles.handCard,
                                            index > 0 && { marginLeft: -14 },
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

                    {/* Player stats bar */}
                    <View style={styles.statsBar}>
                        <Text style={styles.statChip}>📦 {playerDeckCount}</Text>
                        <Text style={styles.statChip}>🏆 {playerPrizeCount}</Text>
                    </View>
                </View>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.playMat.green,
        position: 'relative',
    },
    matPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    horizontalLine: {
        position: 'absolute',
        height: 2,
        width: '80%',
        backgroundColor: Colors.playMat.border,
        opacity: 0.3,
    },
    verticalLine: {
        position: 'absolute',
        width: 2,
        height: '80%',
        backgroundColor: Colors.playMat.border,
        opacity: 0.3,
    },

    // 3-column row
    columns: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },

    // Left column — opponent
    opponentColumn: {
        flex: 2.2,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 8,
    },

    // Right column — player
    playerColumn: {
        flex: 2.2,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 8,
    },

    // Center column
    centerColumn: {
        flex: 0.8,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },

    stadiumArea: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },

    dividerCircleWrapper: {
        alignItems: 'center',
        width: '100%',
    },

    dividerLine: {
        width: 2,
        flex: 1,
        minHeight: 20,
        backgroundColor: Colors.playMat.border,
        opacity: 0.5,
        alignSelf: 'center',
    },

    dividerCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.playMat.border,
        marginVertical: 8,
        opacity: 0.6,
    },

    centerBottom: {
        flex: 1,
    },

    // Stats bar
    statsBar: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        paddingVertical: 4,
    },
    statChip: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },

    // Bench row (horizontal)
    benchRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        flexWrap: 'nowrap',
    },

    benchSlot: {
        alignItems: 'center',
    },

    emptyBenchSlot: {
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Colors.playMat.border,
        borderStyle: 'dashed',
        opacity: 0.35,
    },

    // Active card area
    activeArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
    },

    activeCardWrapper: {
        alignItems: 'center',
        minWidth: 100,
    },

    emptyActiveSlot: {
        width: 90,
        height: 126,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.playMat.border,
        borderStyle: 'dashed',
        opacity: 0.4,
    },

    // HP bar
    hpBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.4)',
        marginTop: 4,
        overflow: 'hidden',
    },
    hpBarFill: {
        height: 6,
        borderRadius: 3,
    },
    hpLabel: {
        color: '#FFFFFF',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 2,
    },

    // Status badge
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 3,
        alignSelf: 'center',
    },
    statusBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Energy row
    energyRow: {
        flexDirection: 'row',
        gap: 3,
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 2,
    },
    energyDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    energyOverflow: {
        color: '#FFFFFF',
        fontSize: 8,
    },

    // Player hand strip (inside right column)
    handStrip: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 6,
        marginVertical: 4,
        minHeight: 88,
        justifyContent: 'center',
    },
    handScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        minWidth: '100%',
    },
    handCard: {
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 4,
    },
    handCardSelected: {
        transform: [{ translateY: -6 }],
    },
    emptyHandText: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 11,
        fontStyle: 'italic',
        paddingHorizontal: 12,
    },
});

export default DesktopPlayMat;
