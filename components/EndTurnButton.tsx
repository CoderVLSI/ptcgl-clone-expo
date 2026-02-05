import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';

interface EndTurnButtonProps {
    onPress: () => void;
    disabled?: boolean;
    timeRemaining?: number;
}

export const EndTurnButton: React.FC<EndTurnButtonProps> = ({
    onPress,
    disabled = false,
    timeRemaining,
}) => {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = (): string => {
        if (!timeRemaining) return Colors.timer.normal;
        if (timeRemaining <= 10) return Colors.timer.critical;
        if (timeRemaining <= 30) return Colors.timer.warning;
        return Colors.timer.normal;
    };

    return (
        <View style={styles.container}>
            {timeRemaining !== undefined && (
                <View style={styles.timerContainer}>
                    <Text style={[styles.timerText, { color: getTimerColor() }]}>
                        {formatTime(timeRemaining)}
                    </Text>
                </View>
            )}
            <TouchableOpacity
                style={[
                    styles.button,
                    disabled && styles.buttonDisabled,
                ]}
                onPress={onPress}
                disabled={disabled}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>END</Text>
                <Text style={styles.buttonSubText}>TURN</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    timerContainer: {
        backgroundColor: Colors.ui.darkGray,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 4,
    },
    timerText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: Colors.button.endTurn,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 60,
        borderWidth: 2,
        borderColor: Colors.ui.white,
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },
    buttonDisabled: {
        backgroundColor: Colors.button.disabled,
        borderColor: Colors.ui.gray,
    },
    buttonText: {
        color: Colors.ui.white,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    buttonSubText: {
        color: Colors.ui.white,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
});

export default EndTurnButton;
