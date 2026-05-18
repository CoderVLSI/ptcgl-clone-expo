import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
    ScrollView, SafeAreaView, StatusBar, FlatList, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';
import DeckManager from './DeckManager';

// ── Props (kept exactly as before) ───────────────────────────────────────────
interface DeckSelectionScreenProps {
    onBack: () => void;
    playerDeck: Card[];
    onSelectDeck: (deck: Card[], name: string) => void;
    onEditDeck: (deck: Card[], name: string) => void;
    onCreateDeck: () => void;
    onUpdateDeck: (deck: Card[]) => void;
    availableDecks: { id: string; name: string; cards: Card[]; type: string; mainCard?: string }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
    fighting:  '#C03028',
    psychic:   '#A040A0',
    lightning: '#C8A000',
    water:     '#2060C0',
    grass:     '#3A8A30',
    fire:      '#C04808',
    darkness:  '#403830',
    metal:     '#6870A0',
};

const TYPE_FALLBACK_IMAGE: Record<string, string> = {
    fighting:  'https://images.pokemontcg.io/sv5/118.png',
    psychic:   'https://images.pokemontcg.io/sv6pt5/38.png',
    lightning: 'https://images.pokemontcg.io/sv5/123.png',
    water:     'https://images.pokemontcg.io/sv6/56.png',
};

// Type filter chips definition (label, filter value, emoji)
type TypeFilter =
    | 'All' | 'fighting' | 'psychic' | 'lightning'
    | 'water' | 'grass' | 'fire' | 'darkness' | 'metal';

const TYPE_CHIPS: { label: string; value: TypeFilter; emoji: string }[] = [
    { label: 'All',       value: 'All',       emoji: '✦'  },
    { label: 'Fighting',  value: 'fighting',  emoji: '⚔'  },
    { label: 'Psychic',   value: 'psychic',   emoji: '🔮' },
    { label: 'Lightning', value: 'lightning', emoji: '⚡' },
    { label: 'Water',     value: 'water',     emoji: '💧' },
    { label: 'Grass',     value: 'grass',     emoji: '🌿' },
    { label: 'Fire',      value: 'fire',      emoji: '🔥' },
    { label: 'Darkness',  value: 'darkness',  emoji: '🌑' },
    { label: 'Metal',     value: 'metal',     emoji: '⚙'  },
];

// ── DeckDisplayItem ───────────────────────────────────────────────────────────
interface DeckDisplayItem {
    id: string;
    name: string;
    type: string;
    color: string;
    valid: boolean;
    image: string;
    localImageSource?: number;
    cards: Card[];
}

