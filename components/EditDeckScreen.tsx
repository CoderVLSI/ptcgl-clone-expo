import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';

const { width, height } = Dimensions.get('window');

interface EditDeckScreenProps {
    deck: Card[];
    deckName: string;
    onBack: () => void;
    onHome: () => void;
}

const EditDeckScreen: React.FC<EditDeckScreenProps> = ({ deck, deckName, onBack, onHome }) => {
    const [selectedTab, setSelectedTab] = useState<'Pokemon' | 'Trainers' | 'Energy' | 'Deck'>('Trainers');
    const [searchQuery, setSearchQuery] = useState('');

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
            <ScrollView style={styles.libraryGrid} contentContainerStyle={styles.libraryContent}>
                {/* Mocking a library view by just showing the deck repeatedly for now since we don't have a full library loaded in this specific component context yet */}
                {/* In a real app, this would be a separate list of ALL cards */}
                {deck.concat(deck).map((card, index) => (
                    <View key={`lib-${index}`} style={styles.libraryCardItem}>
                        <Image source={{ uri: card.imageUrl }} style={styles.cardImageLibrary} resizeMode="contain" />
                        <View style={styles.libraryCountBadge}><Text style={styles.countText}>4</Text></View>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom Navigation Footer */}
            <View style={styles.bottomFooter}>
                <TouchableOpacity onPress={onBack} style={styles.footerButton}>
                    <Text style={styles.footerIcon}>←</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onHome} style={styles.footerButton}>
                    <Text style={styles.footerIcon}>🏠</Text>
                </TouchableOpacity>
            </View>
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
});

export default EditDeckScreen;
