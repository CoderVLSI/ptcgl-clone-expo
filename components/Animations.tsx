import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Text } from 'react-native';
import Colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShuffleAnimationProps {
    visible: boolean;
    onComplete?: () => void;
    x?: number;
    y?: number;
}

export const ShuffleAnimation: React.FC<ShuffleAnimationProps> = ({
    visible,
    onComplete,
    x = SCREEN_WIDTH / 2,
    y = 200,
}) => {
    const shuffleAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            startShuffle();
        }
    }, [visible]);

    const startShuffle = () => {
        // Reset animations
        shuffleAnim.setValue(0);
        scaleAnim.setValue(1);

        // Shuffle sequence - simplified to avoid transform errors
        Animated.sequence([
            // Rise up
            Animated.parallel([
                Animated.timing(shuffleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.2,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]),
            // Shake effect using translateY instead of rotate
            Animated.loop(
                Animated.timing(shuffleAnim, {
                    toValue: 2,
                    duration: 100,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
                { iterations: 6 }
            ),
            // Settle back down
            Animated.parallel([
                Animated.timing(shuffleAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            onComplete?.();
        });
    };

    if (!visible) return null;

    return (
        <View style={[styles.container, { left: x - 40, top: y - 40 }]}>
            {/* Stack effect - simplified without rotate */}
            {[0, 1, 2].map((i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.cardStack,
                        {
                            transform: [
                                {
                                    translateY: shuffleAnim.interpolate({
                                        inputRange: [0, 0.5, 1, 1.5, 2],
                                        outputRange: [0, -20 - i * 8, -10 - i * 8, -5 - i * 8, 0],
                                    }),
                                },
                                {
                                    scale: scaleAnim.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: [1, 1.2, 1],
                                    }),
                                },
                            ] as any,
                        },
                    ]}
                />
            ))}
        </View>
    );
};

interface DrawAnimationProps {
    visible: boolean;
    onComplete?: () => void;
    x?: number;
    y?: number;
}

export const DrawAnimation: React.FC<DrawAnimationProps> = ({
    visible,
    onComplete,
    x = SCREEN_WIDTH / 2,
    y = 300,
}) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(-100);
            opacityAnim.setValue(0);
            startDraw();
        }
    }, [visible]);

    const startDraw = () => {
        Animated.sequence([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(opacityAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
            }),
        ]).start(() => {
            setTimeout(() => {
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(onComplete);
            }, 300);
        });
    };

    if (!visible) return null;

    return (
        <View style={[styles.container, { left: x - 20, top: y - 30 }]}>
            <Animated.View
                style={[
                    styles.drawCard,
                    {
                        transform: [{ translateY: slideAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            >
                <View style={styles.cardBack}>
                    <View style={styles.cardBackInner} />
                </View>
            </Animated.View>
        </View>
    );
};

interface AttackAnimationProps {
    visible: boolean;
    onComplete?: () => void;
    type?: 'physical' | 'special' | 'fire' | 'water' | 'electric' | 'psychic';
    x?: number;
    y?: number;
}

export const AttackAnimation: React.FC<AttackAnimationProps> = ({
    visible,
    onComplete,
    type = 'physical',
    x = SCREEN_WIDTH / 2,
    y = 200,
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const impactAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            startAttack();
        }
    }, [visible]);

    const startAttack = () => {
        Animated.sequence([
            // Wind up
            Animated.spring(scaleAnim, {
                toValue: 0.5,
                useNativeDriver: true,
                friction: 8,
            }),
            // Strike
            Animated.spring(scaleAnim, {
                toValue: 1.5,
                useNativeDriver: true,
                friction: 2,
                tension: 200,
            }),
            // Impact
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 8,
                }),
                Animated.spring(impactAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 4,
                    tension: 300,
                }),
            ]),
            // Fade out
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            scaleAnim.setValue(0);
            impactAnim.setValue(0);
            opacityAnim.setValue(1);
            onComplete?.();
        });
    };

    const getEffectColor = () => {
        switch (type) {
            case 'fire': return Colors.energy.fire;
            case 'water': return Colors.energy.water;
            case 'electric': return Colors.energy.lightning;
            case 'psychic': return Colors.energy.psychic;
            case 'special': return '#9B59B6';
            default: return Colors.energy.fighting;
        }
    };

    const effectColor = getEffectColor();

    if (!visible) return null;

    return (
        <View style={[styles.container, { left: x - 50, top: y - 50 }]}>
            <Animated.View
                style={[
                    styles.attackRing,
                    {
                        borderColor: effectColor,
                        transform: [
                            { scale: scaleAnim },
                            {
                                scale: impactAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 3],
                                }),
                            },
                        ] as any,
                        opacity: opacityAnim.interpolate({
                            inputRange: [0, 0.7, 1],
                            outputRange: [0, 1, 0],
                        }),
                    },
                ]}
            />
        </View>
    );
};

