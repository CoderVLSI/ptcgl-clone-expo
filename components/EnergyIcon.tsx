import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EnergyType } from '../types/game';
import Colors from '../constants/colors';

interface EnergyIconProps {
    type: EnergyType;
    size?: number;
    showCount?: boolean;
    count?: number;
}

const energySymbols: Record<EnergyType, string> = {
    fire: '🔥',
    water: '💧',
    grass: '🌿',
    lightning: '⚡',
    psychic: '🔮',
    fighting: '✊',
    darkness: '🌑',
    metal: '⚙️',
    fairy: '✨',
    dragon: '🐉',
    colorless: '⭐',
};

export const EnergyIcon: React.FC<EnergyIconProps> = ({
    type,
    size = 24,
    showCount = false,
    count = 1,
}) => {
    const backgroundColor = Colors.energy[type];

    return (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor,
                },
            ]}
        >
            <Text style={[styles.symbol, { fontSize: size * 0.5 }]}>
                {energySymbols[type]}
            </Text>
            {showCount && count > 1 && (
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.ui.white,
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    symbol: {
        textAlign: 'center',
    },
    countBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.ui.black,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    countText: {
        color: Colors.ui.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default EnergyIcon;
