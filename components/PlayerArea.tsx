import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text } from 'react-native';
import { Player, Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';
import DeckPile from './DeckPile';
import DiscardPile from './DiscardPile';
import PrizeCards from './PrizeCards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlayerAreaProps {
    player: Player;
    onCardPress?: (card: CardType) => void;
    onCardLongPress?: (card: CardType) => void;
    selectedCardId?: string;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    player,
    onCardPress,
    onCardLongPress,
    selectedCardId,
}) => {
    return (
        <View style={styles.container}>
            {/* Top Row - Deck, Discard, Hand, Prize */}
            <View style={styles.topRow}>
                {/* Deck */}
                <DeckPile count={player.deck.length} size="small" />

                {/* Discard Pile */}
                <DiscardPile cards={player.discardPile} size="small" />

                {/* Hand Count */}
                <View style={styles.handInfo}>
                    <View style={styles.handBadge}>
                        <Text style={styles.handIcon}>🃏</Text>
                        <Text style={styles.handCountText}>{player.hand.length}</Text>
                    </View>
                    <Text style={styles.handLabel}>Hand</Text>
                </View>

                {/* Prize Cards */}
                <PrizeCards count={player.prizeCards.length} />
            </View>

            {/* Hand Cards */}
            <View style={styles.handSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.handContainer}
                    decelerationRate="fast"
                    snapToInterval={SCREEN_WIDTH * 0.15}
                >
                    {player.hand.length === 0 ? (
                        <View style={styles.emptyHand}>
                            <Text style={styles.emptyHandText}>No cards in hand</Text>
                        </View>
                    ) : (
                        player.hand.map((card, index) => (
                            <View
                                key={card.id}
                                style={[
                                    styles.handCard,
                                    { zIndex: player.hand.length - index },
                                    index > 0 && { marginLeft: -24 },
                                ]}
                            >
                                <Card
                                    card={card}
                                    isHighlighted={selectedCardId === card.id}
                                    onPress={() => onCardPress?.(card)}
                                    onLongPress={() => onCardLongPress?.(card)}
                                />
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.primary.red,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderTopWidth: 3,
        borderTopColor: Colors.primary.darkRed,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 8,
    },
    handInfo: {
        alignItems: 'center',
    },
    handBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    handIcon: {
        fontSize: 14,
    },
    handCountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    handLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    handSection: {
        height: 110,
    },
    handContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 4,
    },
    handCard: {
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
        transform: [{ translateY: 0 }],
    },
    emptyHand: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyHandText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontStyle: 'italic',
    },
});

export default PlayerArea;
