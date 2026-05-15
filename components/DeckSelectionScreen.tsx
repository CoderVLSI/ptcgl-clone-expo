import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, SafeAreaView, StatusBar, FlatList, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';
import DeckManager from './DeckManager';

interface DeckSelectionScreenProps {
    onBack: () => void;
    playerDeck: Card[]; // The main active deck
    onSelectDeck: (deck: Card[], name: string) => void;
    onEditDeck: (deck: Card[], name: string) => void;
    onCreateDeck: () => void;
    onUpdateDeck: (deck: Card[]) => void;
    availableDecks: { id: string, name: string, cards: Card[], type: string, mainCard?: string }[];
}

const DeckSelectionScreen: React.FC<DeckSelectionScreenProps> = ({ onBack, playerDeck, onSelectDeck, onEditDeck, onCreateDeck, onUpdateDeck, availableDecks }) => {
    const [selectedTab, setSelectedTab] = useState<'Recents' | 'Favorites' | 'All'>('Recents');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [showDeckManager, setShowDeckManager] = useState(false);

    // Prepare deck list for display. We map available decks to the visual format.
    // If availableDecks is empty (loading/error), we might want to show a placeholder or keep current behavior.
    const displayDecks = availableDecks.map(d => {
        // Find the main/featured card for the deck cover
        // Priority: mainCard name match → any ex/MEGA → first pokemon
        let coverCard = d.mainCard
            ? d.cards.find(c => c.name === d.mainCard)
            : undefined;

        if (!coverCard) {
            coverCard = d.cards.find(c =>
                c.name.includes(' ex') || c.name.includes('Mega ') ||
                c.name.includes(' VMAX') || c.name.includes(' VSTAR')
            );
        }

        if (!coverCard) {
            coverCard = d.cards.find(c => c.type === 'pokemon');
        }

        const TYPE_FALLBACK_IMAGE: Record<string, string> = {
            fighting: 'https://images.pokemontcg.io/sv5/118.png',
            psychic: 'https://images.pokemontcg.io/sv6pt5/38.png',
            lightning: 'https://images.pokemontcg.io/sv5/123.png',
            water: 'https://images.pokemontcg.io/sv6/56.png',
        };
        const coverImage = coverCard?.imageUrl || TYPE_FALLBACK_IMAGE[d.type] || 'https://images.pokemontcg.io/sv5/118.png';

        const TYPE_COLOR: Record<string, string> = {
            fighting: '#C03028',
            psychic: '#A040A0',
            lightning: '#C8A000',
            water: '#2060C0',
            grass: '#3A8A30',
            fire: '#C04808',
            darkness: '#403830',
            metal: '#6870A0',
        };

        return {
            id: d.id,
            name: d.name,
            type: d.type,
            color: TYPE_COLOR[d.type] || '#888',
            valid: d.cards.length === 60,
            image: coverImage,
            cards: d.cards
        };
    });

    const handleDeckPress = (deck: any) => {
        setSelectedDeckId(deck.id);
        setShowDeckManager(true);
    };

    const renderDeckItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.deckItem, selectedDeckId === item.id && styles.selectedDeckItem]}
            onPress={() => handleDeckPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.deckBoxVisual}>
                <View style={styles.deckBoxDepth} />
                <Image source={{ uri: item.image }} style={styles.deckBoxCover} resizeMode="cover" />
                <View style={styles.deckTypeBadge}>
                    <View style={[styles.typeIcon, { backgroundColor: item.color }]} />
                </View>
                {!item.valid && (
                    <View style={styles.invalidOverlay}>
                        <Text style={styles.invalidText}>⚠️</Text>
                    </View>
                )}
            </View>
            <Text style={styles.deckName} numberOfLines={2}>{item.name}</Text>
            {selectedDeckId === item.id && <View style={styles.selectionBorder} />}
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.gridHeader}>
            <TouchableOpacity style={styles.createDeckButton} onPress={onCreateDeck}>
                <View style={styles.createIconContainer}>
                    <Text style={styles.plusIcon}>+</Text>
                </View>
                <Text style={styles.createText}>CREATE A DECK</Text>
            </TouchableOpacity>
        </View>
    );

    // Get currently selected deck data for the modal (safe fallback to empty deck)
    const currentSelectedDeck = displayDecks.find(d => d.id === selectedDeckId) || displayDecks[0] || { id: '', name: '', cards: [], type: '', color: '#888', valid: false, image: '' };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#D00000" barStyle="light-content" />

            {/* Top Bar */}
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}>
                        <Text style={styles.headerBackIcon}>←</Text>
                        <Text style={styles.headerTitle}>DECKS</Text>
                    </TouchableOpacity>
                    <View style={styles.currencyContainer}>
                        <View style={styles.currencyItem}>
                            <View style={[styles.currencyIcon, { backgroundColor: '#A020F0' }]} />
                            <Text style={styles.currencyText}>873</Text>
                        </View>
                    </View>
                </View>

                {/* Filter Bar */}
                <View style={styles.filterBar}>
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity onPress={() => setSelectedTab('Recents')} style={[styles.filterTab, selectedTab === 'Recents' && styles.activeFilterTab]}>
                            <Text style={[styles.filterTabText, selectedTab === 'Recents' && styles.activeFilterTabText]}>RECENTS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedTab('Favorites')} style={[styles.filterTab, selectedTab === 'Favorites' && styles.activeFilterTab]}>
                            <Text style={[styles.filterTabText, selectedTab === 'Favorites' && styles.activeFilterTabText]}>FAVORITES</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedTab('All')} style={[styles.filterTab, selectedTab === 'All' && styles.activeFilterTab]}>
                            <Text style={[styles.filterTabText, selectedTab === 'All' && styles.activeFilterTabText]}>ALL</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search Decks"
                            placeholderTextColor="#AAA"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
            </SafeAreaView>

            {/* Deck Grid */}
            <FlatList
                data={displayDecks}
                renderItem={renderDeckItem}
                keyExtractor={item => item.id}
                numColumns={3} // 3 columns for mobile grid
                contentContainerStyle={styles.gridContent}
                ListHeaderComponent={renderHeader}
                columnWrapperStyle={styles.columnWrapper}
            />

            {/* Deck Details Modal */}
            <DeckManager
                visible={showDeckManager}
                onClose={() => setShowDeckManager(false)}
                deck={currentSelectedDeck.cards}
                deckName={currentSelectedDeck.name}
                onEditDeck={() => {
                    setShowDeckManager(false);
                    onEditDeck(currentSelectedDeck.cards, currentSelectedDeck.name);
                }}
                onUpdateDeck={onUpdateDeck}
                onSetActive={() => {
                    onSelectDeck(currentSelectedDeck.cards, currentSelectedDeck.name);
                    setShowDeckManager(false);
                }}
            />
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
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerBackIcon: {
        fontSize: 24,
        color: '#FFF',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 20,
        color: '#FFF',
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    currencyContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    currencyIcon: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    currencyText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    filterBar: {
        backgroundColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    filterTab: {
        paddingVertical: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeFilterTab: {
        borderBottomColor: '#FFD700',
    },
    filterTabText: {
        color: '#AAA',
        fontWeight: 'bold',
        fontSize: 12,
    },
    activeFilterTabText: {
        color: '#FFF',
    },
    searchContainer: {
        width: 120,
        height: 30,
        backgroundColor: '#555',
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    searchIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 12,
        padding: 0,
    },
    gridContent: {
        padding: 10,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    gridHeader: {
        marginBottom: 10,
    },
    createDeckButton: {
        width: '31%', // roughly 1/3 minus gap
        aspectRatio: 0.7,
        backgroundColor: '#666',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginBottom: 10,
    },
    createIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#888',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    plusIcon: {
        fontSize: 24,
        color: '#FFF',
        fontWeight: 'bold',
    },
    createText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    deckItem: {
        width: '31%',
        aspectRatio: 0.7,
        alignItems: 'center',
    },
    selectedDeckItem: {
        transform: [{ scale: 1.05 }],
    },
    selectionBorder: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderWidth: 2,
        borderColor: '#FFD700',
        borderRadius: 10,
        zIndex: -1,
    },
    deckBoxVisual: {
        width: '80%',
        height: '80%',
        marginBottom: 4,
        position: 'relative',
    },
    deckBoxDepth: {
        position: 'absolute',
        top: 2,
        right: -4,
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
        borderRadius: 4,
        zIndex: -1,
    },
    deckBoxCover: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    deckTypeBadge: {
        position: 'absolute',
        bottom: -4,
        left: -4,
        backgroundColor: '#FFF',
        borderRadius: 10,
        padding: 2,
        zIndex: 2,
    },
    typeIcon: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    invalidOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 2,
    },
    invalidText: {
        fontSize: 12,
    },
    deckName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
});

export default DeckSelectionScreen;
