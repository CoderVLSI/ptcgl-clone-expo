import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Card, EnergyType, Attack } from '../types/game';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface AttackMenuProps {
    visible: boolean;
    card: Card | null;
    onClose: () => void;
    onAttack: (attackIndex: number) => void;
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
            case 'colorless': return '#A0A0A0';
            default: return '#A0A0A0';
        }
    };

    return (
        <View style={[styles.energyIcon, { backgroundColor: getColor(type) }]}>
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

export const AttackMenu: React.FC<AttackMenuProps> = ({ visible, card, onClose, onAttack }) => {
    if (!card || !card.attacks) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{card.name}'s Attacks</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {card.attacks.map((attack, index) => {
                            const canUse = checkEnergyProps(attack.energyCost, card.attachedEnergy);

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.attackButton, !canUse && styles.disabledButton]}
                                    onPress={() => {
                                        if (canUse) {
                                            onAttack(index);
                                            onClose();
                                        }
                                    }}
                                    disabled={!canUse}
                                >
                                    <View style={styles.attackTop}>
                                        <View style={styles.costContainer}>
                                            {attack.energyCost.map((cost, i) => (
                                                <EnergyIcon key={i} type={cost} />
                                            ))}
                                        </View>
                                        <Text style={styles.attackName}>{attack.name}</Text>
                                        <Text style={styles.damage}>{attack.damage > 0 ? attack.damage : ''}</Text>
                                    </View>

                                    {attack.description ? (
                                        <Text style={styles.description}>{attack.description}</Text>
                                    ) : null}

                                    {!canUse && (
                                        <Text style={styles.warningText}>Not enough energy</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.ui.darkGray,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '50%',
        minHeight: 200,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        paddingBottom: 20,
    },
    attackButton: {
        backgroundColor: Colors.ui.mediumGray,
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.ui.border,
    },
    disabledButton: {
        opacity: 0.5,
        backgroundColor: '#333',
    },
    attackTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    costContainer: {
        flexDirection: 'row',
        marginRight: 10,
        minWidth: 50,
    },
    energyIcon: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 2,
    },
    energyText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
    },
    attackName: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    damage: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    description: {
        color: '#BBB',
        fontSize: 14,
        fontStyle: 'italic',
    },
    warningText: {
        color: Colors.primary.red,
        fontSize: 12,
        marginTop: 5,
    },
});

export default AttackMenu;
