/**
 * 2026 Standard Format Decks (H-On)
 * Legal sets: sv5, sv6, sv6pt5, sv7, sv8, sv8pt5, sv9, sve, me1, me2, me2pt5, me3, sv10, zsv10pt5, rsv10pt5
 * Regulation marks H, I, J and newer only — G and earlier are ROTATED.
 *
 * Removed rotated cards:
 *   - Manaphy (Brilliant Stars, swsh9, G mark) → rotated
 *   - Radiant Greninja (Astral Radiance, swsh10, G mark) → rotated
 *   - Rotom V (Astral Radiance, swsh10, G mark) → rotated
 *   - Temple of Sinnoh (Astral Radiance, swsh10, G mark) → rotated
 *   - Arven (Scarlet & Violet base, sv1, E mark) → rotated
 */

import { Card, EnergyType, ENERGY_TYPE_MAP } from '../types/game';
import { fetchSet, PokemonCardData, isStandardLegal } from '../services/pokemonApi';

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
        id: `${apiCard.id}-${index}`,
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

function findCardByName(cards: PokemonCardData[], name: string): PokemonCardData | undefined {
    let card = cards.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (card) return card;
    card = cards.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
    return card;
}

// ============================================
// PROXY / FALLBACK CARD DATA
// Only for cards that are in standard-legal sets (me1, me2, me2pt5, sv5+)
// but may not always be reachable from the API.
// ============================================
const STANDARD_PROXY_CARDS: Record<string, Partial<Card>> = {
    // --- Mega Lucario ex line (me1) ---
    'Mega Lucario ex': {
        name: 'Mega Lucario ex',
        type: 'pokemon',
        hp: 340,
        energyType: 'fighting',
        subtypes: ['Stage 2', 'ex', 'Mega'],
        attacks: [
            { name: 'Aura Jab', damage: 130, energyCost: ['fighting'], description: 'Attach up to 3 Basic Fighting Energy from your discard pile to your Benched Pokémon.' },
            { name: 'Mega Brave', damage: 270, energyCost: ['fighting', 'fighting'], description: 'During your next turn, this Pokémon cannot use Mega Brave.' }
        ],
        imageUrl: 'https://images.pokemontcg.io/me1/188.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/188_hires.png',
    },
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
        imageUrl: 'https://images.pokemontcg.io/me1/71.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/71_hires.png',
    },
    'Riolu': {
        name: 'Riolu',
        type: 'pokemon',
        hp: 70,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [{ name: 'Punch', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me1/70.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/70_hires.png',
    },
    'Hariyama': {
        name: 'Hariyama',
        type: 'pokemon',
        hp: 150,
        energyType: 'fighting',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Makuhita',
        abilities: [{
            name: 'Heave-Ho Catcher',
            type: 'Ability',
            text: 'Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. Switch in 1 of your opponent\'s Benched Pokémon to the Active Spot.',
        }],
        attacks: [
            { name: 'Wild Press', damage: 210, energyCost: ['fighting', 'fighting', 'fighting'], description: 'This Pokémon also does 70 damage to itself.' }
        ],
        weaknesses: [{ type: 'psychic', value: '×2' }],
        retreatCost: 3,
        imageUrl: 'https://images.pokemontcg.io/me1/73.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/73_hires.png',
    },
    'Makuhita': {
        name: 'Makuhita',
        type: 'pokemon',
        hp: 80,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [
            { name: 'Corkscrew Punch', damage: 10, energyCost: ['fighting'] },
            { name: 'Confront', damage: 30, energyCost: ['fighting', 'fighting'] }
        ],
        imageUrl: 'https://images.pokemontcg.io/me1/72.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/72_hires.png',
    },
    'Lunatone': {
        name: 'Lunatone',
        type: 'pokemon',
        hp: 110,
        energyType: 'fighting',
        subtypes: ['Basic'],
        abilities: [{
            name: 'Lunar Cycle',
            type: 'Ability',
            text: 'Once during your turn, if you have Solrock in play, you may discard a Basic Fighting Energy from your hand to draw 3 cards.',
        }],
        attacks: [{ name: 'Power Gem', damage: 50, energyCost: ['fighting', 'fighting'] }],
        weaknesses: [{ type: 'grass', value: '×2' }],
        retreatCost: 1,
        imageUrl: 'https://images.pokemontcg.io/me1/74.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/74_hires.png',
    },
    'Solrock': {
        name: 'Solrock',
        type: 'pokemon',
        hp: 110,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [{
            name: 'Cosmic Beam',
            damage: 70,
            energyCost: ['fighting'],
            description: 'If you don\'t have Lunatone on your Bench, this attack does nothing. Not affected by Weakness or Resistance.',
        }],
        weaknesses: [{ type: 'grass', value: '×2' }],
        retreatCost: 1,
        imageUrl: 'https://images.pokemontcg.io/me1/75.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/75_hires.png',
    },
    // --- me1 Trainers ---
    'Fighting Gong': {
        name: 'Fighting Gong',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for a Basic Fighting Pokémon or Basic Fighting Energy and put it into your hand.',
        imageUrl: 'https://images.pokemontcg.io/me1/101.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/101_hires.png',
    },
    'Premium Power Pro': {
        name: 'Premium Power Pro',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Your Pokémon\'s attacks do +30 more damage.',
        imageUrl: 'https://images.pokemontcg.io/me1/105.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/105_hires.png',
    },
    "Lillie's Determination": {
        name: "Lillie's Determination",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Shuffle your hand into your deck. If you have 6 Prize cards remaining, draw 8 cards. Otherwise, draw 6 cards.',
        imageUrl: 'https://images.pokemontcg.io/me1/95.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/95_hires.png',
    },
    // --- sv6pt5 / sv7 Trainers ---
    'Fezandipiti ex': {
        name: 'Fezandipiti ex',
        type: 'pokemon',
        hp: 210,
        energyType: 'psychic',
        subtypes: ['Basic', 'ex'],
        attacks: [
            { name: 'Adrena-Pheromone', damage: 0, energyCost: ['colorless'], description: 'Flip a coin. If heads, prevent all damage done to this Pokémon during your opponent\'s next turn.' },
            { name: 'Energy Feather', damage: 30, energyCost: ['psychic'], description: 'This attack does 30 more damage for each Energy attached to this Pokémon.' }
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/38.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/38_hires.png',
    },
    'Munkidori': {
        name: 'Munkidori',
        type: 'pokemon',
        hp: 110,
        energyType: 'psychic',
        subtypes: ['Basic'],
        attacks: [{ name: 'Mind Bend', damage: 30, energyCost: ['psychic', 'colorless'], description: 'Your opponent\'s Active Pokémon is now Confused.' }],
        imageUrl: 'https://images.pokemontcg.io/sv6/95.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/95_hires.png',
    },
    'Crispin': {
        name: 'Crispin',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Search your deck for 2 Basic Energy cards of different types, reveal them, and put 1 into your hand. Attach the other to 1 of your Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/sv7/132.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/132_hires.png',
    },
    'Carmine': {
        name: 'Carmine',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Put your hand into your deck and shuffle it. Then draw cards until you have 5 cards in hand.',
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/87.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/87_hires.png',
    },
    'Briar': {
        name: 'Briar',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Draw 3 cards. If any of your Pokémon were Knocked Out during your opponent\'s last turn, draw 3 more cards.',
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/86.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/86_hires.png',
    },
    // --- sv8 items ---
    'Night Stretcher': {
        name: 'Night Stretcher',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Put a Pokémon from your discard pile into your hand. If that Pokémon has a Rule Box, put 2 basic Energy from your discard pile into your hand as well.',
        imageUrl: 'https://images.pokemontcg.io/sv8/171.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8/171_hires.png',
    },
    'Buddy-Buddy Poffin': {
        name: 'Buddy-Buddy Poffin',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for up to 2 Basic Pokémon with 70 HP or less, reveal them, and put them onto your Bench.',
        imageUrl: 'https://images.pokemontcg.io/sv5/144.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/144_hires.png',
    },
    'Pokémon League Headquarters': {
        name: 'Pokémon League Headquarters',
        type: 'trainer',
        subtypes: ['Stadium'],
        flavorText: 'Each player\'s Pokémon with a Rule Box take 20 less damage from attacks (after applying Weakness and Resistance).',
        imageUrl: 'https://images.pokemontcg.io/sv8/177.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8/177_hires.png',
    },
    'Neo Upper Energy': {
        name: 'Neo Upper Energy',
        type: 'energy',
        subtypes: ['ACE SPEC', 'Special Energy'],
        flavorText: 'Provides 2 Energy of any type, but only to Stage 2 Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/sv5/162.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/162_hires.png',
    },
};

// ============================================
// MEGA LUCARIO EX DECK — 2026 Standard (H-On)
// 60 cards: 16 Pokémon / 32 Trainers / 12 Energy
// ============================================
export async function createMegaLucarioExDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    let cardIndex = 0;

    // Fetch only 2026 Standard-legal sets
    const [sv5, sv6, sv6pt5, sv7, sv8, sv8pt5, sv9, me1, me2, me2pt5] = await Promise.all([
        fetchSet('sv5').catch(() => []),
        fetchSet('sv6').catch(() => []),
        fetchSet('sv6pt5').catch(() => []),
        fetchSet('sv7').catch(() => []),
        fetchSet('sv8').catch(() => []),
        fetchSet('sv8pt5').catch(() => []),
        fetchSet('sv9').catch(() => []),
        fetchSet('me1').catch(() => []),
        fetchSet('me2').catch(() => []),
        fetchSet('me2pt5').catch(() => []),
    ]);

    const allCards = [
        ...me1, ...me2, ...me2pt5,
        ...sv9, ...sv8pt5, ...sv8,
        ...sv7, ...sv6pt5, ...sv6, ...sv5,
    ].filter(isStandardLegal);

    const addCard = (name: string, count: number) => {
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) {
                deck.push(convertApiCard(apiCard, cardIndex++));
            }
            return;
        }
        if (STANDARD_PROXY_CARDS[name]) {
            const proxy = STANDARD_PROXY_CARDS[name];
            for (let i = 0; i < count; i++) {
                deck.push({
                    id: `proxy-${name.replace(/\s+/g, '-').toLowerCase()}-${cardIndex++}`,
                    name: proxy.name!,
                    type: proxy.type!,
                    hp: proxy.hp,
                    energyType: proxy.energyType,
                    subtypes: proxy.subtypes,
                    attacks: proxy.attacks,
                    abilities: proxy.abilities,
                    imageUrl: proxy.imageUrl,
                    imageUrlLarge: proxy.imageUrlLarge,
                });
            }
            return;
        }
        console.warn(`[2026 Standard] Card not found: ${name}`);
        for (let i = 0; i < count; i++) {
            deck.push({ id: `placeholder-${cardIndex++}`, name, type: 'pokemon', hp: 100, subtypes: ['Basic'] });
        }
    };

    // Pokémon (16) — all standard-legal
    addCard('Mega Lucario ex', 3);   // me1
    addCard('Lucario', 1);            // me1
    addCard('Riolu', 4);              // me1
    addCard('Lunatone', 2);           // me1
    addCard('Solrock', 2);            // me1
    addCard('Hariyama', 2);           // me1
    addCard('Makuhita', 2);           // me1

    // Trainers (32) — all standard-legal
    // Supporters (9)
    addCard("Professor's Research", 4); // sv5/sv8
    addCard('Iono', 3);                 // sv6/sv8
    addCard("Boss's Orders", 2);        // sv7/sv8
    // Items (21)
    addCard('Fighting Gong', 4);        // me1
    addCard('Ultra Ball', 4);           // sv5/sv8
    addCard('Nest Ball', 3);            // sv5/sv8
    addCard('Buddy-Buddy Poffin', 3);   // sv5 — replaces rotated Manaphy + Radiant Greninja
    addCard('Premium Power Pro', 3);    // me1
    addCard('Super Rod', 2);            // sv5/sv8
    addCard('Switch', 2);               // sv5/sv8
    // Trainers (2) — special
    addCard("Lillie's Determination", 2); // me1

    // Energy (12)
    addCard('Fighting Energy', 12);

    console.log(`[2026 Standard] Mega Lucario deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// DRAGAPULT EX DECK — 2026 Standard (H-On)
// 60 cards: 15 Pokémon / 37 Trainers / 8 Energy
// ============================================
export async function createDragapultExDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    let cardIndex = 0;

    // Fetch only 2026 Standard-legal sets
    const [sv5, sv6, sv6pt5, sv7, sv8, sv8pt5, sv9, me1, me2, me2pt5] = await Promise.all([
        fetchSet('sv5').catch(() => []),
        fetchSet('sv6').catch(() => []),
        fetchSet('sv6pt5').catch(() => []),
        fetchSet('sv7').catch(() => []),
        fetchSet('sv8').catch(() => []),
        fetchSet('sv8pt5').catch(() => []),
        fetchSet('sv9').catch(() => []),
        fetchSet('me1').catch(() => []),
        fetchSet('me2').catch(() => []),
        fetchSet('me2pt5').catch(() => []),
    ]);

    const allCards = [
        ...me1, ...me2, ...me2pt5,
        ...sv9, ...sv8pt5, ...sv8,
        ...sv7, ...sv6pt5, ...sv6, ...sv5,
    ].filter(isStandardLegal);

    const addCard = (name: string, count: number) => {
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) {
                deck.push(convertApiCard(apiCard, cardIndex++));
            }
            return;
        }
        if (STANDARD_PROXY_CARDS[name]) {
            const proxy = STANDARD_PROXY_CARDS[name];
            for (let i = 0; i < count; i++) {
                deck.push({
                    id: `proxy-${name.replace(/\s+/g, '-').toLowerCase()}-${cardIndex++}`,
                    name: proxy.name!,
                    type: proxy.type!,
                    hp: proxy.hp,
                    energyType: proxy.energyType,
                    subtypes: proxy.subtypes,
                    attacks: proxy.attacks,
                    abilities: proxy.abilities,
                    imageUrl: proxy.imageUrl,
                    imageUrlLarge: proxy.imageUrlLarge,
                });
            }
            return;
        }
        console.warn(`[2026 Standard] Card not found: ${name}`);
        for (let i = 0; i < count; i++) {
            deck.push({ id: `placeholder-opp-${cardIndex++}`, name, type: 'pokemon', hp: 100, subtypes: ['Basic'] });
        }
    };

    // Pokémon (15) — Rotom V and Manaphy removed (rotated), Arven replaced
    addCard('Dreepy', 4);           // sv5/sv6
    addCard('Drakloak', 1);         // sv5/sv6
    addCard('Dragapult ex', 3);     // sv5/sv6
    addCard('Duskull', 2);          // sv6/sv8
    addCard('Dusclops', 1);         // sv6/sv8
    addCard('Dusknoir', 2);         // sv6/sv8
    addCard('Fezandipiti ex', 1);   // sv6pt5
    addCard('Munkidori', 1);        // sv6

    // Trainers (37) — Temple of Sinnoh and Arven replaced with standard cards
    // Supporters (12)
    addCard("Professor's Research", 3); // sv5/sv8
    addCard("Boss's Orders", 3);        // sv7/sv8
    addCard('Iono', 3);                 // sv6/sv8
    addCard('Judge', 1);                // sv5
    addCard('Briar', 2);                // sv6pt5 — replaces rotated Arven
    addCard('Crispin', 1);              // sv7
    addCard('Carmine', 1);              // sv6pt5 — replaces rotated Rotom V draw slot
    // Items (23)
    addCard('Rare Candy', 4);           // sv5/sv8
    addCard('Ultra Ball', 4);           // sv5/sv8
    addCard('Nest Ball', 4);            // sv5/sv8
    addCard('Super Rod', 2);            // sv5/sv8
    addCard('Switch', 3);               // sv5/sv8
    addCard('Night Stretcher', 3);      // sv8 — replaces rotated Manaphy recovery
    // Stadium (2)
    addCard('Pokémon League Headquarters', 2); // sv8 — replaces rotated Temple of Sinnoh

    // Energy (8)
    addCard('Psychic Energy', 5);
    addCard('Fire Energy', 2);
    addCard('Neo Upper Energy', 1);     // sv5 (ACE SPEC)

    console.log(`[2026 Standard] Dragapult deck: ${deck.length} cards`);
    return shuffle(deck);
}

export function shuffleDeck<T>(deck: T[]): T[] {
    return shuffle(deck);
}

export const standardDecks = {
    megaLucarioEx: createMegaLucarioExDeck,
    dragapultEx: createDragapultExDeck,
};
