import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
    ScrollView, SafeAreaView, StatusBar, Platform, Alert, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';
import { fetchStandardCards, LibraryCard } from '../utils/cardLibrary';

interface EditDeckScreenProps {
    deck: Card[];
    deckName: string;
    onBack: () => void;
    onHome: () => void;
    onUpdateDeck: (deck: Card[]) => void;
}

type SortMode = 'Name' | 'Cost' | 'HP';
type TypeFilter =
    | 'All' | 'Grass' | 'Fire' | 'Water' | 'Lightning' | 'Psychic'
    | 'Fighting' | 'Darkness' | 'Metal' | 'Colorless' | 'Trainer' | 'Energy';

const TYPE_BUTTONS: { label: string; value: TypeFilter }[] = [
    { label: 'All',       value: 'All' },
    { label: '🌿',        value: 'Grass' },
    { label: '🔥',        value: 'Fire' },
    { label: '💧',        value: 'Water' },
    { label: '⚡',        value: 'Lightning' },
    { label: '🔮',        value: 'Psychic' },
    { label: '⚔',         value: 'Fighting' },
    { label: '🌑',        value: 'Darkness' },
    { label: '⚙',         value: 'Metal' },
    { label: '🎨Trainer', value: 'Trainer' },
    { label: '⚡Energy',  value: 'Energy' },
];

const MAX_COPIES = 4;

