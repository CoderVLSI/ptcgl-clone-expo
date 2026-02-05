/**
 * Pokemon TCG API Service
 * Uses data from https://github.com/PokemonTCG/pokemon-tcg-data
 * Images hosted at https://images.pokemontcg.io
 */

export interface PokemonCardData {
    id: string;
    name: string;
    supertype: 'Pokémon' | 'Trainer' | 'Energy';
    subtypes: string[];
    hp?: string;
    types?: string[];
    evolvesFrom?: string;
    attacks?: Attack[];
    abilities?: Ability[];
    weaknesses?: TypeValue[];
    resistances?: TypeValue[];
    retreatCost?: string[];
    convertedRetreatCost?: number;
    number: string;
    artist: string;
    rarity: string;
    nationalPokedexNumbers?: number[];
    legalities: {
        unlimited?: string;
        standard?: string;
        expanded?: string;
    };
    regulationMark?: string;
    images: {
        small: string;
        large: string;
    };
    flavorText?: string;
}

export interface Attack {
    cost: string[];
    name: string;
    damage: string;
    text: string;
    convertedEnergyCost: number;
}

export interface Ability {
    type: string;
    name: string;
    text: string;
}

export interface TypeValue {
    type: string;
    value: string;
}

// Available sets from the Pokemon TCG Data repo
export const AVAILABLE_SETS = {
    // Scarlet & Violet Era
    sv1: 'Scarlet & Violet',
    sv2: 'Paldea Evolved',
    sv3: 'Obsidian Flames',
    sv4: 'Paradox Rift',
    sv5: 'Temporal Forces',
    sv6: 'Twilight Masquerade',
    sv7: 'Shrouded Fable',
    sv8: 'Surging Sparks',
    sv9: 'Prismatic Evolutions',
    // Sword & Shield Era
    swsh1: 'Sword & Shield',
    swsh2: 'Rebel Clash',
    swsh3: 'Darkness Ablaze',
    swsh4: 'Vivid Voltage',
    swsh5: 'Battle Styles',
    swsh6: 'Chilling Reign',
    swsh7: 'Evolving Skies',
    swsh8: 'Fusion Strike',
    swsh9: 'Brilliant Stars',
    swsh10: 'Astral Radiance',
    swsh11: 'Lost Origin',
    swsh12: 'Silver Tempest',
    // Classic sets
    base1: 'Base Set',
    base2: 'Jungle',
    base3: 'Fossil',
} as const;

const BASE_DATA_URL = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en';
const BASE_IMAGE_URL = 'https://images.pokemontcg.io';

// Cache for fetched card data
const cardCache: Map<string, PokemonCardData[]> = new Map();

/**
 * Fetches card data for a specific set
 */
export async function fetchSet(setId: string): Promise<PokemonCardData[]> {
    // Check cache first
    if (cardCache.has(setId)) {
        return cardCache.get(setId)!;
    }

    try {
        const response = await fetch(`${BASE_DATA_URL}/${setId}.json`);
        if (!response.ok) {
            throw new Error(`Failed to fetch set ${setId}: ${response.status}`);
        }
        const data: PokemonCardData[] = await response.json();
        cardCache.set(setId, data);
        return data;
    } catch (error) {
        console.error(`Error fetching set ${setId}:`, error);
        return [];
    }
}

/**
 * Fetches a specific card by its ID
 */
export async function fetchCard(cardId: string): Promise<PokemonCardData | null> {
    // Card ID format: "setId-number", e.g., "sv1-25"
    const [setId] = cardId.split('-');
    const cards = await fetchSet(setId);
    return cards.find(card => card.id === cardId) || null;
}

/**
 * Searches for cards by name across all cached sets
 */
export async function searchCards(
    query: string,
    options?: {
        sets?: string[];
        types?: string[];
        supertypes?: ('Pokémon' | 'Trainer' | 'Energy')[];
        limit?: number;
    }
): Promise<PokemonCardData[]> {
    const sets = options?.sets || ['sv1', 'sv2', 'sv3']; // Default to recent sets
    const results: PokemonCardData[] = [];

    for (const setId of sets) {
        const cards = await fetchSet(setId);
        for (const card of cards) {
            // Apply filters
            if (options?.supertypes && !options.supertypes.includes(card.supertype)) {
                continue;
            }
            if (options?.types && card.types && !card.types.some(t => options.types!.includes(t))) {
                continue;
            }
            // Name search
            if (card.name.toLowerCase().includes(query.toLowerCase())) {
                results.push(card);
            }
            // Limit results
            if (options?.limit && results.length >= options.limit) {
                return results;
            }
        }
    }
    return results;
}

/**
 * Gets the image URL for a card
 */
export function getCardImageUrl(cardId: string, size: 'small' | 'large' = 'small'): string {
    const [setId, number] = cardId.split('-');
    if (size === 'large') {
        return `${BASE_IMAGE_URL}/${setId}/${number}_hires.png`;
    }
    return `${BASE_IMAGE_URL}/${setId}/${number}.png`;
}

/**
 * Gets random cards from a set for demo purposes
 */
export async function getRandomCards(
    count: number = 7,
    setId: string = 'sv1',
    supertype?: 'Pokémon' | 'Trainer' | 'Energy'
): Promise<PokemonCardData[]> {
    const cards = await fetchSet(setId);
    let filtered = supertype
        ? cards.filter(c => c.supertype === supertype)
        : cards;

    // Shuffle and take count
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Gets starter deck for demo
 */
export async function getStarterDeck(): Promise<PokemonCardData[]> {
    const pokemon = await getRandomCards(20, 'sv1', 'Pokémon');
    const trainers = await getRandomCards(20, 'sv1', 'Trainer');
    const energy = await getRandomCards(20, 'sv1', 'Energy');

    // Build 60 card deck
    return [...pokemon, ...trainers, ...energy].slice(0, 60);
}

export default {
    fetchSet,
    fetchCard,
    searchCards,
    getCardImageUrl,
    getRandomCards,
    getStarterDeck,
    AVAILABLE_SETS,
};
