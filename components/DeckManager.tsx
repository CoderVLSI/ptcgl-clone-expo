import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';

const { width, height } = Dimensions.get('window');

interface DeckManagerProps {
    visible: boolean;
    onClose: () => void;
    deck: Card[];
    deckName: string;
    onEditDeck: () => void;
    onUpdateDeck?: (newDeck: Card[]) => void;
    onSetActive?: () => void;
}

export const DeckManager: React.FC<DeckManagerProps> = ({ visible, onClose, deck, deckName, onEditDeck, onUpdateDeck, onSetActive }) => {
    // Group cards for the grid view
    const cardCounts: { [key: string]: { card: Card, count: number } } = {};
    deck.forEach(card => {
        // Use name as key to grouping for display
        if (cardCounts[card.name]) {
            cardCounts[card.name].count++;
        } else {
            cardCounts[card.name] = { card, count: 1 };
        }
    });

    const groupedCards = Object.values(cardCounts);

    const handleAddCard = (card: Card) => {
        if (!onUpdateDeck) return;
        // Limit to 4 copies logic can be added here, currently basic add
        // For simplicity, we clone the card and add it
        // Generate a unique ID if generic, or just reuse structure
        const newCard = { ...card, id: `${card.id}-${Date.now()}` };
        onUpdateDeck([...deck, newCard]);
    };

    const handleRemoveCard = (card: Card) => {
        if (!onUpdateDeck) return;
        const index = deck.findIndex(c => c.name === card.name);
        if (index !== -1) {
            const newDeck = [...deck];
            newDeck.splice(index, 1);
            onUpdateDeck(newDeck);
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.favoriteIcon}>
                                <Text style={styles.starIcon}>★</Text>
                            </View>
                            <Text style={styles.headerTitle}>{deckName}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.iconButton}>
                                <Text style={styles.iconText}>✎</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                                <Text style={styles.iconText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Main Content Row */}
                    <View style={styles.contentRow}>
                        {/* Deck Box Image */}
                        <View style={styles.deckBoxContainer}>
                            <Image
                                source={{ uri: 'https://images.pokemontcg.io/xy3/55.png' }} // Mega Lucario
                                style={styles.deckBoxImage}
                                resizeMode="contain"
                            />
                            <View style={styles.typeIconContainer}>
                                <View style={[styles.typeIcon, { backgroundColor: '#C03028' }]} />
                            </View>
                        </View>

                        {/* Stats & Actions */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statRow}>
                                <Text style={styles.statIcon}>🎴</Text>
                                <Text style={styles.statText}>{deck.length}/60</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statIcon}>🔄</Text>
                                <Text style={styles.statText}>STANDARD</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statIcon}>♾️</Text>
                                <Text style={styles.statText}>EXPANDED</Text>
                            </View>

                            <View style={styles.primaryActions}>
                                <TouchableOpacity style={styles.setActiveButton} onPress={onSetActive}>
                                    <LinearGradient
                                        colors={['#D00000', '#A00000']}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={styles.buttonText}>✓ SET ACTIVE</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.editDeckButton} onPress={onEditDeck}>
                                    <Text style={styles.editButtonText}>✎ EDIT DECK</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Secondary Actions Tab Bar */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity style={styles.tabItem}>
                            <Text style={styles.tabIcon}>⚗️</Text>
                            <Text style={styles.tabLabel}>TEST DECK</Text>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity style={styles.tabItem}>
                            <Text style={styles.tabIcon}>📄</Text>
                            <Text style={styles.tabLabel}>DUPLICATE</Text>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity style={[styles.tabItem, styles.activeTab]}>
                            <Text style={styles.tabIcon}>📦</Text>
                            <Text style={styles.tabLabel}>EXPORT</Text>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity style={styles.tabItem}>
                            <Text style={styles.tabIcon}>🗑️</Text>
                            <Text style={styles.tabLabel}>DELETE</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Card Grid */}
                    <ScrollView style={styles.cardGrid} contentContainerStyle={styles.gridContent}>
                        {groupedCards.map((item, index) => (
                            <View key={index} style={styles.cardItem}>
                                <Image
                                    source={{ uri: item.card.imageUrl }}
                                    style={styles.cardImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.cardCountBadge}>
                                    <Text style={styles.cardCountText}>{item.count}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.85,
        height: height * 0.75,
        backgroundColor: '#F0F0F0',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#D00000', // Red header
        padding: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    favoriteIcon: {
        width: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starIcon: {
        color: '#FFD700',
        fontSize: 18,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 16,
    },
    iconButton: {
        padding: 4,
    },
    iconText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    contentRow: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#EAEAEA',
        gap: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#CCC',
    },
    deckBoxContainer: {
        width: 100,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deckBoxImage: {
        width: '100%',
        height: '100%',
    },
    typeIconContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 2,
    },
    typeIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    statsContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        fontSize: 14,
        width: 20,
        textAlign: 'center',
    },
    statText: {
        color: '#555',
        fontSize: 14,
        fontWeight: '600',
    },
    primaryActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    gradientButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    setActiveButton: {
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    editDeckButton: {
        flex: 1,
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCC',
    },
    editButtonText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 12,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#DDD',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    activeTab: {
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
    },
    tabIcon: {
        fontSize: 20,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    verticalDivider: {
        width: 1,
        backgroundColor: '#DDD',
        height: '80%',
        alignSelf: 'center',
    },
    cardGrid: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    gridContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
        gap: 10,
        justifyContent: 'center',
    },
    cardItem: {
        width: '22%', // ~4 cards per row
        aspectRatio: 0.7, // Card ratio
        backgroundColor: '#DDD',
        borderRadius: 4,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    cardCountBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#FFF',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    cardCountText: {
        fontWeight: 'bold',
        fontSize: 12,
        color: '#333',
    },
    cardControls: {
        position: 'absolute',
        top: 4,
        right: 4,
        flexDirection: 'column',
        gap: 4,
    },
    controlButton: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    controlText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        lineHeight: 16,
    },
});

export default DeckManager;
