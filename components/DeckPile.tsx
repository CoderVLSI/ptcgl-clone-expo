import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DeckPileProps {
    count: number;
    isOpponent?: boolean;
    onPress?: () => void;
    size?: 'small' | 'medium' | 'large';
}

export const DeckPile: React.FC<DeckPileProps> = ({
    count,
    isOpponent = false,
    onPress,
    size = 'medium',
}) => {
    const sizeMultiplier = size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
    const cardWidth = SCREEN_WIDTH * 0.12 * sizeMultiplier;
    const cardHeight = cardWidth * 1.4;

    // Create stacked card effect
    const stackCount = Math.min(count, 5);

    return (
        <TouchableOpacity
            style={[styles.container, { width: cardWidth + 8, height: cardHeight + 8 }]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.8}
        >
            {/* Card Stack */}
            {[...Array(stackCount)].map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.card,
                        {
                            width: cardWidth,
                            height: cardHeight,
                            bottom: i * 2,
                            left: i * 1,
                            zIndex: stackCount - i,
                        },
                    ]}
                >
                    <View style={styles.cardInner}>
                        {/* Pokeball Design */}
                        <View style={styles.pokeballContainer}>
                            <View style={styles.pokeballTop} />
                            <View style={styles.pokeballCenter}>
                                <View style={styles.pokeballButton} />
                            </View>
                            <View style={styles.pokeballBottom} />
                        </View>
                    </View>
                </View>
            ))}

            {/* Count Badge */}
            <View style={[styles.countBadge, isOpponent && styles.countBadgeOpponent]}>
                <Text style={styles.countText}>{count}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    card: {
        position: 'absolute',
        backgroundColor: '#1A1A2E',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#4A4A7E',
        overflow: 'hidden',
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 4,
    },
    cardInner: {
        flex: 1,
        backgroundColor: '#2A2A4E',
        margin: 2,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pokeballContainer: {
        width: '60%',
        aspectRatio: 1,
    },
    pokeballTop: {
        flex: 1,
        backgroundColor: '#E53935',
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
    },
    pokeballCenter: {
        height: 4,
        backgroundColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pokeballButton: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.ui.white,
        borderWidth: 2,
        borderColor: '#1A1A2E',
        position: 'absolute',
    },
    pokeballBottom: {
        flex: 1,
        backgroundColor: Colors.ui.white,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    countBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: Colors.primary.darkRed,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: Colors.ui.white,
        zIndex: 10,
    },
    countBadgeOpponent: {
        backgroundColor: Colors.primary.maroon,
    },
    countText: {
        color: Colors.ui.white,
        fontSize: 11,
        fontWeight: 'bold',
    },
});

export default DeckPile;