const EditDeckScreen: React.FC<EditDeckScreenProps> = ({
    deck: initialDeck,
    deckName,
    onBack,
    onHome,
    onUpdateDeck,
}) => {
    const [deck, setDeck] = useState<Card[]>(initialDeck);
    const [selectedTab, setSelectedTab] = useState<'Pokemon' | 'Trainers' | 'Energy' | 'Deck'>('Trainers');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [saveConfirmed, setSaveConfirmed] = useState(false);

    // Library State
    const [libraryCards, setLibraryCards] = useState<LibraryCard[]>([]);
    const [page, setPage] = useState(1);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

    // Preview modal
    const [previewCard, setPreviewCard] = useState<Card | LibraryCard | null>(null);

    // Sort state
    const [sortMode, setSortMode] = useState<SortMode>('Name');

    // Type filter
    const [activeTypeFilter, setActiveTypeFilter] = useState<TypeFilter>('All');

    // Deck area collapsed/expanded
    const [deckAreaExpanded, setDeckAreaExpanded] = useState(true);

    // ---------- library loading ----------

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadLibraryCards(1, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    async function loadLibraryCards(pageNum: number, search: string, append = false) {
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
            const next = page + 1;
            setPage(next);
            loadLibraryCards(next, searchQuery, true);
        }
    };

    useEffect(() => {
        setDeck(initialDeck);
        setHasChanges(false);
    }, [initialDeck]);

    // ---------- counts ----------

    const counts = {
        Pokemon:  deck.filter(c => c.type === 'pokemon').length,
        Trainers: deck.filter(c => c.type === 'trainer').length,
        Energy:   deck.filter(c => c.type === 'energy').length,
        Deck:     deck.length,
    };

    const deckFillPct = Math.min(deck.length / 60, 1);

    // ---------- filtered / grouped deck for top scroll ----------

    const filteredDeck = selectedTab === 'Deck'
        ? deck
        : deck.filter(c => c.type === (selectedTab === 'Trainers' ? 'trainer' : selectedTab.toLowerCase()));

    const groupedDeck = filteredDeck.reduce((acc, card) => {
        acc[card.name] = (acc[card.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // ---------- filtered library ----------

    const applyLibraryFilters = (cards: LibraryCard[]): LibraryCard[] => {
        let result = [...cards];

        // Tab filter
        if (selectedTab === 'Pokemon') {
            result = result.filter(c => c.type === 'pokemon');
        } else if (selectedTab === 'Trainers') {
            result = result.filter(c => c.type === 'trainer');
        } else if (selectedTab === 'Energy') {
            result = result.filter(c => c.type === 'energy');
        }

        // Type filter
        if (activeTypeFilter !== 'All') {
            const tf = activeTypeFilter.toLowerCase();
            if (activeTypeFilter === 'Trainer') {
                result = result.filter(c => c.type === 'trainer');
            } else if (activeTypeFilter === 'Energy') {
                result = result.filter(c => c.type === 'energy');
            } else {
                result = result.filter(c =>
                    (c as any).energyType?.toLowerCase() === tf ||
                    (c as any).supertype?.toLowerCase() === tf
                );
            }
        }

        // Sort
        result.sort((a, b) => {
            if (sortMode === 'Name') return a.name.localeCompare(b.name);
            if (sortMode === 'HP')   return ((b as any).hp || 0) - ((a as any).hp || 0);
            if (sortMode === 'Cost') return ((a as any).convertedRetreatCost || 0) - ((b as any).convertedRetreatCost || 0);
            return 0;
        });

        return result;
    };

    const visibleLibraryCards = applyLibraryFilters(libraryCards);

    // ---------- deck mutations ----------

    const copyCountInDeck = (name: string) => deck.filter(c => c.name === name).length;

    const handleAddCard = (cardOrName: string | Card | LibraryCard) => {
        let cardToAdd: Card | undefined;

        if (typeof cardOrName === 'string') {
            cardToAdd = deck.find(c => c.name === cardOrName);
        } else {
            cardToAdd = cardOrName as Card;
        }

        if (!cardToAdd) return;
        if (copyCountInDeck(cardToAdd.name) >= MAX_COPIES) return;

        const newCard = { ...cardToAdd, id: `${cardToAdd.id}-${Date.now()}` };
        setDeck(prev => [...prev, newCard]);
        setHasChanges(true);
    };

    const handleRemoveCard = (cardName: string) => {
        setDeck(prev => {
            const idx = prev.findIndex(c => c.name === cardName);
            if (idx === -1) return prev;
            const next = [...prev];
            next.splice(idx, 1);
            return next;
        });
        setHasChanges(true);
    };

    // ---------- save ----------

    const handleSave = () => {
        onUpdateDeck(deck);
        setHasChanges(false);
        setSaveConfirmed(true);
        setTimeout(() => setSaveConfirmed(false), 2000);
    };

    // ---------- exit guard ----------

    const handleExit = (action: () => void) => {
        if (!hasChanges) { action(); return; }
        Alert.alert(
            'Unsaved Changes',
            'You have unsaved changes. Do you want to save them?',
            [
                { text: 'Discard', style: 'destructive', onPress: action },
                { text: 'Cancel',  style: 'cancel' },
                { text: 'Save',    onPress: () => { onUpdateDeck(deck); action(); } },
            ]
        );
    };

    // ---------- sort cycle ----------

    const cycleSortMode = () => {
        setSortMode(prev =>
            prev === 'Name' ? 'Cost' : prev === 'Cost' ? 'HP' : 'Name'
        );
    };

    // ---------- infinite scroll ----------

    const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) =>
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    // ---------- copy-limit badge color ----------

    const copyBadgeColor = (name: string) => {
        const n = copyCountInDeck(name);
        if (n >= 4) return '#E53935';
        if (n >= 3) return '#FB8C00';
        return '#1565C0';
    };

    const deckAreaHeight = deckAreaExpanded ? 180 : 80;

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#1A1A2E" barStyle="light-content" />

            {/* ── Header ── */}
            <SafeAreaView style={styles.headerSafeArea}>
                <LinearGradient
                    colors={['#1A1A2E', '#0D0D1A']}
                    style={styles.headerGradient}
                >
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
                        {(['Pokemon', 'Trainers', 'Energy', 'Deck'] as const).map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={styles.tabItem}
                                onPress={() => setSelectedTab(tab)}
                            >
                                <Text style={[styles.tabLabel, selectedTab === tab && styles.tabLabelActive]}>
                                    {tab === 'Pokemon' ? 'POKÉMON' : tab.toUpperCase()}
                                </Text>
                                <Text style={[
                                    styles.tabCount,
                                    selectedTab === tab && styles.tabCountActive,
                                ]}>
                                    {counts[tab]}
                                </Text>
                                {selectedTab === tab && <View style={styles.activeTabIndicator} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </LinearGradient>
            </SafeAreaView>

            {/* ── Deck Stats Bar ── */}
            <View style={styles.deckStatsBar}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#42A5F5' }]}>{counts.Pokemon}</Text>
                    <Text style={styles.statLabel}>Pokémon</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#AB47BC' }]}>{counts.Trainers}</Text>
                    <Text style={styles.statLabel}>Trainers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FFA726' }]}>{counts.Energy}</Text>
                    <Text style={styles.statLabel}>Energy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statItem, { flex: 2 }]}>
                    <Text style={styles.statTotal}>{deck.length}/60</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${deckFillPct * 100}%` as any }]} />
                    </View>
                </View>
            </View>

            {/* ── Current Deck Area ── */}
            <View style={[styles.currentDeckArea, { height: deckAreaHeight }]}>
                {/* Collapse toggle */}
                <TouchableOpacity
                    style={styles.deckToggleBtn}
                    onPress={() => setDeckAreaExpanded(prev => !prev)}
                >
                    <Text style={styles.deckToggleText}>{deckAreaExpanded ? '▲ Collapse' : '▼ Expand'}</Text>
                </TouchableOpacity>

                {deckAreaExpanded && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.deckScrollContent}
                    >
                        {Object.entries(groupedDeck).map(([name, count], index) => {
                            const card = deck.find(c => c.name === name);
                            const copies = copyCountInDeck(name);
                            return (
                                <View key={index} style={styles.deckCardItem}>
                                    <Image
                                        source={{ uri: card?.imageUrl }}
                                        style={styles.cardImageSmall}
                                        resizeMode="contain"
                                    />
                                    <View style={[styles.countBadge, { backgroundColor: copyBadgeColor(name) }]}>
                                        <Text style={styles.countText}>{count}</Text>
                                    </View>
                                    <View style={styles.cardControls}>
                                        <TouchableOpacity
                                            style={styles.controlButton}
                                            onPress={() => handleRemoveCard(name)}
                                        >
                                            <Text style={styles.controlText}>−</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.controlButton, copies >= MAX_COPIES && styles.controlDisabled]}
                                            onPress={() => handleAddCard(name)}
                                            disabled={copies >= MAX_COPIES}
                                        >
                                            <Text style={styles.controlText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
            </View>

            {/* ── Library Controls Row ── */}
            <View style={styles.libraryControls}>
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="SEARCH CARD LIBRARY"
                        placeholderTextColor="#555"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Type filter quick-buttons */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.typeFilterRow}
                    style={styles.typeFilterScroll}
                >
                    {TYPE_BUTTONS.map(btn => (
                        <TouchableOpacity
                            key={btn.value}
                            style={[
                                styles.typeFilterBtn,
                                activeTypeFilter === btn.value && styles.typeFilterBtnActive,
                            ]}
                            onPress={() => setActiveTypeFilter(btn.value)}
                        >
                            <Text style={[
                                styles.typeFilterLabel,
                                activeTypeFilter === btn.value && styles.typeFilterLabelActive,
                            ]}>
                                {btn.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* ── Filter / Sort Row ── */}
            <View style={styles.filterSortRow}>
                <TouchableOpacity style={styles.filterButton}>
                    <Text style={styles.filterIcon}>⇅</Text>
                    <Text style={styles.filterText}>FILTERS</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.filterButton} onPress={cycleSortMode}>
                    <Text style={styles.filterIcon}>⟳</Text>
                    <Text style={styles.filterText}>SORT: {sortMode.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {/* ── Card Library Grid ── */}
            <View style={styles.libraryGrid}>
                {isLoadingLibrary && page === 1 ? (
                    <View style={styles.loadingCenter}>
                        <Text style={styles.loadingText}>Loading library...</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.libraryContent}
                        onScroll={({ nativeEvent }) => {
                            if (isCloseToBottom(nativeEvent)) handleLoadMore();
                        }}
                        scrollEventThrottle={400}
                    >
                        {visibleLibraryCards.map((card, index) => {
                            const copies = copyCountInDeck(card.name);
                            const atLimit = copies >= MAX_COPIES;
                            return (
                                <TouchableOpacity
                                    key={`${card.id}-${index}`}
                                    style={styles.libraryCardItem}
                                    onPress={() => !atLimit && handleAddCard(card)}
                                    onLongPress={() => setPreviewCard(card)}
                                    disabled={atLimit}
                                >
                                    <Image
                                        source={{ uri: card.imageUrl }}
                                        style={[styles.cardImageLibrary, atLimit && styles.cardImageDimmed]}
                                        resizeMode="contain"
                                    />
                                    {copies > 0 && (
                                        <View style={[styles.libraryCountBadge, { backgroundColor: copyBadgeColor(card.name) }]}>
                                            <Text style={styles.countText}>{copies}</Text>
                                        </View>
                                    )}
                                    {atLimit && (
                                        <View style={styles.limitOverlay}>
                                            <Text style={styles.limitText}>MAX</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                        {isLoadingLibrary && (
                            <View style={styles.loadMoreRow}>
                                <Text style={styles.loadingText}>Loading more...</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            {/* ── Bottom Footer ── */}
            <View style={styles.bottomFooter}>
                <TouchableOpacity onPress={() => handleExit(onBack)} style={styles.footerButton}>
                    <Text style={styles.footerIcon}>←</Text>
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity onPress={handleSave} style={styles.saveButtonWrapper} activeOpacity={0.85}>
                    <LinearGradient
                        colors={saveConfirmed ? ['#2E7D32', '#1B5E20'] : ['#388E3C', '#1B5E20']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>
                            {saveConfirmed ? '✓ SAVED' : '💾 SAVE DECK'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleExit(onHome)} style={styles.footerButton}>
                    <Text style={styles.footerIcon}>🏠</Text>
                </TouchableOpacity>
            </View>

            {/* ── Card Preview Modal ── */}
            <Modal
                visible={!!previewCard}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewCard(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => setPreviewCard(null)}
                        activeOpacity={1}
                    />
                    {previewCard && (
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{previewCard.name}</Text>
                                <TouchableOpacity onPress={() => setPreviewCard(null)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <Image
                                source={{ uri: (previewCard as any).imageUrlLarge || previewCard.imageUrl }}
                                style={styles.largeCardImage}
                                resizeMode="contain"
                            />

                            <View style={styles.modalControls}>
                                <View style={styles.deckCountInfo}>
                                    <Text style={styles.deckCountLabel}>In Deck:</Text>
                                    <Text style={styles.deckCountValue}>
                                        {copyCountInDeck(previewCard.name)} / {MAX_COPIES}
                                    </Text>
                                </View>
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalActionButton, styles.removeButton]}
                                        onPress={() => handleRemoveCard(previewCard.name)}
                                    >
                                        <Text style={styles.actionButtonText}>− Remove</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalActionButton,
                                            styles.addButton,
                                            copyCountInDeck(previewCard.name) >= MAX_COPIES && styles.addButtonDisabled,
                                        ]}
                                        onPress={() => handleAddCard(previewCard)}
                                        disabled={copyCountInDeck(previewCard.name) >= MAX_COPIES}
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
        backgroundColor: '#0D0D1A',
    },

    // Header
    headerSafeArea: {
        backgroundColor: '#1A1A2E',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerGradient: {
        paddingBottom: 0,
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
        borderColor: '#444',
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

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.3)',
        height: 50,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    tabLabel: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tabLabelActive: {
        color: '#FFD700',
    },
    tabCount: {
        color: '#CCC',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tabCountActive: {
        color: '#FFD700',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 3,
        backgroundColor: '#FFD700',
    },

    // Deck Stats Bar
    deckStatsBar: {
        flexDirection: 'row',
        backgroundColor: '#111122',
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A3E',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#666',
        fontSize: 10,
        marginTop: 1,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#2A2A3E',
        marginHorizontal: 4,
    },
    statTotal: {
        color: '#EEE',
        fontSize: 15,
        fontWeight: 'bold',
    },
    progressBarBg: {
        width: '80%',
        height: 4,
        backgroundColor: '#2A2A3E',
        borderRadius: 2,
        marginTop: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 2,
    },

    // Current Deck Area
    currentDeckArea: {
        backgroundColor: '#0A0A14',
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E2E',
        overflow: 'hidden',
    },
    deckToggleBtn: {
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 2,
    },
    deckToggleText: {
        color: '#555',
        fontSize: 11,
    },
    deckScrollContent: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
    },
    deckCardItem: {
        width: 80,
        height: 112,
        marginRight: 8,
        position: 'relative',
    },
    cardImageSmall: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    countBadge: {
        position: 'absolute',
        bottom: 4,
        alignSelf: 'center',
        borderRadius: 10,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    countText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FFF',
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
        backgroundColor: 'rgba(0,0,0,0.72)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    controlDisabled: {
        opacity: 0.35,
    },
    controlText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 13,
        lineHeight: 15,
    },

    // Library Controls
    libraryControls: {
        backgroundColor: '#111',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 4,
    },
    searchContainer: {
        backgroundColor: '#1C1C2E',
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 38,
        borderWidth: 1,
        borderColor: '#2A2A3E',
        marginBottom: 6,
    },
    searchIcon: {
        marginRight: 8,
        fontSize: 14,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#DDD',
    },
    typeFilterScroll: {
        maxHeight: 36,
    },
    typeFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 2,
    },
    typeFilterBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#1C1C2E',
        borderWidth: 1,
        borderColor: '#2A2A3E',
    },
    typeFilterBtnActive: {
        backgroundColor: '#3A2A6E',
        borderColor: '#8A6ADE',
    },
    typeFilterLabel: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
    },
    typeFilterLabelActive: {
        color: '#C9AAFF',
    },

    // Filter / Sort Row
    filterSortRow: {
        flexDirection: 'row',
        backgroundColor: '#111',
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E2E',
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    filterIcon: {
        fontSize: 16,
        color: '#888',
    },
    filterText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
    },
    divider: {
        width: 1,
        backgroundColor: '#1E1E2E',
        height: '100%',
    },

    // Library Grid
    libraryGrid: {
        flex: 1,
        backgroundColor: '#111',
    },
    libraryContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 6,
        gap: 6,
    },
    libraryCardItem: {
        width: '31%',
        aspectRatio: 0.7,
        position: 'relative',
        borderRadius: 6,
        overflow: 'hidden',
    },
    cardImageLibrary: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
    },
    cardImageDimmed: {
        opacity: 0.4,
    },
    libraryCountBadge: {
        position: 'absolute',
        bottom: 6,
        alignSelf: 'center',
        borderRadius: 10,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    limitOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(200,0,0,0.25)',
        borderRadius: 6,
    },
    limitText: {
        color: '#FF5252',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#555',
    },
    loadMoreRow: {
        width: '100%',
        padding: 10,
        alignItems: 'center',
    },

    // Bottom Footer
    bottomFooter: {
        height: 56,
        backgroundColor: '#0D0D1A',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#1E1E2E',
    },
    footerButton: {
        padding: 10,
    },
    footerIcon: {
        fontSize: 22,
        color: '#888',
    },
    saveButtonWrapper: {
        flex: 1,
        marginHorizontal: 12,
        borderRadius: 8,
        overflow: 'hidden',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },

    // Preview Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#2A2A4E',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        color: '#888',
        fontSize: 18,
    },
    largeCardImage: {
        width: '100%',
        aspectRatio: 0.7,
        borderRadius: 8,
    },
    modalControls: {
        marginTop: 12,
    },
    deckCountInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    deckCountLabel: {
        color: '#888',
        fontSize: 14,
    },
    deckCountValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    modalActionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    removeButton: {
        backgroundColor: '#7F1D1D',
    },
    addButton: {
        backgroundColor: '#1565C0',
    },
    addButtonDisabled: {
        backgroundColor: '#333',
        opacity: 0.5,
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default EditDeckScreen;
