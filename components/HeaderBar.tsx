import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Colors from '../constants/colors';

interface HeaderBarProps {
    opponentName: string;
    turnNumber: number;
    onMenuPress?: () => void;
    onSettingsPress?: () => void;
    playerPrizes?: number;
    opponentPrizes?: number;
    timeRemaining?: number;
    isPlayerTurn?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    opponentName,
    turnNumber,
    onMenuPress,
    onSettingsPress,
    playerPrizes,
    opponentPrizes,
    timeRemaining,
    isPlayerTurn,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (timeRemaining !== undefined && timeRemaining < 10) {
            pulseLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.5,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseLoopRef.current.start();
        } else {
            if (pulseLoopRef.current) {
                pulseLoopRef.current.stop();
                pulseLoopRef.current = null;
            }
            pulseAnim.setValue(1);
        }

        return () => {
            if (pulseLoopRef.current) {
                pulseLoopRef.current.stop();
            }
        };
    }, [timeRemaining !== undefined && timeRemaining < 10]);

    const getTimerColor = () => {
        if (timeRemaining === undefined) return Colors.ui.white;
        if (timeRemaining > 20) return Colors.ui.white;
        if (timeRemaining >= 10) return '#FFC107';
        return '#FF4444';
    };

    const timerColor = getTimerColor();
    const isCriticalTime = timeRemaining !== undefined && timeRemaining < 10;

    return (
        <View style={styles.container}>
            {/* Left: menu button + player prizes */}
            <View style={styles.sideSection}>
                <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
                    <Text style={styles.iconText}>☰</Text>
                </TouchableOpacity>
                {playerPrizes !== undefined && (
                    <View style={styles.prizeContainer}>
                        <Text style={styles.prizeTrophy}>🏆</Text>
                        <Text style={styles.prizeCount}>{playerPrizes}</Text>
                    </View>
                )}
            </View>

            {/* Center: opponent name + turn */}
            <View style={styles.centerSection}>
                <Text style={styles.opponentName} numberOfLines={1}>{opponentName}</Text>
                <Text style={styles.turnText}>Turn {turnNumber}</Text>
            </View>

            {/* Right: opponent prizes + timer */}
            <View style={styles.sideSectionRight}>
                {opponentPrizes !== undefined && (
                    <View style={styles.prizeContainer}>
                        <Text style={styles.prizeTrophy}>🏆</Text>
                        <Text style={styles.prizeCount}>{opponentPrizes}</Text>
                    </View>
                )}
                {timeRemaining !== undefined && (
                    isCriticalTime ? (
                        <Animated.View style={{ opacity: pulseAnim }}>
                            <Text style={[styles.timer, { color: timerColor }]}>
                                {timeRemaining}s
                            </Text>
                        </Animated.View>
                    ) : (
                        <Text style={[styles.timer, { color: timerColor }]}>
                            {timeRemaining}s
                        </Text>
                    )
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.primary.darkRed,
        paddingHorizontal: 12,
        height: 44,
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary.maroon,
    },
    sideSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minWidth: 80,
    },
    sideSectionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minWidth: 80,
        justifyContent: 'flex-end',
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 16,
        color: Colors.ui.white,
    },
    prizeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    prizeTrophy: {
        fontSize: 13,
    },
    prizeCount: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: 'bold',
    },
    centerSection: {
        alignItems: 'center',
        flex: 1,
    },
    opponentName: {
        color: Colors.ui.white,
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    turnText: {
        color: Colors.ui.white,
        fontSize: 10,
        opacity: 0.7,
        marginTop: 1,
    },
    timer: {
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
});

export default HeaderBar;
