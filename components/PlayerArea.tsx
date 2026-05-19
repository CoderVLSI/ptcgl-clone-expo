import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Animated } from 'react-native';
import { Player, Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';
import DeckPile from './DeckPile';
import DiscardPile from './DiscardPile';
import PrizeCards from './PrizeCards';
import useGameDimensions from '../hooks/useGameDimensions';

const IDEAL_HAND_SIZE = 7;

// Pulsing card wrapper — only active when this card is selected
interface PulsingCardProps {
    isSelected: boolean;
    children: React.ReactNode;
}

const PulsingCard: React.FC<PulsingCardProps> = ({ isSelected, children }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const loopRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (isSelected) {
            loopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
            loopRef.current.start();
        } else {
            loopRef.current?.stop();
            scaleAnim.setValue(1);
        }
        return () => {
            loopRef.current?.stop();
        };
    }, [isSelected, scaleAnim]);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {children}
        </Animated.View>
    );
};

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
    const { width: GAME_WIDTH } = useGameDimensions();
    const hand = player.hand;
    const [hasScrolled, setHasScrolled] = useState(false);

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
                        <Text style={styles.handCountText}>{hand.length}</Text>
                    </View>
                    <Text style={styles.handLabel}>Hand</Text>
                </View>

                {/* Prize Cards */}
                <PrizeCards count={player.prizeCards.length} />
            </View>

            {/* Hand Info Bar */}
            <View style={styles.handInfoBar}>
                <Text style={styles.handInfoLabel}>
                    Hand: <Text style={styles.handInfoCount}>{hand.length}</Text>
                </Text>
                <View style={styles.handPips}>
                    {Array.from({ length: IDEAL_HAND_SIZE }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.pip,
                                i < hand.length ? styles.pipFilled : styles.pipEmpty,
                            ]}
                        />
                    ))}
                </View>
            </View>

            {/* Hand Cards */}
            <View style={styles.handSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.handContainer,
                        hand.length === 0 && styles.handContainerEmpty,
                    ]}
                    decelerationRate="fast"
                    snapToInterval={GAME_WIDTH * 0.15}
                    onScrollBeginDrag={() => setHasScrolled(true)}
                >
                    {hand.length === 0 ? (
                        <View style={styles.emptyHand}>
                            <Text style={styles.emptyHandIcon}>🃏</Text>
                            <Text style={styles.emptyHandText}>No cards in hand</Text>
                        </View>
                    ) : (
                        hand.map((card, index) => (
                            <View
                                key={card.id}
                                style={[
                                    styles.handCard,
                                    { zIndex: hand.length - index },
                                    index > 0 && { marginLeft: -24 },
                                ]}
                            >
                                <PulsingCard isSelected={selectedCardId === card.id}>
                                    <Card
                                        card={card}
                                        isHighlighted={selectedCardId === card.id}
                                        onPress={() => onCardPress?.(card)}
                                        onLongPress={() => onCardLongPress?.(card)}
                                    />
                                </PulsingCard>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Swipe hint — only shown when hand > 4 and user hasn't scrolled yet */}
            {hand.length > 4 && !hasScrolled && (
                <Text style={styles.swipeHint}>← swipe to browse →</Text>
            )}
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

    // Hand info bar
    handInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingHorizontal: 4,
    },
    handInfoLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
    handInfoCount: {
        color: Colors.ui.white,
        fontWeight: 'bold',
    },
    handPips: {
        flexDirection: 'row',
        gap: 3,
    },
    pip: {
        width: 8,
        height: 8,
        borderRadius: 2,
    },
    pipFilled: {
        backgroundColor: '#FFD700',
    },
    pipEmpty: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },

    // Hand scroll
    handSection: {
        height: 110,
    },
    handContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 4,
    },
    handContainerEmpty: {
        flex: 1,
        justifyContent: 'center',
    },
    handCard: {
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
        transform: [{ translateY: 0 }],
    },

    // Empty hand
    emptyHand: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyHandIcon: {
        fontSize: 30,
        opacity: 0.3,
        marginBottom: 6,
    },
    emptyHandText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontStyle: 'italic',
    },

    // Swipe hint
    swipeHint: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.45)',
        fontSize: 10,
        fontStyle: 'italic',
        marginTop: 2,
    },
});

export default PlayerArea;
