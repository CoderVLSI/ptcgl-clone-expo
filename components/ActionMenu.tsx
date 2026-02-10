import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PanResponder,
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
    selectionMode?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    // Position state - default below end turn button
    const [position, setPosition] = useState({ x: SCREEN_WIDTH - 170, y: 100 });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                setPosition({
                    x: Math.max(0, Math.min(SCREEN_WIDTH - 160, position.x + gesture.dx)),
                    y: Math.max(0, Math.min(SCREEN_HEIGHT - 200, position.y + gesture.dy)),
                });
            },
            onPanResponderRelease: () => {
                // Position is already updated
            },
        })
    ).current;

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
            onPress: () => { onPlayTrainer?.(); },
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
        <View
            style={[
                styles.container,
                { left: position.x, top: position.y },
            ]}
        >
            {/* Drag Handle - Only this area is draggable */}
            <View
                {...panResponder.panHandlers}
                style={styles.dragHandleContainer}
            >
                <View style={styles.dragHandle}>
                    <View style={styles.dragHandleBar} />
                </View>
            </View>

            {/* Rest of the menu - not draggable, buttons work */}
            <View style={styles.menuContent}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.card.highlight,
        minWidth: 160,
        maxWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 100,
    },
    dragHandleContainer: {
        alignItems: 'center',
    },
    dragHandle: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    dragHandleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#555',
        borderRadius: 2,
    },
    menuContent: {
        // No special styles needed, just a container
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8,
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
