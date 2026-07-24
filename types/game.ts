/**
 * PTCGL Game Types
 */

export type StatusCondition = 'poisoned' | 'burned' | 'asleep' | 'paralyzed' | 'confused';

// Energy types mapping (API uses capitalized, we use lowercase)
export type EnergyType =
    | 'fire'
    | 'water'
    | 'grass'
    | 'lightning'
    | 'psychic'
    | 'fighting'
    | 'darkness'
    | 'metal'
    | 'fairy'
    | 'dragon'
    | 'colorless';

// Map API energy types to our types
export const ENERGY_TYPE_MAP: Record<string, EnergyType> = {
    'Fire': 'fire',
    'Water': 'water',
    'Grass': 'grass',
    'Lightning': 'lightning',
    'Psychic': 'psychic',
    'Fighting': 'fighting',
    'Darkness': 'darkness',
    'Metal': 'metal',
    'Fairy': 'fairy',
    'Dragon': 'dragon',
    'Colorless': 'colorless',
};

export interface Card {
    id: string;
    name: string;
    type: 'pokemon' | 'trainer' | 'energy';
    imageUrl?: string;
    imageUrlLarge?: string;
    energyType?: EnergyType;
    hp?: number;
    abilities?: Ability[];
    attacks?: Attack[];
    attachedEnergy?: EnergyType[];
    attachedTool?: Card; // Pokemon Tool attached to this card
    isActive?: boolean;
    // Additional fields from API
    subtypes?: string[];
    rarity?: string;
    artist?: string;
    flavorText?: string;
    retreatCost?: number;
    weaknesses?: { type: EnergyType; value: string }[];
    resistances?: { type: EnergyType; value: string }[];
    playedTurn?: number; // Turn number when this card was put into play
    previousEvolutions?: Card[]; // Store pre-evolutions
    evolvesFrom?: string; // Set name of Pokémon this evolves from
    damageCounters?: number; // Damage currently on this card
    statusCondition?: StatusCondition;
    cannotAttackNextTurn?: boolean; // Set by paralysis; cleared at end of opponent's turn
    poisonCounters?: number; // 1 = poisoned, 2 = badly poisoned

    // --- Timed effects (Delta Reign and later sets) ---
    // Each holds the turn number the effect stops applying *after*; compare
    // against GameState.turn. Cleared lazily rather than on a schedule.
    /** Flat damage reduction applied after Weakness/Resistance (Guard Press, Rock Head). */
    damageReduction?: number;
    damageReductionUntilTurn?: number;
    /** Prevent all damage from attacks (Quick Flight, Chaos Crawler). */
    preventAllDamageUntilTurn?: number;
    /** Prevent damage from attacks by Basic Pokémon only (Secret Needle). */
    preventBasicDamageUntilTurn?: number;
    /** Cannot retreat (Quatro Hold, Clutch). */
    cannotRetreatUntilTurn?: number;
    /** Cannot attack at all (Scary Pattern). */
    cannotAttackUntilTurn?: number;
    /** Per-attack lockout: attack name → turn through which it is unusable. */
    disabledAttacks?: Record<string, number>;
    /** Turn this Pokémon evolved, for "evolved during this turn" checks (Raid). */
    evolvedTurn?: number;
    /** Damage counters placed on the attacker when it damages this one (Counterattack). */
    counterattackCounters?: number;
}

export interface Ability {
    name: string;
    type: string; // 'Ability' or 'Poke-Power' etc.
    text: string;
}

export interface Attack {
    name: string;
    damage: number;
    energyCost: EnergyType[];
    description?: string;
}

export interface Player {
    id: string;
    name: string;
    avatar?: string;
    deck: Card[];
    hand: Card[];
    activePokemon?: Card;
    bench: Card[];
    prizeCards: Card[];
    discardPile: Card[];
}

export interface GameState {
    turn: number;
    currentPlayer: 'player' | 'opponent';
    phase: 'draw' | 'main' | 'attack' | 'end';
    player: Player;
    opponent: Player;
    stadium?: Card; // Active stadium card in play
    /**
     * Second half of a two-part Stadium (Delta Reign "Legendary" Stadiums).
     * Both halves enter play together and count as one Stadium; the pair's
     * effect is only active while both are present.
     */
    stadiumPartner?: Card;
    stadiumOwner?: 'player' | 'opponent'; // Who played the stadium
    timeRemaining: number;
    message?: string;
    isLoading?: boolean;
    pendingPlayerPromotion?: boolean; // Player must choose which bench Pokemon to promote after KO
}

export interface Position {
    x: number;
    y: number;
}

export interface GameLogicState {
    hasAttachedEnergy: boolean;
    hasPlayedSupporter: boolean;
    hasPlayedStadium: boolean;
    hasTakenAction: boolean;
    premiumPowerProCount: number; // Premium Power Pro stacks
    abilitiesUsed: string[]; // Track card IDs that used abilities this turn
    coinFlipResult: 'heads' | 'tails' | null;
    selectedCard: Card | null;
    actionMode: 'none' | 'attach_energy' | 'evolve' | 'select_target' | 'discard_from_hand' | 'search_deck' | 'search_deck_basic' | 'switch_opponent_active' | 'search_deck_fighting' | 'attach_energy_from_discard' | 'distribute_energy_from_discard' | 'retreat_select_bench' | 'select_from_discard' | 'search_deck_multiple' | 'select_discard_multiple' | 'promote_active';
    message: string;
    activeCardId?: string;
    discardCount: number;
    selectedCardIds?: string[];
}

// Helper to convert API card data to our Card type
export function convertApiCard(apiCard: any): Card {
    const supertype = apiCard.supertype?.toLowerCase() || 'pokemon';
    const type = supertype === 'pokémon' ? 'pokemon' : supertype as Card['type'];

    return {
        id: apiCard.id,
        name: apiCard.name,
        type,
        imageUrl: apiCard.images?.small,
        imageUrlLarge: apiCard.images?.large,
        energyType: apiCard.types?.[0] ? ENERGY_TYPE_MAP[apiCard.types[0]] : undefined,
        hp: apiCard.hp ? parseInt(apiCard.hp, 10) : undefined,
        attacks: apiCard.attacks?.map((a: any) => ({
            name: a.name,
            damage: parseInt(a.damage, 10) || 0,
            energyCost: a.cost?.map((c: string) => ENERGY_TYPE_MAP[c] || 'colorless') || [],
            description: a.text,
        })),
        subtypes: apiCard.subtypes,
        rarity: apiCard.rarity,
        artist: apiCard.artist,
        flavorText: apiCard.flavorText,
        retreatCost: apiCard.convertedRetreatCost,
        weaknesses: apiCard.weaknesses?.map((w: any) => ({
            type: ENERGY_TYPE_MAP[w.type] || 'colorless',
            value: w.value,
        })),
        resistances: apiCard.resistances?.map((r: any) => ({
            type: ENERGY_TYPE_MAP[r.type] || 'colorless',
            value: r.value,
        })),
        evolvesFrom: apiCard.evolvesFrom,
    };
}