// ── DeckItem component ────────────────────────────────────────────────────────
const DeckItem: React.FC<{
    item: DeckDisplayItem;
    isSelected: boolean;
    onPress: (item: DeckDisplayItem) => void;
}> = ({ item, isSelected, onPress }) => {
    const [imgError, setImgError] = useState(false);

    // Animated gold border for selected deck
    const borderAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: isSelected ? 1 : 0,
            duration: 220,
            useNativeDriver: false,
        }).start();
    }, [isSelected]);

    const animatedBorderColor = borderAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['rgba(255,215,0,0)', '#FFD700'],
    });
    const animatedBorderWidth = borderAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [0, 2.5],
    });

    const showLocal = !!item.localImageSource;
    const showUri   = !showLocal && !imgError && !!item.image;

    // Type-to-gradient color (semi-transparent overlay for card footer)
    const typeColorTransparent = (item.color || '#888') + '66'; // ~40 % opacity

    return (
        <TouchableOpacity
            style={[styles.deckItem, isSelected && styles.selectedDeckItem]}
            onPress={() => onPress(item)}
            activeOpacity={0.82}
        >
            {/* Animated gold border wrapper */}
            <Animated.View
                style={[
                    styles.deckItemBorderWrapper,
                    { borderColor: animatedBorderColor, borderWidth: animatedBorderWidth },
                ]}
            >
                {/* Card image */}
                {showLocal ? (
                    <Image source={item.localImageSource} style={styles.deckBoxCover} resizeMode="cover" />
                ) : showUri ? (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.deckBoxCover}
                        resizeMode="cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <View style={[styles.deckBoxCover, { backgroundColor: item.color }]}>
                        <Text style={styles.deckBoxFallbackText}>{item.name.split(' ')[0]}</Text>
                    </View>
                )}

                {/* Type-colored gradient footer overlay */}
                <LinearGradient
                    colors={['transparent', typeColorTransparent]}
                    style={styles.cardGradientOverlay}
                    pointerEvents="none"
                />

                {/* Deck name INSIDE the card at the bottom */}
                <View style={styles.deckNameInsideWrapper} pointerEvents="none">
                    <Text style={styles.deckNameInside} numberOfLines={2}>{item.name}</Text>
                </View>

                {/* Win/Loss badge — top-right */}
                <View style={styles.winBadge}>
                    <Text style={styles.winBadgeText}>12W</Text>
                </View>

                {/* Type dot — bottom-left */}
                <View style={styles.deckTypeBadge}>
                    <View style={[styles.typeIcon, { backgroundColor: item.color }]} />
                </View>

                {/* Invalid warning */}
                {!item.valid && (
                    <View style={styles.invalidOverlay}>
                        <Text style={styles.invalidText}>⚠️</Text>
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const DeckSelectionScreen: React.FC<DeckSelectionScreenProps> = ({
    onBack,
    playerDeck,
    onSelectDeck,
    onEditDeck,
    onCreateDeck,
    onUpdateDeck,
    availableDecks,
}) => {
    const [selectedTab,       setSelectedTab]       = useState<'Recents' | 'Favorites' | 'All'>('Recents');
    const [searchQuery,       setSearchQuery]       = useState('');
    const [selectedDeckId,    setSelectedDeckId]    = useState<string | null>(null);
    const [showDeckManager,   setShowDeckManager]   = useState(false);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<TypeFilter>('All');

    // Build display items from props
    const allDisplayDecks: DeckDisplayItem[] = availableDecks.map(d => {
        let coverCard = d.mainCard ? d.cards.find(c => c.name === d.mainCard) : undefined;
        if (!coverCard) {
            coverCard = d.cards.find(c =>
                c.name.includes(' ex')   || c.name.includes('Mega ')  ||
                c.name.includes(' VMAX') || c.name.includes(' VSTAR')
            );
        }
        if (!coverCard) coverCard = d.cards.find(c => c.type === 'pokemon');

        return {
            id:               d.id,
            name:             d.name,
            type:             d.type,
            color:            TYPE_COLOR[d.type] || '#888',
            valid:            d.cards.length === 60,
            image:            coverCard?.imageUrl || TYPE_FALLBACK_IMAGE[d.type] || 'https://images.pokemontcg.io/sv5/118.png',
            localImageSource: (coverCard as any)?.localImageSource,
            cards:            d.cards,
        };
    });

    // Apply search + type filter
    const displayDecks = allDisplayDecks.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType   = selectedTypeFilter === 'All' || d.type === selectedTypeFilter;
        return matchesSearch && matchesType;
    });

    const handleDeckPress = (deck: DeckDisplayItem) => {
        setSelectedDeckId(deck.id);
        setShowDeckManager(true);
    };

    const currentSelectedDeck =
        allDisplayDecks.find(d => d.id === selectedDeckId) ||
        allDisplayDecks[0] ||
        { id: '', name: '', cards: [], type: '', color: '#888', valid: false, image: '' };

    const renderDeckItem = ({ item }: { item: DeckDisplayItem }) => (
        <DeckItem item={item} isSelected={selectedDeckId === item.id} onPress={handleDeckPress} />
    );

    // "Create a Deck" card shown as first item in grid header
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

    // Empty state when search/filter yields nothing
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            {/* Pokéball placeholder drawn with pure Views */}
            <View style={styles.pokeball}>
                <View style={styles.pokeballTop} />
                <View style={styles.pokeballDivider} />
                <View style={styles.pokeballBottom} />
                <View style={styles.pokeballCenter} />
            </View>
            <Text style={styles.emptyTitle}>No decks found</Text>
            <Text style={styles.emptySubtitle}>Try a different search or filter</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#0D0D1A" barStyle="light-content" />

            {/* ── Header with dark gradient background ── */}
            <SafeAreaView style={styles.headerSafeArea}>
                <LinearGradient
                    colors={['#16162A', '#0D0D1A']}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onBack}
                            style={styles.backButton}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
                        >
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

                    {/* Filter Bar — tabs + search */}
                    <View style={styles.filterBar}>
                        <View style={styles.tabsContainer}>
                            {(['Recents', 'Favorites', 'All'] as const).map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setSelectedTab(tab)}
                                    style={[styles.filterTab, selectedTab === tab && styles.activeFilterTab]}
                                >
                                    <Text style={[styles.filterTabText, selectedTab === tab && styles.activeFilterTabText]}>
                                        {tab.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search Decks"
                                placeholderTextColor="#666"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {/* Type Filter Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.typeChipsScroll}
                        contentContainerStyle={styles.typeChipsContent}
                    >
                        {TYPE_CHIPS.map(chip => {
                            const isActive = selectedTypeFilter === chip.value;
                            return (
                                <TouchableOpacity
                                    key={chip.value}
                                    onPress={() => setSelectedTypeFilter(chip.value)}
                                    style={[
                                        styles.typeChip,
                                        isActive
                                            ? styles.typeChipActive
                                            : styles.typeChipInactive,
                                    ]}
                                >
                                    <Text style={isActive ? styles.typeChipTextActive : styles.typeChipTextInactive}>
                                        {chip.emoji} {chip.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </LinearGradient>
            </SafeAreaView>

            {/* ── Deck Grid ── */}
            <FlatList
                data={displayDecks}
                renderItem={renderDeckItem}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={styles.gridContent}
                ListHeaderComponent={renderHeader}
                columnWrapperStyle={styles.columnWrapper}
                ListEmptyComponent={renderEmpty}
            />

            {/* ── Deck Details Modal ── */}
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Root
    container: {
        flex: 1,
        backgroundColor: '#0D0D1A',
    },

    // Header
    headerSafeArea: {
        backgroundColor: '#0D0D1A',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerGradient: {
        // wraps header + filterBar + chips
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
        backgroundColor: 'rgba(0,0,0,0.4)',
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

    // Filter bar (tabs + search row)
    filterBar: {
        backgroundColor: 'rgba(255,255,255,0.04)',
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
        color: '#666',
        fontWeight: 'bold',
        fontSize: 12,
    },
    activeFilterTabText: {
        color: '#FFF',
    },
    searchContainer: {
        width: 120,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.08)',
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

    // Type filter chips
    typeChipsScroll: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    typeChipsContent: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
        flexDirection: 'row',
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
    },
    typeChipActive: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    typeChipInactive: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.15)',
    },
    typeChipTextActive: {
        color: '#1A1A2E',
        fontSize: 11,
        fontWeight: 'bold',
    },
    typeChipTextInactive: {
        color: '#DDD',
        fontSize: 11,
        fontWeight: '600',
    },

    // Grid
    gridContent: {
        padding: 10,
        paddingBottom: 30,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    gridHeader: {
        marginBottom: 10,
    },

    // Create Deck button (same slot as a deck card)
    createDeckButton: {
        width: '31%',
        aspectRatio: 0.72,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    createIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
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
        color: '#AAA',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    // Deck Item
    deckItem: {
        width: '31%',
        aspectRatio: 0.72,
    },
    selectedDeckItem: {
        transform: [{ scale: 1.04 }],
    },
    deckItemBorderWrapper: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    deckBoxCover: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deckBoxFallbackText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 11,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },

    // Gradient footer overlay inside card
    cardGradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '45%',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },

    // Deck name inside card (bottom)
    deckNameInsideWrapper: {
        position: 'absolute',
        left: 4,
        right: 4,
        bottom: 18,
    },
    deckNameInside: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    // Win badge — top-right green pill
    winBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        zIndex: 3,
    },
    winBadgeText: {
        color: '#A5D6A7',
        fontSize: 9,
        fontWeight: 'bold',
    },

    // Type dot — bottom-left
    deckTypeBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 10,
        padding: 3,
        zIndex: 2,
    },
    typeIcon: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },

    // Invalid overlay
    invalidOverlay: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 2,
        zIndex: 3,
    },
    invalidText: {
        fontSize: 11,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    // Pokéball drawn with Views
    pokeball: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#333',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#555',
        marginBottom: 20,
        position: 'relative',
    },
    pokeballTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: '#C0392B',
    },
    pokeballDivider: {
        position: 'absolute',
        top: '46%',
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: '#222',
        zIndex: 2,
    },
    pokeballBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: '#EEEEEE',
    },
    pokeballCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderColor: '#222',
        zIndex: 3,
    },
    emptyTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#666',
        fontSize: 13,
        textAlign: 'center',
    },
});

export default DeckSelectionScreen;
