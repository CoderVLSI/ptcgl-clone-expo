import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PanResponder,
    Image,
} from 'react-native';
import { Card } from '../types/game';
import Colors from '../constants/colors';
import useGameDimensions from '../hooks/useGameDimensions';

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

// Map energy type to a display color
const ENERGY_TYPE_COLOR: Record<string, string> = {
    fire: Colors.energy.fire,
    water: Colors.energy.water,
    grass: Colors.energy.grass,
    lightning: Colors.energy.lightning,
    psychic: Colors.energy.psychic,
    fighting: Colors.energy.fighting,
    darkness: Colors.energy.darkness,
    metal: Colors.energy.metal,
    fairy: Colors.energy.fairy,
    dragon: Colors.energy.dragon,
    colorless: Colors.energy.colorless,
};

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
    const { width: GAME_WIDTH, height: GAME_HEIGHT } = useGameDimensions();
    const [position, setPosition] = useState({ x: GAME_WIDTH - 170, y: 100 });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                setPosition(prev => ({
                    x: Math.max(0, Math.min(GAME_WIDTH - 160, prev.x + gesture.dx)),
                    y: Math.max(0, Math.min(GAME_HEIGHT - 200, prev.y + gesture.dy)),
                }));
            },
            onPanResponderRelease: () => {},
        })
    ).current;

    if (!visible || !card) return null;

    const actions: {
        label: string;
        onPress: () => void;
        enabled: boolean;
        color: string;
        disabledReason?: string;
    }[] = [];

    if (card.type === 'pokemon') {
        if (card.subtypes?.includes('Basic')) {
            actions.push({
                label: 'Play to Bench',
                onPress: () => { onPlayToBench?.(); onClose(); },
                enabled: canPlayToBench,
                color: Colors.energy.grass,
                disabledReason: canPlayToBench ? undefined : 'Bench full',
            });
        }
        if (card.subtypes?.some(s => s.includes('Stage'))) {
            actions.push({
                label: 'Evolve',
                onPress: () => { onEvolve?.(); },
                enabled: canEvolve,
                color: Colors.energy.psychic,
                disabledReason: canEvolve ? undefined : 'Just played / need a turn',
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
            disabledReason: canPlayTrainer ? undefined : 'Already played a Supporter',
        });
    }

    if (card.type === 'energy') {
        actions.push({
            label: 'Attach Energy',
            onPress: () => { onAttachEnergy?.(); },
            enabled: canAttachEnergy,
            color: Colors.energy.lightning,
            disabledReason: canAttachEnergy ? undefined : 'Already attached this turn',
        });
    }

    const energyColor = card.energyType ? ENERGY_TYPE_COLOR[card.energyType] : undefined;

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
                {/* Card Thumbnail Header */}
                <View style={styles.header}>
                    {card.imageUrl ? (
                        <Image
                            source={{ uri: card.imageUrl }}
                            style={styles.cardThumb}
                            resizeMode="contain"
                        />
                    ) : null}
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
                        {card.hp && card.type === 'pokemon' && (
                            <Text style={styles.cardHP}>{card.hp} HP</Text>
                        )}
                        {energyColor && (
                            <View style={styles.typeBadgeRow}>
                                <View style={[styles.typeBadge, { backgroundColor: energyColor }]} />
                                <Text style={styles.typeLabel}>{card.energyType}</Text>
                            </View>
                        )}
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
                            <View key={index} style={styles.actionWrapper}>
                                <TouchableOpacity
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
                                {!action.enabled && action.disabledReason && (
                                    <Text style={styles.disabledReason}>{action.disabledReason}</Text>
                                )}
                            </View>
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
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 8,
        gap: 8,
    },
    cardThumb: {
        width: 60,
        height: 84,
        borderRadius: 4,
        flexShrink: 0,
    },
    cardInfo: {
        flex: 1,
        marginRight: 4,
        gap: 2,
    },
    cardName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.ui.white,
    },
    cardHP: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.energy.fire,
    },
    typeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    typeBadge: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    typeLabel: {
        fontSize: 9,
        color: '#AAA',
        textTransform: 'capitalize',
    },
    closeButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
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
    actionWrapper: {
        alignItems: 'center',
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
    disabledReason: {
        fontSize: 9,
        color: '#FF6B6B',
        textAlign: 'center',
        marginTop: 2,
        maxWidth: 70,
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
