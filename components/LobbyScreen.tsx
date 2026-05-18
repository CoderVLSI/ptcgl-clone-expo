import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    SafeAreaView, StatusBar, useWindowDimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Card } from '../types/game';
import DeckManager from './DeckManager';

interface LobbyScreenProps {
    onPlayPress: () => void;
    activeDeck?: Card[];
    activeDeckName?: string;
    onEditDeck: () => void;
    onDecksPress: () => void;
    onUpdateDeck: (deck: Card[]) => void;
    onLeaderboardPress?: () => void;
    onFriendBattlePress?: () => void;
    playerWins?: number;
    playerLosses?: number;
}

type GameMode = 'Ranked' | 'Casual' | 'Friends';

const TYPE_COLOR: Record<string, string> = {
    fighting: '#C03028',
    psychic: '#A040A0',
    lightning: '#C8A000',
    water: '#2060C0',
    grass: '#3A8A30',
    fire: '#C04808',
    darkness: '#403830',
    metal: '#6870A0',
    colorless: '#888888',
};

interface TierInfo {
    label: string;
    color: string;
    icon: string;
}

function getTierInfo(score: number): TierInfo {
    if (score >= 3000) return { label: 'MASTER',   color: '#E040FB', icon: '💎' };
    if (score >= 2500) return { label: 'DIAMOND',  color: '#00E5FF', icon: '💠' };
    if (score >= 2000) return { label: 'PLATINUM', color: '#B0BEC5', icon: '🔷' };
    if (score >= 1500) return { label: 'GOLD',     color: '#FFD700', icon: '🥇' };
    if (score >= 1000) return { label: 'SILVER',   color: '#CFD8DC', icon: '🥈' };
    return                     { label: 'BRONZE',  color: '#CD7F32', icon: '🥉' };
}

