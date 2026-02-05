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
            ? ENERGY_TYPE_MAP[apiCard.subtypes?.[0] || ''] || 'colorless'
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
// CHARIZARD EX DECK (Player's Deck)
// ============================================
export async function createCharizardExDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    let cardIndex = 0;

    // Fetch multiple sets for card variety
    const [sv1, sv2, sv3, sv4, sv5, sv6] = await Promise.all([
        fetchSet('sv1'),
        fetchSet('sv2'),
        fetchSet('sv3'),
        fetchSet('sv4'),
        fetchSet('sv5'),
        fetchSet('sv6'),
    ]);

    const allCards = [...sv1, ...sv2, ...sv3, ...sv4, ...sv5, ...sv6];

    const addCard = (name: string, count: number) => {
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) {
                deck.push(convertApiCard(apiCard, cardIndex++));
            }
        } else {
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
        }
    };

    // Pokemon (17)
    addCard('Charmander', 4);
    addCard('Charmeleon', 1);
    addCard('Charizard ex', 3);
    addCard('Pidgey', 3);
    addCard('Pidgeot ex', 2);
    addCard('Rotom V', 1);
    addCard('Manaphy', 1);
    addCard('Lumineon V', 1);
    addCard('Radiant Charizard', 1);

    // Trainers - Supporters (12)
    addCard('Professor\'s Research', 4);
    addCard('Boss\'s Orders', 3);
    addCard('Iono', 3);
    addCard('Arven', 2);

    // Trainers - Items (15)
    addCard('Rare Candy', 4);
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 2);
    addCard('Super Rod', 2);
    addCard('Switch', 2);
    addCard('Lost Vacuum', 1);

    // Trainers - Stadiums (2)
    addCard('Magma Basin', 2);

    // Trainers - Tools (2)
    addCard('Choice Belt', 2);

    // Energy (12)
    addCard('Fire Energy', 10);
    addCard('Double Turbo Energy', 2);

    console.log(`Charizard deck built: ${deck.length} cards`);
    return shuffle(deck);
}

// ============================================
// DRAGAPULT EX DECK (Opponent's Deck)
// ============================================
export async function createDragapultExDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    let cardIndex = 0;

    // Fetch multiple sets for card variety
    const [sv1, sv2, sv3, sv4, sv5, sv6] = await Promise.all([
        fetchSet('sv1'),
        fetchSet('sv2'),
        fetchSet('sv3'),
        fetchSet('sv4'),
        fetchSet('sv5'),
        fetchSet('sv6'),
    ]);

    const allCards = [...sv1, ...sv2, ...sv3, ...sv4, ...sv5, ...sv6];

    const addCard = (name: string, count: number) => {
        const apiCard = findCardByName(allCards, name);
        if (apiCard) {
            for (let i = 0; i < count; i++) {
                deck.push(convertApiCard(apiCard, cardIndex++));
            }
        } else {
            console.warn(`Card not found: ${name}`);
            for (let i = 0; i < count; i++) {
                deck.push({
                    id: `placeholder-opp-${cardIndex++}`,
                    name,
                    type: 'pokemon',
                    hp: 100,
                    subtypes: ['Basic'],
                });
            }
        }
    };

    // Pokemon (18)
    addCard('Dreepy', 4);
    addCard('Drakloak', 1);
    addCard('Dragapult ex', 3);
    addCard('Duskull', 2);
    addCard('Dusclops', 1);
    addCard('Dusknoir', 2);
    addCard('Pidgey', 2);
    addCard('Pidgeot ex', 2);
    addCard('Manaphy', 1);

    // Trainers - Supporters (12)
    addCard('Professor\'s Research', 3);
    addCard('Boss\'s Orders', 3);
    addCard('Iono', 4);
    addCard('Arven', 2);

    // Trainers - Items (17)
    addCard('Rare Candy', 4);
    addCard('Ultra Ball', 4);
    addCard('Nest Ball', 3);
    addCard('Super Rod', 2);
    addCard('Switch', 2);
    addCard('Night Stretcher', 2);

    // Trainers - Stadiums (2)
    addCard('Temple of Sinnoh', 2);

    // Trainers - Tools (1)
    addCard('Technical Machine', 1);

    // Energy (10)
    addCard('Psychic Energy', 8);
    addCard('Jet Energy', 2);

    console.log(`Dragapult deck built: ${deck.length} cards`);
    return shuffle(deck);
}

// Utility export
export function shuffleDeck<T>(deck: T[]): T[] {
    return shuffle(deck);
}

export const standardDecks = {
    charizardEx: createCharizardExDeck,
    dragapultEx: createDragapultExDeck,
};
