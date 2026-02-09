import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Card as CardType } from '../types/game';
import Colors from '../constants/colors';
import Card from './Card';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CardPreviewModalProps {
    visible: boolean;
    card: CardType | null;
    onClose: () => void;
}

export const CardPreviewModal: React.FC<CardPreviewModalProps> = ({
    visible,
    card,
    onClose,
}) => {
    if (!card) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.container}>
                    {/* Close hint */}
                    <View style={styles.closeHint}>
                        <Text style={styles.closeHintText}>Tap anywhere to close</Text>
                    </View>

                    {/* Card Preview - Large Size */}
                    <View style={styles.cardContainer}>
                        <Card card={card} />
                    </View>

                    {/* Card Info */}
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{card.name}</Text>
                        {card.type === 'pokemon' && (
                            <>
                                {card.hp && <Text style={styles.cardDetail}>{card.hp} HP</Text>}
                                {card.subtypes && (
                                    <Text style={styles.cardDetail}>
                                        {card.subtypes.join(' / ')}
                                    </Text>
                                )}
                            </>
                        )}
                        {card.attachedEnergy && card.attachedEnergy.length > 0 && (
                            <Text style={styles.cardDetail}>
                                Energy: {card.attachedEnergy.join(', ')}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        maxWidth: SCREEN_WIDTH * 0.9,
    },
    closeHint: {
        position: 'absolute',
        top: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    closeHintText: {
        color: '#fff',
        fontSize: 14,
        opacity: 0.7,
    },
    cardContainer: {
        transform: [{ scale: 1.5 }],
    },
    cardInfo: {
        marginTop: 40,
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.card.highlight,
        minWidth: 200,
        alignItems: 'center',
    },
    cardName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.ui.white,
        marginBottom: 8,
        textAlign: 'center',
    },
    cardDetail: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 4,
    },
});

export default CardPreviewModal;
