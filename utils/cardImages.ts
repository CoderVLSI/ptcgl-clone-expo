/**
 * Single place that turns a Card's imageUrl into a React Native image source.
 *
 * Most cards carry a remote https URL from the Pokémon TCG API, but proxy sets
 * bundled with the app (Delta Reign, Meowth ex) use local assets that must be
 * resolved through require() instead of { uri }.
 */

import { ImageSourcePropType } from 'react-native';
import { resolveDeltaReignImage } from '../data/deltaReignSet';

const CARD_BACK = { uri: 'https://images.pokemontcg.io/xy3/55.png' };

export function getCardImageSource(imageUrl?: string): ImageSourcePropType {
    if (!imageUrl) return CARD_BACK;
    if (imageUrl === 'meowth_ex') return require('../assets/meowth_ex.png');
    const deltaReign = resolveDeltaReignImage(imageUrl);
    if (deltaReign) return deltaReign;
    return { uri: imageUrl };
}
