import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Card, EnergyType, Attack } from '../types/game';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface AttackMenuProps {
    visible: boolean;
    card: Card | null;
    onClose: () => void;
    onAttack: (attackIndex: number) => void;
    onUseAbility?: (abilityIndex: number) => void;
    abilitiesUsed?: string[];
}

const EnergyIcon = ({ type }: { type: EnergyType }) => {
    const getColor = (t: EnergyType) => {
        switch (t) {
            case 'fire': return Colors.energy.fire;
            case 'water': return Colors.energy.water;
            case 'grass': return Colors.energy.grass;
            case 'lightning': return Colors.energy.lightning;
            case 'psychic': return Colors.energy.psychic;
            case 'fighting': return Colors.energy.fighting;
            case 'darkness': return Colors.energy.darkness;
            case 'metal': return Colors.energy.metal;
            case 'fairy': return Colors.energy.fairy;
            case 'dragon': return Colors.energy.dragon;
            case 'colorless': return '#E0E0E0';
            default: return '#E0E0E0';
        }
    };

    return (
        <View style={[styles.energyIcon, { backgroundColor: getColor(type) }]}>
            {/* Use first letter or icon font if available */}
            <Text style={styles.energyText}>{type[0].toUpperCase()}</Text>
        </View>
    );
};

const checkEnergyProps = (cost: EnergyType[], attached: EnergyType[] = []): boolean => {
    const remainingCost = [...cost];
    const availableEnergy = [...attached];

    // 1. Match specific types
    for (let i = remainingCost.length - 1; i >= 0; i--) {
        const req = remainingCost[i];
        if (req !== 'colorless') {
            const matchIndex = availableEnergy.indexOf(req);
            if (matchIndex !== -1) {
                availableEnergy.splice(matchIndex, 1);
                remainingCost.splice(i, 1);
            } else {
                return false; // Missing specific requirement
            }
        }
    }

    // 2. Match colorless
    return availableEnergy.length >= remainingCost.length;
};

export const AttackMenu: React.FC<AttackMenuProps> = ({ visible, card, onClose, onAttack, onUseAbility, abilitiesUsed = [] }) => {
    if (!card) return null;

    const hasAbilities = card.abilities && card.abilities.length > 0;
    const hasAttacks = card.attacks && card.attacks.length > 0;
    const isAbilityUsed = abilitiesUsed.includes(card.id);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.headerGradient}>
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>{card.name}</Text>
                            <Text style={styles.subtitle}>Select an Action</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Colors.ui.white} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Abilities Section */}
                        {hasAbilities && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Abilities</Text>
                                {card.abilities!.map((ability, index) => (
                                    <TouchableOpacity
                                        key={`ability-${index}`}
                                        style={[styles.attackCard, isAbilityUsed && styles.disabledCard, { borderColor: Colors.energy.psychic }]}
                                        onPress={() => {
                                            if (!isAbilityUsed && onUseAbility) {
                                                onUseAbility(index);
                                                onClose();
                                            }
                                        }}
                                        disabled={isAbilityUsed}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.attackMain}>
                                            <View style={styles.attackInfo}>
                                                <Text style={[styles.attackName, { color: Colors.energy.psychic }]}>{ability.name}</Text>
                                                <Text style={styles.abilityType}>{ability.type}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.descriptionContainer}>
                                            <Text style={styles.descriptionText}>{ability.text}</Text>
                                        </View>
                                        {isAbilityUsed && (
                                            <View style={styles.warningContainer}>
                                                <Ionicons name="warning-outline" size={14} color={Colors.timer.critical} />
                                                <Text style={styles.warningText}>Already used this turn</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Attacks Section */}
                        {hasAttacks && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Attacks</Text>
                                {card.attacks!.map((attack, index) => {
                                    const canUse = checkEnergyProps(attack.energyCost, card.attachedEnergy);

                                    return (
                                        <TouchableOpacity
                                            key={`attack-${index}`}
                                            style={[styles.attackCard, !canUse && styles.disabledCard]}
                                            onPress={() => {
                                                if (canUse) {
                                                    onAttack(index);
                                                    onClose();
                                                }
                                            }}
                                            disabled={!canUse}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.attackMain}>
                                                <View style={styles.attackInfo}>
                                                    <Text style={[styles.attackName, !canUse && styles.disabledText]}>
                                                        {attack.name}
                                                    </Text>
                                                    <View style={styles.costContainer}>
                                                        {attack.energyCost.map((cost, i) => (
                                                            <EnergyIcon key={i} type={cost} />
                                                        ))}
                                                    </View>
                                                </View>

                                                <View style={styles.damageContainer}>
                                                    <Text style={[styles.damageText, !canUse && styles.disabledText]}>
                                                        {attack.damage > 0 ? attack.damage : '-'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {attack.description ? (
                                                <View style={styles.descriptionContainer}>
                                                    <Text style={styles.descriptionText}>{attack.description}</Text>
                                                </View>
                                            ) : null}

                                            {!canUse && (
                                                <View style={styles.warningContainer}>
                                                    <Ionicons name="warning-outline" size={14} color={Colors.timer.critical} />
                                                    <Text style={styles.warningText}>Not enough Energy</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#1E1E24',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    headerGradient: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary.darkRed,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: Colors.ui.white,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 2,
    },
    closeButton: {
        padding: 5,
    },
    content: {
        padding: 15,
    },
    attackCard: {
        backgroundColor: '#2A2A35',
        borderRadius: 12,
        marginBottom: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#3D3D4A',
    },
    disabledCard: {
        opacity: 0.6,
        backgroundColor: '#222',
        borderColor: '#333',
    },
    attackMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    attackInfo: {
        flex: 1,
        marginRight: 10,
    },
    attackName: {
        color: Colors.ui.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    disabledText: {
        color: '#888',
    },
    costContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    energyIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    energyText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
    },
    damageContainer: {
        minWidth: 50,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    damageText: {
        color: Colors.ui.white,
        fontSize: 24,
        fontWeight: '900',
    },
    descriptionContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 8,
        marginTop: 4,
    },
    descriptionText: {
        color: '#BBB',
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    warningText: {
        color: Colors.timer.critical,
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '600',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#888',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    abilityType: {
        color: Colors.energy.psychic,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 2,
    }
});

export default AttackMenu;
