import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
    Image,
} from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CardSelectorModalProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    cards: CardType[];
    minSelection?: number;
    maxSelection?: number;
    onConfirm: (selectedIds: string[]) => void;
    onCancel: () => void;
    confirmText?: string;
    eligibleCardIds?: string[]; // Cards that can be selected (others will be greyed out)
}

const CardSelectorModal: React.FC<CardSelectorModalProps> = ({
    visible,
    title,
    subtitle,
    cards,
    minSelection = 1,
    maxSelection = 1,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    eligibleCardIds,
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Reset selection when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedIds([]);
        }
    }, [visible]);

    const toggleSelection = (cardId: string) => {
        // Check if card is eligible (if eligibleCardIds is provided)
        if (eligibleCardIds && !eligibleCardIds.includes(cardId)) {
            return; // Cannot select ineligible cards
        }

        if (selectedIds.includes(cardId)) {
            setSelectedIds(prev => prev.filter(id => id !== cardId));
        } else {
            if (selectedIds.length < maxSelection) {
                setSelectedIds(prev => [...prev, cardId]);
            } else if (maxSelection === 1) {
                // If single select, replace selection
                setSelectedIds([cardId]);
            }
        }
    };

    const handleConfirm = () => {
        if (selectedIds.length >= minSelection && selectedIds.length <= maxSelection) {
            onConfirm(selectedIds);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
                        <Text style={styles.selectionCount}>
                            Selected: {selectedIds.length} / {maxSelection}
                        </Text>
                    </View>

                    {/* Cards Grid */}
                    <ScrollView
                        contentContainerStyle={styles.cardsGrid}
                        showsVerticalScrollIndicator={false}
                    >
                        {cards.length === 0 ? (
                            <Text style={styles.emptyText}>No cards available</Text>
                        ) : (
                            cards.map((card) => {
                                const isSelected = selectedIds.includes(card.id);
                                const isDimmed = !isSelected && selectedIds.length >= maxSelection && maxSelection > 1;
                                const isEligible = !eligibleCardIds || eligibleCardIds.includes(card.id);
                                const isIneligible = !isEligible;

                                return (
                                    <TouchableOpacity
                                        key={card.id}
                                        style={[
                                            styles.cardWrapper,
                                            isSelected && styles.selectedWrapper,
                                            (isDimmed || isIneligible) && styles.dimmedWrapper,
                                        ]}
                                        onPress={() => toggleSelection(card.id)}
                                        activeOpacity={0.8}
                                        disabled={isIneligible}
                                    >
                                        <Card card={card} isSmall />

                                        {/* Ineligible Overlay */}
                                        {isIneligible && (
                                            <View style={styles.ineligibleOverlay}>
                                                <Text style={styles.ineligibleText}>✕</Text>
                                            </View>
                                        )}

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <View style={styles.checkmarkBadge}>
                                                <Text style={styles.checkmarkText}>✓</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.confirmButton,
                                (selectedIds.length < minSelection) && styles.disabledButton,
                            ]}
                            onPress={handleConfirm}
                            disabled={selectedIds.length < minSelection}
                        >
                            <Text style={styles.confirmText}>
                                {confirmText} ({selectedIds.length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        width: '95%',
        height: '90%',
        borderWidth: 2,
        borderColor: Colors.card.highlight,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.ui.white,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 4,
        textAlign: 'center',
    },
    selectionCount: {
        fontSize: 16,
        color: Colors.card.highlight,
        fontWeight: 'bold',
        marginTop: 8,
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        paddingBottom: 20,
    },
    cardWrapper: {
        position: 'relative',
        padding: 4,
        borderRadius: 8,
    },
    selectedWrapper: {
        backgroundColor: 'rgba(255, 215, 0, 0.3)',
        borderColor: Colors.card.highlight,
        borderWidth: 2,
        transform: [{ scale: 1.05 }],
    },
    dimmedWrapper: {
        opacity: 0.5,
    },
    ineligibleOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ineligibleText: {
        color: '#ff4444',
        fontSize: 32,
        fontWeight: 'bold',
        textShadowColor: '#000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    checkmarkBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: Colors.card.highlight,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
        zIndex: 10,
    },
    checkmarkText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 50,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    cancelButton: {
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#555',
    },
    confirmButton: {
        backgroundColor: Colors.primary.red,
    },
    disabledButton: {
        backgroundColor: '#333',
        opacity: 0.5,
    },
    cancelText: {
        color: '#ccc',
        fontWeight: 'bold',
        fontSize: 16,
    },
    confirmText: {
        color: Colors.ui.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CardSelectorModal;
