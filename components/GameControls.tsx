import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import Colors from '../constants/colors';
import { StatusCondition } from '../types/game';

const STATUS_EMOJI: Record<StatusCondition, string> = {
    poisoned: '☠',
    burned: '🔥',
    asleep: '💤',
    paralyzed: '⚡',
    confused: '😵',
};

interface GameControlsProps {
    hasAttachedEnergy: boolean;
    deckCount: number;
    discardCount: number;
    currentTurn: number;
    isPlayerTurn: boolean;
    activeStatusCondition?: StatusCondition;
    activeRetreatCost?: number;
    activeEnergyCount?: number;
    canRetreat?: boolean;
    onRetreat?: () => void;
    // New optional props
    prizeCount?: number;
    opponentDeckCount?: number;
}

export const GameControls: React.FC<GameControlsProps> = ({
    hasAttachedEnergy,
    deckCount,
    discardCount,
    currentTurn,
    isPlayerTurn,
    activeStatusCondition,
    activeRetreatCost = 0,
    activeEnergyCount = 0,
    canRetreat = false,
    onRetreat,
    prizeCount,
    opponentDeckCount,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isPlayerTurn) {
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isPlayerTurn]);

    // Deck count display helpers
    const deckIsEmpty = deckCount === 0;
    const deckIsLow = deckCount > 0 && deckCount < 5;
    const deckCountColor = deckIsEmpty || deckIsLow ? '#FF4444' : Colors.ui.white;

    // Prize display helpers
    const lastPrize = prizeCount === 1;
    const prizeBadgeColor = lastPrize ? '#22C55E' : '#C9A100';

    return (
        <View style={styles.container}>
            {/* Status Row */}
            <View style={styles.statusRow}>
                {/* Turn Indicator */}
                <View style={styles.turnIndicator}>
                    <Text style={styles.turnLabel}>Turn</Text>
                    <Text style={styles.turnValue}>{currentTurn}</Text>
                </View>

                {/* Prize Card Counter */}
                {prizeCount !== undefined && (
                    <View style={[styles.prizeBadge, { backgroundColor: prizeBadgeColor }]}>
                        <Text style={styles.prizeBadgeText}>
                            {lastPrize ? '🏆 1 — LAST PRIZE!' : `🏆 ${prizeCount}`}
                        </Text>
                    </View>
                )}

                {/* Current Player — animated pulse on your turn */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View style={[styles.playerBadge, isPlayerTurn ? styles.yourTurn : styles.oppTurn]}>
                        <Text style={styles.playerBadgeText}>
                            {isPlayerTurn ? 'Your Turn' : "Opp's Turn"}
                        </Text>
                    </View>
                </Animated.View>

                {/* Active Status Condition */}
                {activeStatusCondition && (
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                            {STATUS_EMOJI[activeStatusCondition]} {activeStatusCondition.toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Energy Attached */}
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, hasAttachedEnergy && styles.statusDotActive]} />
                    <Text style={styles.statusText}>Energy</Text>
                </View>

                {/* Deck Count */}
                <View style={styles.countItem}>
                    <Text style={styles.countLabel}>Deck</Text>
                    {deckIsEmpty ? (
                        <Text style={[styles.countValue, styles.deckOutText]}>DECK OUT!</Text>
                    ) : (
                        <Text style={[styles.countValue, { color: deckCountColor }]}>
                            {deckIsLow ? `⚠ ${deckCount}` : `${deckCount}`}
                        </Text>
                    )}
                </View>

                {/* Discard Count */}
                <View style={styles.countItem}>
                    <Text style={styles.countLabel}>Discard</Text>
                    <Text style={styles.countValue}>{discardCount}</Text>
                </View>

                {/* Opponent Deck Count */}
                {opponentDeckCount !== undefined && (
                    <View style={styles.countItem}>
                        <Text style={styles.countLabel}>Opp deck</Text>
                        <Text style={[
                            styles.countValue,
                            opponentDeckCount < 5 && styles.oppDeckLow,
                        ]}>
                            {opponentDeckCount}
                        </Text>
                    </View>
                )}

                {/* Retreat Button */}
                {isPlayerTurn && activeRetreatCost >= 0 && onRetreat && (
                    <TouchableOpacity
                        style={[styles.retreatButton, !canRetreat && styles.retreatButtonDisabled]}
                        onPress={canRetreat ? onRetreat : undefined}
                        disabled={!canRetreat}
                    >
                        <Text style={styles.retreatButtonText}>
                            ↩ {activeRetreatCost > 0 ? `(${activeRetreatCost})` : 'FREE'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    turnIndicator: {
        alignItems: 'center',
    },
    turnLabel: {
        fontSize: 9,
        color: '#666',
    },
    turnValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.card.highlight,
    },
    prizeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    prizeBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    playerBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    yourTurn: {
        backgroundColor: Colors.energy.grass,
    },
    oppTurn: {
        backgroundColor: Colors.energy.fire,
    },
    playerBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#444',
        borderWidth: 1,
        borderColor: '#666',
    },
    statusDotActive: {
        backgroundColor: Colors.energy.grass,
        borderColor: Colors.energy.grass,
    },
    statusText: {
        fontSize: 10,
        color: '#888',
    },
    countItem: {
        alignItems: 'center',
    },
    countLabel: {
        fontSize: 9,
        color: '#666',
    },
    countValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    deckOutText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FF4444',
    },
    oppDeckLow: {
        color: '#FF4444',
    },
    statusBadge: {
        backgroundColor: '#800080',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 9,
        color: '#FFF',
        fontWeight: 'bold',
    },
    retreatButton: {
        backgroundColor: '#1A6B3A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    retreatButtonDisabled: {
        backgroundColor: '#333',
        opacity: 0.5,
    },
    retreatButtonText: {
        fontSize: 10,
        color: '#FFF',
        fontWeight: 'bold',
    },
});

export default GameControls;
