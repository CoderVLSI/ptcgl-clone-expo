import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import Colors from '../constants/colors';

// ─── Shuffle Animation ────────────────────────────────────────────────────────
interface ShuffleAnimationProps {
    visible: boolean;
    onComplete?: () => void;
}

export const ShuffleAnimation: React.FC<ShuffleAnimationProps> = ({ visible, onComplete }) => {
    const anims = [0, 1, 2].map(() => ({
        x: useRef(new Animated.Value(0)).current,
        y: useRef(new Animated.Value(0)).current,
        opacity: useRef(new Animated.Value(0)).current,
        rotate: useRef(new Animated.Value(0)).current,
    }));

    useEffect(() => {
        if (!visible) return;
        const offsets = [-20, 0, 20];
        const sequences = anims.map((a, i) =>
            Animated.sequence([
                Animated.delay(i * 60),
                Animated.parallel([
                    Animated.timing(a.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
                    Animated.timing(a.x, { toValue: offsets[i], duration: 80, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(a.x, { toValue: offsets[i] * -1, duration: 120, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
                    Animated.timing(a.rotate, { toValue: 1, duration: 120, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(a.x, { toValue: 0, duration: 120, useNativeDriver: true }),
                    Animated.timing(a.y, { toValue: -30, duration: 120, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(a.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                    Animated.timing(a.y, { toValue: -60, duration: 200, useNativeDriver: true }),
                ]),
            ])
        );
        Animated.parallel(sequences).start(() => {
            anims.forEach(a => { a.x.setValue(0); a.y.setValue(0); a.opacity.setValue(0); a.rotate.setValue(0); });
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.shuffleContainer} pointerEvents="none">
            {anims.map((a, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.shuffleCard,
                        {
                            transform: [
                                { translateX: a.x },
                                { translateY: a.y },
                                { rotate: a.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', i % 2 === 0 ? '15deg' : '-15deg'] }) },
                            ],
                            opacity: a.opacity,
                        },
                    ]}
                />
            ))}
        </View>
    );
};

// ─── Draw Animation ───────────────────────────────────────────────────────────
interface DrawAnimationProps {
    visible: boolean;
    onComplete?: () => void;
}

export const DrawAnimation: React.FC<DrawAnimationProps> = ({ visible, onComplete }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.6)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(-0.1)).current;

    useEffect(() => {
        if (!visible) return;
        translateY.setValue(0);
        translateX.setValue(0);
        scale.setValue(0.6);
        opacity.setValue(0);
        rotate.setValue(-0.1);

        Animated.sequence([
            // Card lifts from deck
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -40, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]),
            // Arc to hand
            Animated.parallel([
                Animated.timing(translateX, { toValue: 80, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 60, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.timing(rotate, { toValue: 0.15, duration: 320, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 0.8, duration: 320, useNativeDriver: true }),
            ]),
            // Fade out as it joins hand
            Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            opacity.setValue(0);
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.drawContainer} pointerEvents="none">
            <Animated.View
                style={[
                    styles.drawCard,
                    {
                        opacity,
                        transform: [
                            { translateX },
                            { translateY },
                            { scale },
                            { rotate: rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-360deg', '360deg'] }) },
                        ],
                    },
                ]}
            />
        </View>
    );
};

// ─── Attack Animation ─────────────────────────────────────────────────────────
interface AttackAnimationProps {
    visible: boolean;
    onComplete?: () => void;
    type?: 'physical' | 'fire' | 'water' | 'electric' | 'psychic' | 'special';
}

const TYPE_COLORS: Record<string, string> = {
    fire: Colors.energy.fire,
    water: Colors.energy.water,
    electric: Colors.energy.lightning,
    psychic: Colors.energy.psychic,
    special: '#9B59B6',
    physical: Colors.energy.fighting,
};

const TYPE_EMOJIS: Record<string, string> = {
    fire: '🔥', water: '💧', electric: '⚡', psychic: '🔮', special: '✨', physical: '💥',
};

export const AttackAnimation: React.FC<AttackAnimationProps> = ({ visible, onComplete, type = 'physical' }) => {
    const rings = [0, 1, 2].map(() => ({
        scale: useRef(new Animated.Value(0)).current,
        opacity: useRef(new Animated.Value(0.9)).current,
    }));
    const flash = useRef(new Animated.Value(0)).current;
    const emojiScale = useRef(new Animated.Value(0)).current;
    const emojiOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        rings.forEach(r => { r.scale.setValue(0); r.opacity.setValue(0.9); });
        flash.setValue(0);
        emojiScale.setValue(0);
        emojiOpacity.setValue(0);

        const color = TYPE_COLORS[type] || TYPE_COLORS.physical;

        // Flash + shockwave rings
        Animated.parallel([
            // Screen flash
            Animated.sequence([
                Animated.timing(flash, { toValue: 1, duration: 80, useNativeDriver: true }),
                Animated.timing(flash, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
            // Emoji impact
            Animated.sequence([
                Animated.delay(40),
                Animated.parallel([
                    Animated.spring(emojiScale, { toValue: 1.4, friction: 3, tension: 300, useNativeDriver: true }),
                    Animated.timing(emojiOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(emojiScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                    Animated.timing(emojiOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                ]),
            ]),
            // Three expanding rings with delays
            ...rings.map((r, i) =>
                Animated.sequence([
                    Animated.delay(i * 80),
                    Animated.parallel([
                        Animated.timing(r.scale, { toValue: 3 + i * 0.8, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                        Animated.timing(r.opacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                    ]),
                ])
            ),
        ]).start(() => {
            rings.forEach(r => { r.scale.setValue(0); r.opacity.setValue(0); });
            flash.setValue(0);
            emojiScale.setValue(0);
            emojiOpacity.setValue(0);
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    const color = TYPE_COLORS[type] || TYPE_COLORS.physical;
    const emoji = TYPE_EMOJIS[type] || '💥';

    return (
        <View style={styles.attackContainer} pointerEvents="none">
            {/* Screen flash */}
            <Animated.View style={[styles.flashOverlay, { opacity: flash, backgroundColor: color + '44' }]} />

            {/* Shockwave rings */}
            {rings.map((r, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.attackRing,
                        { borderColor: color, transform: [{ scale: r.scale }], opacity: r.opacity },
                    ]}
                />
            ))}

            {/* Impact emoji */}
            <Animated.Text
                style={[
                    styles.attackEmoji,
                    { transform: [{ scale: emojiScale }], opacity: emojiOpacity },
                ]}
            >
                {emoji}
            </Animated.Text>
        </View>
    );
};

// ─── Damage Number ────────────────────────────────────────────────────────────
interface DamageNumberProps {
    visible: boolean;
    damage: number;
    onComplete?: () => void;
}

export const DamageNumberAnimation: React.FC<DamageNumberProps> = ({ visible, damage, onComplete }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        translateY.setValue(0);
        scale.setValue(0);
        opacity.setValue(0);

        Animated.sequence([
            Animated.parallel([
                Animated.spring(scale, { toValue: 1.4, friction: 3, tension: 400, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
            ]),
            Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
            Animated.delay(400),
            Animated.parallel([
                Animated.timing(translateY, { toValue: -50, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
        ]).start(() => {
            opacity.setValue(0);
            scale.setValue(0);
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    const isBig = damage >= 100;
    const color = damage >= 200 ? '#FF2244' : damage >= 100 ? '#FF6600' : '#FFDD00';

    return (
        <View style={styles.damageContainer} pointerEvents="none">
            <Animated.Text
                style={[
                    styles.damageText,
                    {
                        color,
                        fontSize: isBig ? 52 : 40,
                        transform: [{ translateY }, { scale }],
                        opacity,
                        textShadowColor: '#000',
                        textShadowOffset: { width: 2, height: 2 },
                        textShadowRadius: 4,
                    },
                ]}
            >
                -{damage}
            </Animated.Text>
        </View>
    );
};

// ─── Energy Attachment ────────────────────────────────────────────────────────
interface EnergyAttachmentProps {
    visible: boolean;
    energyType?: string;
    onComplete?: () => void;
}

export const EnergyAttachmentAnimation: React.FC<EnergyAttachmentProps> = ({ visible, energyType = 'colorless', onComplete }) => {
    const particles = [0, 1, 2, 3, 4, 5].map(() => ({
        x: useRef(new Animated.Value(0)).current,
        y: useRef(new Animated.Value(0)).current,
        opacity: useRef(new Animated.Value(0)).current,
        scale: useRef(new Animated.Value(0.3)).current,
    }));
    const glow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0.3); });
        glow.setValue(0);

        const color = Colors.energy[energyType as keyof typeof Colors.energy] || '#FFD700';
        const angles = particles.map((_, i) => (i * Math.PI * 2) / particles.length);

        Animated.parallel([
            // Glow pulse
            Animated.sequence([
                Animated.timing(glow, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(glow, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
            // Particles spiral in
            ...particles.map((p, i) => {
                const r = 60;
                return Animated.sequence([
                    Animated.delay(i * 30),
                    Animated.parallel([
                        Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
                        Animated.timing(p.x, { toValue: Math.cos(angles[i]) * r, duration: 80, useNativeDriver: true }),
                        Animated.timing(p.y, { toValue: Math.sin(angles[i]) * r, duration: 80, useNativeDriver: true }),
                        Animated.timing(p.scale, { toValue: 1, duration: 80, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(p.x, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                        Animated.timing(p.y, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                        Animated.timing(p.scale, { toValue: 0.1, duration: 250, useNativeDriver: true }),
                        Animated.timing(p.opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
                    ]),
                ]);
            }),
        ]).start(() => {
            glow.setValue(0);
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    const color = Colors.energy[energyType as keyof typeof Colors.energy] || '#FFD700';

    return (
        <View style={styles.energyContainer} pointerEvents="none">
            {/* Central glow */}
            <Animated.View style={[styles.energyGlow, { backgroundColor: color + '88', opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }] }]} />

            {/* Particles */}
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.energyParticle,
                        {
                            backgroundColor: color,
                            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                            opacity: p.opacity,
                        },
                    ]}
                />
            ))}
        </View>
    );
};

// ─── Evolution Animation ──────────────────────────────────────────────────────
interface EvolutionAnimationProps {
    visible: boolean;
    isMega?: boolean;
    evolutionName?: string;
    onComplete?: () => void;
}

export const EvolutionAnimation: React.FC<EvolutionAnimationProps> = ({ visible, isMega = false, evolutionName = '', onComplete }) => {
    const flash = useRef(new Animated.Value(0)).current;
    const pillarScale = useRef(new Animated.Value(0)).current;
    const pillarOpacity = useRef(new Animated.Value(0)).current;
    const textScale = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const rings = [0, 1, 2, 3].map(() => ({
        scale: useRef(new Animated.Value(0)).current,
        opacity: useRef(new Animated.Value(0)).current,
    }));

    useEffect(() => {
        if (!visible) return;
        flash.setValue(0); pillarScale.setValue(0); pillarOpacity.setValue(0);
        textScale.setValue(0); textOpacity.setValue(0);
        rings.forEach(r => { r.scale.setValue(0); r.opacity.setValue(0); });

        const duration = isMega ? 2800 : 2000;

        Animated.sequence([
            // Initial bright flash
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(flash, { toValue: 0.9, duration: 150, useNativeDriver: true }),
                    Animated.timing(flash, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                ]),
                // Light pillar rises
                Animated.parallel([
                    Animated.timing(pillarOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                    Animated.timing(pillarScale, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
                ]),
                // Expanding rings
                ...rings.map((r, i) =>
                    Animated.sequence([
                        Animated.delay(i * 120),
                        Animated.parallel([
                            Animated.timing(r.scale, { toValue: 4 + i, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                            Animated.timing(r.opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
                        ]),
                    ])
                ),
            ]),
            // Name reveal
            Animated.parallel([
                Animated.spring(textScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
                Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
            Animated.delay(isMega ? 1200 : 800),
            // Fade everything
            Animated.parallel([
                Animated.timing(flash, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(pillarOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
        ]).start(() => {
            flash.setValue(0); pillarOpacity.setValue(0); textOpacity.setValue(0);
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    const accentColor = isMega ? '#FF6B35' : '#7CB9E8';

    return (
        <View style={styles.evolutionContainer} pointerEvents="none">
            {/* White flash overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: flash }]} />

            {/* Expanding rings */}
            {rings.map((r, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.evolutionRing,
                        { borderColor: accentColor, transform: [{ scale: r.scale }], opacity: r.opacity },
                    ]}
                />
            ))}

            {/* Light pillar */}
            <Animated.View
                style={[
                    styles.evolutionPillar,
                    {
                        backgroundColor: accentColor,
                        transform: [{ scaleY: pillarScale }],
                        opacity: pillarOpacity,
                    },
                ]}
            />

            {/* Evolution name */}
            <Animated.View style={{ transform: [{ scale: textScale }], opacity: textOpacity, alignItems: 'center' }}>
                {isMega && <Text style={styles.megaLabel}>MEGA EVOLUTION</Text>}
                <Text style={[styles.evolutionName, isMega && styles.evolutionNameMega]}>
                    {evolutionName}
                </Text>
            </Animated.View>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Shuffle
    shuffleContainer: {
        position: 'absolute', top: 80, right: 60,
        width: 80, height: 100, alignItems: 'center', justifyContent: 'center', zIndex: 50,
    },
    shuffleCard: {
        position: 'absolute',
        width: 50, height: 70,
        backgroundColor: '#1A4A8A',
        borderRadius: 6,
        borderWidth: 2, borderColor: '#FFD700',
    },

    // Draw
    drawContainer: {
        position: 'absolute', top: 100, right: 60,
        width: 60, height: 80, zIndex: 50,
    },
    drawCard: {
        width: 50, height: 70,
        backgroundColor: '#1A4A8A',
        borderRadius: 6,
        borderWidth: 2, borderColor: '#4A90E2',
    },

    // Attack
    attackContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center', zIndex: 100,
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    attackRing: {
        position: 'absolute',
        width: 120, height: 120,
        borderRadius: 60,
        borderWidth: 4,
    },
    attackEmoji: {
        fontSize: 72,
        textAlign: 'center',
    },

    // Damage number
    damageContainer: {
        position: 'absolute',
        top: '35%', left: 0, right: 0,
        alignItems: 'center', zIndex: 110,
    },
    damageText: {
        fontWeight: 'bold',
        letterSpacing: 1,
    },

    // Energy
    energyContainer: {
        position: 'absolute',
        top: '30%', left: 0, right: 0,
        alignItems: 'center', justifyContent: 'center',
        height: 160, zIndex: 90,
    },
    energyGlow: {
        position: 'absolute',
        width: 80, height: 80, borderRadius: 40,
    },
    energyParticle: {
        position: 'absolute',
        width: 12, height: 12, borderRadius: 6,
    },

    // Evolution
    evolutionContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center', zIndex: 120,
    },
    evolutionRing: {
        position: 'absolute',
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 3,
    },
    evolutionPillar: {
        position: 'absolute',
        width: 60,
        top: 0, bottom: 0,
        opacity: 0.6,
    },
    megaLabel: {
        color: '#FF6B35',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 4,
        textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
    },
    evolutionName: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6,
    },
    evolutionNameMega: {
        fontSize: 36,
        color: '#FF6B35',
    },
});
