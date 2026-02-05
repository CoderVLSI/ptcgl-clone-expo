import React from 'react';
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

interface SelectActiveModalProps {
    visible: boolean;
    basicCards: CardType[];
    onSelect: (card: CardType) => void;
}

export const SelectActiveModal: React.FC<SelectActiveModalProps> = ({
    visible,
    basicCards,
    onSelect,
}) => {
    if (!visible || basicCards.length === 0) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Title */}
                    <Text style={styles.title}>Choose Your Active Pokémon</Text>
                    <Text style={styles.subtitle}>
                        Select a Basic Pokémon to place in the Active spot
                    </Text>

                    {/* Cards */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsRow}
                    >
                        {basicCards.map((card) => (
                            <TouchableOpacity
                                key={card.id}
                                style={styles.cardWrapper}
                                onPress={() => onSelect(card)}
                            >
                                <Card card={card} />
                                <View style={styles.selectOverlay}>
                                    <Text style={styles.selectText}>Select</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Info */}
                    <Text style={styles.info}>
                        Tap a card to set it as your Active Pokémon
                    </Text>
                </View>
            </View>
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
        backgroundColor: '#1A1A2E',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.card.highlight,
        maxWidth: '95%',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.ui.white,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 24,
        textAlign: 'center',
    },
    cardsRow: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 8,
    },
    cardWrapper: {
        position: 'relative',
    },
    selectOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 200, 100, 0.9)',
        paddingVertical: 8,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    selectText: {
        color: Colors.ui.white,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    info: {
        fontSize: 12,
        color: '#666',
        marginTop: 20,
        fontStyle: 'italic',
    },
});

export default SelectActiveModal;
