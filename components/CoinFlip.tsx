import React, { useState, useRef, useEffect } from 'react';
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

interface CoinFlipProps {
    visible: boolean;
    onClose: () => void;
    onResult: (result: 'heads' | 'tails') => void;
    autoFlip?: boolean;
}

export const CoinFlip: React.FC<CoinFlipProps> = ({
    visible,
    onClose,
    onResult,
    autoFlip = false,
}) => {
    const [isFlipping, setIsFlipping] = useState(false);
    const [result, setResult] = useState<'heads' | 'tails' | null>(null);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible && autoFlip) {
            flipCoin();
        }
    }, [visible, autoFlip]);

    const flipCoin = () => {
        if (isFlipping) return;

        setIsFlipping(true);
        setResult(null);

        // Random result
        const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';

        // Animation sequence
        Animated.sequence([
            // Start spinning
            Animated.parallel([
                Animated.timing(rotateAnim, {
                    toValue: 8, // 8 full rotations
                    duration: 1500,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.3,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        ]).start(() => {
            setResult(flipResult);
            setIsFlipping(false);
            rotateAnim.setValue(0);
            onResult(flipResult);
        });
    };

    const interpolatedRotateX = rotateAnim.interpolate({
        inputRange: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        outputRange: ['0deg', '180deg', '360deg', '540deg', '720deg', '900deg', '1080deg', '1260deg', '1440deg'],
    });

    const handleClose = () => {
        setResult(null);
        rotateAnim.setValue(0);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Coin Flip</Text>

                    {/* Coin */}
                    <TouchableOpacity
                        onPress={flipCoin}
                        disabled={isFlipping}
                        activeOpacity={0.9}
                    >
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
                    </TouchableOpacity>

                    {/* Result */}
                    {result && (
                        <View style={[
                            styles.resultBadge,
                            result === 'heads' ? styles.headsBadge : styles.tailsBadge,
                        ]}>
                            <Text style={styles.resultText}>
                                {result === 'heads' ? 'HEADS!' : 'TAILS!'}
                            </Text>
                        </View>
                    )}

                    {/* Instructions */}
                    <Text style={styles.instructions}>
                        {isFlipping
                            ? 'Flipping...'
                            : result
                                ? 'Tap to flip again'
                                : 'Tap the coin to flip'}
                    </Text>

                    {/* Done Button */}
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={handleClose}
                    >
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.card.highlight,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.ui.white,
        marginBottom: 30,
    },
    coin: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.card.highlight,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.card.highlight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    coinHeads: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinTails: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        backgroundColor: '#C0C0C0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#333',
    },
    coinEmoji: {
        fontSize: 48,
    },
    resultBadge: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    headsBadge: {
        backgroundColor: '#FFD700',
    },
    tailsBadge: {
        backgroundColor: '#C0C0C0',
    },
    resultText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    instructions: {
        fontSize: 14,
        color: '#888',
        marginTop: 20,
    },
    doneButton: {
        marginTop: 20,
        paddingHorizontal: 40,
        paddingVertical: 12,
        backgroundColor: Colors.primary.red,
        borderRadius: 25,
    },
    doneText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
});

export default CoinFlip;
