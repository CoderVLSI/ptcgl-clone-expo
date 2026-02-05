import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
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
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
}) => {
    if (!card) return null;

    const actions: { label: string; onPress: () => void; enabled: boolean; color: string }[] = [];

    if (card.type === 'pokemon') {
        if (card.subtypes?.includes('Basic')) {
            actions.push({
                label: '🎯 Play to Bench',
                onPress: () => { onPlayToBench?.(); onClose(); },
                enabled: canPlayToBench,
                color: Colors.energy.grass,
            });
        }
        if (card.subtypes?.some(s => s.includes('Stage'))) {
            actions.push({
                label: '⬆️ Evolve',
                onPress: () => { onEvolve?.(); },
                enabled: canEvolve,
                color: Colors.energy.psychic,
            });
        }
        if (canSetActive) {
            actions.push({
                label: '⚔️ Set as Active',
                onPress: () => { onSetActive?.(); onClose(); },
                enabled: true,
                color: Colors.energy.fire,
            });
        }
    }

    if (card.type === 'trainer') {
        actions.push({
            label: '🃏 Play Trainer',
            onPress: () => { onPlayTrainer?.(); onClose(); },
            enabled: canPlayTrainer,
            color: Colors.energy.psychic,
        });
    }

    if (card.type === 'energy') {
        actions.push({
            label: '⚡ Attach Energy',
            onPress: () => { onAttachEnergy?.(); },
            enabled: canAttachEnergy,
            color: Colors.energy.lightning,
        });
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.menuContainer}>
                    {/* Card Name */}
                    <View style={styles.header}>
                        <Text style={styles.cardName}>{card.name}</Text>
                        {card.hp && <Text style={styles.cardHP}>{card.hp} HP</Text>}
                    </View>

                    {/* Card Type */}
                    <Text style={styles.cardType}>
                        {card.type.toUpperCase()} {card.subtypes?.join(' • ')}
                    </Text>

                    {/* Message */}
                    {message && (
                        <View style={styles.messageContainer}>
                            <Text style={styles.message}>{message}</Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        {actions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: action.enabled ? action.color : '#555' },
                                    !action.enabled && styles.disabledButton,
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

                    {/* Cancel Button */}
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: SCREEN_WIDTH * 0.85,
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: Colors.card.highlight,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.ui.white,
        flex: 1,
    },
    cardHP: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.energy.fire,
    },
    cardType: {
        fontSize: 12,
        color: '#888',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    messageContainer: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: Colors.card.highlight,
    },
    message: {
        fontSize: 13,
        color: Colors.card.highlight,
        fontStyle: 'italic',
    },
    actionsContainer: {
        gap: 10,
        marginBottom: 16,
    },
    actionButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    actionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    disabledText: {
        color: '#AAA',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#333',
        marginTop: 8,
    },
    cancelText: {
        fontSize: 14,
        color: '#888',
    },
});

export default ActionMenu;
