import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Player } from '../types/game';
import Colors from '../constants/colors';
import DeckPile from './DeckPile';
import DiscardPile from './DiscardPile';
import PrizeCards from './PrizeCards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OpponentAreaProps {
    opponent: Player;
}

export const OpponentArea: React.FC<OpponentAreaProps> = ({
    opponent,
}) => {
    return (
        <View style={styles.container}>
            {/* Left Section - Avatar */}
            <View style={styles.leftSection}>
                <View style={styles.avatarContainer}>
                    {opponent.avatar ? (
                        <Image source={{ uri: opponent.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarEmoji}>👤</Text>
                        </View>
                    )}
                    <View style={styles.avatarFrame} />
                </View>
            </View>

            {/* Center Section - Deck, Discard & Prize */}
            <View style={styles.centerSection}>
                {/* Deck */}
                <DeckPile count={opponent.deck.length} isOpponent size="small" />

                {/* Discard Pile */}
                <DiscardPile cards={opponent.discardPile} isOpponent size="small" />

                {/* Prize Cards */}
                <PrizeCards count={opponent.prizeCards.length} isOpponent />
            </View>

            {/* Hand Count */}
            <View style={styles.rightSection}>
                <View style={styles.handBadge}>
                    <Text style={styles.handIcon}>🃏</Text>
                    <Text style={styles.handCount}>{opponent.hand.length}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.primary.red,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: Colors.primary.darkRed,
    },
    leftSection: {
        alignItems: 'center',
        marginRight: 12,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.primary.maroon,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarEmoji: {
        fontSize: 26,
    },
    avatarFrame: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: Colors.card.highlight,
    },
    centerSection: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    energyRow: {
        flexDirection: 'row',
        gap: 4,
    },
    rightSection: {
        marginLeft: 8,
        alignItems: 'center',
    },
    handBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    handIcon: {
        fontSize: 14,
    },
    handCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
});

export default OpponentArea;
