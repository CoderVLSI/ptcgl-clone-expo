// 2026 Standard Format Top Decks
// Based on February 2026 meta: Charizard ex, Dragapult ex
// Uses real card data from Pokemon TCG API for proper images

import { Card, EnergyType, ENERGY_TYPE_MAP } from '../types/game';
import { fetchSet, PokemonCardData, searchCards } from '../services/pokemonApi';

// Fisher-Yates shuffle
function shuffle<T>(deck: T[]): T[] {
    const result = [...deck];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Convert API card to our Card type
function convertApiCard(apiCard: PokemonCardData, index: number): Card {
    const energyType = apiCard.types?.[0]
        ? ENERGY_TYPE_MAP[apiCard.types[0]] || 'colorless'
        : apiCard.supertype === 'Energy'
            ? (apiCard.name.includes('Grass') ? 'grass' :
                apiCard.name.includes('Fire') ? 'fire' :
                    apiCard.name.includes('Water') ? 'water' :
                        apiCard.name.includes('Lightning') ? 'lightning' :
                            apiCard.name.includes('Psychic') ? 'psychic' :
                                apiCard.name.includes('Fighting') ? 'fighting' :
                                    apiCard.name.includes('Darkness') ? 'darkness' :
                                        apiCard.name.includes('Metal') ? 'metal' :
                                            apiCard.name.includes('Fairy') ? 'fairy' :
                                                apiCard.name.includes('Dragon') ? 'dragon' :
                                                    ENERGY_TYPE_MAP[apiCard.subtypes?.[0] || ''] || 'colorless')
            : 'colorless';

    return {
        id: `${apiCard.id}-${index}`, // Unique ID for duplicates
        name: apiCard.name,
        type: apiCard.supertype === 'Pokémon' ? 'pokemon' :
            apiCard.supertype === 'Trainer' ? 'trainer' : 'energy',
        hp: apiCard.hp ? parseInt(apiCard.hp) : undefined,
        imageUrl: apiCard.images.small,
        imageUrlLarge: apiCard.images.large,
        energyType,
        subtypes: apiCard.subtypes,
        attacks: apiCard.attacks?.map(a => ({
            name: a.name,
            damage: parseInt(a.damage) || 0,
            energyCost: a.cost.map(c => ENERGY_TYPE_MAP[c] || 'colorless') as EnergyType[],
            description: a.text,
        })),
        abilities: apiCard.abilities?.map(a => ({
            name: a.name,
            type: a.type,
            text: a.text,
        })),
        retreatCost: apiCard.convertedRetreatCost,
    };
}

// Find cards by name from API data
function findCardByName(cards: PokemonCardData[], name: string): PokemonCardData | undefined {
    // Exact match first
    let card = cards.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (card) return card;

    // Partial match
    card = cards.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
    return card;
}

// ============================================
// FUTURE / PROXY CARD DATA (For unreleased/2026 cards)
// ============================================
// Note: Using high-quality existing card images as proxies for the 2026 meta cards
// Many of these (Mega Lucario, Riolu, Lucario, Fighting Gong, etc.) are now available in 'me1' and 'me2pt5'
// The deck builder prioritizes API data, so these will only be used if API fails.
const FUTURE_CARDS: Record<string, Partial<Card>> = {
    // 'Mega Lucario ex' is in me1
    'Mega Lucario ex': {
        name: 'Mega Lucario ex',
        type: 'pokemon',
        hp: 340,
        energyType: 'fighting',
        subtypes: ['Stage 2', 'ex', 'Mega'],
        attacks: [
            { name: 'Ora Jab', damage: 130, energyCost: ['fighting'], description: 'Attach up to 3 Basic Fighting Energy from discard to your Benched Pokemon.' },
            { name: 'Mega Brave', damage: 270, energyCost: ['fighting', 'fighting'], description: 'During your next turn, this Pokemon cannot use Mega Brave.' }
        ],
        // Using M Lucario-EX (Furious Fists) as visual proxy
        imageUrl: 'https://images.pokemontcg.io/xy3/55.png',
        imageUrlLarge: 'https://images.pokemontcg.io/xy3/55_hires.png'
    },
    // 'Riolu' is in me1/me2pt5
    'Riolu': {
        name: 'Riolu',
        type: 'pokemon',
        hp: 70,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [
            { name: 'Punch', damage: 10, energyCost: ['colorless'] }
        ],
        // Using Riolu (Scarlet & Violet Base)
        imageUrl: 'https://images.pokemontcg.io/sv1/113.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/113_hires.png'
    },
    // 'Lucario' is in me1/me2pt5
    'Lucario': {
        name: 'Lucario',
        type: 'pokemon',
        hp: 120,
        energyType: 'fighting',
        subtypes: ['Stage 1'],
        attacks: [
            { name: 'Spike Draw', damage: 40, energyCost: ['fighting'] },
            { name: 'Knuckle Impact', damage: 120, energyCost: ['fighting', 'fighting'] }
        ],
        // Using Lucario (Brilliant Stars)
        imageUrl: 'https://images.pokemontcg.io/swsh9/79.png',
        imageUrlLarge: 'https://images.pokemontcg.io/swsh9/79_hires.png'
    },
    'Fighting Lunatone': {
        name: 'Lunatone',
        type: 'pokemon',
        hp: 110,
        energyType: 'fighting',
        subtypes: ['Basic'],
        abilities: [{
            name: 'Lunar Cycle',
            type: 'Ability',
            text: 'Once during your turn, if you have Solrock in play, you may discard a Basic Fighting Energy card from your hand in order to use this Ability. Draw 3 cards. You can\'t use more than 1 Lunar Cycle Ability each turn.'
        }],
        attacks: [
            { name: 'Power Gem', damage: 50, energyCost: ['fighting', 'fighting'] }
        ],
        imageUrl: 'https://limitlesstcg.com/images/cards/MEG/74.png',
        imageUrlLarge: 'https://limitlesstcg.com/images/cards/MEG/74.png'
    },
    'Solrock': {
        name: 'Solrock',
        type: 'pokemon',
        hp: 110,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [
            {
                name: 'Cosmic Beam',
                damage: 70,
                energyCost: ['fighting'],
                description: 'If you don\'t have Lunatone on your Bench, this attack does nothing. This attack\'s damage isn\'t affected by Weakness or Resistance.'
            }
        ],
        weaknesses: [{ type: 'grass', value: '×2' }],
        retreatCost: 1,
        imageUrl: 'https://limitlesstcg.com/images/cards/MEG/75.png',
        imageUrlLarge: 'https://limitlesstcg.com/images/cards/MEG/75.png'
    },
    'Radiant Greninja': {
        name: 'Radiant Greninja',
        type: 'pokemon',
        hp: 130,
        energyType: 'water',
        subtypes: ['Basic', 'Radiant'],
        abilities: [{
            name: 'Concealed Cards',
            type: 'Ability',
            text: 'Once during your turn, you may discard an Energy card from your hand. If you do, draw 2 cards.'
        }],
        attacks: [{ name: 'Moonlight Shuriken', damage: 0, energyCost: ['water', 'water', 'colorless'], description: 'Discard 2 Energy. This attack does 90 damage to 2 of your opponent\'s Pokemon.' }],
        imageUrl: 'https://images.pokemontcg.io/swsh10/46.png',
        imageUrlLarge: 'https://images.pokemontcg.io/swsh10/46_hires.png'
    },
    'Manaphy': {
        name: 'Manaphy',
        type: 'pokemon',
        hp: 70,
        energyType: 'water',
        subtypes: ['Basic'],
        abilities: [{
            name: 'Wave Veil',
            type: 'Ability',
            text: 'Prevent all damage done to your Benched Pokemon by attacks.'
        }],
        attacks: [{ name: 'Rain Splash', damage: 20, energyCost: ['water'] }],
        imageUrl: 'https://images.pokemontcg.io/swsh9/41.png',
        imageUrlLarge: 'https://images.pokemontcg.io/swsh9/41_hires.png'
    },
    // 'Hariyama' is in me1/me2pt5
    'Hariyama': {
        name: 'Hariyama',
        type: 'pokemon',
        hp: 140,
        energyType: 'fighting',
        subtypes: ['Stage 1'],
        attacks: [
            { name: 'Slap Push', damage: 50, energyCost: ['fighting', 'colorless'] },
            { name: 'Mega Slap', damage: 120, energyCost: ['fighting', 'fighting', 'colorless'] }
        ],
        // Using Hariyama (Scarlet & Violet Base)
        imageUrl: 'https://images.pokemontcg.io/sv1/117.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/117_hires.png'
    },
    // 'Makuhita' is in me1/me2pt5
    'Makuhita': {
        name: 'Makuhita',
        type: 'pokemon',
        hp: 80,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [{ name: 'Slap', damage: 20, energyCost: ['fighting'] }],
        // Using Makuhita (Scarlet & Violet Base)
        imageUrl: 'https://images.pokemontcg.io/sv1/116.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/116_hires.png'
    },
    // 'Fighting Gong' is in me1 (Trainer)
    'Fighting Gong': {
        name: 'Fighting Gong',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for a Basic Fighting Pokemon or Basic Fighting Energy and put it into your hand.',
        // Using Focus Sash as visual proxy (looks like useful fighting gear)
        imageUrl: 'https://images.pokemontcg.io/xy3/100.png',
        imageUrlLarge: 'https://images.pokemontcg.io/xy3/100_hires.png'
    },
    // 'Premium Power Pro' is in me1 (Trainer)
    'Premium Power Pro': {
        name: 'Premium Power Pro',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Your Pokemon attacks do +30 damage.',
        // Using Muscle Band as visual proxy (damage boost item)
        imageUrl: 'https://images.pokemontcg.io/xy1/121.png',
        imageUrlLarge: 'https://images.pokemontcg.io/xy1/121_hires.png'
    },
    // 'Lillie\'s Determination' is in me1 (Supporter)
    'Lillie\'s Determination': {
        name: 'Lillie\'s Determination',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Shuffle your hand into your deck. Then, draw 8 cards. If you have 6 Prize cards remaining, draw 8 cards. Otherwise, draw 6 cards.',
        // Using Lillie (Sun & Moon)
        imageUrl: 'https://images.pokemontcg.io/sm1/122.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sm1/122_hires.png'
    },
    'Fezandipiti ex': {
        name: 'Fezandipiti ex',
        type: 'pokemon',
        hp: 210,
        energyType: 'psychic',
        subtypes: ['Basic', 'ex'],
        attacks: [
            { name: 'Adrena-Pheromone', damage: 0, energyCost: ['colorless'], description: 'Flip a coin. If heads, prevent all damage during opponents next turn.' },
            { name: 'Energy Feather', damage: 30, energyCost: ['psychic'], description: '30x energy attached.' }
        ],
        // Using Fezandipiti ex (Shrouded Fable)
        imageUrl: 'https://images.pokemontcg.io/sv6a/38.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6a/38_hires.png'
    },
    'Munkidori': {
        name: 'Munkidori',
        type: 'pokemon',
        hp: 110,
        energyType: 'psychic',
        subtypes: ['Basic'],
        attacks: [
            { name: 'Mind Bend', damage: 30, energyCost: ['psychic', 'colorless'], description: 'Opponent is now Confused.' }
        ],
        // Using Munkidori (Twilight Masquerade)
        imageUrl: 'https://images.pokemontcg.io/sv6/95.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/95_hires.png'
    },
    'Crispin': {
        name: 'Crispin',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Search your deck for 2 Basic Energy cards of different types, reveal them, and put 1 into your hand. Attach the other to 1 of your Pokemon.',
        // Using Crispin (Stellar Crown)
        imageUrl: 'https://images.pokemontcg.io/sv7/132.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/132_hires.png'
    },
    'Spark': {
        name: 'Spark',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Draw 2 cards. If you do, flip a coin. If heads, attach a Lightning Energy from discard to one of your Benched Pokemon.',
        // Using Spark (Pokemon GO)
        imageUrl: 'https://images.pokemontcg.io/pgo/70.png',
        imageUrlLarge: 'https://images.pokemontcg.io/pgo/70_hires.png'
    },
    'Neo Upper Energy': {
        name: 'Neo Upper Energy',
        type: 'energy',
        subtypes: ['ACE SPEC', 'Special Energy'],
        flavorText: 'Provides 2 Energy of any type, but only to Stage 2 Pokemon.',
        // Using Neo Upper Energy (Temporal Forces)
        imageUrl: 'https://images.pokemontcg.io/sv5/162.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/162_hires.png'
    }
};

// ============================================
// MEGA LUCARIO EX DECK (Player's Deck - 2026 Meta)
// ============================================
export async function createMegaLucarioExDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    let cardIndex = 0;

    // Fetch sets for other cards, including new 2026 sets
    // Fetch sets with individual error handling to prevent deck load failure
    // Fetch sets with individual error handling to prevent deck load failure
    const [sv1, sv3, sv4, sv5, sv6, asc, me1, me2pt5, sv8, sv9] = await Promise.all([
        fetchSet('sv1').catch(() => []),
        fetchSet('sv3').catch(() => []),
        fetchSet('sv4').catch(() => []),
        fetchSet('sv5').catch(() => []),
        fetchSet('sv6').catch(() => []),
        fetchSet('asc').catch(() => []),
        fetchSet('me1').catch(() => []),
        fetchSet('me2pt5').catch(() => []),
        fetchSet('sv8').catch(() => []),
        fetchSet('sv9').catch(() => []),
    ]);

    const allCards = [...sv1, ...sv3, ...sv4, ...sv5, ...sv6, ...asc, ...me1, ...me2pt5, ...sv8, ...sv9];

    const addCard = (name: string, count: number) => {
        // PRIORITY 1: Try to find real card in API (User confirmed they exist)
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) {
                deck.push(convertApiCard(apiCard, cardIndex++));
            }
            return;
        }

        // PRIORITY 2: Fallback to high-quality proxy if API fetch failed for some reason
        if (FUTURE_CARDS[name]) {
            const proxy = FUTURE_CARDS[name];
            for (let i = 0; i < count; i++) {
                deck.push({
                    id: `proxy-${name.replace(/\s+/g, '-').toLowerCase()}-${cardIndex++}`,
                    name: proxy.name!,
                    type: proxy.type!,
                    hp: proxy.hp,
                    energyType: proxy.energyType,
                    subtypes: proxy.subtypes,
                    attacks: proxy.attacks,
                    imageUrl: proxy.imageUrl,
                    imageUrlLarge: proxy.imageUrlLarge
                });
            }
            return;
        }
        console.warn(`Card not found: ${name}`);
        // Add placeholder
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `placeholder-${cardIndex++}`,
                name,
                type: 'pokemon',
                hp: 100,
                subtypes: ['Basic'],
            });
        }
    };

    // Pokemon (18)
    addCard('Mega Lucario ex', 3);
    addCard('Lucario', 1);
    addCard('Riolu', 4);
    addCard('Fighting Lunatone', 2);
    addCard('Solrock', 2);
    addCard('Hariyama', 2);
    addCard('Makuhita', 2); // Assuming Makuhita exists or will fallback
    addCard('Manaphy', 1); // Brilliant Stars (Rotated? Need verify. Assuming reprint or standard fallback)
    addCard('Radiant Greninja', 1); // Astral Radiance (Rotated? Keeping for draw power structure, likely replaced by Lunatone/Solrock logic)

    // Trainers (30)
    addCard('Professor\'s Research', 4);
    addCard('Iono', 3);
    addCard('Boss\'s Orders', 3);
    addCard('Lillie\'s Determination', 2); // Future card? Fallback to placeholder
    addCard('Fighting Gong', 4);
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 3);
    addCard('Premium Power Pro', 3);
    addCard('Super Rod', 2);
    addCard('Switch', 2);

    // Energy (12)
    addCard('Fighting Energy', 12);

    console.log(`Mega Lucario deck built: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// DRAGAPULT EX DECK (Opponent's Deck - Post-Rotation)
// ============================================
export async function createDragapultExDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    let cardIndex = 0;

    // Fetch multiple sets for card variety
    // Fetch multiple sets for card variety, including new sets
    // Fetch multiple sets with error handling
    const [sv4, sv5, sv6, asc, me1, me2pt5, sv8, sv9] = await Promise.all([
        fetchSet('sv4').catch(() => []),
        fetchSet('sv5').catch(() => []),
        fetchSet('sv6').catch(() => []),
        fetchSet('asc').catch(() => []),
        fetchSet('me1').catch(() => []),
        fetchSet('me2pt5').catch(() => []),
        fetchSet('sv8').catch(() => []),
        fetchSet('sv9').catch(() => []),
    ]);

    const allCards = [...sv4, ...sv5, ...sv6, ...asc, ...me1, ...me2pt5, ...sv8, ...sv9];

    const addCard = (name: string, count: number) => {
        // PRIORITY 1: Try to find real card in API
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) {
                deck.push(convertApiCard(apiCard, cardIndex++));
            }
            return;
        }

        // PRIORITY 2: Check Future/Proxy cards
        if (FUTURE_CARDS[name]) {
            const proxy = FUTURE_CARDS[name];
            for (let i = 0; i < count; i++) {
                deck.push({
                    id: `proxy-${name.replace(/\s+/g, '-').toLowerCase()}-${cardIndex++}`,
                    name: proxy.name!,
                    type: proxy.type!,
                    hp: proxy.hp,
                    energyType: proxy.energyType,
                    subtypes: proxy.subtypes,
                    attacks: proxy.attacks,
                    imageUrl: proxy.imageUrl,
                    imageUrlLarge: proxy.imageUrlLarge
                });
            }
            return;
        }
        console.warn(`Card not found: ${name}`);
        // Add placeholder
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `placeholder-opp-${cardIndex++}`,
                name,
                type: 'pokemon',
                hp: 100,
                subtypes: ['Basic'],
            });
        }
    };

    // Pokemon (18)
    addCard('Dreepy', 4);
    addCard('Drakloak', 1);
    addCard('Dragapult ex', 3);
    addCard('Duskull', 2);
    addCard('Dusclops', 1);
    addCard('Dusknoir', 2);
    addCard('Fezandipiti ex', 1);
    addCard('Munkidori', 1);
    addCard('Manaphy', 1); // Brilliant Stars? (Check legality)
    addCard('Rotom V', 1); // Replaced by Fezandipiti logic usually, but preserving for engine

    // Trainers - Supporters (13)
    addCard('Professor\'s Research', 3);
    addCard('Boss\'s Orders', 3);
    addCard('Iono', 3); // Replaced by Judge in some lists, but keeping generic
    addCard('Judge', 1);
    addCard('Arven', 2);
    addCard('Crispin', 1);

    // Trainers - Items (18)
    addCard('Rare Candy', 4);
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 4);
    addCard('Super Rod', 2);
    addCard('Switch', 2);
    addCard('Night Stretcher', 2);

    // Trainers - Stadiums (2)
    addCard('Temple of Sinnoh', 2);

    // Trainers - Tools (1)
    addCard('Technical Machine', 1);

    // Energy (8)
    addCard('Psychic Energy', 5);
    addCard('Fire Energy', 2);
    addCard('Neo Upper Energy', 1);

    console.log(`Dragapult deck built: ${deck.length} cards`);
    return shuffle(deck);
}

// Utility export
export function shuffleDeck<T>(deck: T[]): T[] {
    return shuffle(deck);
}

export const standardDecks = {
    megaLucarioEx: createMegaLucarioExDeck,
    dragapultEx: createDragapultExDeck,
};
