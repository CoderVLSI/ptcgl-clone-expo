/**
 * Card library for the deck builder.
 * Only serves 2026 Standard-legal cards (H-On format).
 * Fetches from pokemon-tcg-data via GitHub raw, filtered by regulation mark (H, I, J).
 */

import { Card } from '../types/game';
import { createMegaLucarioExDeck, createDragapultExDeck } from '../data/standardDecks';
import { fetchSet, isStandardLegal, STANDARD_2026_SETS } from '../services/pokemonApi';

export interface LibraryCard extends Card {
    set: {
        id: string;
        name: string;
        series: string;
        images: { symbol: string; logo: string };
    };
    number: string;
    rarity: string;
}

// Human-readable set names for display
const SET_DISPLAY_NAMES: Record<string, string> = {
    sv5:      'Temporal Forces',
    sv6:      'Twilight Masquerade',
    sv6pt5:   'Shrouded Fable',
    sv7:      'Stellar Crown',
    sv8:      'Surging Sparks',
    sv8pt5:   'Prismatic Evolutions',
    sv9:      'Journey Together',
    sve:      'SV Energies',
    me1:      'Mega Evolution',
    me2:      'Phantasmal Flames',
    me2pt5:   'Ascended Heroes',
    me3:      'Perfect Order',
    me4:      'Chaos Rising',
};

function apiCardToLibraryCard(apiCard: any, setId: string): LibraryCard {
    const supertype: string = apiCard.supertype || 'Pokémon';
    const type: Card['type'] =
        supertype === 'Pokémon' ? 'pokemon' :
        supertype === 'Trainer' ? 'trainer' : 'energy';

    const energyTypeName = apiCard.types?.[0]?.toLowerCase() || 'colorless';

    return {
        id: apiCard.id,
        name: apiCard.name,
        type,
        hp: apiCard.hp ? parseInt(apiCard.hp) : undefined,
        imageUrl: apiCard.images?.small || '',
        imageUrlLarge: apiCard.images?.large || '',
        energyType: energyTypeName as any,
        subtypes: apiCard.subtypes || [],
        attacks: apiCard.attacks?.map((a: any) => ({
            name: a.name,
            damage: parseInt(a.damage) || 0,
            energyCost: a.cost || [],
            description: a.text || '',
        })) || [],
        abilities: apiCard.abilities?.map((a: any) => ({
            name: a.name,
            type: a.type,
            text: a.text,
        })) || [],
        retreatCost: apiCard.convertedRetreatCost || 0,
        set: {
            id: setId,
            name: SET_DISPLAY_NAMES[setId] || setId,
            series: 'Scarlet & Violet',
            images: { symbol: '', logo: '' },
        },
        number: apiCard.number || '0',
        rarity: apiCard.rarity || 'Common',
    };
}

/**
 * Fetches Standard-legal cards for the deck builder.
 * Searches across all 2026 Standard sets, filtered by regulation mark.
 * Falls back to local deck cards if API is unavailable.
 */
export async function fetchStandardCards(page: number = 1, searchQuery: string = ''): Promise<LibraryCard[]> {
    const PAGE_SIZE = 30;

    try {
        // Fetch all standard sets in parallel (cached after first load)
        const setResults = await Promise.all(
            STANDARD_2026_SETS.map(setId =>
                fetchSet(setId)
                    .then(cards => cards.filter(isStandardLegal).map(c => apiCardToLibraryCard(c, setId)))
                    .catch(() => [] as LibraryCard[])
            )
        );

        let allCards: LibraryCard[] = setResults.flat();

        // Apply search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            allCards = allCards.filter(c => c.name.toLowerCase().includes(q));
        }

        // Deduplicate by name (keep first occurrence — newest set wins due to ordering)
        const seen = new Set<string>();
        const unique = allCards.filter(c => {
            if (seen.has(c.name)) return false;
            seen.add(c.name);
            return true;
        });

        // Paginate
        const start = (page - 1) * PAGE_SIZE;
        return unique.slice(start, start + PAGE_SIZE);

    } catch (error: any) {
        console.error('Card library fetch error, falling back to local decks:', error);
        return localFallback(searchQuery);
    }
}

async function localFallback(searchQuery: string): Promise<LibraryCard[]> {
    const [lucarioDeck, dragapultDeck] = await Promise.all([
        createMegaLucarioExDeck(),
        createDragapultExDeck(),
    ]);
    const allLocal = [...lucarioDeck, ...dragapultDeck];
    const seen = new Set<string>();
    const unique = allLocal.filter(c => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
    });

    const filtered = searchQuery.trim()
        ? unique.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : unique;

    return filtered.map(c => ({
        ...c,
        set: { id: 'local', name: 'Local', series: 'Local', images: { symbol: '', logo: '' } },
        number: '0',
        rarity: 'Common',
    } as LibraryCard));
}