interface DamageNumberProps {
    visible: boolean;
    damage: number;
    type?: 'damage' | 'heal' | 'healing';
    onComplete?: () => void;
    x?: number;
    y?: number;
}

export const DamageNumberAnimation: React.FC<DamageNumberProps> = ({
    visible,
    damage,
    type = 'damage',
    onComplete,
    x = SCREEN_WIDTH / 2,
    y = 200,
}) => {
    const moveAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (visible) {
            moveAnim.setValue(0);
            opacityAnim.setValue(1);
            scaleAnim.setValue(0.5);
            startAnimation();
        }
    }, [visible]);

    const startAnimation = () => {
        Animated.parallel([
            Animated.spring(moveAnim, {
                toValue: -60,
                useNativeDriver: true,
                friction: 5,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1.2,
                useNativeDriver: true,
                friction: 5,
            }),
        ]).start(() => {
            Animated.parallel([
                Animated.timing(moveAnim, {
                    toValue: -80,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                onComplete?.();
            });
        });
    };

    const textColor = type === 'heal' || type === 'healing' ? '#4CAF50' : '#FF4444';
    const sign = type === 'heal' || type === 'healing' ? '+' : '-';

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.damageContainer,
                { left: x, top: y },
                {
                    transform: [{ translateY: moveAnim }, { scale: scaleAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <Text style={[styles.damageText, { color: textColor }]}>
                {sign}{damage}
            </Text>
        </Animated.View>
    );
};

interface EnergyAttachmentProps {
    visible: boolean;
    energyType?: string;
    onComplete?: () => void;
    x?: number;
    y?: number;
}

export const EnergyAttachmentAnimation: React.FC<EnergyAttachmentProps> = ({
    visible,
    energyType = 'colorless',
    onComplete,
    x = 100,
    y = 300,
}) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            progressAnim.setValue(0);
            scaleAnim.setValue(0);
            startAttachment();
        }
    }, [visible]);

    const startAttachment = () => {
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
            }),
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.spring(scaleAnim, {
                toValue: 0.8,
                useNativeDriver: true,
                friction: 6,
            }),
        ]).start(() => {
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                scaleAnim.setValue(0);
                progressAnim.setValue(0);
                opacityAnim.setValue(1);
                onComplete?.();
            });
        });
    };

    const getEnergyColor = () => {
        const colors: Record<string, string> = {
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
            colorless: '#E0E0E0',
        };
        return colors[energyType] || colors.colorless;
    };

    const energyColor = getEnergyColor();

    if (!visible) return null;

    return (
        <View style={[styles.container, { left: x, top: y }]}>
            <Animated.View
                style={[
                    styles.energyOrb,
                    {
                        backgroundColor: energyColor,
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.energyInner,
                        {
                            opacity: progressAnim.interpolate({
                                inputRange: [0, 0.3, 0.7, 1],
                                outputRange: [0, 0.3, 0.6, 0],
                            }),
                        },
                    ]}
                />
            </Animated.View>
        </View>
    );
};

interface EvolutionAnimationProps {
    visible: boolean;
    onComplete?: () => void;
    isMega?: boolean;
    x?: number;
    y?: number;
    evolutionName?: string;
}

