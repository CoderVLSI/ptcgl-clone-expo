import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import Colors from '../constants/colors';

interface GameControlsProps {
    hasAttachedEnergy: boolean;
    deckCount: number;
    discardCount: number;
    currentTurn: number;
    isPlayerTurn: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
    hasAttachedEnergy,
    deckCount,
    discardCount,
    currentTurn,
    isPlayerTurn,
}) => {
    return (
        <View style={styles.container}>
            {/* Status Row */}
            <View style={styles.statusRow}>
                {/* Turn Indicator */}
                <View style={styles.turnIndicator}>
                    <Text style={styles.turnLabel}>Turn</Text>
                    <Text style={styles.turnValue}>{currentTurn}</Text>
                </View>

                {/* Current Player */}
                <View style={[styles.playerBadge, isPlayerTurn ? styles.yourTurn : styles.oppTurn]}>
                    <Text style={styles.playerBadgeText}>
                        {isPlayerTurn ? 'Your Turn' : "Opp's Turn"}
                    </Text>
                </View>

                {/* Energy Attached */}
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, hasAttachedEnergy && styles.statusDotActive]} />
                    <Text style={styles.statusText}>Energy</Text>
                </View>

                {/* Deck Count */}
                <View style={styles.countItem}>
                    <Text style={styles.countLabel}>Deck</Text>
                    <Text style={styles.countValue}>{deckCount}</Text>
                </View>

                {/* Discard Count */}
                <View style={styles.countItem}>
                    <Text style={styles.countLabel}>Discard</Text>
                    <Text style={styles.countValue}>{discardCount}</Text>
                </View>
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
});

export default GameControls;
