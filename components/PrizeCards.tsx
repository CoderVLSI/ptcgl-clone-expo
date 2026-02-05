import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrizeCardsProps {
    count: number;
    maxCards?: number;
    isOpponent?: boolean;
    orientation?: 'horizontal' | 'vertical';
}

export const PrizeCards: React.FC<PrizeCardsProps> = ({
    count,
    maxCards = 6,
    isOpponent = false,
    orientation = 'horizontal',
}) => {
    const cardWidth = SCREEN_WIDTH * 0.08;
    const cardHeight = cardWidth * 1.4;

    const isVertical = orientation === 'vertical';

    return (
        <View style={[styles.container, isVertical && styles.containerVertical]}>
            <Text style={styles.label}>Prize</Text>

            <View style={[styles.cardsContainer, isVertical && styles.cardsVertical]}>
                {[...Array(maxCards)].map((_, i) => {
                    const isCollected = i >= count;
                    return (
                        <View
                            key={i}
                            style={[
                                styles.card,
                                {
                                    width: cardWidth,
                                    height: cardHeight,
                                    marginLeft: !isVertical && i > 0 ? -cardWidth * 0.3 : 0,
                                    marginTop: isVertical && i > 0 ? -cardHeight * 0.3 : 0,
                                },
                                isCollected && styles.cardCollected,
                            ]}
                        >
                            {!isCollected && (
                                <View style={styles.cardInner}>
                                    <View style={styles.miniPokeball} />
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            <View style={[styles.countBadge, isOpponent && styles.countBadgeOpponent]}>
                <Text style={styles.countText}>{count}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    containerVertical: {
        flexDirection: 'row',
    },
    label: {
        color: Colors.ui.white,
        fontSize: 9,
        fontWeight: '600',
        marginBottom: 4,
        opacity: 0.8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardsVertical: {
        flexDirection: 'column',
    },
    card: {
        backgroundColor: '#1A1A2E',
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#4A4A7E',
        overflow: 'hidden',
    },
    cardCollected: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
    },
    cardInner: {
        flex: 1,
        backgroundColor: '#2A2A4E',
        margin: 1,
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniPokeball: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E53935',
        borderWidth: 1,
        borderColor: '#1A1A2E',
    },
    countBadge: {
        marginTop: 6,
        backgroundColor: Colors.primary.darkRed,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: Colors.ui.white,
    },
    countBadgeOpponent: {
        backgroundColor: Colors.primary.maroon,
    },
    countText: {
        color: Colors.ui.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default PrizeCards;
