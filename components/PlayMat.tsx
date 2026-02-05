import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';
import StadiumZone from './StadiumZone';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
                                    <View style={styles.emptyBenchSlot} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Opponent Active (in front, closer to center) */}
                <View style={styles.activeZone}>
                    {opponentActive ? (
                        <Card
                            card={opponentActive}
                            isHighlighted={selectedCardId === opponentActive.id}
                            onPress={() => onCardPress?.(opponentActive.id)}
                        />
                    ) : (
                        <View style={styles.emptySlot} />
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
                        <Card
                            card={playerActive}
                            isHighlighted={
                                selectedCardId === playerActive.id ||
                                playerActive.isActive ||
                                highlightTargets
                            }
                            onPress={handlePlayerActivePress}
                        />
                    ) : (
                        <View style={styles.emptySlot} />
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
                                    <View style={styles.emptyBenchSlot} />
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
        width: SCREEN_WIDTH * 0.18,
        height: SCREEN_WIDTH * 0.18 * 1.4,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.playMat.border,
        borderStyle: 'dashed',
        opacity: 0.4,
    },
    emptyBenchSlot: {
        width: SCREEN_WIDTH * 0.12,
        height: SCREEN_WIDTH * 0.12 * 1.4,
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
});

export default PlayMat;