// Convenience alias kept for backwards-compat in case callers used the old name
function getTierIcon(score: number): string {
    const t = getTierInfo(score);
    return `${t.icon} ${t.label}`;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
    onPlayPress,
    activeDeck = [],
    activeDeckName = 'Deck',
    onEditDeck,
    onDecksPress,
    onUpdateDeck,
    onLeaderboardPress,
    onFriendBattlePress,
    playerWins = 0,
    playerLosses = 0,
}) => {
    const [mode, setMode] = useState<GameMode>('Ranked');
    const [showDeckManager, setShowDeckManager] = useState(false);
    const { width, height } = useWindowDimensions();

    // Bounce animation for play button (spring from 0.7 → 1 on mount)
    const playScale = useRef(new Animated.Value(0.7)).current;
    useEffect(() => {
        Animated.spring(playScale, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
        }).start();
    }, []);

    // Derive featured card from the active deck
    const mainPokemon =
        activeDeck.find(c =>
            c.type === 'pokemon' &&
            (c.name.includes(' ex') || c.name.includes('Mega ') || c.name.includes(' VMAX'))
        ) || activeDeck.find(c => c.type === 'pokemon');

    const mainCardImage = mainPokemon?.imageUrlLarge || mainPokemon?.imageUrl;
    const deckTypeColor = TYPE_COLOR[mainPokemon?.energyType || 'colorless'] || '#888888';
    const bgImage = mainCardImage || 'https://images.pokemontcg.io/sv5/123_hires.png';

    const RANK_SCORE = 1708;
    const tier = getTierInfo(RANK_SCORE);

    const handleModePress = (selectedMode: GameMode) => {
        if (selectedMode === 'Friends') {
            onFriendBattlePress?.();
        }
        setMode(selectedMode);
    };

    return (
        <View style={styles.container}>
            <DeckManager
                visible={showDeckManager}
                onClose={() => setShowDeckManager(false)}
                deck={activeDeck}
                deckName={activeDeckName}
                onEditDeck={() => {
                    setShowDeckManager(false);
                    onEditDeck();
                }}
            />
            <StatusBar barStyle="light-content" />

            {/* Blurred background derived from active deck card */}
            <Image
                source={{ uri: bgImage }}
                style={[styles.backgroundImage, { width, height }]}
                resizeMode="cover"
                blurRadius={8}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)', '#1A1A2E']}
                style={[styles.gradientOverlay, { width, height }]}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* ── Top Bar — Currency ── */}
                <View style={styles.topBar}>
                    <View style={styles.currencyContainer}>
                        <View style={styles.currencyItem}>
                            <View style={[styles.currencyIcon, { backgroundColor: '#A020F0' }]} />
                            <Text style={styles.currencyText}>873</Text>
                        </View>
                        <View style={styles.currencyItem}>
                            <View style={[styles.currencyIcon, { backgroundColor: '#00FFFF' }]} />
                            <Text style={styles.currencyText}>8,670</Text>
                        </View>
                    </View>
                </View>

                {/* ── Mode Selector — 3 tabs: RANKED | CASUAL | FRIENDS ── */}
                <View style={styles.modeSelector}>
                    {(['Ranked', 'Casual', 'Friends'] as GameMode[]).map(m => (
                        <TouchableOpacity
                            key={m}
                            onPress={() => handleModePress(m)}
                            style={styles.modeButton}
                        >
                            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                                {m.toUpperCase()}
                            </Text>
                            {mode === m && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Main Content ── */}
                <View style={styles.centerContent}>
                    {/* Featured Card — 200×280 with type-colored glow */}
                    <View style={styles.featuredContainer}>
                        <View
                            style={[
                                styles.featuredCardWrapper,
                                {
                                    shadowColor: deckTypeColor,
                                    shadowRadius: 20,
                                    shadowOpacity: 0.85,
                                    shadowOffset: { width: 0, height: 0 },
                                    elevation: 12,
                                },
                            ]}
                        >
                            {mainCardImage ? (
                                <Image
                                    source={{ uri: mainCardImage }}
                                    style={styles.featuredCard}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.featuredCard,
                                        { backgroundColor: deckTypeColor, opacity: 0.5, borderRadius: 12 },
                                    ]}
                                />
                            )}
                        </View>
                    </View>

                    {/* Tier Badge + Rank Score pill */}
                    <View style={styles.rankBlock}>
                        <View style={[styles.tierBadge, { backgroundColor: tier.color + '33', borderColor: tier.color }]}>
                            <Text style={[styles.tierText, { color: tier.color }]}>
                                {tier.icon} {tier.label}
                            </Text>
                        </View>
                        <View style={[styles.rankContainer, { borderColor: tier.color }]}>
                            <Text style={[styles.rankScore, { color: tier.color }]}>{RANK_SCORE}</Text>
                        </View>
                    </View>

                    {/* Play Button — bigger, gold gradient, bounce-in on mount */}
                    <Animated.View style={[styles.playButtonWrapper, { transform: [{ scale: playScale }] }]}>
                        <TouchableOpacity
                            style={styles.playButton}
                            onPress={onPlayPress}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                style={styles.playButtonGradient}
                            >
                                <Text style={styles.playButtonText}>PLAY</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Active Deck Display */}
                    <TouchableOpacity
                        style={styles.activeDeckContainer}
                        onPress={() => setShowDeckManager(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.deckBoxVisual}>
                            <View style={[styles.deckBoxDepth, { backgroundColor: deckTypeColor }]} />
                            {mainCardImage ? (
                                <Image
                                    source={{ uri: mainCardImage }}
                                    style={styles.deckBoxCover}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.deckBoxCover, { backgroundColor: deckTypeColor }]} />
                            )}
                            <View style={styles.deckTypeBadge}>
                                <View style={[styles.typeIcon, { backgroundColor: deckTypeColor }]} />
                            </View>
                        </View>

                        <View style={styles.deckInfo}>
                            <Text style={styles.activeDeckLabel}>ACTIVE DECK</Text>
                            <Text style={styles.activeDeckName}>{activeDeckName}</Text>
                            {/* Win / Loss row */}
                            <View style={styles.winLossRow}>
                                <Text style={styles.winsText}>W: {playerWins}</Text>
                                <Text style={styles.wlSep}> | </Text>
                                <Text style={styles.lossesText}>L: {playerLosses}</Text>
                            </View>
                            <View style={styles.deckStats}>
                                <Text style={styles.deckStatText}>Standard</Text>
                                <View style={styles.separator} />
                                <Text style={styles.deckStatText}>{activeDeck.length} Cards</Text>
                            </View>
                        </View>

                        <View style={styles.changeDeckButton}>
                            <Text style={styles.changeDeckText}>✎</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Bottom Navigation — 4 items ── */}
                <View style={styles.bottomNav}>
                    {/* PROFILE */}
                    <TouchableOpacity style={styles.navItem}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' }}
                                style={styles.avatar}
                            />
                            <View style={styles.levelBadge}>
                                <Text style={styles.levelText}>46</Text>
                            </View>
                        </View>
                        <Text style={styles.navLabel}>PROFILE</Text>
                    </TouchableOpacity>

                    {/* DECKS */}
                    <TouchableOpacity style={styles.navItem} onPress={onDecksPress}>
                        <View style={styles.navIconBox}>
                            {/* Card-stack icon — three overlapping rectangles */}
                            <View style={styles.cardStackIcon}>
                                <View style={[styles.cardLayer, { top: 4, left: 4, backgroundColor: '#777' }]} />
                                <View style={[styles.cardLayer, { top: 2, left: 2, backgroundColor: '#999' }]} />
                                <View style={[styles.cardLayer, { top: 0, left: 0, backgroundColor: '#EEE' }]} />
                            </View>
                        </View>
                        <Text style={styles.navLabel}>DECKS</Text>
                    </TouchableOpacity>

                    {/* LADDER */}
                    <TouchableOpacity style={styles.navItem} onPress={onLeaderboardPress}>
                        <View style={styles.navIconBox}>
                            <Text style={styles.navIconEmoji}>🏆</Text>
                        </View>
                        <Text style={styles.navLabel}>LADDER</Text>
                    </TouchableOpacity>

                    {/* SHOP */}
                    <TouchableOpacity style={styles.navItem}>
                        <View style={styles.navIconBox}>
                            <Text style={styles.navIconEmoji}>🛍️</Text>
                        </View>
                        <Text style={styles.navLabel}>SHOP</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    // ── Root ──────────────────────────────────────────────────────────────────
    container: {
        flex: 1,
        backgroundColor: '#1A1A2E',
    },
    backgroundImage: {
        position: 'absolute',
        opacity: 0.6,
    },
    gradientOverlay: {
        position: 'absolute',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },

    // ── Top Bar ───────────────────────────────────────────────────────────────
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingTop: 40,
    },
    currencyContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    currencyIcon: {
        width: 20,
        height: 20,
        transform: [{ rotate: '45deg' }],
        marginRight: 8,
    },
    currencyText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // ── Mode Selector ─────────────────────────────────────────────────────────
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        marginTop: 16,
    },
    modeButton: {
        alignItems: 'center',
    },
    modeText: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modeTextActive: {
        color: '#FFD700',
        textShadowColor: 'rgba(255,215,0,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    activeIndicator: {
        width: 36,
        height: 3,
        backgroundColor: '#FFD700',
        marginTop: 4,
        borderRadius: 2,
    },

    // ── Center Content ────────────────────────────────────────────────────────
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },

    // ── Featured Card ─────────────────────────────────────────────────────────
    featuredContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    featuredCardWrapper: {
        width: 200,
        height: 280,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    featuredCard: {
        width: 200,
        height: 280,
    },

    // ── Tier + Rank Score ─────────────────────────────────────────────────────
    rankBlock: {
        alignItems: 'center',
        marginBottom: 8,
        gap: 4,
    },
    tierBadge: {
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    tierText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    rankContainer: {
        backgroundColor: 'rgba(30,30,50,0.85)',
        paddingHorizontal: 28,
        paddingVertical: 5,
        borderRadius: 18,
        borderWidth: 2,
    },
    rankScore: {
        fontSize: 20,
        fontWeight: 'bold',
    },

    // ── Play Button ───────────────────────────────────────────────────────────
    playButtonWrapper: {
        marginTop: 16,
        marginBottom: 4,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
    },
    playButton: {},
    playButtonGradient: {
        paddingHorizontal: 80,
        paddingVertical: 18,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    playButtonText: {
        color: '#8B0000',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2,
    },

    // ── Active Deck ───────────────────────────────────────────────────────────
    activeDeckContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 12,
        borderRadius: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 16,
        minWidth: 280,
    },
    deckBoxVisual: {
        width: 60,
        height: 84,
        position: 'relative',
        transform: [{ rotate: '-5deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    deckBoxDepth: {
        position: 'absolute',
        top: 4,
        left: 4,
        width: '100%',
        height: '100%',
        borderRadius: 6,
    },
    deckBoxCover: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    deckTypeBadge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    typeIcon: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    deckInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    activeDeckLabel: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    activeDeckName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    winLossRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    winsText: {
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: 'bold',
    },
    wlSep: {
        color: '#555',
        fontSize: 12,
    },
    lossesText: {
        color: '#F44336',
        fontSize: 12,
        fontWeight: 'bold',
    },
    deckStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deckStatText: {
        color: '#AAA',
        fontSize: 12,
    },
    separator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#555',
        marginHorizontal: 6,
    },
    changeDeckButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    changeDeckText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },

    // ── Bottom Navigation ─────────────────────────────────────────────────────
    bottomNav: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 70,
        minWidth: 64,
    },
    navLabel: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    // Profile avatar with level badge
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#FFD700',
        backgroundColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    levelBadge: {
        position: 'absolute',
        bottom: -6,
        backgroundColor: '#FFD700',
        paddingHorizontal: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#000',
    },
    levelText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000',
    },
    // Generic nav icon box
    navIconBox: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 10,
    },
    navIconEmoji: {
        fontSize: 24,
    },
    // Card-stack icon for DECKS tab
    cardStackIcon: {
        width: 26,
        height: 34,
        position: 'relative',
    },
    cardLayer: {
        position: 'absolute',
        width: 22,
        height: 30,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.3)',
    },
});

export default LobbyScreen;
