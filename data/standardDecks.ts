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

const MEGA_GRENINJA_EX_IMAGE = require('../assets/mega-greninja-ex.png');

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
        imageUrl: 'https://images.pokemontcg.io/me1/116.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/116_hires.png',
    },
    'Premium Power Pro': {
        name: 'Premium Power Pro',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'During this turn, attacks used by your Fighting Pokémon do 30 more damage to your opponent\'s Active Pokémon (before applying Weakness and Resistance).',
        imageUrl: 'https://images.pokemontcg.io/me1/124.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/124_hires.png',
    },
    "Lillie's Determination": {
        name: "Lillie's Determination",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Shuffle your hand into your deck. If you have 6 Prize cards remaining, draw 8 cards. Otherwise, draw 6 cards.',
        imageUrl: 'https://images.pokemontcg.io/me1/119.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/119_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv7/133.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/133_hires.png',
    },
    'Carmine': {
        name: 'Carmine',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Put your hand into your deck and shuffle it. Then draw cards until you have 5 cards in hand.',
        imageUrl: 'https://images.pokemontcg.io/sv6/145.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/145_hires.png',
    },
    'Briar': {
        name: 'Briar',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Draw 3 cards. If any of your Pokémon were Knocked Out during your opponent\'s last turn, draw 3 more cards.',
        imageUrl: 'https://images.pokemontcg.io/sv7/132.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/132_hires.png',
    },
    // --- sv8 items ---
    'Night Stretcher': {
        name: 'Night Stretcher',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Put a Pokémon from your discard pile into your hand. If that Pokémon has a Rule Box, put 2 basic Energy from your discard pile into your hand as well.',
        imageUrl: 'https://images.pokemontcg.io/sv6pt5/61.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6pt5/61_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv3/192.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv3/192_hires.png',
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
                    localImageSource: proxy.localImageSource,
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
    addCard('Iono', 2);                 // sv6/sv8
    addCard("Boss's Orders", 2);        // sv7/sv8
    // Items (22)
    addCard('Fighting Gong', 4);        // me1 — search Fighting Energy or Fighting Pokémon
    addCard('Ultra Ball', 4);           // sv5/sv8
    addCard('Nest Ball', 4);            // sv5/sv8 — Riolu/Makuhita 80HP don't qualify for Poffin
    addCard('Premium Power Pro', 3);    // me1 — Fighting attacks +30 this turn
    addCard('Super Rod', 1);            // sv5/sv8
    addCard('Special Red Card', 2);     // cri — opponent draws 3 when they have ≤3 prizes
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
    addCard('Iono', 3);                          // sv6/sv8 — hand disruption + draw
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
    addCard('Super Rod', 1);                     // sv5/sv8
    addCard('Special Red Card', 2);          // cri — opponent draws 3 when they have ≤3 prizes
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
        imageUrl: 'https://images.pokemontcg.io/me2/49.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me2/49_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv8pt5/56.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8pt5/56_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv6/25.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/25_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv7/39.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv7/39_hires.png',
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
            name: 'Sure-Hit Shuriken',
            type: 'Ability',
            text: 'Once during your turn, if this Pokémon is in the Active Spot, you may discard a Basic Water Energy card from your hand in order to use this Ability. Place 6 damage counters on 1 of your opponent\'s Pokémon.',
        }],
        attacks: [
            {
                name: 'Ninja Spinner',
                damage: 120,
                energyCost: ['water', 'water'],
                description: 'You may put a Water Energy attached to this Pokémon into your hand. If you do, this attack does 80 more damage.',
            },
        ],
        localImageSource: MEGA_GRENINJA_EX_IMAGE,  // bundled scan; swap for cri/22.png after 2026-05-22
        imageUrl: 'https://images.pokemontcg.io/cri/22.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/22_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/cri/21.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/21_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv6/131.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/131_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv4/55.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv4/55_hires.png',
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
            text: 'Once during your turn, you may attach a Basic Grass Energy card from your hand to this Pokémon. If you attached Energy to a Pokémon in this way, draw a card.',
        }],
        attacks: [
            { name: 'Ivy Cudgel', damage: 80, energyCost: ['grass', 'colorless'], description: 'If your opponent\'s Active Pokémon has a Rule Box, this attack does 80 more damage.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/25.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/25_hires.png',
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
            text: 'Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, if you have any Tera Pokémon ex in play, you may search your deck for up to 2 Trainer cards, reveal them, and put them into your hand. Then, shuffle your deck.',
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
            text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may choose 2 of your opponent\'s Benched Pokémon and put 1 damage counter on each of them.',
        }],
        attacks: [{ name: 'Cross Chop', damage: 60, energyCost: ['fighting', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/sv6/107.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/107_hires.png',
    },

    'Bloodmoon Ursaluna ex': {
        name: 'Bloodmoon Ursaluna ex',
        type: 'pokemon',
        hp: 260,
        energyType: 'colorless',
        subtypes: ['Basic', 'ex'],
        retreatCost: 3,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        abilities: [{
            name: 'Fallen Giant',
            type: 'Ability',
            text: 'This Pokémon is not affected by any effects of your opponent\'s Abilities.',
        }],
        attacks: [
            { name: 'Crescent Moon', damage: 190, energyCost: ['colorless', 'colorless', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/sv6/141.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/141_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/sv1/175.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/175_hires.png',
    },

    'Counter Catcher': {
        name: 'Counter Catcher',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this only if any of your Pokémon were Knocked Out during your opponent\'s last turn. Switch in 1 of your opponent\'s Benched Pokémon to the Active Spot.',
        imageUrl: 'https://images.pokemontcg.io/sv4/160.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv4/160_hires.png',
    },

    'Unfair Stamp': {
        name: 'Unfair Stamp',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this only if your opponent has 1, 2, or 3 Prize cards remaining. Your opponent shuffles their hand into their deck and draws 3 cards.',
        imageUrl: 'https://images.pokemontcg.io/sv6/165.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv6/165_hires.png',
    },

    "Brock's Scouting": {
        name: "Brock's Scouting",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Search your deck for up to 2 Evolution Pokémon that evolve from a Pokémon you have in play, reveal them, and put them into your hand. Then shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/me1/190.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/190_hires.png',
    },

    'Exp. Share': {
        name: 'Exp. Share',
        type: 'trainer',
        subtypes: ['Pokémon Tool'],
        flavorText: 'When the Pokémon this card is attached to is Knocked Out by damage from an attack, move 1 basic Energy card attached to that Pokémon to 1 of your Benched Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/sv1/174.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/174_hires.png',
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
        subtypes: ['Stage 1', 'MEGA', 'ex'],
        evolvesFrom: 'Barbaracle',
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
        imageUrl: 'https://images.pokemontcg.io/me3/47.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/47_hires.png',
    },

    'Binacle': {
        name: 'Binacle',
        type: 'pokemon',
        hp: 60,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 1,
        attacks: [{ name: 'Scratch', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me3/42.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/42_hires.png',
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
        imageUrl: 'https://images.pokemontcg.io/me3/43.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/43_hires.png',
    },

    'Tarragon': {
        name: 'Tarragon',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Retrieve up to 4 Basic Fighting Energy cards from your discard pile and put them into your hand.',
        imageUrl: 'https://images.pokemontcg.io/me3/85.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/85_hires.png',
    },

    'Poké Pad': {
        name: 'Poké Pad',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for a Pokémon Tool card or a basic Energy card, reveal it, and put it into your hand. Then shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/me3/81.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/81_hires.png',
    },

    // ─── Shared trainers (if not already in STANDARD_PROXY_CARDS) ────────────
    "Professor's Research": {
        name: "Professor's Research",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Discard your hand and draw 7 cards.',
        imageUrl: 'https://images.pokemontcg.io/sv1/190.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/190_hires.png',
    },
    'Nest Ball': {
        name: 'Nest Ball',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for a Basic Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/sv1/181.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/181_hires.png',
    },
    'Iono': {
        name: 'Iono',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Each player shuffles their hand and puts it on the bottom of their deck. Then, each player draws a card for each of their remaining Prize cards.',
        imageUrl: 'https://images.pokemontcg.io/sv2/185.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv2/185_hires.png',
    },
    'Ultra Ball': {
        name: 'Ultra Ball',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Discard 2 cards from your hand. Then, search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/sv1/196.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/196_hires.png',
    },
    "Boss's Orders": {
        name: "Boss's Orders",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: "Switch 1 of your opponent's Benched Pokémon with their Active Pokémon.",
        imageUrl: 'https://images.pokemontcg.io/sv2/172.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv2/172_hires.png',
    },
    'Energy Retrieval': {
        name: 'Energy Retrieval',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Put 2 basic Energy from your discard pile into your hand.',
        imageUrl: 'https://images.pokemontcg.io/sv1/171.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/171_hires.png',
    },

    'Judge': {
        name: 'Judge',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Each player shuffles their hand into their deck and draws 4 cards.',
        imageUrl: 'https://images.pokemontcg.io/sv1/176.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/176_hires.png',
    },

    'Rare Candy': {
        name: 'Rare Candy',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Choose 1 of your Basic Pokémon in play. If you have a Stage 2 card in your hand that evolves from that Pokémon, put that card onto the Basic Pokémon to evolve it. You can\'t use this card during your first turn or the turn you put that Pokémon into play.',
        imageUrl: 'https://images.pokemontcg.io/sv1/191.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv1/191_hires.png',
    },

    'Super Rod': {
        name: 'Super Rod',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Shuffle up to 3 Pokémon and/or basic Energy cards from your discard pile into your deck.',
        imageUrl: 'https://images.pokemontcg.io/sv2/188.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv2/188_hires.png',
    },

    'Switch': {
        name: 'Switch',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Switch your Active Pokémon with 1 of your Benched Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/me1/130.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/130_hires.png',
    },

    "Wally's Compassion": {
        name: "Wally's Compassion",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Heal all damage from 1 of your Mega Evolution Pokémon ex. If you healed any damage in this way, put all Energy attached to that Pokémon into your hand.',
        imageUrl: 'https://images.pokemontcg.io/me1/132.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me1/132_hires.png',
    },

    'Precious Trolley': {
        name: 'Precious Trolley',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for up to 2 Item cards, reveal them, and put them into your hand. Then, shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/sv8pt5/185.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sv8pt5/185_hires.png',
    },

    'Air Balloon': {
        name: 'Air Balloon',
        type: 'trainer',
        subtypes: ['Pokémon Tool'],
        flavorText: 'The Retreat Cost of the Pokémon this card is attached to is 2 less.',
        imageUrl: 'https://images.pokemontcg.io/me2/79.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me2/79_hires.png',
    },

    'Rocky Fighting Energy': {
        name: 'Rocky Fighting Energy',
        type: 'energy',
        energyType: 'fighting',
        subtypes: ['Special Energy'],
        flavorText: 'This card provides Fighting Energy. The Pokémon this card is attached to takes 20 less damage from attacks (after applying Weakness and Resistance).',
        imageUrl: 'https://images.pokemontcg.io/me3/87.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me3/87_hires.png',
    },

    // ─── Basic Energy cards ───────────────────────────────────────────────────
    // sve (SV Energies) is a dedicated energy set — verified from the API:
    // 1=Grass, 2=Fire, 3=Water, 4=Lightning, 5=Psychic, 6=Fighting, 7=Darkness, 8=Metal
    'Grass Energy': {
        name: 'Grass Energy',
        type: 'energy',
        energyType: 'grass',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/1.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/1.png',
    },
    'Fire Energy': {
        name: 'Fire Energy',
        type: 'energy',
        energyType: 'fire',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/2.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/2.png',
    },
    'Water Energy': {
        name: 'Water Energy',
        type: 'energy',
        energyType: 'water',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/3.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/3.png',
    },
    'Lightning Energy': {
        name: 'Lightning Energy',
        type: 'energy',
        energyType: 'lightning',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/4.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/4.png',
    },
    'Psychic Energy': {
        name: 'Psychic Energy',
        type: 'energy',
        energyType: 'psychic',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/5.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/5.png',
    },
    'Fighting Energy': {
        name: 'Fighting Energy',
        type: 'energy',
        energyType: 'fighting',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/6.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/6.png',
    },
    'Darkness Energy': {
        name: 'Darkness Energy',
        type: 'energy',
        energyType: 'darkness',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/7.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/7.png',
    },
    'Metal Energy': {
        name: 'Metal Energy',
        type: 'energy',
        energyType: 'metal',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/8.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/8.png',
    },
    'Colorless Energy': {
        name: 'Colorless Energy',
        type: 'energy',
        energyType: 'colorless',
        subtypes: ['Basic Energy'],
        imageUrl: 'https://images.pokemontcg.io/sve/9.png',
        imageUrlLarge: 'https://images.pokemontcg.io/sve/9.png',
    },
};

// ============================================
// CHAOS RISING (CRI) PROXY CARDS
// Set releases 2026-05-22. Proxy data based on revealed card scans and spoilers.
// All card numbers reference the CRI set (e.g. cri/003.png).
// ============================================
const CRI_PROXY_CARDS: Record<string, Partial<Card>> = {

    // ─── Grass ───────────────────────────────────────────────────────────────
    'Weedle': {
        name: 'Weedle',
        type: 'pokemon',
        hp: 50,
        energyType: 'grass',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'String Shot', damage: 10, energyCost: ['colorless'], description: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/1.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/1_hires.png',
    },
    'Kakuna': {
        name: 'Kakuna',
        type: 'pokemon',
        hp: 80,
        energyType: 'grass',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Weedle',
        retreatCost: 3,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Harden', damage: 0, energyCost: ['colorless'], description: 'During your opponent\'s next turn, any damage dealt to this Pokémon is reduced by 30 (after applying Weakness and Resistance).' }],
        imageUrl: 'https://images.pokemontcg.io/cri/2.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/2_hires.png',
    },
    'Beedrill ex': {
        name: 'Beedrill ex',
        type: 'pokemon',
        hp: 310,
        energyType: 'grass',
        subtypes: ['Stage 2', 'ex'],
        evolvesFrom: 'Kakuna',
        retreatCost: 0,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [
            { name: 'Twineedle', damage: 30, energyCost: ['grass'], description: 'Flip 2 coins. This attack does 30 damage for each heads.' },
            { name: 'Rumbling Bees', damage: 110, energyCost: ['grass', 'grass'], description: 'This attack does 110 damage for each of your Beedrill ex in play.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/3.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/3_hires.png',
    },

    // ─── Fire ─────────────────────────────────────────────────────────────────
    'Litleo': {
        name: 'Litleo',
        type: 'pokemon',
        hp: 60,
        energyType: 'fire',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'water', value: '×2' }],
        attacks: [{ name: 'Headbutt', damage: 20, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/16.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/16_hires.png',
    },
    'Mega Pyroar ex': {
        name: 'Mega Pyroar ex',
        type: 'pokemon',
        hp: 340,
        energyType: 'fire',
        subtypes: ['Stage 1', 'MEGA', 'ex'],
        evolvesFrom: 'Litleo',
        retreatCost: 2,
        weaknesses: [{ type: 'water', value: '×2' }],
        abilities: [{
            name: 'Ferocious Bellow',
            type: 'Ability',
            text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may put 2 damage counters on each of your opponent\'s Pokémon.',
        }],
        attacks: [
            { name: 'Fiery Big Bang', damage: 290, energyCost: ['fire', 'fire', 'fire'], description: 'Discard 3 Fire Energy from this Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/15.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/15_hires.png',
    },

    // ─── Psychic / Fairy ──────────────────────────────────────────────────────
    'Flabébé': {
        name: 'Flabébé',
        type: 'pokemon',
        hp: 40,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'metal', value: '×2' }],
        attacks: [{ name: 'Tackle', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/36.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/36_hires.png',
    },
    'Floette': {
        name: 'Floette',
        type: 'pokemon',
        hp: 70,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Flabébé',
        retreatCost: 1,
        weaknesses: [{ type: 'metal', value: '×2' }],
        attacks: [{ name: 'Petal Dance', damage: 30, energyCost: ['psychic'], description: 'Flip 3 coins. This attack does 30 damage for each heads. This Pokémon is now Confused.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/37.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/37_hires.png',
    },
    'Mega Floette ex': {
        name: 'Mega Floette ex',
        type: 'pokemon',
        hp: 250,
        energyType: 'psychic',
        subtypes: ['Stage 2', 'MEGA', 'ex'],
        evolvesFrom: 'Floette',
        retreatCost: 1,
        weaknesses: [{ type: 'metal', value: '×2' }],
        attacks: [
            { name: 'Gentle Light', damage: 0, energyCost: ['psychic'], description: 'Heal 30 damage from each of your Pokémon.' },
            { name: 'Eternity Bloom', damage: 200, energyCost: ['psychic', 'psychic', 'colorless'], description: '' },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/35.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/35_hires.png',
    },
    'Pumpkaboo': {
        name: 'Pumpkaboo',
        type: 'pokemon',
        hp: 70,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [{ name: 'Eerie Sound', damage: 10, energyCost: ['psychic'], description: 'Your opponent\'s Active Pokémon is now Confused.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/42.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/42_hires.png',
    },
    'Gourgeist ex': {
        name: 'Gourgeist ex',
        type: 'pokemon',
        hp: 220,
        energyType: 'psychic',
        subtypes: ['Stage 1', 'ex'],
        evolvesFrom: 'Pumpkaboo',
        retreatCost: 2,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [
            { name: 'Ghost Touch', damage: 30, energyCost: ['psychic'], description: 'Put 2 damage counters on 1 of your opponent\'s Benched Pokémon.' },
            { name: 'Horror Rondo', damage: 60, energyCost: ['psychic', 'psychic'], description: 'This attack does 60 damage for each of your opponent\'s Pokémon in play.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/41.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/41_hires.png',
    },
    'Espurr': {
        name: 'Espurr',
        type: 'pokemon',
        hp: 60,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [{ name: 'Scratch', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/43.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/43_hires.png',
    },
    'Meowstic': {
        name: 'Meowstic',
        type: 'pokemon',
        hp: 90,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Espurr',
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        abilities: [{
            name: 'Psychic Barrier',
            type: 'Ability',
            text: 'Your Pokémon with Rule Boxes take 20 less damage from your opponent\'s attacks (after applying Weakness and Resistance).',
        }],
        attacks: [{ name: 'Psybeam', damage: 60, energyCost: ['psychic', 'colorless'], description: 'Your opponent\'s Active Pokémon is now Confused.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/44.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/44_hires.png',
    },

    // ─── Fighting ─────────────────────────────────────────────────────────────
    'Ralts': {
        name: 'Ralts',
        type: 'pokemon',
        hp: 60,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'metal', value: '×2' }],
        attacks: [{ name: 'Confuse Ray', damage: 10, energyCost: ['psychic'], description: 'Your opponent\'s Active Pokémon is now Confused.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/49.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/49_hires.png',
    },
    'Kirlia': {
        name: 'Kirlia',
        type: 'pokemon',
        hp: 80,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Ralts',
        retreatCost: 1,
        weaknesses: [{ type: 'metal', value: '×2' }],
        attacks: [{ name: 'Magical Leaf', damage: 50, energyCost: ['psychic', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/50.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/50_hires.png',
    },
    'Mega Gallade ex': {
        name: 'Mega Gallade ex',
        type: 'pokemon',
        hp: 350,
        energyType: 'fighting',
        subtypes: ['Stage 2', 'MEGA', 'ex'],
        evolvesFrom: 'Kirlia',
        retreatCost: 1,
        weaknesses: [{ type: 'psychic', value: '×2' }],
        attacks: [
            {
                name: 'Gale Cut',
                damage: 50,
                energyCost: ['fighting', 'colorless'],
                description: 'If your opponent\'s Active Pokémon has any damage counters on it, this attack does 200 damage instead.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/48.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/48_hires.png',
    },

    // ─── Darkness ─────────────────────────────────────────────────────────────
    'Sandile': {
        name: 'Sandile',
        type: 'pokemon',
        hp: 60,
        energyType: 'darkness',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'grass', value: '×2' }],
        attacks: [{ name: 'Bite', damage: 20, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/55.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/55_hires.png',
    },
    'Krokorok': {
        name: 'Krokorok',
        type: 'pokemon',
        hp: 90,
        energyType: 'darkness',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Sandile',
        retreatCost: 1,
        weaknesses: [{ type: 'grass', value: '×2' }],
        attacks: [{ name: 'Sand Tomb', damage: 30, energyCost: ['darkness'], description: 'Your opponent\'s Active Pokémon is now Trapped (it can\'t retreat).' }],
        imageUrl: 'https://images.pokemontcg.io/cri/56.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/56_hires.png',
    },
    'Krookodile ex': {
        name: 'Krookodile ex',
        type: 'pokemon',
        hp: 320,
        energyType: 'darkness',
        subtypes: ['Stage 2', 'ex'],
        evolvesFrom: 'Krokorok',
        retreatCost: 2,
        weaknesses: [{ type: 'grass', value: '×2' }],
        abilities: [{
            name: 'Intimidation',
            type: 'Ability',
            text: 'As long as this Pokémon is in the Active Spot, your opponent\'s Pokémon\'s attacks do 30 less damage to your Pokémon (before applying Weakness and Resistance).',
        }],
        attacks: [
            { name: 'Crunch', damage: 120, energyCost: ['darkness', 'colorless'], description: 'Discard an Energy from your opponent\'s Active Pokémon.' },
            { name: 'Earthquake Jaw', damage: 260, energyCost: ['darkness', 'darkness', 'colorless'], description: 'This attack also does 30 damage to each of your Benched Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/54.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/54_hires.png',
    },

    // ─── Metal ────────────────────────────────────────────────────────────────
    'Beldum': {
        name: 'Beldum',
        type: 'pokemon',
        hp: 60,
        energyType: 'metal',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Take Down', damage: 30, energyCost: ['colorless'], description: 'This Pokémon does 10 damage to itself.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/65.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/65_hires.png',
    },
    'Metang': {
        name: 'Metang',
        type: 'pokemon',
        hp: 90,
        energyType: 'metal',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Beldum',
        retreatCost: 2,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Magnet Bomb', damage: 60, energyCost: ['metal', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/66.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/66_hires.png',
    },
    'Metagross': {
        name: 'Metagross',
        type: 'pokemon',
        hp: 150,
        energyType: 'metal',
        subtypes: ['Stage 2'],
        evolvesFrom: 'Metang',
        retreatCost: 3,
        weaknesses: [{ type: 'fire', value: '×2' }],
        abilities: [{
            name: 'Metal Collection',
            type: 'Ability',
            text: 'Once during your turn, you may attach a Basic Metal Energy card from your discard pile to 1 of your Pokémon.',
        }],
        attacks: [{ name: 'Giga Impact', damage: 200, energyCost: ['metal', 'metal', 'colorless'], description: 'This Pokémon can\'t attack during your next turn.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/67.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/67_hires.png',
    },
    'Cobalion ex': {
        name: 'Cobalion ex',
        type: 'pokemon',
        hp: 230,
        energyType: 'metal',
        subtypes: ['Basic', 'ex'],
        retreatCost: 2,
        weaknesses: [{ type: 'fire', value: '×2' }],
        abilities: [{
            name: 'Metal Road',
            type: 'Ability',
            text: 'Once during your turn, you may search your deck for a Basic Metal Energy card and attach it to 1 of your Metal Pokémon. Then, shuffle your deck.',
        }],
        attacks: [
            { name: 'Sacred Sword', damage: 200, energyCost: ['metal', 'metal', 'colorless'], description: '' },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/63.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/63_hires.png',
    },

    // ─── Dragon ───────────────────────────────────────────────────────────────
    'Skrelp': {
        name: 'Skrelp',
        type: 'pokemon',
        hp: 60,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Acid', damage: 10, energyCost: ['psychic'], description: 'The Defending Pokémon\'s Resistance is now 0.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/69.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/69_hires.png',
    },
    'Mega Dragalge ex': {
        name: 'Mega Dragalge ex',
        type: 'pokemon',
        hp: 290,
        energyType: 'psychic',
        subtypes: ['Stage 1', 'MEGA', 'ex'],
        evolvesFrom: 'Skrelp',
        retreatCost: 2,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        abilities: [{
            name: 'Pernicious Poison',
            type: 'Ability',
            text: 'Your opponent\'s Poisoned Pokémon now get 16 damage counters instead of 1 between turns.',
        }],
        attacks: [
            {
                name: 'Acid Splash',
                damage: 150,
                energyCost: ['psychic', 'psychic', 'colorless'],
                description: 'Your opponent\'s Active Pokémon is now Poisoned.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/64.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/64_hires.png',
    },
    'Goomy': {
        name: 'Goomy',
        type: 'pokemon',
        hp: 60,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Ram', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/70.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/70_hires.png',
    },
    'Sliggoo': {
        name: 'Sliggoo',
        type: 'pokemon',
        hp: 90,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Goomy',
        retreatCost: 2,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Acid Spray', damage: 40, energyCost: ['psychic', 'colorless'], description: 'Discard an Energy from your opponent\'s Active Pokémon.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/71.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/71_hires.png',
    },
    'Goodra': {
        name: 'Goodra',
        type: 'pokemon',
        hp: 150,
        energyType: 'psychic',
        subtypes: ['Stage 2'],
        evolvesFrom: 'Sliggoo',
        retreatCost: 3,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        abilities: [{
            name: 'Slippery Goo',
            type: 'Ability',
            text: 'Attacks used against this Pokémon do 30 less damage (before applying Weakness and Resistance).',
        }],
        attacks: [{ name: 'Dragon Pulse', damage: 130, energyCost: ['psychic', 'psychic', 'colorless'], description: 'Discard the top 3 cards of your deck.' }],
        imageUrl: 'https://images.pokemontcg.io/cri/72.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/72_hires.png',
    },

    // ─── Colorless ────────────────────────────────────────────────────────────
    'Minccino': {
        name: 'Minccino',
        type: 'pokemon',
        hp: 60,
        energyType: 'colorless',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [{ name: 'Slap', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/cri/74.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/74_hires.png',
    },
    'Cinccino ex': {
        name: 'Cinccino ex',
        type: 'pokemon',
        hp: 200,
        energyType: 'colorless',
        subtypes: ['Stage 1', 'ex'],
        evolvesFrom: 'Minccino',
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        abilities: [{
            name: 'Fluffy',
            type: 'Ability',
            text: 'This Pokémon takes 20 less damage from attacks (after applying Weakness and Resistance).',
        }],
        attacks: [
            {
                name: 'Do the Wave',
                damage: 30,
                energyCost: ['colorless', 'colorless'],
                description: 'This attack does 30 damage for each of your Benched Pokémon.',
            },
        ],
        imageUrl: 'https://images.pokemontcg.io/cri/73.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/73_hires.png',
    },

    // ─── CRI Trainers ─────────────────────────────────────────────────────────
    "AZ's Tranquility": {
        name: "AZ's Tranquility",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Return all Pokémon you have in play to your hand. Return all Pokémon your opponent has in play to their hand.',
        imageUrl: 'https://images.pokemontcg.io/cri/80.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/80_hires.png',
    },
    'Emma': {
        name: 'Emma',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Draw a card for each Pokémon your opponent has in their hand.',
        imageUrl: 'https://images.pokemontcg.io/cri/81.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/81_hires.png',
    },
    'Philippe': {
        name: 'Philippe',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Attach up to 2 Basic Metal Energy cards from your discard pile to 1 of your Metal Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/cri/82.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/82_hires.png',
    },
    "Roxie's Performance": {
        name: "Roxie's Performance",
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Your opponent\'s Poisoned Pokémon can\'t retreat during their next turn.',
        imageUrl: 'https://images.pokemontcg.io/cri/83.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/83_hires.png',
    },
    'Special Red Card': {
        name: 'Special Red Card',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this card only if your opponent has 3 or fewer Prize cards remaining. Your opponent shuffles their hand under their deck and draws 3 cards.',
        imageUrl: 'https://images.pokemontcg.io/cri/87.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/87_hires.png',
    },
    'Great Haul Net': {
        name: 'Great Haul Net',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Search your deck for up to 3 Water Pokémon and/or Basic Water Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.',
        imageUrl: 'https://images.pokemontcg.io/cri/88.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/88_hires.png',
    },
    'Transformation Tome': {
        name: 'Transformation Tome',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'If your Active Pokémon is a damaged Basic Pokémon ex, switch it with a Basic Pokémon ex with the same name from your discard pile, keeping all attached cards.',
        imageUrl: 'https://images.pokemontcg.io/cri/89.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/89_hires.png',
    },
    'Tool Scrapper': {
        name: 'Tool Scrapper',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Discard up to 2 Pokémon Tool cards from any Pokémon in play.',
        imageUrl: 'https://images.pokemontcg.io/cri/90.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/90_hires.png',
    },
    'Jumbo Ice Cream': {
        name: 'Jumbo Ice Cream',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Heal 30 damage from each of your Benched Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/cri/91.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/91_hires.png',
    },
    'Adversity Policy': {
        name: 'Adversity Policy',
        type: 'trainer',
        subtypes: ['Pokémon Tool'],
        flavorText: 'When the Pokémon this card is attached to is damaged by an attack from a Pokémon of a type this Pokémon is weak to, draw 3 cards.',
        imageUrl: 'https://images.pokemontcg.io/cri/92.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/92_hires.png',
    },
    'Prism Tower': {
        name: 'Prism Tower',
        type: 'trainer',
        subtypes: ['Stadium'],
        flavorText: 'Once during each player\'s turn, that player may discard 2 cards from their hand to draw 1 card.',
        imageUrl: 'https://images.pokemontcg.io/cri/95.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/95_hires.png',
    },
    'Ange Floette': {
        name: 'Ange Floette',
        type: 'trainer',
        subtypes: ['Stadium'],
        flavorText: 'Your Mega Floette ex has 150 more HP.',
        imageUrl: 'https://images.pokemontcg.io/cri/96.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/96_hires.png',
    },
    'Surfing Beach': {
        name: 'Surfing Beach',
        type: 'trainer',
        subtypes: ['Stadium'],
        flavorText: 'Once during each player\'s turn, that player may switch their Active Pokémon with 1 of their Benched Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/cri/97.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/97_hires.png',
    },

    // ─── CRI Special Energy ───────────────────────────────────────────────────
    'Bubbly W Energy': {
        name: 'Bubbly W Energy',
        type: 'energy',
        energyType: 'water',
        subtypes: ['Special Energy'],
        flavorText: 'Provides [W] Energy. The Pokémon this card is attached to can\'t be affected by any Special Conditions.',
        imageUrl: 'https://images.pokemontcg.io/cri/100.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/100_hires.png',
    },
    'Magnetic M Energy': {
        name: 'Magnetic M Energy',
        type: 'energy',
        energyType: 'metal',
        subtypes: ['Special Energy'],
        flavorText: 'Provides [M] Energy. The retreat cost of the Pokémon this card is attached to is 0.',
        imageUrl: 'https://images.pokemontcg.io/cri/101.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/101_hires.png',
    },
    'Nitro R Energy': {
        name: 'Nitro R Energy',
        type: 'energy',
        energyType: 'fire',
        subtypes: ['Special Energy'],
        flavorText: 'Provides [R] Energy. If this card would be discarded by an attack effect, put it into your hand instead.',
        imageUrl: 'https://images.pokemontcg.io/cri/102.png',
        imageUrlLarge: 'https://images.pokemontcg.io/cri/102_hires.png',
    },
};

// Merge all proxies
// ============================================
// PITCH BLACK (ME5) PROXY CARDS
// English release: 2026-07-17 | Japanese "Abyss Eye" (M5): 2026-05-22
// Set code: me5 / pb
// Darkness strategy + Ghost sub-theme + Fossil sub-theme
// ============================================
const PB_PROXY_CARDS: Record<string, Partial<Card>> = {

    // ─── Grass ────────────────────────────────────────────────────────────────
    'Tropius': {
        name: 'Tropius',
        type: 'pokemon',
        hp: 100,
        energyType: 'grass',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [
            { name: 'Razor Leaf', damage: 30, energyCost: ['grass'] },
            { name: 'Fly', damage: 80, energyCost: ['grass', 'colorless', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/1.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/1_hires.png',
    },
    'Grubbin': {
        name: 'Grubbin',
        type: 'pokemon',
        hp: 60,
        energyType: 'grass',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Bite', damage: 20, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/2.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/2_hires.png',
    },
    'Fomantis': {
        name: 'Fomantis',
        type: 'pokemon',
        hp: 60,
        energyType: 'grass',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Synthesis', damage: 0, energyCost: ['grass'], description: 'Attach a Basic Grass Energy card from your discard pile to this Pokémon.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/3.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/3_hires.png',
    },
    'Lurantis ex': {
        name: 'Lurantis ex',
        type: 'pokemon',
        hp: 260,
        energyType: 'grass',
        subtypes: ['Stage 1', 'ex'],
        evolvesFrom: 'Fomantis',
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [
            { name: 'Lively Cutter', damage: 60, energyCost: ['grass'], description: 'If you healed any damage from any of your Pokémon this turn, this attack does 200 more damage.' },
            { name: 'Leaf Guard', damage: 140, energyCost: ['grass', 'colorless'], description: 'During your opponent\'s next turn, this Pokémon takes 30 less damage from attacks.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/4.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/4_hires.png',
    },
    'Poltchageist': {
        name: 'Poltchageist',
        type: 'pokemon',
        hp: 30,
        energyType: 'grass',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        abilities: [{
            name: 'Ghost Veil',
            type: 'Ability',
            text: 'This Pokémon is not affected by any effects from your opponent\'s Pokémon\'s attacks.',
        }],
        attacks: [{ name: 'Matcha Spray', damage: 10, energyCost: ['grass'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/5.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/5_hires.png',
    },
    'Sinistcha': {
        name: 'Sinistcha',
        type: 'pokemon',
        hp: 60,
        energyType: 'grass',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Poltchageist',
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        abilities: [{
            name: 'Ghost Veil',
            type: 'Ability',
            text: 'This Pokémon is not affected by any effects from your opponent\'s Pokémon\'s attacks.',
        }],
        attacks: [{
            name: 'Matcha Spin',
            damage: 0,
            energyCost: ['grass'],
            description: 'If you have 6 Pokémon with Ghost Veil in your discard pile, put 4 damage counters on each of your opponent\'s Pokémon.',
        }],
        imageUrl: 'https://images.pokemontcg.io/me5/6.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/6_hires.png',
    },

    // ─── Fire ─────────────────────────────────────────────────────────────────
    'Heatran': {
        name: 'Heatran',
        type: 'pokemon',
        hp: 130,
        energyType: 'fire',
        subtypes: ['Basic'],
        retreatCost: 3,
        weaknesses: [{ type: 'water', value: '×2' }],
        attacks: [
            { name: 'Heat Blast', damage: 30, energyCost: ['fire'] },
            { name: 'Lava Plume', damage: 100, energyCost: ['fire', 'fire', 'colorless'], description: 'This attack also does 30 damage to each of your Benched Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/7.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/7_hires.png',
    },
    'Sizzlipede': {
        name: 'Sizzlipede',
        type: 'pokemon',
        hp: 60,
        energyType: 'fire',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'water', value: '×2' }],
        attacks: [{ name: 'Ember', damage: 20, energyCost: ['fire'], description: 'Discard an Energy from this Pokémon.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/8.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/8_hires.png',
    },
    'Centiskorch': {
        name: 'Centiskorch',
        type: 'pokemon',
        hp: 120,
        energyType: 'fire',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Sizzlipede',
        retreatCost: 2,
        weaknesses: [{ type: 'water', value: '×2' }],
        attacks: [
            { name: 'Scorching Sands', damage: 60, energyCost: ['fire', 'colorless'] },
            { name: 'Burning Coil', damage: 140, energyCost: ['fire', 'fire', 'colorless'], description: 'Your opponent\'s Active Pokémon is now Burned.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/9.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/9_hires.png',
    },
    'Charcadet': {
        name: 'Charcadet',
        type: 'pokemon',
        hp: 50,
        energyType: 'fire',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'water', value: '×2' }],
        attacks: [{ name: 'Ember', damage: 10, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/10.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/10_hires.png',
    },
    'Armarouge': {
        name: 'Armarouge',
        type: 'pokemon',
        hp: 130,
        energyType: 'fire',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Charcadet',
        retreatCost: 2,
        weaknesses: [{ type: 'water', value: '×2' }],
        abilities: [{
            name: 'Armor Canon',
            type: 'Ability',
            text: 'Once during your turn, you may discard a Fire Energy from this Pokémon. If you do, prevent all damage done to this Pokémon by attacks during your opponent\'s next turn.',
        }],
        attacks: [{ name: 'Psyshock', damage: 90, energyCost: ['fire', 'psychic', 'colorless'], description: 'Your opponent\'s Active Pokémon is now Paralyzed.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/11.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/11_hires.png',
    },

    // ─── Water ────────────────────────────────────────────────────────────────
    'Goldeen': {
        name: 'Goldeen',
        type: 'pokemon',
        hp: 60,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Horn Attack', damage: 20, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/12.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/12_hires.png',
    },
    'Seaking': {
        name: 'Seaking',
        type: 'pokemon',
        hp: 100,
        energyType: 'water',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Goldeen',
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            { name: 'Waterfall', damage: 60, energyCost: ['water', 'colorless'] },
            { name: 'Megahorn', damage: 120, energyCost: ['water', 'water', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/13.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/13_hires.png',
    },
    'Wailmer': {
        name: 'Wailmer',
        type: 'pokemon',
        hp: 100,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 3,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Splash', damage: 0, energyCost: ['water'], description: 'Does nothing.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/14.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/14_hires.png',
    },
    'Wailord ex': {
        name: 'Wailord ex',
        type: 'pokemon',
        hp: 380,
        energyType: 'water',
        subtypes: ['Basic', 'ex'],
        retreatCost: 4,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            { name: 'Giant Wave', damage: 100, energyCost: ['water', 'colorless', 'colorless'], description: 'This attack also does 30 damage to each of your opponent\'s Benched Pokémon.' },
            { name: 'Tsunami', damage: 200, energyCost: ['water', 'water', 'water', 'colorless'], description: 'This attack also does 30 damage to each of your Benched Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/15.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/15_hires.png',
    },
    'Relicanth': {
        name: 'Relicanth',
        type: 'pokemon',
        hp: 90,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        abilities: [{
            name: 'Living Fossil',
            type: 'Ability',
            text: 'Prevent all damage done to this Pokémon by attacks from Pokémon ex and Pokémon with a Rule Box.',
        }],
        attacks: [{ name: 'Ancient Power', damage: 70, energyCost: ['water', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/16.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/16_hires.png',
    },
    'Finizen': {
        name: 'Finizen',
        type: 'pokemon',
        hp: 70,
        energyType: 'water',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [{ name: 'Aqua Jet', damage: 20, energyCost: ['water'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/19.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/19_hires.png',
    },
    'Palafin': {
        name: 'Palafin',
        type: 'pokemon',
        hp: 120,
        energyType: 'water',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Finizen',
        retreatCost: 1,
        weaknesses: [{ type: 'lightning', value: '×2' }],
        attacks: [
            { name: 'Helping Hand', damage: 0, energyCost: ['colorless'], description: 'Heal 30 damage from each of your Pokémon.' },
            { name: 'Jet Punch', damage: 80, energyCost: ['water', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/20.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/20_hires.png',
    },

    // ─── Lightning ────────────────────────────────────────────────────────────
    'Zeraora': {
        name: 'Zeraora',
        type: 'pokemon',
        hp: 110,
        energyType: 'lightning',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [
            { name: 'Plasma Fists', damage: 80, energyCost: ['lightning', 'colorless'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/22.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/22_hires.png',
    },
    'Tapu Koko ex': {
        name: 'Tapu Koko ex',
        type: 'pokemon',
        hp: 210,
        energyType: 'lightning',
        subtypes: ['Basic', 'ex'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        abilities: [{
            name: 'Electric Terrain',
            type: 'Ability',
            text: 'Once during your turn, you may attach a Basic Lightning Energy card from your hand to 1 of your Lightning Pokémon.',
        }],
        attacks: [
            { name: 'Tapu Thunder', damage: 150, energyCost: ['lightning', 'lightning', 'colorless'], description: 'This attack also does 30 damage to each of your Benched Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/25.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/25_hires.png',
    },
    'Mega Zeraora ex': {
        name: 'Mega Zeraora ex',
        type: 'pokemon',
        hp: 270,
        energyType: 'lightning',
        subtypes: ['Basic', 'MEGA', 'ex'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [
            { name: 'Thunder Fist', damage: 60, energyCost: ['lightning'], description: 'This attack does 60 damage for each Energy attached to this Pokémon.' },
            { name: 'Zepto Turn', damage: 150, energyCost: ['lightning', 'lightning', 'lightning'], description: 'Switch this Pokémon with 1 of your Benched Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/26.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/26_hires.png',
    },

    // ─── Psychic ──────────────────────────────────────────────────────────────
    'Slowpoke': {
        name: 'Slowpoke',
        type: 'pokemon',
        hp: 60,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [{ name: 'Amnesia', damage: 0, energyCost: ['colorless'], description: 'Choose 1 of your opponent\'s Active Pokémon\'s attacks. That Pokémon can\'t use that attack during your opponent\'s next turn.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/27.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/27_hires.png',
    },
    'Slowbro': {
        name: 'Slowbro',
        type: 'pokemon',
        hp: 120,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Slowpoke',
        retreatCost: 2,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        abilities: [{
            name: 'Dopey',
            type: 'Ability',
            text: 'Once during your turn, you may heal 30 damage from this Pokémon.',
        }],
        attacks: [{ name: 'Psychic', damage: 80, energyCost: ['psychic', 'colorless'], description: 'This attack does 20 more damage for each Energy attached to your opponent\'s Active Pokémon.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/28.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/28_hires.png',
    },
    'Jynx': {
        name: 'Jynx',
        type: 'pokemon',
        hp: 70,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [
            { name: 'Lovely Kiss', damage: 0, energyCost: ['psychic'], description: 'Your opponent\'s Active Pokémon is now Asleep.' },
            { name: 'Blizzard', damage: 60, energyCost: ['psychic', 'colorless', 'colorless'], description: 'This attack also does 10 damage to each Benched Pokémon (both yours and your opponent\'s).' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/29.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/29_hires.png',
    },
    'Shuppet': {
        name: 'Shuppet',
        type: 'pokemon',
        hp: 50,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        abilities: [{
            name: 'Ghost Veil',
            type: 'Ability',
            text: 'This Pokémon is not affected by any effects from your opponent\'s Pokémon\'s attacks.',
        }],
        attacks: [{ name: 'Night Shade', damage: 10, energyCost: ['psychic'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/30.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/30_hires.png',
    },
    'Banette': {
        name: 'Banette',
        type: 'pokemon',
        hp: 80,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Shuppet',
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        abilities: [
            {
                name: 'Ghost Veil',
                type: 'Ability',
                text: 'This Pokémon is not affected by any effects from your opponent\'s Pokémon\'s attacks.',
            },
            {
                name: 'Doll Catch',
                type: 'Ability',
                text: 'Once during your turn, you may search your deck for any 1 card, reveal it, and put it into your hand. Then, shuffle your deck.',
            },
        ],
        attacks: [{ name: 'Shadow Ball', damage: 80, energyCost: ['psychic', 'psychic'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/31.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/31_hires.png',
    },
    'Spiritomb': {
        name: 'Spiritomb',
        type: 'pokemon',
        hp: 70,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        abilities: [{
            name: 'Spooky Binding',
            type: 'Ability',
            text: 'As long as this Pokémon is in the Active Spot, your opponent\'s Pokémon can\'t retreat.',
        }],
        attacks: [{ name: 'Ominous Wind', damage: 40, energyCost: ['psychic', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/32.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/32_hires.png',
    },
    'Marshadow': {
        name: 'Marshadow',
        type: 'pokemon',
        hp: 70,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [
            { name: 'Copycat Strike', damage: 0, energyCost: ['psychic'], description: 'Use the same attack as your opponent\'s Active Pokémon. (You still need the required Energy to use that attack.)' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/33.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/33_hires.png',
    },
    'Sinistea': {
        name: 'Sinistea',
        type: 'pokemon',
        hp: 40,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [{ name: 'Astonish', damage: 10, energyCost: ['psychic'], description: 'Your opponent\'s Active Pokémon is now Confused.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/34.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/34_hires.png',
    },
    'Polteageist': {
        name: 'Polteageist',
        type: 'pokemon',
        hp: 70,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Sinistea',
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [
            { name: 'Strange Steam', damage: 60, energyCost: ['psychic', 'colorless'], description: 'Your opponent\'s Active Pokémon is now Confused.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/35.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/35_hires.png',
    },
    'Litwick': {
        name: 'Litwick',
        type: 'pokemon',
        hp: 40,
        energyType: 'psychic',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [{ name: 'Astonish', damage: 10, energyCost: ['psychic'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/37.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/37_hires.png',
    },
    'Lampent': {
        name: 'Lampent',
        type: 'pokemon',
        hp: 80,
        energyType: 'psychic',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Litwick',
        retreatCost: 2,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        attacks: [{ name: 'Hex', damage: 50, energyCost: ['psychic', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/38.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/38_hires.png',
    },
    'Mega Chandelure ex': {
        name: 'Mega Chandelure ex',
        type: 'pokemon',
        hp: 350,
        energyType: 'psychic',
        subtypes: ['Stage 2', 'MEGA', 'ex'],
        evolvesFrom: 'Lampent',
        retreatCost: 2,
        weaknesses: [{ type: 'darkness', value: '×2' }],
        resistances: [{ type: 'fighting', value: '-30' }],
        abilities: [{
            name: 'Cursed Flame',
            type: 'Ability',
            text: 'As long as this Pokémon is in the Active Spot, your opponent\'s Pokémon\'s Retreat Costs are increased by [C].',
        }],
        attacks: [{
            name: 'Phantom Maze',
            damage: 130,
            energyCost: ['psychic', 'psychic'],
            description: 'This attack does 50 more damage for each [C] in your opponent\'s Active Pokémon\'s Retreat Cost.',
        }],
        imageUrl: 'https://images.pokemontcg.io/me5/36.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/36_hires.png',
    },

    // ─── Darkness ─────────────────────────────────────────────────────────────
    'Inkay': {
        name: 'Inkay',
        type: 'pokemon',
        hp: 60,
        energyType: 'darkness',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [{ name: 'Procurement', damage: 0, energyCost: ['darkness'], description: 'Search your deck for 1 Item card, reveal it, and put it into your hand. Then, shuffle your deck.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/40.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/40_hires.png',
    },
    'Malamar': {
        name: 'Malamar',
        type: 'pokemon',
        hp: 120,
        energyType: 'darkness',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Inkay',
        retreatCost: 2,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [
            { name: 'Perplex', damage: 0, energyCost: ['darkness'], description: 'Your opponent\'s Active Pokémon is now Confused.' },
            { name: 'Brain Crush', damage: 130, energyCost: ['darkness', 'darkness'], description: 'This attack can only be used if your opponent\'s Active Pokémon is Confused.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/41.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/41_hires.png',
    },
    'Zarude': {
        name: 'Zarude',
        type: 'pokemon',
        hp: 130,
        energyType: 'darkness',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [
            { name: 'Overhead Throw', damage: 30, energyCost: ['darkness'], description: 'This attack also does 30 damage to 1 of your Benched Pokémon.' },
            { name: 'Shadow Whip', damage: 170, energyCost: ['darkness', 'darkness', 'darkness'] },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/42.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/42_hires.png',
    },
    'Chi-Yu': {
        name: 'Chi-Yu',
        type: 'pokemon',
        hp: 80,
        energyType: 'darkness',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [
            { name: 'Whirling Envy', damage: 30, energyCost: ['darkness'], description: 'This attack does 30 more damage for each damage counter on this Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/43.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/43_hires.png',
    },
    'Mega Darkrai ex': {
        name: 'Mega Darkrai ex',
        type: 'pokemon',
        hp: 280,
        energyType: 'darkness',
        subtypes: ['Basic', 'MEGA', 'ex'],
        retreatCost: 2,
        weaknesses: [{ type: 'grass', value: '×2' }],
        attacks: [
            { name: 'Night Raid', damage: 110, energyCost: ['darkness', 'darkness'], description: 'If any of your Benched Pokémon have any damage counters on them, this attack does 110 more damage.' },
            { name: 'Abyss Eye', damage: 0, energyCost: ['darkness', 'darkness', 'darkness'], description: 'If your opponent\'s Active Pokémon is affected by any Special Condition, it is Knocked Out.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/46.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/46_hires.png',
    },
    'Morpeko ex': {
        name: 'Morpeko ex',
        type: 'pokemon',
        hp: 190,
        energyType: 'darkness',
        subtypes: ['Basic', 'ex'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        attacks: [
            { name: 'Gnaw', damage: 30, energyCost: ['darkness'] },
            { name: 'Hunger Switch', damage: 80, energyCost: ['darkness', 'colorless'], description: 'Switch this Pokémon with 1 of your Benched Pokémon.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/54.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/54_hires.png',
    },
    'Thievul': {
        name: 'Thievul',
        type: 'pokemon',
        hp: 90,
        energyType: 'darkness',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fighting', value: '×2' }],
        abilities: [{
            name: 'Stakeout',
            type: 'Ability',
            text: 'Once during your turn, you may look at the top 4 cards of your opponent\'s deck. Put 1 of them at the bottom of their deck and the rest back in any order.',
        }],
        attacks: [{ name: 'Night Slash', damage: 70, energyCost: ['darkness', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/55.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/55_hires.png',
    },

    // ─── Fighting / Fossil ────────────────────────────────────────────────────
    'Mankey': {
        name: 'Mankey',
        type: 'pokemon',
        hp: 60,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'psychic', value: '×2' }],
        attacks: [{ name: 'Scratch', damage: 20, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/57.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/57_hires.png',
    },
    'Primeape': {
        name: 'Primeape',
        type: 'pokemon',
        hp: 90,
        energyType: 'fighting',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Mankey',
        retreatCost: 1,
        weaknesses: [{ type: 'psychic', value: '×2' }],
        attacks: [{ name: 'Rage', damage: 40, energyCost: ['fighting'], description: 'This attack does 10 more damage for each damage counter on this Pokémon.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/58.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/58_hires.png',
    },
    'Annihilape': {
        name: 'Annihilape',
        type: 'pokemon',
        hp: 150,
        energyType: 'fighting',
        subtypes: ['Stage 2'],
        evolvesFrom: 'Primeape',
        retreatCost: 2,
        weaknesses: [{ type: 'psychic', value: '×2' }],
        abilities: [{
            name: 'Rage Fist',
            type: 'Ability',
            text: 'This Pokémon\'s attacks do 30 more damage for each damage counter on it (before applying Weakness and Resistance).',
        }],
        attacks: [{ name: 'Final Gambit', damage: 150, energyCost: ['fighting', 'fighting', 'colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/59.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/59_hires.png',
    },
    'Koraidon': {
        name: 'Koraidon',
        type: 'pokemon',
        hp: 130,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'psychic', value: '×2' }],
        abilities: [{
            name: 'Ride of the Ancients',
            type: 'Ability',
            text: 'Once during your turn, you may discard 1 card from your hand. If you do, search your deck for a Basic Fighting Pokémon and put it onto your Bench. Then, shuffle your deck.',
        }],
        attacks: [{ name: 'Collision Course', damage: 120, energyCost: ['fighting', 'fighting'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/60.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/60_hires.png',
    },
    'Cranidos': {
        name: 'Cranidos',
        type: 'pokemon',
        hp: 80,
        energyType: 'fighting',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'grass', value: '×2' }],
        attacks: [{ name: 'Headbutt', damage: 30, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/61.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/61_hires.png',
    },
    'Rampardos ex': {
        name: 'Rampardos ex',
        type: 'pokemon',
        hp: 330,
        energyType: 'fighting',
        subtypes: ['Stage 2', 'ex'],
        evolvesFrom: 'Cranidos',
        retreatCost: 2,
        weaknesses: [{ type: 'grass', value: '×2' }],
        abilities: [{
            name: 'Destructive Headbutt',
            type: 'Ability',
            text: 'Once during your turn, if this Pokémon is your Active Pokémon, you may flip a coin. If heads, discard an Energy from your opponent\'s Active Pokémon.',
        }],
        attacks: [{ name: 'Rampaging Hammer', damage: 150, energyCost: ['fighting', 'fighting'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/62.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/62_hires.png',
    },

    // ─── Metal / Fossil ───────────────────────────────────────────────────────
    'Drilbur': {
        name: 'Drilbur',
        type: 'pokemon',
        hp: 60,
        energyType: 'metal',
        subtypes: ['Basic'],
        retreatCost: 1,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Scratch', damage: 20, energyCost: ['colorless'] }],
        imageUrl: 'https://images.pokemontcg.io/me5/63.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/63_hires.png',
    },
    'Mega Excadrill ex': {
        name: 'Mega Excadrill ex',
        type: 'pokemon',
        hp: 340,
        energyType: 'metal',
        subtypes: ['Stage 1', 'MEGA', 'ex'],
        evolvesFrom: 'Drilbur',
        retreatCost: 4,
        weaknesses: [{ type: 'fire', value: '×2' }],
        resistances: [{ type: 'grass', value: '-30' }],
        abilities: [{
            name: 'Call for Family',
            type: 'Ability',
            text: 'Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may search your deck for up to 2 Basic Pokémon and put them onto your Bench. Then, shuffle your deck.',
        }],
        attacks: [
            { name: 'Dig and Break', damage: 90, energyCost: ['metal', 'metal'], description: 'Discard the top 2 cards of your opponent\'s deck.' },
            { name: 'Maximum Drill', damage: 200, energyCost: ['metal', 'metal', 'metal'], description: 'If this Pokémon has at least 2 extra Energy attached beyond this attack\'s cost, this attack does 130 more damage.' },
        ],
        imageUrl: 'https://images.pokemontcg.io/me5/64.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/64_hires.png',
    },
    'Shieldon': {
        name: 'Shieldon',
        type: 'pokemon',
        hp: 70,
        energyType: 'metal',
        subtypes: ['Basic'],
        retreatCost: 2,
        weaknesses: [{ type: 'fire', value: '×2' }],
        attacks: [{ name: 'Iron Defense', damage: 0, energyCost: ['metal'], description: 'During your opponent\'s next turn, this Pokémon takes 30 less damage from attacks.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/65.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/65_hires.png',
    },
    'Bastiodon': {
        name: 'Bastiodon',
        type: 'pokemon',
        hp: 160,
        energyType: 'metal',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Shieldon',
        retreatCost: 3,
        weaknesses: [{ type: 'fire', value: '×2' }],
        abilities: [{
            name: 'Ancient Bulwark',
            type: 'Ability',
            text: 'As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks from Pokémon that have 2 or fewer Energy attached to them.',
        }],
        attacks: [{ name: 'Mirror Attack', damage: 10, energyCost: ['metal', 'colorless'], description: 'This attack does 30 more damage if your opponent\'s Active Pokémon is a Metal-type Pokémon.' }],
        imageUrl: 'https://images.pokemontcg.io/me5/66.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/66_hires.png',
    },

    // ─── PB Trainers ──────────────────────────────────────────────────────────
    'Gwynn': {
        name: 'Gwynn',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Discard up to 2 Pokémon from your hand (not Pokémon with a Rule Box). For each Pokémon you discarded in this way, draw 3 cards.',
        imageUrl: 'https://images.pokemontcg.io/me5/68.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/68_hires.png',
    },
    'Misty\'s Spirit': {
        name: 'Misty\'s Spirit',
        type: 'trainer',
        subtypes: ['Supporter'],
        flavorText: 'Search your deck for up to 4 Basic Water Energy cards and attach them to 1 of your Pokémon. Then, shuffle your deck. Your turn ends.',
        imageUrl: 'https://images.pokemontcg.io/me5/73.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/73_hires.png',
    },
    'Dark Bell': {
        name: 'Dark Bell',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Both Active Pokémon are now Confused. This effect doesn\'t apply to Darkness-type Pokémon.',
        imageUrl: 'https://images.pokemontcg.io/me5/70.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/70_hires.png',
    },
    'Antique Skull Fossil': {
        name: 'Antique Skull Fossil',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this card as if it were a 40-HP Basic Pokémon. At any time during your turn, you may evolve this card into Cranidos.',
        imageUrl: 'https://images.pokemontcg.io/me5/71.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/71_hires.png',
    },
    'Antique Armor Fossil': {
        name: 'Antique Armor Fossil',
        type: 'trainer',
        subtypes: ['Item'],
        flavorText: 'Play this card as if it were a 40-HP Basic Pokémon. At any time during your turn, you may evolve this card into Shieldon.',
        imageUrl: 'https://images.pokemontcg.io/me5/72.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/72_hires.png',
    },
    'Fossil Excavation Site': {
        name: 'Fossil Excavation Site',
        type: 'trainer',
        subtypes: ['Stadium'],
        flavorText: 'Once during each player\'s turn, that player may search their deck for an Antique Fossil Item card, reveal it, and put it into their hand. Then, shuffle their deck.',
        imageUrl: 'https://images.pokemontcg.io/me5/79.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/79_hires.png',
    },

    // ─── PB Special Energy ────────────────────────────────────────────────────
    'Shadow Energy': {
        name: 'Shadow Energy',
        type: 'energy',
        energyType: 'darkness',
        subtypes: ['Special Energy'],
        flavorText: 'Provides [D] Energy. As long as this card is attached to a Darkness-type Pokémon on your Bench, prevent all damage done to that Pokémon by your opponent\'s attacks.',
        imageUrl: 'https://images.pokemontcg.io/me5/80.png',
        imageUrlLarge: 'https://images.pokemontcg.io/me5/80_hires.png',
    },
};

/** Combined proxy card lookup: STANDARD + EXTRA + CRI + PB */
const ALL_PROXY_CARDS: Record<string, Partial<Card>> = {
    ...STANDARD_PROXY_CARDS,
    ...EXTRA_PROXY_CARDS,
    ...CRI_PROXY_CARDS,
    ...PB_PROXY_CARDS,
};

/** Shared deck builder helper — fetches sets and creates an addCard function */
async function buildDeckHelper() {
    const [sv5, sv6, sv6pt5, sv7, sv8, sv8pt5, sv9, me1, me2, me2pt5, me3, cri, me5] = await Promise.all([
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
        fetchSet('cri').catch(() => []),  // Chaos Rising (2026-05-22)
        fetchSet('me5').catch(() => []),  // Pitch Black (2026-07-17)
    ]);

    const allCards = [
        ...me5, ...cri, ...me3, ...me2pt5, ...me2, ...me1,
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
                    localImageSource: proxy.localImageSource,
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
    addCard('Iono', 3);
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
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);       // cri — opponent draws 3 when they have ≤3 prizes
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
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);
    addCard('Briar', 1);
    addCard('Judge', 1);

    // Trainers — Items (23)
    addCard('Rare Candy', 4);           // skip Frogadier into Mega Greninja ex
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 4);
    addCard('Switch', 3);
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);           // cri — opponent draws 3 when they have ≤3 prizes
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
// me3 (Perfect Order) — Fighting Barbaracle engine
// 60 cards: 16 Pokémon / 33 Trainers / 11 Energy
// ============================================
export async function createMegaZygardeExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (16)
    addCard('Binacle', 4);               // me3/42 — Basic, evolves into Barbaracle
    addCard('Barbaracle', 4);            // me3/43 — Stone Arms: attach Fighting from discard
    addCard('Mega Zygarde ex', 4);       // me3/47 — Stage 1 MEGA; Gaia Wave + Nullifying Zero
    addCard('Solrock', 2);               // me1/75 — powers up Lands Force ability
    addCard('Lunatone', 2);              // me1/74 — Lunar Cycle: discard Fighting to draw 3

    // Trainers — Supporters (16)
    addCard('Carmine', 4);               // sv6/145 — shuffle hand, draw up to 5
    addCard("Lillie's Determination", 4); // me1/119 — search Fighting Pokémon/Energy
    addCard('Tarragon', 4);              // me3/85 — retrieve 4 Fighting Energy from discard
    addCard("Wally's Compassion", 2);    // me1/132 — heal Mega Evo ex, return Energy to hand
    addCard("Boss's Orders", 2);         // me1/114 — gust opponent's Benched Pokémon

    // Trainers — Items (17)
    addCard('Poké Pad', 4);              // me3/81 — search for Tool or Energy
    addCard('Fighting Gong', 4);         // me1/116 — search Fighting Energy or Fighting Pokémon
    addCard('Night Stretcher', 2);       // sv6pt5/61 — recover Pokémon (+ Energy if Rule Box)
    addCard('Ultra Ball', 2);            // me1/131 — search any Pokémon
    addCard('Switch', 1);               // me1/130 — free retreat
    addCard('Special Red Card', 2);             // cri — opponent draws 3 when they have ≤3 prizes
    addCard('Precious Trolley', 1);      // sv8pt5/185 — search up to 2 Items
    addCard('Air Balloon', 1);           // me2/79 — Tool: -2 Retreat Cost

    // Energy (11)
    addCard('Fighting Energy', 8);       // sve/6
    addCard('Rocky Fighting Energy', 3); // me3/87 — Fighting + -20 damage taken

    console.log(`[2026 Standard] Mega Zygarde ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA PYROAR EX DECK — CRI (Chaos Rising)
// Fire spread — 60 cards: 14 Pokémon / 34 Trainers / 12 Energy
// ============================================
export async function createMegaPyroarExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (14)
    addCard('Litleo', 4);               // CRI — base of Mega Pyroar ex
    addCard('Mega Pyroar ex', 3);       // CRI 015 — Ferocious Bellow, Fiery Big Bang 290
    addCard('Beedrill ex', 2);          // CRI 003 — Rumbling Bees spread
    addCard('Weedle', 2);               // CRI — basic
    addCard('Kakuna', 1);               // CRI — stage 1 bridge
    addCard('Munkidori', 2);            // sv6 — Adrena-Brain chip damage

    // Trainers — Supporters (10)
    addCard("Professor's Research", 3);
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);
    addCard('Crispin', 1);              // sv7 — energy from discard
    addCard('Briar', 1);                // sv6pt5 — draw after KO

    // Trainers — Items (22)
    addCard('Ultra Ball', 4);
    addCard('Rare Candy', 4);           // Weedle/Kakuna → Beedrill ex skip
    addCard('Nest Ball', 3);
    addCard('Night Stretcher', 3);
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);           // cri — opponent draws 3 when they have ≤3 prizes
    addCard('Buddy-Buddy Poffin', 2);
    addCard('Switch', 2);
    addCard('Prism Tower', 2);          // CRI — discard 2 to draw 1

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Fire Energy', 12);

    console.log(`[2026 Standard] Mega Pyroar ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA GALLADE EX DECK — CRI (Chaos Rising)
// Fighting sweep — 60 cards: 16 Pokémon / 32 Trainers / 12 Energy
// ============================================
export async function createMegaGalladeExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (16)
    addCard('Ralts', 4);                // CRI — base
    addCard('Kirlia', 3);               // CRI — Stage 1 bridge
    addCard('Mega Gallade ex', 3);      // CRI 048 — Gale Cut 50/200
    addCard('Cobalion ex', 2);          // CRI 063 — Metal Road energy acceleration
    addCard('Cinccino ex', 2);          // CRI 073 — Do the Wave + Fluffy
    addCard('Minccino', 2);             // CRI — base for Cinccino ex

    // Trainers — Supporters (10)
    addCard("Professor's Research", 3);
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);
    addCard('Jacq', 1);                 // sv7 — evolution search
    addCard('Tarragon', 1);             // me3 — retrieve Fighting Energy

    // Trainers — Items (20)
    addCard('Rare Candy', 4);           // Ralts → Mega Gallade ex skip
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 3);
    addCard('Night Stretcher', 2);
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);           // cri — opponent draws 3 when they have ≤3 prizes
    addCard('Switch', 2);
    addCard('Adversity Policy', 2);     // CRI — draw 3 when hit by weakness
    addCard('Buddy-Buddy Poffin', 1);

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Fighting Energy', 12);

    console.log(`[2026 Standard] Mega Gallade ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA DARKRAI EX DECK — Pitch Black (ME5)
// Darkness control — 60 cards: 14 Pokémon / 34 Trainers / 12 Energy
// ============================================
export async function createMegaDarkraiExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (14)
    addCard('Mega Darkrai ex', 3);       // me5 046 — Night Raid 110/220, Abyss Eye instant KO
    addCard('Inkay', 4);                 // me5 040 — Procurement: search Item
    addCard('Malamar', 3);               // me5 041 — Perplex + Brain Crush
    addCard('Spiritomb', 2);             // me5 032 — Spooky Binding: opponent can't retreat
    addCard('Thievul', 2);               // me5 055 — Stakeout: peek top 4 opponent deck

    // Trainers — Supporters (10)
    addCard("Professor's Research", 3);
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);
    addCard('Gwynn', 2);                 // me5 — discard Pokémon, draw 3×

    // Trainers — Items (22)
    addCard('Dark Bell', 4);             // me5 — Confuse both Active (non-Darkness)
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 3);
    addCard('Night Stretcher', 3);
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);           // cri — opponent draws 3 when they have ≤3 prizes
    addCard('Switch', 2);
    addCard('Counter Catcher', 2);
    addCard('Buddy-Buddy Poffin', 2);

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Darkness Energy', 12);

    console.log(`[2026 Standard] Mega Darkrai ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA CHANDELURE EX DECK — Pitch Black (ME5)
// Psychic lock + spread — 60 cards: 16 Pokémon / 32 Trainers / 12 Energy
// ============================================
export async function createMegaChandelureExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (16)
    addCard('Litwick', 4);              // me5 037 — pre-evo
    addCard('Lampent', 3);              // me5 038 — Stage 1 bridge
    addCard('Mega Chandelure ex', 3);   // me5 036 — Cursed Flame, Phantom Maze 130+
    addCard('Shuppet', 3);              // me5 030 — Ghost Veil
    addCard('Banette', 2);              // me5 031 — Ghost Veil + Doll Catch
    addCard('Spiritomb', 1);            // me5 032 — Spooky Binding

    // Trainers — Supporters (10)
    addCard("Professor's Research", 3);
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);
    addCard('Jacq', 1);
    addCard('Briar', 1);

    // Trainers — Items (20)
    addCard('Rare Candy', 4);           // Litwick → Mega Chandelure ex skip
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 3);
    addCard('Night Stretcher', 3);
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);           // cri — opponent draws 3 when they have ≤3 prizes
    addCard('Switch', 2);
    addCard('Buddy-Buddy Poffin', 2);

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (12)
    addCard('Psychic Energy', 12);

    console.log(`[2026 Standard] Mega Chandelure ex deck: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// MEGA EXCADRILL EX DECK — Pitch Black (ME5)
// Metal drill — 60 cards: 14 Pokémon / 34 Trainers / 12 Energy
// ============================================
export async function createMegaExcadrillExDeck(): Promise<Card[]> {
    const { deck, addCard } = await buildDeckHelper();

    // Pokémon (14)
    addCard('Drilbur', 4);              // me5 — pre-evo
    addCard('Mega Excadrill ex', 3);    // me5 064 — Call for Family, Dig and Break, Maximum Drill
    addCard('Cobalion ex', 3);          // cri 063 — Metal Road energy acceleration
    addCard('Bastiodon', 2);            // me5 066 — Ancient Bulwark (bench protection)
    addCard('Shieldon', 2);             // me5 065 — pre-evo for Bastiodon

    // Trainers — Supporters (10)
    addCard("Professor's Research", 3);
    addCard('Iono', 2);
    addCard("Boss's Orders", 2);
    addCard('Philippe', 2);             // cri — attach 2 Metal Energy from discard

    // Trainers — Items (22)
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 4);
    addCard('Night Stretcher', 3);
    addCard('Super Rod', 1);
    addCard('Special Red Card', 2);           // cri — opponent draws 3 when they have ≤3 prizes
    addCard('Switch', 2);
    addCard('Buddy-Buddy Poffin', 2);
    addCard('Adversity Policy', 2);     // cri — draw 3 when hit by weakness (Fire)
    addCard('Tool Scrapper', 1);        // cri — discard up to 2 opponent Tools
    addCard('Magnetic M Energy', 2);    // cri — Metal + retreat 0

    // Trainers — Stadiums (2)
    addCard('Pokémon League Headquarters', 2);

    // Energy (10)
    addCard('Metal Energy', 10);

    console.log(`[2026 Standard] Mega Excadrill ex deck: ${deck.length} cards`);
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
    megaPyroarEx: createMegaPyroarExDeck,
    megaGalladeEx: createMegaGalladeExDeck,
    megaDarkraiEx: createMegaDarkraiExDeck,
    megaChandelureEx: createMegaChandelureExDeck,
    megaExcadrillEx: createMegaExcadrillExDeck,
};
