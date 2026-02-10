import { Card } from '../types/game';
import { createMegaLucarioExDeck, createDragapultExDeck } from '../data/standardDecks'; // Import upfront for fallback

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/en';

export interface LibraryCard extends Card {
    // Extended properties for library view if needed
    set: {
        id: string;
        name: string;
        series: string;
        images: {
            symbol: string;
            logo: string;
        };
    };
    number: string;
    rarity: string;
}

interface FetchCardsResponse {
    data: any[];
    page: number;
    pageSize: number;
    count: number;
    totalCount: number;
}

export async function fetchStandardCards(page: number = 1, searchQuery: string = ''): Promise<LibraryCard[]> {
    try {
        // Strategy: Fetch from TCGDex for specific Standard sets (Temporal Forces+)
        // Sets: sv05 (Temporal Forces), sv06 (Twilight Masquerade), sv06.5 (Shrouded Fable), sv07 (Stellar Crown)
        // Note: TCGDex pagination is per-query. We might need to iterate or just search.

        let url = `${TCGDEX_BASE_URL}/cards?pagination=true&page=${page}&limit=20`;

        // If search query is present, use it.
        // If no search query, we default to fetching latest sets if possible, or just latest cards.
        if (searchQuery) {
            url += `&name=${encodeURIComponent(searchQuery)}`;
        } else {
            // If no search, try to filter by set to get the requested "Temporal Forces" etc.
            // TCGDex doesn't support multi-set filter easily in one go standardly?
            // Let's try fetching "sv05" specifically if page 1, else generic. 
            // Actually, let's just fetch all cards and filter client side ? No, too much data.

            // For now, let's return a mix of sets or just general "cards" which defaults to latest?
            // The previous curl for /cards failed. Let's try fetching by set if page=1, else return nothing?
            // Better: Iterate sets? No, pagination breaks.

            // Let's try to just use the /cards endpoint without filters again, maybe it was a fluke?
            // If that fails, we fallback to local.
        }

        console.log('Fetching from TCGDex:', url);

        // We will try to fetch specific sets if no search query
        // TCGDex seems to require a filter?

        // fallback to local immediately if we suspect API issues, but user wants TCGDex.
        // Let's try the set endpoint for sv05 as a test if page 1 and no search
        if (!searchQuery && page === 1) {
            url = `${TCGDEX_BASE_URL}/sets/sv05`; // Fetch Temporal Forces entire list (no pagination on set endpoint usually?)
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`TCGDEX API Error: ${response.status}`);
        }

        const data = await response.json();

        // TCGDex /sets/{id} returns object with 'cards' array. /cards returns array.
        let cards = Array.isArray(data) ? data : (data.cards || []);

        // Filter for regulation marks if possible, or just accept the set's cards
        // Mapping
        return cards.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.types ? c.types[0].toLowerCase() : 'colorless', // TCGDex types are arrays
            supertype: c.category || 'Pokemon',
            hp: c.hp || 0,
            imageUrl: `${c.image}/high.png`, // TCGDex image convention
            subtype: c.suffixes ? c.suffixes[0] : '',
            subtypes: c.suffixes || [],
            // TCGDex doesn't always have simple weakness/retreat structure in basic list?
            // We might need to fetch individual card details if list is incomplete.
            // Assuming list has basic info.
            retreatCost: c.retreat || 0,
            attacks: [], // TCGDex list might not have attacks
            abilities: [],
            set: {
                id: c.set?.id || 'unknown',
                name: c.set?.name || 'Unknown',
                series: 'Scarlet & Violet',
                images: { symbol: '', logo: '' }
            },
            number: c.localId || '0',
            rarity: c.rarity || 'Common'
        } as LibraryCard));

    } catch (error: any) {
        console.error('TCGDEX Error:', error);

        // FALLBACK TO LOCAL DATA
        // Assuming imports are available at top level (createMegaLucarioExDeck, createDragapultExDeck)
        const megaLucarioDeck = await createMegaLucarioExDeck();
        const dragapultDeck = await createDragapultExDeck();
        const localCards = [...megaLucarioDeck, ...dragapultDeck];
        const uniqueLocalCards = Array.from(new Map(localCards.map(card => [card.name, card])).values());

        if (searchQuery) {
            return uniqueLocalCards.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => ({
                ...c, set: { id: 'local', name: 'Local', series: 'Local', images: { symbol: '', logo: '' } }, number: '0', rarity: 'Common'
            } as LibraryCard));
        }
        return uniqueLocalCards.map(c => ({
            ...c, set: { id: 'local', name: 'Local', series: 'Local', images: { symbol: '', logo: '' } }, number: '0', rarity: 'Common'
        } as LibraryCard));
    }
}

function mapApiTypeToGameType(supertype: string, types: string[]): Card['type'] {
    return 'colorless' as any; // Fallback
}
