import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Easing,
} from 'react-native';
import Colors from '../constants/colors';

interface GameStartCoinFlipProps {
    visible: boolean;
    onComplete: (playerGoesFirst: boolean) => void;
}

export const GameStartCoinFlip: React.FC<GameStartCoinFlipProps> = ({
    visible,
    onComplete,
}) => {
    const [phase, setPhase] = useState<'choose' | 'flipping' | 'result'>('choose');
    const [playerChoice, setPlayerChoice] = useState<'heads' | 'tails' | null>(null);
    const [result, setResult] = useState<'heads' | 'tails' | null>(null);
    const [playerWon, setPlayerWon] = useState<boolean | null>(null);
    const rotateAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(1))[0];

    const handleChoose = (choice: 'heads' | 'tails') => {
        setPlayerChoice(choice);
        setPhase('flipping');

        // Random result
        const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = choice === flipResult;

        // Animation
        Animated.sequence([
            Animated.parallel([
                Animated.timing(rotateAnim, {
                    toValue: 10,
                    duration: 2000,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.5,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1600,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        ]).start(() => {
            setResult(flipResult);
            setPlayerWon(won);
            setPhase('result');
            rotateAnim.setValue(0);
        });
    };

    const handleContinue = () => {
        if (playerWon !== null) {
            onComplete(playerWon);
        }
    };

    const interpolatedRotateX = rotateAnim.interpolate({
        inputRange: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        outputRange: [
            '0deg', '180deg', '360deg', '540deg', '720deg',
            '900deg', '1080deg', '1260deg', '1440deg', '1620deg', '1800deg'
        ],
    });

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Title */}
                    <Text style={styles.title}>
                        {phase === 'choose' ? 'Choose Heads or Tails' :
                            phase === 'flipping' ? 'Flipping...' :
                                playerWon ? '🎉 You Go First!' : '😢 Opponent Goes First'}
                    </Text>

                    {/* Coin */}
                    <Animated.View
                        style={[
                            styles.coin,
                            {
                                transform: [
                                    { rotateX: interpolatedRotateX },
                                    { scale: scaleAnim },
                                ],
                            },
                        ]}
                    >
                        {result === null ? (
                            <Text style={styles.coinText}>?</Text>
                        ) : result === 'heads' ? (
                            <View style={styles.coinHeads}>
                                <Text style={styles.coinEmoji}>⭐</Text>
                            </View>
                        ) : (
                            <View style={styles.coinTails}>
                                <Text style={styles.coinEmoji}>🌙</Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Choice Buttons */}
                    {phase === 'choose' && (
                        <View style={styles.choiceRow}>
                            <TouchableOpacity
                                style={[styles.choiceButton, styles.headsButton]}
                                onPress={() => handleChoose('heads')}
                            >
                                <Text style={styles.choiceEmoji}>⭐</Text>
                                <Text style={styles.choiceText}>Heads</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.choiceButton, styles.tailsButton]}
                                onPress={() => handleChoose('tails')}
                            >
                                <Text style={styles.choiceEmoji}>🌙</Text>
                                <Text style={styles.choiceText}>Tails</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Result Info */}
                    {phase === 'result' && (
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultText}>
                                You chose: {playerChoice?.toUpperCase()}
                            </Text>
                            <Text style={styles.resultText}>
                                Result: {result?.toUpperCase()}
                            </Text>

                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={handleContinue}
                            >
                                <Text style={styles.continueText}>Start Game</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
        padding: 30,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.card.highlight,
        minWidth: 300,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.ui.white,
        marginBottom: 30,
        textAlign: 'center',
    },
    coin: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: Colors.card.highlight,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.card.highlight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 30,
        elevation: 20,
        marginBottom: 30,
    },
    coinHeads: {
        width: '100%',
        height: '100%',
        borderRadius: 70,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinTails: {
        width: '100%',
        height: '100%',
        borderRadius: 70,
        backgroundColor: '#C0C0C0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinText: {
        fontSize: 60,
        fontWeight: 'bold',
        color: '#333',
    },
    coinEmoji: {
        fontSize: 60,
    },
    choiceRow: {
        flexDirection: 'row',
        gap: 20,
    },
    choiceButton: {
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    headsButton: {
        backgroundColor: '#FFD700',
    },
    tailsButton: {
        backgroundColor: '#C0C0C0',
    },
    choiceEmoji: {
        fontSize: 32,
        marginBottom: 4,
    },
    choiceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    resultContainer: {
        alignItems: 'center',
    },
    resultText: {
        fontSize: 16,
        color: '#AAA',
        marginBottom: 8,
    },
    continueButton: {
        marginTop: 20,
        backgroundColor: Colors.energy.grass,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 25,
    },
    continueText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
});

export default GameStartCoinFlip;
