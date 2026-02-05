import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';

interface HeaderBarProps {
    opponentName: string;
    turnNumber: number;
    onMenuPress?: () => void;
    onSettingsPress?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    opponentName,
    turnNumber,
    onMenuPress,
    onSettingsPress,
}) => {
    return (
        <View style={styles.container}>
            {/* Menu Button */}
            <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
                <Text style={styles.iconText}>☰</Text>
            </TouchableOpacity>

            {/* Opponent Name */}
            <View style={styles.centerSection}>
                <Text style={styles.opponentName}>{opponentName}</Text>
                <Text style={styles.turnText}>Turn {turnNumber}</Text>
            </View>

            {/* Settings Button */}
            <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
                <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
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
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary.maroon,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 18,
        color: Colors.ui.white,
    },
    centerSection: {
        alignItems: 'center',
    },
    opponentName: {
        color: Colors.ui.white,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    turnText: {
        color: Colors.ui.white,
        fontSize: 10,
        opacity: 0.7,
        marginTop: 2,
    },
});

export default HeaderBar;
