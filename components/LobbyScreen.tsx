import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

interface LobbyScreenProps {
    onPlayPress: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onPlayPress }) => {
    const [mode, setMode] = useState<'Ranked' | 'Casual'>('Ranked');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background */}
            <Image
                source={{ uri: 'https://images.pokemontcg.io/swsh12pt5/160_hires.png' }} // Placeholder for dynamic background (Pikachu VMAX or similar)
                style={styles.backgroundImage}
                resizeMode="cover"
                blurRadius={3}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', '#1A1A2E']}
                style={styles.gradientOverlay}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Top Bar - Currency */}
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

                {/* Mode Selector */}
                <View style={styles.modeSelector}>
                    <TouchableOpacity onPress={() => setMode('Ranked')} style={styles.modeButton}>
                        <Text style={[styles.modeText, mode === 'Ranked' && styles.modeTextActive]}>RANKED</Text>
                        {mode === 'Ranked' && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMode('Casual')} style={styles.modeButton}>
                        <Text style={[styles.modeText, mode === 'Casual' && styles.modeTextActive]}>CASUAL</Text>
                        {mode === 'Casual' && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                </View>

                {/* Main Content - Featured Card & Play */}
                <View style={styles.centerContent}>
                    {/* Hexagon/Featured Graphics */}
                    <View style={styles.featuredContainer}>
                        <View style={styles.hexagonBorder}>
                            <Image
                                source={{ uri: 'https://images.pokemontcg.io/swsh9/122_hires.png' }} // Arceus VSTAR
                                style={styles.featuredCard}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {/* Rank Score */}
                    <View style={styles.rankContainer}>
                        <Text style={styles.rankScore}>1708</Text>
                    </View>

                    {/* Play Button */}
                    <TouchableOpacity style={styles.playButton} onPress={onPlayPress}>
                        <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            style={styles.playButtonGradient}
                        >
                            <Text style={styles.playButtonText}>PLAY</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                    {/* Profile */}
                    <TouchableOpacity style={styles.navItem}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' }} // Placeholder Avatar
                                style={styles.avatar}
                            />
                            <View style={styles.levelBadge}>
                                <Text style={styles.levelText}>46</Text>
                            </View>
                        </View>
                        <Text style={styles.navLabel}>PROFILE</Text>
                    </TouchableOpacity>

                    {/* Decks - Festival Box Style */}
                    <TouchableOpacity style={styles.navItem}>
                        <View style={styles.deckBoxContainer}>
                            <View style={styles.deckBoxFront} />
                            <Text style={styles.deckLabel}>DECKS</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Center Grid/Menu */}
                    <TouchableOpacity style={styles.menuButton}>
                        <View style={styles.gridIcon}>
                            <View style={styles.gridRow}>
                                <View style={styles.gridDot} /><View style={styles.gridDot} /><View style={styles.gridDot} />
                            </View>
                            <View style={styles.gridRow}>
                                <View style={styles.gridDot} /><View style={styles.gridDot} /><View style={styles.gridDot} />
                            </View>
                            <View style={styles.gridRow}>
                                <View style={styles.gridDot} /><View style={styles.gridDot} /><View style={styles.gridDot} />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Battle Pass */}
                    <TouchableOpacity style={styles.navItem}>
                        <View style={styles.battlePassContainer}>
                            <Text style={styles.bpLevel}>74</Text>
                            <Text style={styles.bpLabel}>BATTLE PASS</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Shop */}
                    <TouchableOpacity style={styles.navItem}>
                        <View style={styles.shopContainer}>
                            <Image
                                source={{ uri: 'https://images.pokemontcg.io/sv08/logo.png' }} // Surging Sparks Logo approximation
                                style={styles.shopLogo}
                                resizeMode="contain"
                            />
                            <Text style={styles.navLabel}>SHOP</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1A2E',
    },
    backgroundImage: {
        position: 'absolute',
        width: width,
        height: height,
        opacity: 0.6,
    },
    gradientOverlay: {
        position: 'absolute',
        width: width,
        height: height,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Items aligned to right
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
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        marginTop: 20,
    },
    modeButton: {
        alignItems: 'center',
    },
    modeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modeTextActive: {
        color: '#FFD700',
        textShadowColor: 'rgba(255, 215, 0, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    activeIndicator: {
        width: 40,
        height: 3,
        backgroundColor: '#FFD700',
        marginTop: 4,
        borderRadius: 2,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    featuredContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    hexagonBorder: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        // Creating a simple shape pending SVG
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#A020F0',
        transform: [{ rotate: '45deg' }],
        overflow: 'hidden',
    },
    featuredCard: {
        width: 140,
        height: 140,
        transform: [{ rotate: '-45deg' }], // Counter rotate image
    },
    rankContainer: {
        backgroundColor: '#333',
        paddingHorizontal: 30,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: -20, // Overlap with Play button
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#A020F0',
    },
    rankScore: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    playButton: {
        marginTop: 30,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    playButtonGradient: {
        paddingHorizontal: 60,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    playButtonText: {
        color: '#8B0000',
        fontSize: 28,
        fontWeight: '900', // Black
        letterSpacing: 2,
    },
    bottomNav: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 80,
    },
    navLabel: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#FFF',
        backgroundColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    levelBadge: {
        position: 'absolute',
        bottom: -5,
        backgroundColor: '#FFD700',
        paddingHorizontal: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#000',
    },
    levelText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    deckBoxContainer: {
        alignItems: 'center',
    },
    deckBoxFront: {
        width: 40,
        height: 50,
        backgroundColor: '#E74C3C',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    deckLabel: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
    menuButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    gridIcon: {
        padding: 4,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    gridDot: {
        width: 4,
        height: 4,
        backgroundColor: '#FFF',
        borderRadius: 2,
    },
    battlePassContainer: {
        alignItems: 'center',
    },
    bpLevel: {
        fontSize: 24,
        color: '#FFD700',
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    bpLabel: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
        backgroundColor: '#FFF',
        color: '#000',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
        marginTop: 0,
    },
    shopContainer: {
        alignItems: 'center',
    },
    shopLogo: {
        width: 60,
        height: 30,
    },
});

export default LobbyScreen;
