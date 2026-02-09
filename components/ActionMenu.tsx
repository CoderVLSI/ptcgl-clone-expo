import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Card } from '../types/game';
import Colors from '../constants/colors';

interface ActionMenuProps {
    card: Card | null;
    visible: boolean;
    onClose: () => void;
    onPlayToBench?: () => void;
    onAttachEnergy?: () => void;
    onEvolve?: () => void;
    onPlayTrainer?: () => void;
    onSetActive?: () => void;
    canPlayToBench?: boolean;
    canAttachEnergy?: boolean;
    canEvolve?: boolean;
    canPlayTrainer?: boolean;
    canSetActive?: boolean;
    message?: string;
    selectionMode?: boolean; // If true, hide action buttons and only show cancel
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
    card,
    visible,
    onClose,
    onPlayToBench,
    onAttachEnergy,
    onEvolve,
    onPlayTrainer,
    onSetActive,
    canPlayToBench = false,
    canAttachEnergy = false,
    canEvolve = false,
    canPlayTrainer = false,
    canSetActive = false,
    message,
    selectionMode = false,
}) => {
    if (!visible || !card) return null;

    const actions: { label: string; onPress: () => void; enabled: boolean; color: string }[] = [];

    if (card.type === 'pokemon') {
        if (card.subtypes?.includes('Basic')) {
            actions.push({
                label: 'Play to Bench',
                onPress: () => { onPlayToBench?.(); onClose(); },
                enabled: canPlayToBench,
                color: Colors.energy.grass,
            });
        }
        if (card.subtypes?.some(s => s.includes('Stage'))) {
            actions.push({
                label: 'Evolve',
                onPress: () => { onEvolve?.(); },
                enabled: canEvolve,
                color: Colors.energy.psychic,
            });
        }
        if (canSetActive) {
            actions.push({
                label: 'Set Active',
                onPress: () => { onSetActive?.(); onClose(); },
                enabled: true,
                color: Colors.energy.fire,
            });
        }
    }

    if (card.type === 'trainer') {
        actions.push({
            label: 'Play Trainer',
            onPress: () => { onPlayTrainer?.(); onClose(); },
            enabled: canPlayTrainer,
            color: Colors.energy.psychic,
        });
    }

    if (card.type === 'energy') {
        actions.push({
            label: 'Attach Energy',
            onPress: () => { onAttachEnergy?.(); },
            enabled: canAttachEnergy,
            color: Colors.energy.lightning,
        });
    }

    return (
        <View style={styles.container}>
            {/* Card Info Header */}
            <View style={styles.header}>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
                    {card.hp && <Text style={styles.cardHP}>{card.hp} HP</Text>}
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Message */}
            {message && (
                <Text style={styles.message}>{message}</Text>
            )}

            {/* Action Buttons - hide during selection mode */}
            {!selectionMode && (
                <View style={styles.actionsRow}>
                    {actions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.actionButton,
                                { backgroundColor: action.enabled ? action.color : '#444' },
                            ]}
                            onPress={action.onPress}
                            disabled={!action.enabled}
                        >
                            <Text style={[
                                styles.actionText,
                                !action.enabled && styles.disabledText,
                            ]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>{selectionMode ? 'Cancel Action' : 'Cancel'}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 10,
        top: 70, // Below end turn button
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.card.highlight,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    cardInfo: {
        flex: 1,
        marginRight: 8,
    },
    cardName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    cardHP: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.energy.fire,
    },
    closeButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 14,
        color: '#888',
        fontWeight: 'bold',
    },
    message: {
        fontSize: 11,
        color: Colors.card.highlight,
        paddingHorizontal: 12,
        paddingTop: 8,
        fontStyle: 'italic',
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        gap: 6,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 70,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.ui.white,
        textAlign: 'center',
    },
    disabledText: {
        color: '#888',
    },
    cancelButton: {
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingVertical: 10,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 13,
        color: '#FF6B6B',
        fontWeight: '600',
    },
});

export default ActionMenu;
