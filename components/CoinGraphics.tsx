import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Pikachu Coin for heads side - using regular React Native components
export const PikachuCoin: React.FC<{ size?: number }> = ({ size = 100 }) => {
    const scale = size / 100;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Outer gold rim */}
            <View style={[styles.coinBase, styles.goldCoin, { width: size, height: size, borderRadius: size / 2 }]}>
                {/* Inner shine */}
                <View style={[styles.innerShine, { width: size * 0.84, height: size * 0.84, borderRadius: size * 0.42 }]} />

                {/* Pikachu Face */}
                <View style={[styles.pikachuFace, { transform: [{ scale: scale * 0.8 }] }]}>
                    {/* Left ear */}
                    <View style={[styles.ear, styles.earLeft]}>
                        <View style={styles.earTip} />
                    </View>

                    {/* Right ear */}
                    <View style={[styles.ear, styles.earRight]}>
                        <View style={styles.earTip} />
                    </View>

                    {/* Face body */}
                    <View style={styles.faceBody} />

                    {/* Left eye */}
                    <View style={[styles.eye, styles.eyeLeft]}>
                        <View style={styles.eyeHighlight} />
                    </View>

                    {/* Right eye */}
                    <View style={[styles.eye, styles.eyeRight]}>
                        <View style={styles.eyeHighlight} />
                    </View>

                    {/* Nose */}
                    <View style={styles.nose} />

                    {/* Mouth */}
                    <View style={styles.mouth} />

                    {/* Left cheek */}
                    <View style={[styles.cheek, styles.cheekLeft]} />

                    {/* Right cheek */}
                    <View style={[styles.cheek, styles.cheekRight]} />
                </View>

                {/* Edge shine */}
                <View style={[styles.edgeShine, { width: size * 0.94, height: size * 0.94, borderRadius: size * 0.47 }]} />
            </View>
        </View>
    );
};

// Pokemon TCG Coin for tails side
export const PokemonTcgCoin: React.FC<{ size?: number }> = ({ size = 100 }) => {
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Outer silver rim */}
            <View style={[styles.coinBase, styles.silverCoin, { width: size, height: size, borderRadius: size / 2 }]}>
                {/* Inner shine */}
                <View style={[styles.innerShine, styles.silverInnerShine, { width: size * 0.84, height: size * 0.84, borderRadius: size * 0.42 }]} />

                {/* Pokemon TCG Text */}
                <View style={styles.tcgContainer}>
                    <Text style={styles.pokemonText}>POKÉMON</Text>
                    <Text style={styles.tcgText}>TCG</Text>
                    <View style={styles.divider} />

                    {/* Pokeball decoration */}
                    <View style={styles.pokeball}>
                        <View style={styles.pokeballTop} />
                        <View style={styles.pokeballLine} />
                        <View style={styles.pokeballCenter}>
                            <View style={styles.pokeballCenterInner} />
                        </View>
                        <View style={styles.pokeballBottom} />
                    </View>
                </View>

                {/* Edge shine */}
                <View style={[styles.edgeShine, styles.silverEdgeShine, { width: size * 0.94, height: size * 0.94, borderRadius: size * 0.47 }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinBase: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    goldCoin: {
        backgroundColor: '#FFC107',
        borderWidth: 2,
        borderColor: '#F57C00',
    },
    silverCoin: {
        backgroundColor: '#BDBDBD',
        borderWidth: 2,
        borderColor: '#757575',
    },
    innerShine: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    silverInnerShine: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    edgeShine: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    silverEdgeShine: {
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },

    // Pikachu styles
    pikachuFace: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ear: {
        position: 'absolute',
        width: 16,
        height: 35,
        backgroundColor: '#FFCC02',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    earLeft: {
        top: 5,
        left: 22,
        transform: [{ rotate: '-20deg' }],
    },
    earRight: {
        top: 5,
        right: 22,
        transform: [{ rotate: '20deg' }],
    },
    earTip: {
        position: 'absolute',
        top: 0,
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderBottomWidth: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopColor: '#1A1A1A',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    faceBody: {
        position: 'absolute',
        width: 50,
        height: 45,
        backgroundColor: '#FFCC02',
        borderRadius: 25,
        top: 30,
    },
    eye: {
        position: 'absolute',
        width: 12,
        height: 12,
        backgroundColor: '#1A1A1A',
        borderRadius: 6,
        top: 38,
    },
    eyeLeft: {
        left: 38,
    },
    eyeRight: {
        right: 38,
    },
    eyeHighlight: {
        position: 'absolute',
        width: 4,
        height: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
        top: 2,
        left: 2,
    },
    nose: {
        position: 'absolute',
        width: 4,
        height: 3,
        backgroundColor: '#1A1A1A',
        borderRadius: 2,
        top: 50,
    },
    mouth: {
        position: 'absolute',
        width: 18,
        height: 8,
        top: 54,
        borderBottomWidth: 2,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#1A1A1A',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderRadius: 10,
    },
    cheek: {
        position: 'absolute',
        width: 14,
        height: 14,
        backgroundColor: '#FF6B6B',
        borderRadius: 7,
        top: 46,
    },
    cheekLeft: {
        left: 30,
    },
    cheekRight: {
        right: 30,
    },

    // Pokemon TCG styles
    tcgContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pokemonText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: 1,
        top: -5,
    },
    tcgText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#E53935',
        letterSpacing: 2,
        top: -2,
    },
    divider: {
        width: 56,
        height: 2,
        backgroundColor: '#1A1A1A',
        borderRadius: 1,
        marginTop: 4,
    },
    pokeball: {
        width: 30,
        height: 30,
        marginTop: 4,
    },
    pokeballTop: {
        position: 'absolute',
        width: 30,
        height: 15,
        backgroundColor: '#DC0A2D',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
    },
    pokeballBottom: {
        position: 'absolute',
        width: 30,
        height: 15,
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        top: 15,
    },
    pokeballLine: {
        position: 'absolute',
        width: 30,
        height: 3,
        backgroundColor: '#1A1A1A',
        top: 13,
    },
    pokeballCenter: {
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: '#1A1A1A',
        borderRadius: 5,
        top: 10,
        left: 10,
    },
    pokeballCenterInner: {
        position: 'absolute',
        width: 6,
        height: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
        top: 2,
        left: 2,
    },
});
