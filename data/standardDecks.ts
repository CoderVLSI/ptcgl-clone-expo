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
    // --- Mega Lucario ex line (me1) — data verified against local me1.json ---
    'Mega Lucario ex': {
        name: 'Mega Lucario ex',
        type: 'pokemon',
        hp: 340,
        energyType: 'fighting',
        subtypes: ['Stage 1', 'MEGA', 'ex'],  // Stage 1 MEGA evolves directly from Riolu
        evolvesFrom: 'Riolu',
        attacks: [
            { name: 'Aura Jab', damage: 130, energyCost: ['fighting'], description: 'Attach up to 3 Basic Fighting Energy cards from your discard pile to your Benched Pokémon in any way you like.' },
            { name: 'Mega Brave', damage: 270, energyCost: ['fighting', 'fighting'], description: 'During your next turn, this Pokémon cannot use Mega Brave.' }
        ],
        imageUrl: 'https://images.pokemontcg.io/me1/77.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/77_hires.png',
    },
    // NOTE: Lucario (Stage 1) does NOT exist in me1. Evolution is Riolu → Mega Lucario ex directly.
    'Riolu': {
        name: 'Riolu',
        type: 'pokemon',
        hp: 80,
        energyType: 'fighting',
        subtypes: ['Basic'],
        attacks: [{ name: 'Accelerating Stab', damage: 30, energyCost: ['fighting'], description: 'During your next turn, this Pokémon can\'t use Accelerating Stab.' }],
        imageUrl: 'https://images.pokemontcg.io/me1/76.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/76_hires.png',
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
        flavorText: 'During this turn, attacks used by your Fighting Pokémon do 30 more damage to your opponent\'s Active Pokémon (before applying Weakness and Resistance).',
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
        energyType: 'darkness',
        subtypes: ['Basic', 'ex'],
        weaknesses: [{ type: 'fighting', value: '×2' }],
        retreatCost: 1,
        abilities: [{
            name: 'Flip the Script',
            type: 'Ability',
            text: 'Once during your turn, if any of your Pokémon were Knocked Out during your opponent\'s last turn, you may draw 3 cards. You can\'t use more than 1 Flip the Script Ability each turn.',
        }],
        attacks: [
            { name: 'Cruel Arrow', damage: 100, energyCost: ['colorless', 'colorless', 'colorless'], description: 'This attack does 100 damage to 1 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)' },
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
        abilities: [{
            name: 'Adrena-Brain',
            type: 'Ability',
            text: 'Once during your turn, if this Pokémon has any Darkness Energy attached, you may move 3 damage counters from 1 of your Pokémon to 1 of your opponent\'s Pokémon.',
        }],
        attacks: [{ name: 'Mind Bend', damage: 60, energyCost: ['psychic', 'colorless'], description: 'Your opponent\'s Active Pokémon is now Confused.' }],
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
// 60 cards: 15 Pokémon / 33 Trainers / 12 Energy
// Evolution: Riolu → Mega Lucario ex (Stage 1 MEGA directly, no Lucario Stage 1)
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
        const proxy = ALL_PROXY_CARDS[name];
        if (proxy) {
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

    // Pokémon (16) — Riolu evolves DIRECTLY into Mega Lucario ex (Stage 1 MEGA, no Lucario Stage 1 exists)
    addCard('Mega Lucario ex', 3);   // me1 — Stage 1 MEGA, evolvesFrom Riolu
    addCard('Riolu', 4);              // me1 — Basic
    addCard('Lunatone', 2);           // me1
    addCard('Solrock', 2);            // me1
    addCard('Hariyama', 2);           // me1
    addCard('Makuhita', 2);           // me1

    // Trainers (33) — all standard-legal
    // Supporters (9)
    addCard("Professor's Research", 4); // sv5/sv8
    addCard('Iono', 3);                 // sv6/sv8
    addCard("Boss's Orders", 2);        // sv7/sv8
    // Items (22)
    addCard('Fighting Gong', 4);        // me1 — search Fighting Energy or Fighting Pokémon
    addCard('Ultra Ball', 4);           // sv5/sv8
    addCard('Nest Ball', 4);            // sv5/sv8 — Riolu/Makuhita 80HP don't qualify for Poffin
    addCard('Premium Power Pro', 3);    // me1 — Fighting attacks +30 this turn
    addCard('Super Rod', 2);            // sv5/sv8
    addCard('Switch', 3);               // sv5/sv8
    addCard('Energy Retrieval', 2);     // sv5 — get Fighting Energy back
    // Supporters — special
    addCard("Lillie's Determination", 2); // me1

    // Energy (12)
    addCard('Fighting Energy', 12);

    console.log(`[2026 Standard] Mega Lucario deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// DRAGAPULT EX / DUSKNOIR DECK — 2026 Standard (H-On)
// Real competitive list: Phantom Dive + Sinister Hand combo
// 60 cards: 17 Pokémon / 37 Trainers / 6 Energy
// ============================================
export async function createDragapultExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (17)
    addCard('Dreepy', 4);                  // sv5 — Dragapult base
    addCard('Drakloak', 2);                // sv5 — Stage 1 bridge
    addCard('Dragapult ex', 3);            // sv5 — Phantom Dive: place 6 damage counters on bench
    addCard('Duskull', 2);                 // sv6 — Dusknoir base
    addCard('Dusclops', 1);               // sv6 — Stage 1 bridge
    addCard('Dusknoir', 1);               // sv6 — Sinister Hand: move all bench counters to active
    addCard('Budew', 2);                   // sv8pt5 — Itchy Pollen: opponent can't play Items next turn
    addCard('Hawlucha', 1);               // sv5 — Flying Entry: 2 counters on bench when played
    addCard('Bloodmoon Ursaluna ex', 1);  // sv6pt5 — Crescent Moon 190dmg, ignores Abilities

    // Trainers — Supporters (12)
    addCard('Iono', 4);                          // sv6/sv8 — hand disruption + draw
    addCard("Lillie's Determination", 3);        // me1 — full-grip draw
    addCard("Boss's Orders", 3);                 // sv7/sv8 — force active switch
    addCard('Jacq', 1);                          // sv7 — search for Evolution Pokémon
    addCard("Brock's Scouting", 1);              // me1 — search 2 Evolutions from deck

    // Trainers — Items (23)
    addCard('Rare Candy', 4);                    // sv5/sv8 — Basic→Stage 2 skip
    addCard('Ultra Ball', 4);                    // sv5/sv8
    addCard('Buddy-Buddy Poffin', 4);            // sv5 — grab Budew + Hawlucha (both ≤70HP)
    addCard('Night Stretcher', 3);               // sv8 — recovery
    addCard('Counter Catcher', 3);               // sv6 — switch after KO
    addCard('Super Rod', 2);                     // sv5/sv8
    addCard('Unfair Stamp', 1);                  // sv8 — opponent draws 3 when they have 1-3 prizes
    addCard('Exp. Share', 1);                    // sv5 — keep energy when KO'd
    addCard('Switch', 1);                        // sv5

    // Trainers — Stadium (2)
    addCard('Pokémon League Headquarters', 2);   // sv8

    // Energy (6)
    addCard('Psychic Energy', 3);
    addCard('Fire Energy', 3);

    console.log(`[2026 Standard] Dragapult/Dusknoir deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// ADDITIONAL PROXY CARDS — used by new decks
// ============================================

// Merge with existing STANDARD_PROXY_CARDS by extending the declaration
const EXTRA_PROXY_CARDS: Record<string, Partial<Card>> = {

    // ─── Raging Bolt ex line (sv5 — Temporal Forces) ─────────────────────────
    'Raging Bolt ex': {
        name: 'Raging Bolt ex',
        type: 'pokemon',
        hp: 240,
        energyType: 'lightning',
        subtypes: ['Basic', 'ex', 'Ancient'],
        retreatCost: 3,
        attacks: [
            {
                name: 'Burst Roar',
                damage: 0,
                energyCost: ['colorless'],
                description: 'Discard your hand and draw 6 cards.',
            },
            {
                name: 'Bellowing Thunder',
                damage: 70,
                energyCost: ['lightning', 'fighting'],
                description: 'You may discard any amount of Basic Energy from your Pokémon. This attack does 70 damage for each card you discarded in this way.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv5/123.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/123_hires.png',
    },

    'Regieleki ex': {
        name: 'Regieleki ex',
        type: 'pokemon',
        hp: 220,
        energyType: 'lightning',
        subtypes: ['Basic', 'ex'],
        weaknesses: [{ type: 'fighting', value: '×2' }],
        retreatCost: 1,
        abilities: [{
            name: 'Transistor',
            type: 'Ability',
            text: 'Your Lightning Pokémon\'s attacks do 30 more damage to the opponent\'s Active Pokémon (before applying Weakness and Resistance).',
        }],
        attacks: [
            {
                name: 'Volt Tackle',
                damage: 220,
                energyCost: ['lightning', 'lightning', 'lightning', 'lightning'],
                description: 'This Pokémon does 50 damage to itself.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv5/79.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/79_hires.png',
    },

    'Sandy Shocks ex': {
        name: 'Sandy Shocks ex',
        type: 'pokemon',
        hp: 220,
        energyType: 'lightning',
        subtypes: ['Basic', 'ex', 'Ancient'],
        weaknesses: [{ type: 'fighting', value: '×2' }],
        retreatCost: 2,
        attacks: [
            {
                name: 'Sand Javelin',
                damage: 60,
                energyCost: ['lightning', 'colorless'],
                description: 'This attack also does 20 damage to each of your opponent\'s Benched Pokémon.',
            },
            {
                name: 'Spark Tackle',
                damage: 160,
                energyCost: ['lightning', 'lightning', 'colorless'],
                description: 'This Pokémon does 30 damage to itself.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/70.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/70_hires.png',
    },

    'Flutter Mane': {
        name: 'Flutter Mane',
        type: 'pokemon',
        hp: 90,
        energyType: 'psychic',
        subtypes: ['Basic', 'Ancient'],
        retreatCost: 1,
        weaknesses: [{ type: 'metal', value: '×2' }],
        abilities: [{
            name: 'Midnight Fluttering',
            type: 'Ability',
            text: 'As long as this Pokémon is in the Active Spot, your opponent\'s Active Pokémon has no Abilities, except for Midnight Fluttering.',
        }],
        attacks: [
            {
                name: 'Hex Hurl',
                damage: 90,
                energyCost: ['colorless', 'colorless', 'colorless'],
                description: 'Put 2 damage counters on your opponent\'s Benched Pokémon in any way you like.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv5/78.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/78_hires.png',
    },

    'Ogerpon ex': {
        name: 'Ogerpon ex',
        type: 'pokemon',
        hp: 190,
        energyType: 'grass',
        subtypes: ['Basic', 'ex'],
        weaknesses: [{ type: 'fire', value: '×2' }],
        retreatCost: 1,
        attacks: [
            {
                name: 'Ivy Cudgel',
                damage: 80,
                energyCost: ['grass', 'colorless'],
                description: 'Heal 30 damage from this Pokémon.',
            },
            {
                name: 'Teal Tornado',
                damage: 180,
                energyCost: ['grass', 'grass', 'colorless'],
                description: '',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/25.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/25_hires.png',
    },

    // ─── Mega Greninja ex line (CRI — Chaos Rising, releases 2026-05-22) ───────
    'Froakie': {
        name: 'Froakie',
        type: 'pokemon',
        hp: 60,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            { name: 'Bubble', damage: 10, energyCost: ['colorless'], description: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/56.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/56_hires.png',
    },

    'Frogadier': {
        name: 'Frogadier',
        type: 'pokemon',
        hp: 90,
        energyType: 'water',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Froakie',
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            {
                name: 'Water Shuriken',
                damage: 30,
                energyCost: ['water'],
                description: 'Flip 2 coins. This attack does 30 more damage for each heads.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/57.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/57_hires.png',
    },

    'Mega Greninja ex': {
        name: 'Mega Greninja ex',
        type: 'pokemon',
        hp: 350,
        energyType: 'water',
        subtypes: ['Stage 2', 'ex', 'Mega'],
        evolvesFrom: 'Frogadier',
        weaknesses: [{ type: 'lightning', value: '×2' }],
        retreatCost: 1,
        abilities: [{
            name: 'Mortal Shuriken',
            type: 'Ability',
            text: 'Once during your turn, if this Pokémon is in the Active Spot, you may discard a Basic Water Energy card from your hand in order to use this Ability. Place 6 damage counters on 1 of your opponent\'s Pokémon.',
        }],
        attacks: [
            {
                name: 'Ninja Spinner',
                damage: 120,
                energyCost: ['water', 'water'],
                description: 'You may put a Water Energy attached to this Pokémon into your hand and have this attack do 80 more damage.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/106.png',     // temp: sv6 Greninja ex until cri/22.png goes live (2026-05-22)
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/106_hires.png',
    },

    'Greninja': {
        name: 'Greninja',
        type: 'pokemon',
        hp: 130,
        energyType: 'water',
        subtypes: ['Stage 2'],
        evolvesFrom: 'Frogadier',
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        abilities: [{
            name: 'Smokescreen Veil',
            type: 'Ability',
            text: 'Once during your turn, you may put 1 damage counter on 1 of your opponent\'s Pokémon.',
        }],
        attacks: [
            {
                name: 'Night Slash',
                damage: 80,
                energyCost: ['water', 'colorless'],
                description: 'Flip a coin. If heads, switch this Pokémon with 1 of your Benched Pokémon.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/56.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/56_hires.png',
    },

    'Tatsugiri': {
        name: 'Tatsugiri',
        type: 'pokemon',
        hp: 70,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            {
                name: 'Mise en Place',
                damage: 0,
                energyCost: ['water'],
                description: 'Search your deck for up to 2 Basic Water Energy cards and attach them to 1 of your Basic Pokémon. Then, shuffle your deck.',
            },
            {
                name: 'Curl Up',
                damage: 30,
                energyCost: ['water'],
                description: 'Put this Pokémon and all attached cards into your hand.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv1/62.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/62_hires.png',
    },

    'Dondozo': {
        name: 'Dondozo',
        type: 'pokemon',
        hp: 160,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 4,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            {
                name: 'Release Rage',
                damage: 50,
                energyCost: ['colorless', 'colorless'],
                description: 'This attack does 50 damage for each Tatsugiri in your discard pile.',
            },
            {
                name: 'Heavy Splash',
                damage: 120,
                energyCost: ['water', 'water', 'colorless', 'colorless'],
                description: '',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv1/61.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/61_hires.png',
    },

    // ─── Raging Bolt ex support ──────────────────────────────────────────────
    'Teal Mask Ogerpon ex': {
        name: 'Teal Mask Ogerpon ex',
        type: 'pokemon',
        hp: 160,
        energyType: 'grass',
        subtypes: ['Basic', 'ex'],
        weaknesses: [{ type: 'fire', value: '×2' }],
        retreatCost: 1,
        abilities: [{
            name: 'Teal Dance',
            type: 'Ability',
            text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may attach a basic Grass Energy card from your hand to 1 of your Pokémon.',
        }],
        attacks: [
            { name: 'Ivy Cudgel', damage: 80, energyCost: ['grass', 'colorless'], description: 'If your opponent\'s Active Pokémon has a Rule Box, this attack does 80 more damage.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/25.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/25_hires.png',
    },

    'Hoothoot': {
        name: 'Hoothoot',
        type: 'pokemon',
        hp: 70,
        energyType: 'colorless',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Triple Stab', damage: 10, energyCost: ['colorless'], description: 'Flip 3 coins. This attack does 10 damage for each heads.' }],
        imageUrl: 'https://images.pokemontcg.io/sv7/114.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/114_hires.png',
    },

    'Noctowl': {
        name: 'Noctowl',
        type: 'pokemon',
        hp: 100,
        energyType: 'colorless',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Hoothoot',
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        abilities: [{
            name: 'Jewel Seeker',
            type: 'Ability',
            text: 'Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, if you have any Tera Pokémon in play, you may search your deck for up to 2 Trainer cards, reveal them, and put them into your hand. Then, shuffle your deck.',
        }],
        attacks: [{ name: 'Speed Wing', damage: 60, energyCost: ['colorless', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/sv7/115.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/115_hires.png',
    },

    'Fan Rotom': {
        name: 'Fan Rotom',
        type: 'pokemon',
        hp: 70,
        energyType: 'colorless',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        abilities: [{
            name: 'Fan Call',
            type: 'Ability',
            text: 'Once during your first turn, you may search your deck for up to 3 Colorless Pokémon with 100 HP or less, reveal them, and put them into your hand. Then, shuffle your deck. You can\'t use more than 1 Fan Call Ability during your turn.',
        }],
        attacks: [{ name: 'Assault Landing', damage: 70, energyCost: ['colorless'], description: 'If there is no Stadium in play, this attack does nothing.' }],
        imageUrl: 'https://images.pokemontcg.io/sv8pt5/85.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8pt5/85_hires.png',
    },

    // ─── Dragapult ex / Dusknoir support ────────────────────────────────────
    'Budew': {
        name: 'Budew',
        type: 'pokemon',
        hp: 30,
        energyType: 'grass',
        subtypes: ['Basic'],
        retreatCost: 0,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Itchy Pollen', damage: 10, energyCost: [], description: 'During your opponent\'s next turn, they can\'t play any Item cards from their hand.' }],
        imageUrl: 'https://images.pokemontcg.io/sv8pt5/4.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8pt5/4_hires.png',
    },

    'Hawlucha': {
        name: 'Hawlucha',
        type: 'pokemon',
        hp: 70,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 0,
        abilities: [{
            name: 'Flying Entry',
            type: 'Ability',
            text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may put 2 damage counters on 1 of your opponent\'s Pokémon.',
        }],
        attacks: [{ name: 'Cross Chop', damage: 60, energyCost: ['fighting', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/sv5/118.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/118_hires.png',
    },

    'Bloodmoon Ursaluna ex': {
        name: 'Bloodmoon Ursaluna ex',
        type: 'pokemon',
        hp: 260,
        energyType: 'colorless',
        subtypes: ['Basic', 'ex'],
        retreatCost: 3,
        abilities: [{
            name: 'Fallen Giant',
            type: 'Ability',
            text: 'This Pokémon is not affected by any effects of your opponent\'s Abilities.',
        }],
        attacks: [
            { name: 'Crescent Moon', damage: 190, energyCost: ['colorless', 'colorless', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/141.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/141_hires.png',
    },

    'Bloodmoon Ursaluna': {
        name: 'Bloodmoon Ursaluna',
        type: 'pokemon',
        hp: 150,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 4,
        weaknesses: [{ type: 'grass', value: '×2' }],
        abilities: [{
            name: 'Battle-Hardened',
            type: 'Ability',
            text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may attach up to 2 Basic Fighting Energy cards from your hand to this Pokémon.',
        }],
        attacks: [
            { name: 'Mad Bite', damage: 100, energyCost: ['fighting', 'fighting', 'colorless'], description: 'This attack does 30 more damage for each damage counter on your opponent\'s Active Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/25.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/25_hires.png',
    },

    'Jacq': {
        name: 'Jacq',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Search your deck for an Evolution Pokémon, reveal it, and put it into your hand. Then shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/sv7/135.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/135_hires.png',
    },

    'Counter Catcher': {
        name: 'Counter Catcher',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this only if any of your Pokémon were Knocked Out during your opponent\'s last turn. Switch in 1 of your opponent\'s Benched Pokémon to the Active Spot.',
        imageUrl: 'https://images.pokemontcg.io/sv6/264.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/264_hires.png',
    },

    'Unfair Stamp': {
        name: 'Unfair Stamp',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this only if your opponent has 1, 2, or 3 Prize cards remaining. Your opponent shuffles their hand into their deck and draws 3 cards.',
        imageUrl: 'https://images.pokemontcg.io/sv8/230.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8/230_hires.png',
    },

    "Brock's Scouting": {
        name: "Brock's Scouting",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Search your deck for up to 2 Evolution Pokémon that evolve from a Pokémon you have in play, reveal them, and put them into your hand. Then shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/me1/93.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/93_hires.png',
    },

    'Exp. Share': {
        name: 'Exp. Share',
        type: 'trainer',
        subtypes: ['Pokémon Tool'],
        flavorText: 'When the Pokémon this card is attached to is Knocked Out by damage from an attack, move 1 basic Energy card attached to that Pokémon to 1 of your Benched Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/sv5/174.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/174_hires.png',
    },

    // ─── Mega Zygarde ex line (me3 — Perfect Order) ───────────────────────────
    'Zygarde': {
        name: 'Zygarde',
        type: 'pokemon',
        hp: 80,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 1,
        attacks: [
            { name: 'Core Enforcer', damage: 20, energyCost: ['colorless'] },
            { name: 'Land Force', damage: 60, energyCost: ['fighting', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me3/5.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/5_hires.png',
    },

    'Zygarde 50%': {
        name: 'Zygarde 50%',
        type: 'pokemon',
        hp: 150,
        energyType: 'fighting',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Zygarde',
        retreatCost: 2,
        abilities: [{
            name: 'Order Shield',
            type: 'Ability',
            text: 'This Pokémon takes 20 less damage from attacks (after applying Weakness and Resistance).',
        }],
        attacks: [
            { name: 'Gaia Blade', damage: 110, energyCost: ['fighting', 'fighting', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me3/6.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/6_hires.png',
    },

    'Mega Zygarde ex': {
        name: 'Mega Zygarde ex',
        type: 'pokemon',
        hp: 340,
        energyType: 'fighting',
        subtypes: ['Stage 2', 'ex', 'Mega'],
        evolvesFrom: 'Zygarde 50%',
        weaknesses: [{ type: 'grass', value: '×2' }],
        retreatCost: 3,
        abilities: [{
            name: 'Lands Force',
            type: 'Ability',
            text: 'If you have Lunatone and Solrock on your Bench, your Fighting Pokémon\'s attacks do 30 more damage to the opponent\'s Active Pokémon.',
        }],
        attacks: [
            {
                name: 'Gaia Wave',
                damage: 200,
                energyCost: ['fighting', 'fighting', 'fighting'],
                description: 'This attack also does 20 damage to each of your opponent\'s Benched Pokémon.',
            },
            {
                name: 'Nullifying Zero',
                damage: 260,
                energyCost: ['fighting', 'fighting', 'fighting', 'colorless'],
                description: 'This attack also does 50 damage to all of your opponent\'s Benched Pokémon. This Pokémon cannot use Nullifying Zero during your next turn.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/me3/188.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/188_hires.png',
    },

    'Binacle': {
        name: 'Binacle',
        type: 'pokemon',
        hp: 60,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 1,
        attacks: [{ name: 'Scratch', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me3/35.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/35_hires.png',
    },

    'Barbaracle': {
        name: 'Barbaracle',
        type: 'pokemon',
        hp: 130,
        energyType: 'fighting',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Binacle',
        retreatCost: 2,
        abilities: [{
            name: 'Stone Arms',
            type: 'Ability',
            text: 'Once during your turn, you may attach a Basic Fighting Energy card from your discard pile to 1 of your Pokémon.',
        }],
        attacks: [{ name: 'Rock Smash', damage: 100, energyCost: ['fighting', 'fighting'] }],
        imageUrl: 'https://images.pokemontcg.io/me3/36.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/36_hires.png',
    },

    'Tarragon': {
        name: 'Tarragon',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Retrieve up to 4 Basic Fighting Energy cards from your discard pile and put them into your hand.',
        imageUrl: 'https://images.pokemontcg.io/me3/95.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/95_hires.png',
    },

    'Poké Pad': {
        name: 'Poké Pad',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for a Pokémon Tool card or a basic Energy card, reveal it, and put it into your hand. Then shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/me3/101.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/101_hires.png',
    },

    // ─── Shared trainers (if not already in STANDARD_PROXY_CARDS) ────────────
    'Energy Retrieval': {
        name: 'Energy Retrieval',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Put 2 basic Energy from your discard pile into your hand.',
        imageUrl: 'https://images.pokemontcg.io/sv5/171.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/171_hires.png',
    },

    'Judge': {
        name: 'Judge',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Each player shuffles their hand into their deck and draws 4 cards.',
        imageUrl: 'https://images.pokemontcg.io/sv5/176.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/176_hires.png',
    },

    'Rare Candy': {
        name: 'Rare Candy',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Choose 1 of your Basic Pokémon in play. If you have a Stage 2 card in your hand that evolves from that Pokémon, put that card onto the Basic Pokémon to evolve it. You can\'t use this card during your first turn or the turn you put that Pokémon into play.',
        imageUrl: 'https://images.pokemontcg.io/sv5/183.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/183_hires.png',
    },

    'Super Rod': {
        name: 'Super Rod',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Shuffle up to 3 Pokémon and/or basic Energy cards from your discard pile into your deck.',
        imageUrl: 'https://images.pokemontcg.io/sv5/188.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv5/188_hires.png',
    },

    // ─── Basic Energy cards ───────────────────────────────────────────────────
    // These appear in every set but may not be fetched if offline. Proxy ensures
    // they always have type:'energy' instead of falling to the 'pokemon' placeholder.
    'Fighting Energy': {
        name: 'Fighting Energy',
        type: 'energy',
        energyType: 'fighting',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/191.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/191_hires.png',
    },
    'Water Energy': {
        name: 'Water Energy',
        type: 'energy',
        energyType: 'water',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/188.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/188_hires.png',
    },
    'Grass Energy': {
        name: 'Grass Energy',
        type: 'energy',
        energyType: 'grass',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/186.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/186_hires.png',
    },
    'Lightning Energy': {
        name: 'Lightning Energy',
        type: 'energy',
        energyType: 'lightning',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/189.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/189_hires.png',
    },
    'Psychic Energy': {
        name: 'Psychic Energy',
        type: 'energy',
        energyType: 'psychic',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/190.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/190_hires.png',
    },
    'Fire Energy': {
        name: 'Fire Energy',
        type: 'energy',
        energyType: 'fire',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/187.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/187_hires.png',
    },
    'Darkness Energy': {
        name: 'Darkness Energy',
        type: 'energy',
        energyType: 'darkness',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/192.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/192_hires.png',
    },
    'Metal Energy': {
        name: 'Metal Energy',
        type: 'energy',
        energyType: 'metal',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/193.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/193_hires.png',
    },
    'Colorless Energy': {
        name: 'Colorless Energy',
        type: 'energy',
        energyType: 'colorless',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sv1/194.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/194_hires.png',
    },
};

// Merge all proxies
const ALL_PROXY_CARDS: Record<string, Partial<Card>> = {
    ...STANDARD_PROXY_CARDS,
    ...EXTRA_PROXY_CARDS,
};

/** Shared deck builder helper — fetches sets and creates an addCard function */
async function buildDeckHelper() {
    const [sv5, sv6, sv6pt5, sv7, sv8, sv8pt5, sv9, me1, me2, me2pt5, me3, cri] = await Promise.all([
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
        fetchSet('me3').catch(() => []),
        fetchSet('cri').catch(() => []),  // Chaos Rising (releases 2026-05-22)
    ]);

    const allCards = [
        ...cri, ...me3, ...me2pt5, ...me2, ...me1,
        ...sv9, ...sv8pt5, ...sv8,
        ...sv7, ...sv6pt5, ...sv6, ...sv5,
    ].filter(isStandardLegal);

    const deck: Card[] = [];
    let cardIndex = 0;

    const addCard = (name: string, count: number) => {
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) deck.push(convertApiCard(apiCard, cardIndex++));
            return;
        }
        if (ALL_PROXY_CARDS[name]) {
            const proxy = ALL_PROXY_CARDS[name];
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
                    weaknesses: proxy.weaknesses,
                    retreatCost: proxy.retreatCost,
                    evolvesFrom: proxy.evolvesFrom,
                    imageUrl: proxy.imageUrl,
                    imageUrlLarge: proxy.imageUrlLarge,
                    flavorText: proxy.flavorText,
                });
            }
            return;
        }
        console.warn(`[2026 Standard] Card not found: ${name}`);
        for (let i = 0; i < count; i++) {
            deck.push({ id: `placeholder-${cardIndex++}`, name, type: 'pokemon', hp: 100, subtypes: ['Basic'] });
        }
    };

    return { deck, addCard };
}

// ============================================
// RAGING BOLT EX DECK — 2026 Standard (H-On)
// Real competitive list: Noctowl consistency + Raging Thunder 280 damage
// 60 cards: 14 Pokémon / 34 Trainers / 12 Energy
// ============================================
export async function createRagingBoltExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (14)
    addCard('Raging Bolt ex', 3);          // sv5 — Bellowing Thunder: L+F → 70× per Energy discarded
    addCard('Teal Mask Ogerpon ex', 3);    // sv6pt5 — Teal Dance: attach Grass when played; Ivy Cudgel 80+
    addCard('Hoothoot', 3);               // sv7 — evolves into Noctowl
    addCard('Noctowl', 3);                // sv7 — Night Shift: look top 3, take 1 (key consistency engine)
    addCard('Fan Rotom', 2);              // sv8pt5 — Fan Spinning: look top 5, grab a Pokémon

    // Trainers — Supporters (10)
    addCard('Iono', 4);
    addCard("Boss's Orders", 3);
    addCard('Crispin', 1);                // sv7 — energy from discard
    addCard('Carmine', 1);                // sv6pt5 — draw up to 5
    addCard('Judge', 1);                  // sv5 — both players draw 4

    // Trainers — Items (22)
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 3);
    addCard('Buddy-Buddy Poffin', 3);     // grab Hoothoot + Fan Rotom (both ≤70HP)
    addCard('Switch', 3);
    addCard('Night Stretcher', 3);
    addCard('Energy Retrieval', 3);       // retrieve Lightning Energy
    addCard('Super Rod', 2);
    addCard('Counter Catcher', 1);

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Lightning Energy', 9);
    addCard('Fighting Energy', 2);        // for Bellowing Thunder's L+F requirement
    addCard('Grass Energy', 1);           // for Teal Mask Ogerpon ex (Teal Dance + Ivy Cudgel)

    console.log(`[2026 Standard] Raging Bolt ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA GRENINJA EX DECK — 2026 Standard (H-On)
// Water/Spread control — 60 cards
// 13 Pokémon / 35 Trainers / 12 Energy
// ============================================
export async function createMegaGreninjaExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (13)
    addCard('Froakie', 4);              // CRI — base of evolution line
    addCard('Frogadier', 1);            // CRI — stage 1 bridge
    addCard('Mega Greninja ex', 3);     // CRI 022 — main attacker
    addCard('Greninja', 1);             // CRI — secondary attacker
    addCard('Tatsugiri', 2);            // sv7 — draw 2 ability
    addCard('Dondozo', 1);              // sv7 — bulky pivot/wall
    addCard('Munkidori', 1);            // sv6 — poison chip

    // Trainers — Supporters (10)
    addCard("Professor's Research", 3);
    addCard('Iono', 3);
    addCard("Boss's Orders", 2);
    addCard('Briar', 1);
    addCard('Judge', 1);

    // Trainers — Items (23)
    addCard('Rare Candy', 4);           // skip Frogadier into Mega Greninja ex
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 4);
    addCard('Switch', 3);
    addCard('Super Rod', 2);
    addCard('Night Stretcher', 3);
    addCard('Buddy-Buddy Poffin', 3);

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Water Energy', 12);

    console.log(`[2026 Standard] Mega Greninja ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA ZYGARDE EX DECK — 2026 Standard (H-On)
// me3 (Perfect Order) — Fighting/spread control
// 60 cards: 17 Pokémon / 31 Trainers / 12 Energy
// ============================================
export async function createMegaZygardeExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (17)
    addCard('Zygarde', 4);               // me3 — Basic, evolves into Zygarde 50%
    addCard('Zygarde 50%', 3);           // me3 — Stage 1, Order Shield -20 damage
    addCard('Mega Zygarde ex', 2);       // me3 — Stage 2, Gaia Wave + Nullifying Zero spread
    addCard('Binacle', 4);               // me3 — Basic, evolves into Barbaracle
    addCard('Barbaracle', 3);            // me3 — Stone Arms: attach Fighting from discard each turn
    addCard('Lunatone', 1);              // me1 — Lunar Cycle: discard Fighting Energy to draw 3

    // Trainers — Supporters (11)
    addCard('Tarragon', 4);              // me3 — retrieve 4 Fighting Energy from discard
    addCard("Professor's Research", 3);
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);

    // Trainers — Items (18)
    addCard('Rare Candy', 4);            // sv5/sv8 — Zygarde→Mega Zygarde ex
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 4);
    addCard('Super Rod', 2);
    addCard('Night Stretcher', 2);
    addCard('Poké Pad', 2);              // me3 — search for Tool or Energy

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Fighting Energy', 12);

    console.log(`[2026 Standard] Mega Zygarde ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

export function shuffleDeck<T>(deck: T[]): T[] {
    return shuffle(deck);
}

export const standardDecks = {
    megaLucarioEx: createMegaLucarioExDeck,
    dragapultEx: createDragapultExDeck,
    ragingBoltEx: createRagingBoltExDeck,
    megaGreninjaEx: createMegaGreninjaExDeck,
    megaZygardeEx: createMegaZygardeExDeck,
};
