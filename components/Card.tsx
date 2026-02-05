import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Card as CardType, EnergyType } from '../types/game';
import Colors from '../constants/colors';
import EnergyIcon from './EnergyIcon';

interface CardProps {
    card?: CardType;
    isFlipped?: boolean;
    isHighlighted?: boolean;
    isSmall?: boolean;
    onPress?: () => void;
    showEnergy?: boolean;
    showFullImage?: boolean; // Shows full card image from API
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_ASPECT_RATIO = 1.4;

export const Card: React.FC<CardProps> = ({
    card,
    isFlipped = false,
    isHighlighted = false,
    isSmall = false,
    onPress,
    showEnergy = true,
    showFullImage = true,
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const cardWidth = isSmall ? SCREEN_WIDTH * 0.12 : SCREEN_WIDTH * 0.18;
    const cardHeight = cardWidth * CARD_ASPECT_RATIO;

    const renderCardBack = () => (
        <View style={[styles.cardBack, { width: cardWidth, height: cardHeight }]}>
            <View style={styles.cardBackInner}>
                <View style={styles.pokeballDesign}>
                    <View style={styles.pokeballTop} />
                    <View style={styles.pokeballCenter}>
                        <View style={styles.pokeballButton} />
                    </View>
                    <View style={styles.pokeballBottom} />
                </View>
            </View>
        </View>
    );

    const renderCardFront = () => {
        if (!card) return null;

        const getCardColor = (): string => {
            if (card.type === 'energy' && card.energyType) {
                return Colors.energy[card.energyType];
            }
            if (card.type === 'trainer') {
                return '#7B5BA6';
            }
            if (card.energyType) {
                return Colors.energy[card.energyType];
            }
            return Colors.energy.colorless;
        };

        // If we have a full card image from the API, show it directly
        if (showFullImage && card.imageUrl && !imageError) {
            return (
                <View style={[styles.fullCardContainer, { width: cardWidth, height: cardHeight }]}>
                    <Image
                        source={{ uri: card.imageUrl }}
                        style={styles.fullCardImage}
                        onLoadStart={() => setImageLoading(true)}
                        onLoadEnd={() => setImageLoading(false)}
                        onError={() => {
                            setImageError(true);
                            setImageLoading(false);
                        }}
                    />
                    {imageLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={Colors.card.highlight} />
                        </View>
                    )}
                </View>
            );
        }

        // Fallback to custom card design
        return (
            <View
                style={[
                    styles.cardFront,
                    {
                        width: cardWidth,
                        height: cardHeight,
                        borderColor: getCardColor(),
                    },
                ]}
            >
                {/* Card Art Area */}
                <View style={[styles.cardArt, { backgroundColor: getCardColor() + '40' }]}>
                    <Text style={styles.cardPlaceholder}>
                        {card.type === 'pokemon' ? '🃏' : card.type === 'trainer' ? '👤' : '⚡'}
                    </Text>
                </View>

                {/* Card Name */}
                <View style={styles.cardNameContainer}>
                    <Text style={styles.cardName} numberOfLines={1}>
                        {card.name}
                    </Text>
                    {card.hp && <Text style={styles.cardHP}>{card.hp} HP</Text>}
                </View>

                {/* Attached Energy */}
                {showEnergy && card.attachedEnergy && card.attachedEnergy.length > 0 && (
                    <View style={styles.attachedEnergy}>
                        {card.attachedEnergy.slice(0, 3).map((energy, index) => (
                            <View key={index} style={styles.energyWrapper}>
                                <EnergyIcon type={energy} size={isSmall ? 12 : 16} />
                            </View>
                        ))}
                        {card.attachedEnergy.length > 3 && (
                            <Text style={styles.moreEnergy}>+{card.attachedEnergy.length - 3}</Text>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isHighlighted && styles.highlighted,
                { width: cardWidth, height: cardHeight },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            disabled={!onPress}
        >
            {isFlipped ? renderCardBack() : renderCardFront()}
            {isHighlighted && <View style={styles.highlightOverlay} />}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    highlighted: {
        shadowColor: Colors.card.highlight,
        shadowOpacity: 0.8,
        shadowRadius: 12,
        elevation: 12,
    },
    highlightOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 3,
        borderColor: Colors.card.highlight,
        borderRadius: 8,
    },
    cardBack: {
        backgroundColor: Colors.card.back,
        borderRadius: 8,
        padding: 4,
    },
    cardBackInner: {
        flex: 1,
        backgroundColor: '#2A2A4E',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4A4A7E',
    },
    pokeballDesign: {
        width: '60%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pokeballTop: {
        width: '100%',
        height: '45%',
        backgroundColor: '#E53935',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
    },
    pokeballCenter: {
        width: '100%',
        height: '10%',
        backgroundColor: Colors.ui.black,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pokeballButton: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.ui.white,
        borderWidth: 2,
        borderColor: Colors.ui.black,
    },
    pokeballBottom: {
        width: '100%',
        height: '45%',
        backgroundColor: Colors.ui.white,
        borderBottomLeftRadius: 100,
        borderBottomRightRadius: 100,
    },
    cardFront: {
        backgroundColor: Colors.ui.white,
        borderRadius: 8,
        borderWidth: 3,
        overflow: 'hidden',
    },
    cardArt: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
        borderRadius: 4,
    },
    fullCardContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: Colors.ui.black,
    },
    fullCardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
        borderRadius: 8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardPlaceholder: {
        fontSize: 32,
    },
    cardNameContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    cardName: {
        fontSize: 8,
        fontWeight: 'bold',
        color: Colors.ui.black,
        flex: 1,
    },
    cardHP: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#E53935',
    },
    attachedEnergy: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    energyWrapper: {
        marginRight: -4,
    },
    moreEnergy: {
        fontSize: 8,
        color: Colors.ui.white,
        fontWeight: 'bold',
        marginLeft: 4,
        textShadowColor: Colors.ui.black,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default Card;
