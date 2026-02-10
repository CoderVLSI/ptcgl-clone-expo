import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, Dimensions, SafeAreaView, StatusBar, Platform, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';
import { fetchStandardCards, LibraryCard } from '../utils/cardLibrary';

const { width, height } = Dimensions.get('window');

interface EditDeckScreenProps {
    deck: Card[];
    deckName: string;
    onBack: () => void;
    onHome: () => void;
    onUpdateDeck: (deck: Card[]) => void;
}

const EditDeckScreen: React.FC<EditDeckScreenProps> = ({ deck: initialDeck, deckName, onBack, onHome, onUpdateDeck }) => {
    const [deck, setDeck] = useState<Card[]>(initialDeck);
    const [selectedTab, setSelectedTab] = useState<'Pokemon' | 'Trainers' | 'Energy' | 'Deck'>('Trainers');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    // Library State
    const [libraryCards, setLibraryCards] = useState<LibraryCard[]>([]);
    const [page, setPage] = useState(1);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset page on search
            loadLibraryCards(1, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    async function loadLibraryCards(pageNum: number, search: string, append: boolean = false) {
        if (isLoadingLibrary) return;
        setIsLoadingLibrary(true);
        const cards = await fetchStandardCards(pageNum, search);
        if (append) {
            setLibraryCards(prev => [...prev, ...cards]);
        } else {
            setLibraryCards(cards);
        }
        setIsLoadingLibrary(false);
    }

    const handleLoadMore = () => {
        if (!isLoadingLibrary) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadLibraryCards(nextPage, searchQuery, true);
        }
    };

    useEffect(() => {
        setDeck(initialDeck);
        setHasChanges(false);
    }, [initialDeck]);

    // Mocking counts for the UI (real logic would calculate these)
    const counts = {
        Pokemon: deck.filter(c => c.type === 'pokemon').length,
        Trainers: deck.filter(c => c.type === 'trainer').length,
        Energy: deck.filter(c => c.type === 'energy').length,
        Deck: deck.length
    };

    // Filter deck for top view based on selected tab (or just show all for 'Deck')
    const filteredDeck = selectedTab === 'Deck'
        ? deck
        : deck.filter(c => c.type === (selectedTab === 'Trainers' ? 'trainer' : selectedTab.toLowerCase()));

    // Group cards (simple logic for display)
    const groupedDeck = filteredDeck.reduce((acc, card) => {
        acc[card.name] = (acc[card.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const handleAddCard = (cardOrName: string | Card) => {
        let cardToAdd: Card | undefined;

        if (typeof cardOrName === 'string') {
            cardToAdd = deck.find(c => c.name === cardOrName);
        } else {
            cardToAdd = cardOrName;
        }

        if (cardToAdd) {
            const newCard = { ...cardToAdd, id: `${cardToAdd.id}-${Date.now()}` };
            const newDeck = [...deck, newCard];
            setDeck(newDeck);
            setHasChanges(true);
        }
    };

    const handleRemoveCard = (cardName: string) => {
        const index = deck.findIndex(c => c.name === cardName);
        if (index !== -1) {
            const newDeck = [...deck];
            newDeck.splice(index, 1);
            setDeck(newDeck);
            setHasChanges(true);
        }
    };

    const handleExit = (action: () => void) => {
        if (!hasChanges) {
            action();
            return;
        }

        Alert.alert(
            "Unsaved Changes",
            "You have unsaved changes to your deck. Do you want to save them?",
            [
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: action
                },
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Save",
                    onPress: () => {
                        onUpdateDeck(deck);
                        action();
                    }
                }
            ]
        );
    };

    const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
        const paddingToBottom = 20;
        return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#D00000" barStyle="light-content" />

            {/* Header */}
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <View style={styles.deckBoxThumbnail}>
                        <Image
                            source={{ uri: 'https://images.pokemontcg.io/xy3/55.png' }}
                            style={styles.headerDeckImage}
                        />
                    </View>
                    <Text style={styles.headerTitle}>{deckName}</Text>
                    <TouchableOpacity style={styles.menuButton}>
                        <Text style={styles.menuDots}>⋮</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabItem} onPress={() => setSelectedTab('Pokemon')}>
                        <View style={styles.tabIconFallback}><Text>🚫</Text></View>
                        <Text style={[styles.tabLabel, selectedTab === 'Pokemon' && styles.tabLabelActive]}>POKÉMON</Text>
                        <Text style={styles.tabCount}>{counts.Pokemon}</Text>
                        {selectedTab === 'Pokemon' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} onPress={() => setSelectedTab('Trainers')}>
                        <Text style={[styles.tabLabel, selectedTab === 'Trainers' && styles.tabLabelActive]}>TRAINERS</Text>
                        <Text style={[styles.tabCount, styles.highlightCount]}>{counts.Trainers}</Text>
                        {selectedTab === 'Trainers' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} onPress={() => setSelectedTab('Energy')}>
                        <Text style={[styles.tabLabel, selectedTab === 'Energy' && styles.tabLabelActive]}>ENERGY</Text>
                        <Text style={styles.tabCount}>{counts.Energy}</Text>
                        {selectedTab === 'Energy' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} onPress={() => setSelectedTab('Deck')}>
                        <Text style={[styles.tabLabel, selectedTab === 'Deck' && styles.tabLabelActive]}>DECK</Text>
                        <Text style={styles.tabCount}>{counts.Deck}</Text>
                        {selectedTab === 'Deck' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Current Deck View (Top Section) */}
            <View style={styles.currentDeckArea}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckScrollContent}>
                    {Object.entries(groupedDeck).map(([name, count], index) => {
                        const card = deck.find(c => c.name === name);
                        return (
                            <View key={index} style={styles.deckCardItem}>
                                <Image source={{ uri: card?.imageUrl }} style={styles.cardImageSmall} resizeMode="contain" />
                                <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>
                                <View style={styles.cardControls}>
                                    <TouchableOpacity style={styles.controlButton} onPress={() => handleRemoveCard(name)}>
                                        <Text style={styles.controlText}>-</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.controlButton} onPress={() => handleAddCard(name)}>
                                        <Text style={styles.controlText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Library Search & Filter Bar */}
            <View style={styles.libraryControls}>
                <TouchableOpacity style={styles.collapseButton}>
                    <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="SEARCH CARD LIBRARY"
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.filterSortRow}>
                <TouchableOpacity style={styles.filterButton}>
                    <Text style={styles.filterIcon}>⇅</Text>
                    <Text style={styles.filterText}>FILTERS</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.filterButton}>
                    <Text style={styles.filterIcon}>1L</Text>
                    <Text style={styles.filterText}>SORTING</Text>
                </TouchableOpacity>
            </View>

            {/* Card Library Grid (Bottom Section) */}
            <View style={styles.libraryGrid}>
                {isLoadingLibrary && page === 1 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#888' }}>Loading library...</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.libraryContent}
                        onScroll={({ nativeEvent }) => {
                            if (isCloseToBottom(nativeEvent)) {
                                handleLoadMore();
                            }
                        }}
                        scrollEventThrottle={400}
                    >
                        {libraryCards.map((card, index) => (
                            <TouchableOpacity
                                key={`${card.id}-${index}`}
                                style={styles.libraryCardItem}
                                onPress={() => handleAddCard(card)}
                            >
                                <Image source={{ uri: card.imageUrl }} style={styles.cardImageLibrary} resizeMode="contain" />
                                {/* Show count of this card currently in deck */}
                                {deck.filter(c => c.name === card.name).length > 0 && (
                                    <View style={styles.libraryCountBadge}>
                                        <Text style={styles.countText}>{deck.filter(c => c.name === card.name).length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                        {isLoadingLibrary && (
                            <View style={{ width: '100%', padding: 10, alignItems: 'center' }}>
                                <Text style={{ color: '#888' }}>Loading more...</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Bottom Navigation Footer */}
            <View style={styles.bottomFooter}>
                <TouchableOpacity onPress={() => handleExit(onBack)} style={styles.footerButton}>
                    <Text style={styles.footerIcon}>←</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleExit(onHome)} style={styles.footerButton}>
                    <Text style={styles.footerIcon}>🏠</Text>
                </TouchableOpacity>
            </View>

            {/* Card Viewer Modal */}
            <Modal
                visible={!!selectedCard}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedCard(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedCard(null)} />

                    {selectedCard && (
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedCard.name}</Text>
                                <TouchableOpacity onPress={() => setSelectedCard(null)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <Image
                                source={{ uri: selectedCard.imageUrlLarge || selectedCard.imageUrl }}
                                style={styles.largeCardImage}
                                resizeMode="contain"
                            />

                            <View style={styles.modalControls}>
                                <View style={styles.deckCountInfo}>
                                    <Text style={styles.deckCountLabel}>In Deck:</Text>
                                    <Text style={styles.deckCountValue}>
                                        {deck.filter(c => c.name === selectedCard.name).length}
                                    </Text>
                                </View>

                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalActionButton, styles.removeButton]}
                                        onPress={() => handleRemoveCard(selectedCard.name)}
                                    >
                                        <Text style={styles.actionButtonText}>- Remove</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.modalActionButton, styles.addButton]}
                                        onPress={() => handleAddCard(selectedCard)}
                                    >
                                        <Text style={styles.actionButtonText}>+ Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerSafeArea: {
        backgroundColor: '#D00000',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    deckBoxThumbnail: {
        position: 'absolute',
        left: 10,
        bottom: 5,
        width: 40,
        height: 50,
        backgroundColor: '#FFF',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    headerDeckImage: {
        width: '100%',
        height: '100%',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    menuButton: {
        position: 'absolute',
        right: 16,
    },
    menuDots: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#333',
        height: 50,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    tabLabel: {
        color: '#AAA',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tabLabelActive: {
        color: '#FFD700', // Yellow for active text
    },
    tabCount: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    highlightCount: {
        color: '#FFD700',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 3,
        backgroundColor: '#FFD700',
    },
    tabIconFallback: {
        display: 'none', // simplifying for now
    },
    currentDeckArea: {
        height: 180, // Approximate height for the top deck view
        backgroundColor: '#E0E0E0',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#CCC',
    },
    deckScrollContent: {
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    deckCardItem: {
        width: 100,
        height: 140,
        marginRight: 8,
        position: 'relative',
    },
    cardImageSmall: {
        width: '100%',
        height: '100%',
    },
    countBadge: {
        position: 'absolute',
        bottom: -5,
        alignSelf: 'center',
        backgroundColor: '#FFF',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCC',
    },
    countText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    libraryControls: {
        backgroundColor: '#F0F0F0',
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    collapseButton: {
        padding: 5,
    },
    arrowText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        flex: 1,
        backgroundColor: '#DDD',
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    filterSortRow: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        height: 44,
        borderBottomWidth: 1,
        borderBottomColor: '#DDD',
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    filterIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    filterText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        width: 1,
        backgroundColor: '#DDD',
        height: '100%',
    },
    libraryGrid: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    libraryContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        justifyContent: 'space-between',
    },
    libraryCardItem: {
        width: '24%', // 4 columns
        aspectRatio: 0.7,
        marginBottom: 8,
        position: 'relative',
    },
    cardImageLibrary: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    libraryCountBadge: {
        position: 'absolute',
        bottom: 5,
        alignSelf: 'center',
        backgroundColor: '#FFF',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCC',
    },
    bottomFooter: {
        height: 50,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#DDD',
    },
    footerButton: {
        padding: 10,
    },
    footerIcon: {
        fontSize: 24,
        color: '#333',
    },
    cardControls: {
        position: 'absolute',
        top: 0,
        right: 0,
        flexDirection: 'column',
        gap: 2,
        zIndex: 10,
    },
    controlButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    controlText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
        lineHeight: 14,
    },
});

export default EditDeckScreen;