export const EvolutionAnimation: React.FC<EvolutionAnimationProps> = ({
    visible,
    onComplete,
    isMega = false,
    x = SCREEN_WIDTH / 2,
    y = 300,
    evolutionName = 'Evolved',
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const rotationAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const textOpacityAnim = useRef(new Animated.Value(0)).current;
    const textScaleAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (visible) {
            startEvolution();
        }
    }, [visible]);

    const startEvolution = () => {
        // Reset animations
        scaleAnim.setValue(0);
        opacityAnim.setValue(1);
        rotationAnim.setValue(0);
        glowAnim.setValue(0);
        pulseAnim.setValue(1);
        textOpacityAnim.setValue(0);
        textScaleAnim.setValue(0.5);

        const duration = isMega ? 1500 : 1000;
        const pulseSpeed = isMega ? 200 : 300;

        // Main evolution sequence
        Animated.sequence([
            // Initial burst
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: duration * 0.3,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: duration * 0.3,
                    useNativeDriver: false,
                }),
            ]),
            // Pulsing rings
            Animated.loop(
                Animated.timing(pulseAnim, {
                    toValue: 1.5,
                    duration: pulseSpeed,
                    useNativeDriver: true,
                }),
                { iterations: isMega ? 5 : 3 }
            ),
            // Show text and hold
            Animated.parallel([
                Animated.timing(textOpacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(textScaleAnim, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                }),
            ]),
            Animated.delay(isMega ? 400 : 200),
            // Fade out
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(textOpacityAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            scaleAnim.setValue(0);
            glowAnim.setValue(0);
            pulseAnim.setValue(1);
            opacityAnim.setValue(1);
            textOpacityAnim.setValue(0);
            textScaleAnim.setValue(0.5);
            onComplete?.();
        });
    };

    if (!visible) return null;

    // Mega evolution has golden/blue colors, regular has green/white
    const innerColor = isMega ? '#FFD700' : '#4ADE80';
    const outerColor = isMega ? '#00BFFF' : '#FFFFFF';
    const glowColor = isMega ? 'rgba(255, 215, 0, 0.8)' : 'rgba(74, 222, 128, 0.6)';
    const ringCount = isMega ? 5 : 3;

    return (
        <View style={[styles.container, { left: x - 75, top: y - 75 }]}>
            {/* Multiple expanding rings */}
            {Array.from({ length: ringCount }).map((_, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.evoRing,
                        {
                            borderColor: outerColor,
                            transform: [
                                {
                                    scale: pulseAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 2 + i * 0.5],
                                    }),
                                },
                            ] as any,
                            opacity: opacityAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [1, 0.6, 0],
                            }),
                        },
                    ]}
                />
            ))}

            {/* Central glow */}
            <Animated.View
                style={[
                    styles.evoGlow,
                    {
                        backgroundColor: glowAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: ['rgba(255,255,255,0)', glowColor, 'rgba(255,255,255,0.8)'],
                        }) as any,
                        transform: [{ scale: scaleAnim }] as any,
                        opacity: opacityAnim,
                    },
                ]}
            />

            {/* Inner core */}
            <Animated.View
                style={[
                    styles.evoCore,
                    {
                        backgroundColor: innerColor,
                        transform: [{ scale: scaleAnim }] as any,
                        opacity: opacityAnim,
                        shadowColor: innerColor,
                    },
                ]}
            />

            {/* Evolution text */}
            <Animated.View
                style={[
                    styles.evoTextContainer,
                    {
                        opacity: textOpacityAnim,
                        transform: [{ scale: textScaleAnim }],
                    },
                ]}
            >
                <Text style={[styles.evoText, isMega && styles.evoTextMega]}>
                    {isMega ? 'MEGA EVOLUTION!' : 'EVOLVED!'}
                </Text>
                {evolutionName && evolutionName !== 'Evolved' && (
                    <Text style={styles.evoSubText}>{evolutionName}</Text>
                )}
            </Animated.View>

            {/* Sparkle particles for mega evolution */}
            {isMega && (
                <>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const angle = (i * 45) * Math.PI / 180;
                        const distance = 60;
                        return (
                            <Animated.View
                                key={`sparkle-${i}`}
                                style={[
                                    styles.sparkle,
                                    {
                                        left: 75 + Math.cos(angle) * distance,
                                        top: 75 + Math.sin(angle) * distance,
                                        transform: [
                                            {
                                                scale: glowAnim.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [0, 1.5, 0.5],
                                                }),
                                            },
                                            {
                                                translateY: glowAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [20, -20],
                                                }),
                                            },
                                        ] as any,
                                        opacity: opacityAnim.interpolate({
                                            inputRange: [0, 0.3, 0.7, 1],
                                            outputRange: [0, 1, 1, 0],
                                        }),
                                    },
                                ]}
                            >
                                <Text style={styles.sparkleText}>✦</Text>
                            </Animated.View>
                        );
                    })}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'none',
    },
    cardStack: {
        position: 'absolute',
        width: 40,
        height: 56,
        backgroundColor: '#2A2A4E',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    drawCard: {
        width: 40,
        height: 56,
    },
    cardBack: {
        width: 40,
        height: 56,
        backgroundColor: Colors.card.back,
        borderRadius: 6,
        padding: 3,
    },
    cardBackInner: {
        flex: 1,
        backgroundColor: '#2A2A4E',
        borderRadius: 4,
    },
    attackRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderStyle: 'dashed',
    },
    damageContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    damageText: {
        fontSize: 36,
        fontWeight: 'bold',
        textShadowColor: '#000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    energyOrb: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    energyInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFF',
    },
    // Evolution animation styles
    evoRing: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
        borderStyle: 'solid',
    },
    evoGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    evoCore: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 10,
    },
    evoTextContainer: {
        position: 'absolute',
        top: 170,
        alignItems: 'center',
    },
    evoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: '#000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 8,
        letterSpacing: 2,
    },
    evoTextMega: {
        fontSize: 28,
        color: '#FFD700',
        textShadowColor: '#0000FF',
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 10,
    },
    evoSubText: {
        fontSize: 16,
        color: '#FFFFFF',
        marginTop: 4,
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    sparkle: {
        position: 'absolute',
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkleText: {
        fontSize: 20,
        color: '#FFD700',
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default {
    ShuffleAnimation,
    DrawAnimation,
    AttackAnimation,
    DamageNumberAnimation,
    EnergyAttachmentAnimation,
    EvolutionAnimation,
};
