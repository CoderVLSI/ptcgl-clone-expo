import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DesktopPlayMat from './DesktopPlayMat';

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
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';
import StadiumZone from './StadiumZone';
import useGameDimensions from '../hooks/useGameDimensions';

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
}

const getHpBarColor = (ratio: number): string => {
    if (ratio > 0.5) return '#4CAF50';
    if (ratio > 0.25) return '#FFC107';
    return '#F44336';
};

export const PlayMat: React.FC<PlayMatProps> = ({
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
}) => {
    const { width: GAME_WIDTH, isDesktop } = useGameDimensions();

    if (isDesktop) {
        return (
            <DesktopPlayMat
                opponentActive={opponentActive}
                opponentBench={opponentBench}
                playerActive={playerActive}
                playerBench={playerBench}
                onCardPress={onCardPress}
                onBenchCardPress={onBenchCardPress}
                selectedCardId={selectedCardId}
                highlightTargets={highlightTargets}
                stadium={stadium}
                stadiumOwner={stadiumOwner}
            />
        );
    }

    const emptySlotSize = GAME_WIDTH * 0.18;
    const emptyBenchSlotSize = GAME_WIDTH * 0.12;

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
                // When selecting a target, use bench card handler for active too
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
                    { backgroundColor: config.color + 'D9' }, // D9 ≈ 85% opacity in hex
                ]}
            >
                <Text style={styles.statusBadgeText}>{config.emoji} {config.label}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Mat Background Pattern */}
            <View style={styles.matPattern}>
                {/* Grid lines */}
                <View style={styles.horizontalLine} />
                <View style={styles.verticalLine} />
            </View>

            {/* Stadium Zone - Left Side */}
            <View style={styles.stadiumZoneContainer}>
                <StadiumZone stadium={stadium} stadiumOwner={stadiumOwner} />
            </View>

            {/* Opponent's Side */}
            <View style={styles.opponentSide}>
                {/* Opponent Bench (behind, at top) */}
                <View style={styles.benchZone}>
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
                                    <View style={[styles.emptyBenchSlot, { width: emptyBenchSlotSize, height: emptyBenchSlotSize * 1.4 }]} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Opponent Active (in front, closer to center) */}
                <View style={styles.activeZone}>
                    {opponentActive ? (
                        <View style={{ alignItems: 'center' }}>
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
                        <View style={[styles.emptySlot, { width: emptySlotSize, height: emptySlotSize * 1.4 }]} />
                    )}
                </View>
            </View>

            {/* Center Divider */}
            <View style={styles.centerDivider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerCircle} />
                <View style={styles.dividerLine} />
            </View>

            {/* Player's Side */}
            <View style={styles.playerSide}>
                {/* Player Active (in front, closer to center) */}
                <View style={styles.activeZone}>
                    {playerActive ? (
                        <View style={{ alignItems: 'center' }}>
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
                        <View style={[styles.emptySlot, { width: emptySlotSize, height: emptySlotSize * 1.4 }]} />
                    )}
                </View>

                {/* Player Bench (behind, at bottom) */}
                <View style={styles.benchZone}>
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
                                    <View style={[styles.emptyBenchSlot, { width: emptyBenchSlotSize, height: emptyBenchSlotSize * 1.4 }]} />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.playMat.green,
        paddingHorizontal: 8,
        paddingVertical: 12,
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
    opponentSide: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    playerSide: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    activeZone: {
        marginVertical: 8,
    },
    benchZone: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 8,
    },
    benchSlot: {
        alignItems: 'center',
    },
    emptySlot: {
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.playMat.border,
        borderStyle: 'dashed',
        opacity: 0.4,
    },
    emptyBenchSlot: {
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Colors.playMat.border,
        borderStyle: 'dashed',
        opacity: 0.3,
    },
    centerDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 2,
        backgroundColor: Colors.playMat.border,
        opacity: 0.5,
    },
    dividerCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.playMat.border,
        marginHorizontal: 8,
        opacity: 0.5,
    },
    stadiumZoneContainer: {
        position: 'absolute',
        left: 10,
        top: '50%',
        transform: [{ translateY: -35 }],
        zIndex: 15,
    },
    hpBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.4)',
        marginTop: 3,
        overflow: 'hidden',
    },
    hpBarFill: {
        height: 6,
        borderRadius: 3,
    },
    hpLabel: {
        color: '#FFFFFF',
        fontSize: 9,
        textAlign: 'center',
        marginTop: 2,
    },
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
});

export default PlayMat;
