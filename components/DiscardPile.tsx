import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DiscardPileProps {
    cards: CardType[];
    isOpponent?: boolean;
    size?: 'small' | 'medium';
}

export const DiscardPile: React.FC<DiscardPileProps> = ({
    cards,
    isOpponent = false,
    size = 'small',
}) => {
    const [showModal, setShowModal] = useState(false);

    const pileSize = size === 'small' ? 40 : 50;
    const count = cards.length;

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.container,
                    { width: pileSize, height: pileSize * 1.4 },
                    count === 0 && styles.emptyPile,
                ]}
                onPress={() => count > 0 && setShowModal(true)}
                disabled={count === 0}
            >
                {/* Stack effect */}
                {count > 0 && (
                    <>
                        {count > 2 && (
                            <View style={[styles.stackCard, styles.stackBack, { width: pileSize, height: pileSize * 1.4 }]} />
                        )}
                        {count > 1 && (
                            <View style={[styles.stackCard, styles.stackMiddle, { width: pileSize, height: pileSize * 1.4 }]} />
                        )}
                        <View style={[styles.topCard, { width: pileSize, height: pileSize * 1.4 }]}>
                            <Text style={styles.discardIcon}>🗑️</Text>
                        </View>
                    </>
                )}

                {/* Empty state */}
                {count === 0 && (
                    <View style={styles.emptyContent}>
                        <Text style={styles.emptyIcon}>🗑️</Text>
                    </View>
                )}

                {/* Count Badge */}
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>

                {/* Label */}
                <Text style={styles.label}>Discard</Text>
            </TouchableOpacity>

            {/* Discard Pile Viewer Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isOpponent ? "Opponent's" : 'Your'} Discard Pile
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {count} card{count !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {/* Cards Grid */}
                        <ScrollView
                            contentContainerStyle={styles.cardsGrid}
                            showsVerticalScrollIndicator={false}
                        >
                            {cards.length === 0 ? (
                                <Text style={styles.emptyText}>No cards in discard pile</Text>
                            ) : (
                                cards.map((card, index) => (
                                    <View key={`${card.id}-${index}`} style={styles.cardWrapper}>
                                        <Card card={card} isSmall />
                                        <Text style={styles.cardIndex}>#{index + 1}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {/* Close Button */}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
    },
    emptyPile: {
        opacity: 0.5,
    },
    stackCard: {
        position: 'absolute',
        backgroundColor: '#333',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#444',
    },
    stackBack: {
        top: 4,
        left: 4,
        opacity: 0.4,
    },
    stackMiddle: {
        top: 2,
        left: 2,
        opacity: 0.6,
    },
    topCard: {
        backgroundColor: '#4A4A4A',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
    },
    discardIcon: {
        fontSize: 18,
    },
    emptyContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(100, 100, 100, 0.3)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#444',
        borderStyle: 'dashed',
    },
    emptyIcon: {
        fontSize: 16,
        opacity: 0.5,
    },
    countBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.energy.fire,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    countText: {
        color: Colors.ui.white,
        fontSize: 11,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 9,
        color: '#888',
        marginTop: 4,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        padding: 20,
        width: '90%',
        maxHeight: SCREEN_HEIGHT * 0.75,
        borderWidth: 2,
        borderColor: Colors.energy.fire,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    cardWrapper: {
        alignItems: 'center',
    },
    cardIndex: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    emptyText: {
        color: '#666',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 40,
    },
    closeButton: {
        backgroundColor: Colors.energy.fire,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignSelf: 'center',
        marginTop: 16,
    },
    closeText: {
        color: Colors.ui.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DiscardPile;
