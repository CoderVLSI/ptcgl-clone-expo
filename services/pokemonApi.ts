/**
 * Pokemon TCG API Service
 * Uses data from https://github.com/PokemonTCG/pokemon-tcg-data
 * Images hosted at https://images.pokemontcg.io
 *
 * Format: 2026 Standard (H-On)
 * Legal regulation marks: H, I, J and newer
 * Rotation effective: April 10, 2026 (March 26, 2026 on PTCGL)
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

// Legal regulation marks for 2026 Standard (H-On)
export const STANDARD_2026_REGULATION_MARKS = ['H', 'I', 'J', 'K'] as const;

// All sets legal in 2026 Standard format (H-On rotation, effective April 2026)
// Regulation mark G and earlier have rotated out.
export const AVAILABLE_SETS = {
    // Scarlet & Violet era — regulation mark H (legal)
    sv5:     'Temporal Forces',
    sv6:     'Twilight Masquerade',
    sv6pt5:  'Shrouded Fable',
    sv7:     'Stellar Crown',
    // Scarlet & Violet era — regulation mark I (legal)
    sv8:     'Surging Sparks',
    sv8pt5:  'Prismatic Evolutions',
    sv9:     'Journey Together',
    // Special energy set
    sve:     'Scarlet & Violet Energies',
    // Mega Evolution era — regulation marks H/I (legal)
    me1:     'Mega Evolution',
    me2:     'Phantasmal Flames',
    me2pt5:  'Ascended Heroes',
    me3:     'Perfect Order',      // J mark — Mega Zygarde ex mascot (March 27, 2026)
    me4:     'Chaos Rising',       // J mark — Mega Greninja ex mascot (May 22, 2026)
    // Pitch Black (me5, July 17 2026) — not yet released as of May 2026
} as const;

export type StandardSetId = keyof typeof AVAILABLE_SETS;

// Ordered list of all 2026 Standard set IDs (newest first for search priority)
// Last updated: May 2026
// Pitch Black (me5, July 17 2026) omitted — not yet released
export const STANDARD_2026_SETS: string[] = [
    'me4',                          // Chaos Rising       — J mark (May 22, 2026)
    'me3',                          // Perfect Order      — J mark (March 27, 2026)
    'me2pt5', 'me2', 'me1',         // Ascended Heroes / Phantasmal Flames / Mega Evolution — H/I
    'sv9', 'sv8pt5', 'sv8',         // Journey Together / Prismatic Evolutions / Surging Sparks — I
    'sv7', 'sv6pt5', 'sv6', 'sv5',  // Stellar Crown / Shrouded Fable / Twilight Masquerade / Temporal Forces — H
    'sve',                          // SV Energies
];

const BASE_DATA_URL = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en';
const BASE_IMAGE_URL = 'https://images.pokemontcg.io';

// Cache for fetched card data
const cardCache: Map<string, PokemonCardData[]> = new Map();

/**
 * Fetches card data for a specific set
 */
export async function fetchSet(setId: string): Promise<PokemonCardData[]> {
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
 * Returns true if a card is legal in 2026 Standard format.
 * Checks regulation mark (H, I, J, K) or falls back to set-based check.
 */
export function isStandardLegal(card: PokemonCardData): boolean {
    if (card.regulationMark) {
        return (STANDARD_2026_REGULATION_MARKS as readonly string[]).includes(card.regulationMark);
    }
    // If no regulation mark, check legalities field
    if (card.legalities?.standard) {
        return card.legalities.standard === 'Legal';
    }
    return true; // custom sets (me1, me2, etc.) assumed legal if in standard pool
}

/**
 * Fetches all cards from all 2026 Standard-legal sets.
 * Results are cached. Fetches sets in parallel.
 */
export async function fetchAllStandardCards(): Promise<PokemonCardData[]> {
    const results = await Promise.all(
        STANDARD_2026_SETS.map(setId => fetchSet(setId).catch(() => []))
    );
    return results.flat().filter(isStandardLegal);
}

/**
 * Fetches a specific card by its ID
 */
export async function fetchCard(cardId: string): Promise<PokemonCardData | null> {
    const [setId] = cardId.split('-');
    const cards = await fetchSet(setId);
    return cards.find(card => card.id === cardId) || null;
}

/**
 * Searches for cards by name across Standard-legal sets
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
    const sets = options?.sets || STANDARD_2026_SETS;
    const results: PokemonCardData[] = [];

    for (const setId of sets) {
        const cards = await fetchSet(setId);
        for (const card of cards) {
            if (!isStandardLegal(card)) continue;
            if (options?.supertypes && !options.supertypes.includes(card.supertype)) continue;
            if (options?.types && card.types && !card.types.some(t => options.types!.includes(t))) continue;
            if (card.name.toLowerCase().includes(query.toLowerCase())) {
                results.push(card);
            }
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
 * Gets random Standard-legal cards from a set
 */
export async function getRandomCards(
    count: number = 7,
    setId: string = 'sv8',
    supertype?: 'Pokémon' | 'Trainer' | 'Energy'
): Promise<PokemonCardData[]> {
    const cards = await fetchSet(setId);
    let filtered = cards.filter(isStandardLegal);
    if (supertype) filtered = filtered.filter(c => c.supertype === supertype);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Gets a starter deck using Standard-legal sets
 */
export async function getStarterDeck(): Promise<PokemonCardData[]> {
    const [pokemon, trainers, energy] = await Promise.all([
        getRandomCards(20, 'sv8', 'Pokémon'),
        getRandomCards(20, 'sv8', 'Trainer'),
        getRandomCards(20, 'sv8', 'Energy'),
    ]);
    return [...pokemon, ...trainers, ...energy].slice(0, 60);
}

export default {
    fetchSet,
    fetchCard,
    fetchAllStandardCards,
    searchCards,
    getCardImageUrl,
    getRandomCards,
    getStarterDeck,
    isStandardLegal,
    AVAILABLE_SETS,
    STANDARD_2026_SETS,
};
