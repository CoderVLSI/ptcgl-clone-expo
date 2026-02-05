import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';

interface StadiumZoneProps {
    stadium?: CardType;
    stadiumOwner?: 'player' | 'opponent';
    onPress?: () => void;
}

export const StadiumZone: React.FC<StadiumZoneProps> = ({
    stadium,
    stadiumOwner,
    onPress,
}) => {
    const [showDetail, setShowDetail] = useState(false);

    if (!stadium) {
        return (
            <View style={styles.emptyZone}>
                <Text style={styles.emptyIcon}>🏟️</Text>
                <Text style={styles.emptyText}>Stadium</Text>
            </View>
        );
    }

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.container,
                    stadiumOwner === 'player' ? styles.playerOwned : styles.opponentOwned,
                ]}
                onPress={() => setShowDetail(true)}
            >
                {/* Stadium Card (shown smaller) */}
                <View style={styles.cardContainer}>
                    <Card card={stadium} isSmall />
                </View>

                {/* Owner Badge */}
                <View style={[
                    styles.ownerBadge,
                    stadiumOwner === 'player' ? styles.playerBadge : styles.opponentBadge,
                ]}>
                    <Text style={styles.ownerText}>
                        {stadiumOwner === 'player' ? 'Your' : 'Opp'}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Stadium Detail Modal */}
            <Modal
                visible={showDetail}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDetail(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDetail(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Stadium In Play</Text>
                        <Text style={styles.stadiumName}>{stadium.name}</Text>

                        <View style={styles.cardPreview}>
                            <Card card={stadium} />
                        </View>

                        <Text style={styles.ownerInfo}>
                            Played by: {stadiumOwner === 'player' ? 'You' : 'Opponent'}
                        </Text>

                        <Text style={styles.hint}>
                            This stadium stays in play until a different stadium is played.
                        </Text>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDetail(false)}
                        >
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    emptyZone: {
        width: 50,
        height: 70,
        backgroundColor: 'rgba(100, 100, 100, 0.2)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 18,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: 8,
        color: '#666',
        marginTop: 2,
    },
    container: {
        position: 'relative',
        borderRadius: 8,
        padding: 2,
        borderWidth: 2,
    },
    playerOwned: {
        borderColor: Colors.primary.red,
        backgroundColor: 'rgba(200, 50, 50, 0.2)',
    },
    opponentOwned: {
        borderColor: Colors.energy.water,
        backgroundColor: 'rgba(50, 50, 200, 0.2)',
    },
    cardContainer: {
        transform: [{ scale: 0.7 }],
        marginTop: -10,
        marginBottom: -10,
        marginLeft: -8,
        marginRight: -8,
    },
    ownerBadge: {
        position: 'absolute',
        bottom: -8,
        left: '50%',
        marginLeft: -15,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    playerBadge: {
        backgroundColor: Colors.primary.red,
    },
    opponentBadge: {
        backgroundColor: Colors.energy.water,
    },
    ownerText: {
        fontSize: 8,
        color: Colors.ui.white,
        fontWeight: 'bold',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.card.highlight,
        maxWidth: '85%',
    },
    modalTitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 4,
    },
    stadiumName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.ui.white,
        marginBottom: 16,
        textAlign: 'center',
    },
    cardPreview: {
        marginBottom: 16,
    },
    ownerInfo: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 8,
    },
    hint: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
    },
    closeButton: {
        backgroundColor: Colors.card.highlight,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    closeText: {
        color: Colors.ui.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default StadiumZone;
