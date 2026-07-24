/**
 * Delta Reign (M6) card effects.
 *
 * The generic parser in attackEffects.ts handles the common templates
 * (status conditions, flat bench damage, simple heals). Everything in this
 * file needs game state the parser doesn't see — deck contents, prize counts,
 * stadiums, what's in play — so each effect is implemented explicitly and
 * keyed by card + attack/ability name.
 *
 * Everything here is a pure function of GameState. `mutate` closures are
 * applied by the caller inside its own setState, so this module never touches
 * React state directly and can be exercised standalone (see the checks in
 * scripts/checkDeltaReign.js).
 */

import { Card, GameState, Player, EnergyType, Attack } from '../types/game';

export type Side = 'player' | 'opponent';

export interface DRContext {
    state: GameState;
    /** Which side is using the attack/ability. */
    side: Side;
    attacker: Card;
    defender?: Card;
    flipCoin: () => boolean;
}

export interface DRResult {
    /** Base damage to the defending Pokémon, before Weakness/Resistance. */
    damage: number;
    /** Skip Weakness/Resistance for this attack's damage (Thunder Edge, Hard Swing). */
    ignoreWeaknessResistance?: boolean;
    /** Skip Resistance only. */
    ignoreResistance?: boolean;
    /** Damage dealt to each of the defender's benched Pokémon. */
    benchDamageEach?: number;
    /** Damage to a single benched Pokémon, auto-targeted (see pickBenchTarget). */
    benchSnipe?: number;
    messages: string[];
    /** Applied to the game state after damage resolution. */
    mutate?: (s: GameState) => GameState;
}

// ------------------------------------------------------------------
// Side helpers
// ------------------------------------------------------------------

export const other = (side: Side): Side => (side === 'player' ? 'opponent' : 'player');

const mine = (s: GameState, side: Side): Player => s[side];
const theirs = (s: GameState, side: Side): Player => s[other(side)];

/** Every Pokémon a side has in play (Active + Bench). */
export function inPlay(p?: Player): Card[] {
    if (!p) return [];
    return [...(p.activePokemon ? [p.activePokemon] : []), ...p.bench];
}

function setPlayer(s: GameState, side: Side, patch: Partial<Player>): GameState {
    return { ...s, [side]: { ...s[side], ...patch } } as GameState;
}

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const isBasicEnergy = (c: Card): boolean =>
    c.type === 'energy' && !c.subtypes?.some(s => s.toLowerCase().includes('special'));

const energyTypeOf = (c: Card): EnergyType | undefined => c.energyType;

const isEx = (c?: Card): boolean =>
    !!c && (!!c.subtypes?.some(s => s.toLowerCase() === 'ex') || / ex$/i.test(c.name));

const isMegaEx = (c?: Card): boolean =>
    !!c && !!c.subtypes?.some(s => s.toUpperCase() === 'MEGA') && isEx(c);

const isEvolution = (c?: Card): boolean =>
    !!c && c.type === 'pokemon' && !c.subtypes?.includes('Basic');

const isBasicPokemon = (c?: Card): boolean =>
    !!c && c.type === 'pokemon' && !!c.subtypes?.includes('Basic');

/** Total energy attached across a side's Pokémon in play, optionally filtered. */
function countAttachedEnergy(p: Player, types?: EnergyType[]): number {
    return inPlay(p).reduce((sum, c) => {
        const attached = c.attachedEnergy || [];
        return sum + (types ? attached.filter(e => types.includes(e)).length : attached.length);
    }, 0);
}

/**
 * Auto-target for "1 of your opponent's Pokémon" effects: prefer a Benched
 * Pokémon the snipe would Knock Out, otherwise the one closest to a KO.
 */
export function pickBenchTarget(bench: Card[], damage: number): number {
    if (bench.length === 0) return -1;
    let best = 0;
    let bestScore = -Infinity;
    bench.forEach((c, i) => {
        const remaining = (c.hp || 0) - (c.damageCounters || 0);
        const score = remaining <= damage ? 10000 - remaining : -remaining;
        if (score > bestScore) {
            bestScore = score;
            best = i;
        }
    });
    return best;
}

// ------------------------------------------------------------------
// Stadiums
// ------------------------------------------------------------------

/**
 * The "Legendary" Stadiums are printed as two halves. Both must be in play
 * for the pair's effect to apply, and together they count as one Stadium.
 */
export function legendaryStadiumInPlay(s: GameState, baseName: string): boolean {
    const halves = [s.stadium, s.stadiumPartner].filter(Boolean) as Card[];
    if (halves.length < 2) return false;
    const matching = halves.filter(c => c.name.startsWith(baseName));
    if (matching.length < 2) return false;
    // Must be the L and R halves, not two copies of the same half.
    return new Set(matching.map(c => c.name)).size === 2;
}

/** Any complete "Legendary" Stadium — several cards check only for the name. */
export function anyLegendaryStadiumInPlay(s: GameState): boolean {
    return ['Legendary Trench', 'Legendary Summit', 'Legendary Lava Lake']
        .some(n => legendaryStadiumInPlay(s, n));
}

/** Legendary Trench: all healing in play is doubled. */
export function applyHealModifier(s: GameState, amount: number): number {
    return legendaryStadiumInPlay(s, 'Legendary Trench') ? amount * 2 : amount;
}

/** Legendary Lava Lake: Evolution Pokémon on both sides lose their Abilities. */
export function abilitiesDisabled(s: GameState, card: Card): boolean {
    return legendaryStadiumInPlay(s, 'Legendary Lava Lake') && isEvolution(card);
}

/** Legendary Summit: Colorless Pokémon give up one less Prize card (minimum 1). */
export function prizeCountFor(s: GameState, knockedOut: Card): number {
    const base = isEx(knockedOut) ? 2 : 1;
    if (legendaryStadiumInPlay(s, 'Legendary Summit') && knockedOut.energyType === 'colorless') {
        return Math.max(1, base - 1);
    }
    return base;
}

/** True if `card` is one half of a two-part Stadium. */
export function isPairedStadium(card: Card): boolean {
    return !!card.subtypes?.includes('Stadium') && /\s(L|R)$/.test(card.name);
}

export function pairedStadiumBaseName(card: Card): string {
    return card.name.replace(/\s(L|R)$/, '');
}

/** The other half of a paired Stadium, if it is in `hand`. */
export function findStadiumPartner(card: Card, hand: Card[]): Card | undefined {
    if (!isPairedStadium(card)) return undefined;
    const base = pairedStadiumBaseName(card);
    const wantedHalf = card.name.endsWith(' L') ? 'R' : 'L';
    return hand.find(c => c.id !== card.id && c.name === `${base} ${wantedHalf}`);
}

// ------------------------------------------------------------------
// Passive modifiers
// ------------------------------------------------------------------

/** Retreat cost after Punk Out / Cotton Carrier and any "can't retreat" lock. */
export function effectiveRetreatCost(s: GameState, side: Side, card: Card): number {
    const base = card.retreatCost || 0;

    // Wimpod — Punk Out: retreat 0 while the opponent has any Pokémon ex in play.
    if (hasAbility(s, card, 'Punk Out') && inPlay(theirs(s, side)).some(isEx)) return 0;

    // Altaria — Cotton Carrier: your Basic Pokémon have no Retreat Cost.
    if (isBasicPokemon(card)) {
        const hasCarrier = inPlay(mine(s, side)).some(c => hasAbility(s, c, 'Cotton Carrier'));
        if (hasCarrier) return 0;
    }

    return base;
}

export function canRetreat(s: GameState, card: Card): boolean {
    return !(card.cannotRetreatUntilTurn !== undefined && s.turn <= card.cannotRetreatUntilTurn);
}

/** An ability counts only if the card actually has it and it isn't shut off. */
function hasAbility(s: GameState, card: Card, name: string): boolean {
    if (!card.abilities?.some(a => a.name === name)) return false;
    return !abilitiesDisabled(s, card);
}

/**
 * Incarnate Union (Tornadus / Thundurus / Landorus / Enamorus): while all four
 * are in play, Colorless costs in this Pokémon's attacks are ignored.
 */
export function effectiveAttackCost(s: GameState, side: Side, card: Card, attack: Attack): EnergyType[] {
    if (!hasAbility(s, card, 'Incarnate Union')) return attack.energyCost;
    const names = new Set(inPlay(mine(s, side)).map(c => c.name));
    const quartet = ['Tornadus', 'Thundurus', 'Landorus', 'Enamorus'];
    if (!quartet.every(n => names.has(n))) return attack.energyCost;
    return attack.energyCost.filter(e => e !== 'colorless');
}

/** Mega Golurk ex — Power Limiter: can only attack with 10+ cards in hand. */
export function attackBlockedByAbility(s: GameState, side: Side, card: Card): string | null {
    if (hasAbility(s, card, 'Power Limiter') && mine(s, side).hand.length < 10) {
        return `${card.name}'s Power Limiter: you need 10 or more cards in hand to attack.`;
    }
    return null;
}

/** Per-attack and whole-Pokémon attack lockouts set by earlier effects. */
export function attackLocked(s: GameState, card: Card, attackName: string): string | null {
    if (card.cannotAttackUntilTurn !== undefined && s.turn <= card.cannotAttackUntilTurn) {
        return `${card.name} can't attack this turn.`;
    }
    const until = card.disabledAttacks?.[attackName];
    if (until !== undefined && s.turn <= until) {
        return `${card.name} can't use ${attackName} this turn.`;
    }
    return null;
}

export interface DamageModifierResult {
    damage: number;
    messages: string[];
}

/**
 * Defensive modifiers applied AFTER Weakness/Resistance:
 * prevention effects, Steelix's armor, Custom Vest, Guard Press / Rock Head.
 */
export function applyDamageModifiers(
    s: GameState,
    defenderSide: Side,
    defender: Card,
    attacker: Card,
    incoming: number,
): DamageModifierResult {
    const messages: string[] = [];
    let damage = incoming;

    if (damage <= 0) return { damage: 0, messages };

    // Full prevention (Quick Flight, Chaos Crawler)
    if (defender.preventAllDamageUntilTurn !== undefined && s.turn <= defender.preventAllDamageUntilTurn) {
        return { damage: 0, messages: [`All damage to ${defender.name} was prevented.`] };
    }

    // Prevention against Basic attackers only (Secret Needle)
    if (
        defender.preventBasicDamageUntilTurn !== undefined &&
        s.turn <= defender.preventBasicDamageUntilTurn &&
        isBasicPokemon(attacker)
    ) {
        return { damage: 0, messages: [`${defender.name} prevented all damage from the Basic ${attacker.name}.`] };
    }

    // Steelix — High-Density Armor: -60 while at full HP.
    if (hasAbility(s, defender, 'High-Density Armor') && (defender.damageCounters || 0) === 0) {
        damage = Math.max(0, damage - 60);
        messages.push(`High-Density Armor reduced the damage by 60.`);
    }

    // Custom Vest: -60 from Mega Pokémon ex attacks (not for Mega ex holders).
    if (defender.attachedTool?.name === 'Custom Vest' && !isMegaEx(defender) && isMegaEx(attacker)) {
        damage = Math.max(0, damage - 60);
        messages.push(`Custom Vest reduced the damage by 60.`);
    }

    // Timed flat reduction (Guard Press, Rock Head).
    if (
        defender.damageReduction &&
        defender.damageReductionUntilTurn !== undefined &&
        s.turn <= defender.damageReductionUntilTurn
    ) {
        damage = Math.max(0, damage - defender.damageReduction);
        messages.push(`${defender.name} took ${defender.damageReduction} less damage.`);
    }

    return { damage, messages };
}

/** Sandslash — Counterattack: 3 counters back on whatever damaged it. */
export function counterattackDamage(s: GameState, defender: Card, wasActive: boolean): number {
    return wasActive && hasAbility(s, defender, 'Counterattack') ? 30 : 0;
}

// ------------------------------------------------------------------
// Attacks
// ------------------------------------------------------------------

type AttackHandler = (ctx: DRContext) => DRResult;

/** Mark an attack unusable on this Pokémon during its controller's next turn. */
function lockAttack(card: Card, attackName: string, turn: number): Card {
    return { ...card, disabledAttacks: { ...(card.disabledAttacks || {}), [attackName]: turn + 1 } };
}

function patchAttacker(s: GameState, side: Side, id: string, fn: (c: Card) => Card): GameState {
    const p = s[side];
    return setPlayer(s, side, {
        activePokemon: p.activePokemon?.id === id ? fn(p.activePokemon) : p.activePokemon,
        bench: p.bench.map(c => (c.id === id ? fn(c) : c)),
    });
}

function patchDefenderActive(s: GameState, side: Side, fn: (c: Card) => Card): GameState {
    const opp = theirs(s, side);
    if (!opp.activePokemon) return s;
    return setPlayer(s, other(side), { activePokemon: fn(opp.activePokemon) });
}

function draw(s: GameState, side: Side, n: number): GameState {
    const p = s[side];
    const deck = [...p.deck];
    const hand = [...p.hand];
    for (let i = 0; i < n && deck.length > 0; i++) hand.push(deck.shift()!);
    return setPlayer(s, side, { deck, hand });
}

/** Bug Out — shared by Masquerain, Combee and Spinarak. */
const bugOut: AttackHandler = ({ state, side }) => {
    const deck = mine(state, side).deck;
    const revealed = deck.slice(-7);
    const hits = revealed.filter(
        c => c.type === 'pokemon' && c.attacks?.some(a => a.name === 'Bug Out'),
    );
    const damage = 50 * hits.length;

    return {
        damage,
        messages: [
            hits.length > 0
                ? `Bug Out revealed ${hits.length} Pokémon with Bug Out — ${damage} damage.`
                : 'Bug Out revealed no Pokémon with Bug Out.',
        ],
        mutate: s => {
            const p = mine(s, side);
            const kept = p.deck.slice(0, Math.max(0, p.deck.length - 7));
            const back = revealed.filter(c => c.type === 'pokemon');
            const discarded = revealed.filter(c => c.type !== 'pokemon');
            return setPlayer(s, side, {
                deck: shuffle([...kept, ...back]),
                discardPile: [...p.discardPile, ...discarded],
            });
        },
    };
};

const ATTACK_HANDLERS: Record<string, AttackHandler> = {
    // --- Grass ---
    'Spike Draw': ({ side }) => ({
        damage: 20,
        messages: ['Drew 2 cards.'],
        mutate: s => draw(s, side, 2),
    }),

    'High Horsepower': ({ side, attacker }) => ({
        damage: 130,
        messages: [`${attacker.name} took 30 damage from the recoil.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({
            ...c,
            damageCounters: (c.damageCounters || 0) + 30,
        })),
    }),

    Increase: ({ state, side }) => {
        const found = mine(state, side).deck.filter(c => c.name === 'Surskit').slice(0, 2);
        return {
            damage: 0,
            messages: [found.length ? `Put ${found.length} Surskit onto the Bench.` : 'No Surskit in deck.'],
            mutate: s => {
                const p = mine(s, side);
                const room = Math.max(0, 5 - p.bench.length);
                const take = found.slice(0, room);
                const ids = new Set(take.map(c => c.id));
                return setPlayer(s, side, {
                    deck: shuffle(p.deck.filter(c => !ids.has(c.id))),
                    bench: [...p.bench, ...take.map(c => ({ ...c, playedTurn: s.turn }))],
                });
            },
        };
    },

    'Scary Pattern': ({ state, side }) => ({
        damage: 30,
        messages: ["The Defending Pokémon can't attack during its next turn."],
        mutate: s => patchDefenderActive(s, side, c => ({ ...c, cannotAttackUntilTurn: s.turn + 1 })),
    }),

    'Bug Out': bugOut,

    'Knock Away': ({ flipCoin }) => {
        const heads = flipCoin();
        return {
            damage: heads ? 20 : 10,
            messages: [heads ? 'Heads — 10 more damage.' : 'Tails.'],
        };
    },

    'Linear Attack': ({ state, side }) => {
        const bench = theirs(state, side).bench;
        if (bench.length === 0) return { damage: 30, messages: ['Linear Attack hit the Active Pokémon.'] };
        return { damage: 0, benchSnipe: 30, messages: ['Linear Attack hit a Benched Pokémon for 30.'] };
    },

    'Punishing Needle': ({ state, side }) => {
        const withAbility = inPlay(theirs(state, side)).filter(
            c => (c.abilities?.length || 0) > 0 && !abilitiesDisabled(state, c),
        ).length;
        return {
            damage: 10 + 50 * withAbility,
            messages: [`Opponent has ${withAbility} Pokémon with an Ability — +${50 * withAbility} damage.`],
        };
    },

    'Sudden Flight': ({ side, attacker }) => ({
        damage: 10,
        messages: [`${attacker.name} returned to your hand.`],
        mutate: s => returnToHand(s, side, attacker),
    }),

    'Clean Hit': ({ state, side }) => {
        const bonus = isEvolution(theirs(state, side).activePokemon) ? 80 : 0;
        return {
            damage: 80 + bonus,
            messages: bonus ? ['Opponent is an Evolution Pokémon — +80 damage.'] : [],
        };
    },

    'Finishing Blow': ({ state, side }) => {
        const def = theirs(state, side).activePokemon;
        const bonus = (def?.damageCounters || 0) > 0 ? 160 : 0;
        return {
            damage: 60 + bonus,
            messages: bonus ? ['Opponent already has damage — +160 damage.'] : [],
        };
    },

    'Quatro Hold': ({ side }) => ({
        damage: 160,
        messages: ["The Defending Pokémon can't retreat during its next turn."],
        mutate: s => patchDefenderActive(s, side, c => ({ ...c, cannotRetreatUntilTurn: s.turn + 1 })),
    }),

    // --- Fire ---
    Howl: ({ state, side }) => {
        const bench = theirs(state, side).bench;
        return {
            damage: 0,
            messages: [bench.length ? "Switched the opponent's Active Pokémon." : 'Opponent has no Bench.'],
            // The opponent chooses; picking their healthiest Pokémon is the
            // choice they would make, so the AI stands in for them here.
            mutate: s => {
                const opp = theirs(s, side);
                if (opp.bench.length === 0 || !opp.activePokemon) return s;
                let best = 0;
                opp.bench.forEach((c, i) => {
                    const rem = (c.hp || 0) - (c.damageCounters || 0);
                    const bestRem = (opp.bench[best].hp || 0) - (opp.bench[best].damageCounters || 0);
                    if (rem > bestRem) best = i;
                });
                const promoted = opp.bench[best];
                return setPlayer(s, other(side), {
                    activePokemon: promoted,
                    bench: [...opp.bench.slice(0, best), opp.activePokemon, ...opp.bench.slice(best + 1)],
                });
            },
        };
    },

    'Energetic Fang': ({ state, side }) => {
        const bonus = theirs(state, side).prizeCards.length <= 4 ? 90 : 0;
        return {
            damage: 90 + bonus,
            messages: bonus ? ['Opponent has 4 or fewer Prizes — +90 damage.'] : [],
        };
    },

    'Heat Tackle': ({ side, attacker }) => ({
        damage: 200,
        messages: [`${attacker.name} took 50 damage from the recoil.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({
            ...c,
            damageCounters: (c.damageCounters || 0) + 50,
        })),
    }),

    'Gather Strength': ({ state, side }) => {
        const found = mine(state, side).deck.filter(isBasicEnergy).slice(0, 2);
        return {
            damage: 0,
            messages: [found.length ? `Put ${found.length} Basic Energy into your hand.` : 'No Basic Energy in deck.'],
            mutate: s => {
                const p = mine(s, side);
                const ids = new Set(found.map(c => c.id));
                return setPlayer(s, side, {
                    deck: shuffle(p.deck.filter(c => !ids.has(c.id))),
                    hand: [...p.hand, ...found],
                });
            },
        };
    },

    'Flame Explosion': ({ state, side, attacker }) => ({
        damage: 120,
        messages: [`${attacker.name} can't use Flame Explosion next turn.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => lockAttack(c, 'Flame Explosion', s.turn)),
    }),

    Reheat: ({ state, side }) => {
        const fireInDiscard = mine(state, side).discardPile.filter(
            c => isBasicEnergy(c) && energyTypeOf(c) === 'fire',
        );
        return {
            damage: 30 * fireInDiscard.length,
            messages: [`${fireInDiscard.length} Basic Fire Energy in the discard — ${30 * fireInDiscard.length} damage.`],
            mutate: s => {
                const p = mine(s, side);
                const ids = new Set(fireInDiscard.map(c => c.id));
                return setPlayer(s, side, {
                    discardPile: p.discardPile.filter(c => !ids.has(c.id)),
                    deck: shuffle([...p.deck, ...fireInDiscard]),
                });
            },
        };
    },

    'Strong Flare': ({ side, attacker }) => ({
        damage: 170,
        messages: ['Discarded 2 Energy.'],
        mutate: s => discardEnergyFrom(s, side, attacker.id, 2),
    }),

    'Flare Destruction': ({ state, side, flipCoin }) => {
        const heads = flipCoin();
        return {
            damage: 30,
            messages: [heads ? "Heads — discarded an Energy from the opponent's Active." : 'Tails.'],
            mutate: s => (heads ? discardEnergyFromDefender(s, side, 1) : s),
        };
    },

    // --- Water ---
    'Create Waves': ({ side }) => ({
        damage: 0,
        messages: ['Both players shuffled their hand into their deck and drew 4 cards.'],
        mutate: s => {
            let next = s;
            for (const sd of ['player', 'opponent'] as Side[]) {
                const p = next[sd];
                next = setPlayer(next, sd, { deck: shuffle([...p.deck, ...p.hand]), hand: [] });
                next = draw(next, sd, 4);
            }
            return next;
        },
    }),

    'Bubble Drain': ({ state, side, attacker }) => {
        const heal = applyHealModifier(state, 30);
        return {
            damage: 30,
            messages: [`Healed ${heal} damage from ${attacker.name}.`],
            mutate: s => patchAttacker(s, side, attacker.id, c => ({
                ...c,
                damageCounters: Math.max(0, (c.damageCounters || 0) - heal),
            })),
        };
    },

    'Savage Whirlpool': ({ state }) => {
        const boosted = anyLegendaryStadiumInPlay(state);
        return {
            damage: 100,
            benchDamageEach: boosted ? 50 : 0,
            messages: boosted ? ['A Legendary Stadium is in play — 50 damage to each Benched Pokémon.'] : [],
        };
    },

    // --- Lightning ---
    'Call for Family': ({ state, side }) => {
        const found = mine(state, side).deck.filter(isBasicPokemon).slice(0, 2);
        return {
            damage: 0,
            messages: [found.length ? `Put ${found.length} Basic Pokémon onto the Bench.` : 'No Basic Pokémon in deck.'],
            mutate: s => {
                const p = mine(s, side);
                const take = found.slice(0, Math.max(0, 5 - p.bench.length));
                const ids = new Set(take.map(c => c.id));
                return setPlayer(s, side, {
                    deck: shuffle(p.deck.filter(c => !ids.has(c.id))),
                    bench: [...p.bench, ...take.map(c => ({ ...c, playedTurn: s.turn }))],
                });
            },
        };
    },

    'Voltage Hammer': ({ state, side, attacker }) => {
        // Discard as much Basic Energy as the cost allows us to spare.
        const attached = attacker.attachedEnergy || [];
        const spare = Math.max(0, attached.length - 4);
        return {
            damage: 60 * spare,
            messages: [`Discarded ${spare} Basic Energy — ${60 * spare} damage.`],
            mutate: s => discardEnergyFrom(s, side, attacker.id, spare),
        };
    },

    'Gather Lightning': ({ state, side, attacker }) => {
        const energy = mine(state, side).deck.find(c => c.type === 'energy');
        return {
            damage: 0,
            messages: [energy ? `Attached ${energy.name} to ${attacker.name}.` : 'No Energy in deck.'],
            mutate: s => {
                if (!energy) return s;
                const p = mine(s, side);
                const withEnergy = patchAttacker(s, side, attacker.id, c => ({
                    ...c,
                    attachedEnergy: [...(c.attachedEnergy || []), energyTypeOf(energy) || 'colorless'],
                }));
                return setPlayer(withEnergy, side, {
                    deck: shuffle(p.deck.filter(c => c.id !== energy.id)),
                });
            },
        };
    },

    'Power Rush': ({ side, attacker, flipCoin }) => {
        const heads = flipCoin();
        return {
            damage: 200,
            messages: [heads ? 'Heads.' : `Tails — ${attacker.name} can't attack next turn.`],
            mutate: s =>
                heads
                    ? s
                    : patchAttacker(s, side, attacker.id, c => ({ ...c, cannotAttackUntilTurn: s.turn + 1 })),
        };
    },

    'Thunder Edge': () => ({
        damage: 90,
        ignoreWeaknessResistance: true,
        messages: ["Ignored all effects on the opponent's Active Pokémon."],
    }),

    'Energy Crush': ({ state, side }) => {
        const n = countAttachedEnergy(theirs(state, side));
        return {
            damage: 20 * n,
            messages: [`Opponent has ${n} Energy in play — ${20 * n} damage.`],
        };
    },

    'Quick Flight': ({ side, attacker, flipCoin }) => {
        const heads = flipCoin();
        return {
            damage: 10,
            messages: [heads ? `Heads — all damage to ${attacker.name} is prevented next turn.` : 'Tails.'],
            mutate: s =>
                heads
                    ? patchAttacker(s, side, attacker.id, c => ({ ...c, preventAllDamageUntilTurn: s.turn + 1 }))
                    : s,
        };
    },

    Raid: ({ state, attacker }) => {
        const justEvolved = attacker.evolvedTurn === state.turn;
        return {
            damage: 30 + (justEvolved ? 90 : 0),
            messages: justEvolved ? ['Evolved this turn — +90 damage.'] : [],
        };
    },

    // --- Psychic ---
    'Mind Ruler': ({ state, side }) => {
        const n = theirs(state, side).hand.length;
        return { damage: 20 * n, messages: [`Opponent has ${n} cards in hand — ${20 * n} damage.`] };
    },

    'Chaos Crawler': ({ side, attacker }) => ({
        damage: 120,
        messages: [`All damage to ${attacker.name} is prevented next turn.`],
        mutate: s => {
            const locked = patchAttacker(s, side, attacker.id, c => ({
                ...c,
                preventAllDamageUntilTurn: s.turn + 1,
            }));
            // "You can't use this attack if any of your Pokémon used it last turn."
            return patchAttacker(locked, side, attacker.id, c => lockAttack(c, 'Chaos Crawler', s.turn));
        },
    }),

    'Goliath Punch': ({ side, attacker }) => ({
        damage: 300,
        messages: [`${attacker.name} took 30 damage from the recoil.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({
            ...c,
            damageCounters: (c.damageCounters || 0) + 30,
        })),
    }),

    'Rising Heart': ({ state, side }) => {
        const bonus = isEx(theirs(state, side).activePokemon) ? 100 : 0;
        return { damage: 100 + bonus, messages: bonus ? ['Opponent is a Pokémon ex — +100 damage.'] : [] };
    },

    // --- Fighting ---
    Ascension: ({ state, side, attacker }) => {
        const evo = mine(state, side).deck.find(c => c.evolvesFrom === attacker.name);
        return {
            damage: 0,
            messages: [evo ? `${attacker.name} evolved into ${evo.name}.` : 'No Evolution found in deck.'],
            mutate: s => {
                if (!evo) return s;
                const p = mine(s, side);
                const evolved: Card = {
                    ...evo,
                    id: attacker.id,
                    attachedEnergy: attacker.attachedEnergy,
                    attachedTool: attacker.attachedTool,
                    damageCounters: attacker.damageCounters,
                    previousEvolutions: [...(attacker.previousEvolutions || []), attacker],
                    evolvedTurn: s.turn,
                    playedTurn: s.turn,
                };
                const next = patchAttacker(s, side, attacker.id, () => evolved);
                return setPlayer(next, side, { deck: shuffle(p.deck.filter(c => c.id !== evo.id)) });
            },
        };
    },

    'Hole-Digging Claws': ({ side }) => ({
        damage: 60,
        messages: ["Discarded the top card of the opponent's deck."],
        mutate: s => {
            const opp = theirs(s, side);
            if (opp.deck.length === 0) return s;
            return setPlayer(s, other(side), {
                deck: opp.deck.slice(1),
                discardPile: [...opp.discardPile, opp.deck[0]],
            });
        },
    }),

    'Guard Press': ({ side, attacker }) => ({
        damage: 80,
        messages: [`${attacker.name} takes 30 less damage next turn.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({
            ...c,
            damageReduction: 30,
            damageReductionUntilTurn: s.turn + 1,
        })),
    }),

    'Hard Swing': () => ({
        damage: 150,
        ignoreResistance: true,
        messages: [],
    }),

    'Savage Ground': ({ state }) => {
        const boosted = anyLegendaryStadiumInPlay(state);
        return {
            damage: 100 + (boosted ? 170 : 0),
            messages: boosted ? ['A Legendary Stadium is in play — +170 damage.'] : [],
        };
    },

    'Gaia Crush': () => ({
        damage: 110,
        messages: ['Discarded the Stadium in play.'],
        mutate: s => ({ ...s, stadium: undefined, stadiumPartner: undefined, stadiumOwner: undefined }),
    }),

    // --- Darkness ---
    'Find a Friend': ({ state, side }) => {
        const found = mine(state, side).deck.find(c => c.type === 'pokemon');
        return {
            damage: 0,
            messages: [found ? `Put ${found.name} into your hand.` : 'No Pokémon in deck.'],
            mutate: s => {
                if (!found) return s;
                const p = mine(s, side);
                return setPlayer(s, side, {
                    deck: shuffle(p.deck.filter(c => c.id !== found.id)),
                    hand: [...p.hand, found],
                });
            },
        };
    },

    'Giga Impact': ({ side, attacker }) => ({
        damage: 150,
        messages: [`${attacker.name} can't attack next turn.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({ ...c, cannotAttackUntilTurn: s.turn + 1 })),
    }),

    Toxic: ({ side }) => ({
        damage: 0,
        messages: ['The opponent is Poisoned — 4 damage counters per checkup.'],
        mutate: s => patchDefenderActive(s, side, c => ({
            ...c,
            statusCondition: 'poisoned',
            poisonCounters: 4,
        })),
    }),

    'Secret Needle': ({ side, attacker }) => ({
        damage: 80,
        messages: [`${attacker.name} prevents all damage from Basic Pokémon next turn.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({
            ...c,
            preventBasicDamageUntilTurn: s.turn + 1,
        })),
    }),

    'Lure Out': ({ side }) => ({
        damage: 0,
        messages: ["Looked at the top 5 cards of the opponent's deck."],
        mutate: s => {
            const opp = theirs(s, side);
            const top = opp.deck.slice(0, 5);
            const basics = top.filter(isBasicPokemon).slice(0, Math.max(0, 5 - opp.bench.length));
            const ids = new Set(basics.map(c => c.id));
            return setPlayer(s, other(side), {
                deck: shuffle(opp.deck.filter(c => !ids.has(c.id))),
                bench: [...opp.bench, ...basics.map(c => ({ ...c, playedTurn: s.turn }))],
            });
        },
    }),

    'Shining Eyes': ({ state, side }) => {
        const bench = theirs(state, side).bench;
        if (bench.length === 0) return { damage: 50, messages: ['Put 5 damage counters on the Active Pokémon.'] };
        return { damage: 0, benchSnipe: 50, messages: ['Put 5 damage counters on a Benched Pokémon.'] };
    },

    'Knock Off': ({ side }) => ({
        damage: 10,
        messages: ["Discarded a random card from the opponent's hand."],
        mutate: s => {
            const opp = theirs(s, side);
            if (opp.hand.length === 0) return s;
            const i = Math.floor(Math.random() * opp.hand.length);
            return setPlayer(s, other(side), {
                hand: [...opp.hand.slice(0, i), ...opp.hand.slice(i + 1)],
                discardPile: [...opp.discardPile, opp.hand[i]],
            });
        },
    }),

    'Psychic Marionettes': ({ state, side }) => {
        const n = theirs(state, side).bench.length;
        return { damage: 70 * n, messages: [`Opponent has ${n} Benched Pokémon — ${70 * n} damage.`] };
    },

    // --- Dragon ---
    /**
     * Damage lands on the Pokémon dragged out, not the one that was Active,
     * so the switch and the 40 damage are both applied in the patch and the
     * attack itself reports 0 damage to the original defender.
     */
    'Drag Out': ({ state, side }) => {
        const bench = theirs(state, side).bench;
        if (bench.length === 0) return { damage: 0, messages: ['Opponent has no Benched Pokémon.'] };
        return {
            damage: 0,
            messages: ['Dragged out a Benched Pokémon and did 40 damage to it.'],
            mutate: s => {
                const opp = theirs(s, side);
                if (!opp.activePokemon || opp.bench.length === 0) return s;
                const idx = pickBenchTarget(opp.bench, 40);
                const promoted = { ...opp.bench[idx], damageCounters: (opp.bench[idx].damageCounters || 0) + 40 };
                const newBench = [...opp.bench.slice(0, idx), opp.activePokemon, ...opp.bench.slice(idx + 1)];

                // The promoted Pokémon may have been Knocked Out by the 40.
                if ((promoted.damageCounters || 0) >= (promoted.hp || 1)) {
                    return setPlayer(s, other(side), {
                        activePokemon: newBench[0],
                        bench: newBench.slice(1),
                        discardPile: [...opp.discardPile, promoted],
                    });
                }
                return setPlayer(s, other(side), { activePokemon: promoted, bench: newBench });
            },
        };
    },

    'Rock Head': ({ side, attacker }) => ({
        damage: 0,
        messages: [`${attacker.name} takes 30 less damage next turn.`],
        mutate: s => patchAttacker(s, side, attacker.id, c => ({
            ...c,
            damageReduction: 30,
            damageReductionUntilTurn: s.turn + 1,
        })),
    }),

    'Double Smash': ({ flipCoin }) => {
        const heads = [flipCoin(), flipCoin()].filter(Boolean).length;
        return { damage: 70 * heads, messages: [`${heads} heads — ${70 * heads} damage.`] };
    },

    'Break Through': () => ({
        damage: 110,
        benchSnipe: 30,
        messages: ['Also did 30 damage to a Benched Pokémon.'],
    }),

    // --- Colorless ---
    'Bounce Bounce Charge': ({ state, side }) => {
        const energy = mine(state, side).deck.find(c => c.type === 'energy');
        const bench = mine(state, side).bench;
        return {
            damage: 0,
            messages: [
                energy && bench.length
                    ? `Attached ${energy.name} to a Benched Pokémon.`
                    : 'Nothing to attach.',
            ],
            mutate: s => {
                const p = mine(s, side);
                if (!energy || p.bench.length === 0) return s;
                const idx = pickBenchTarget(p.bench, 0);
                const bench2 = p.bench.map((c, i) =>
                    i === idx
                        ? { ...c, attachedEnergy: [...(c.attachedEnergy || []), energyTypeOf(energy) || 'colorless'] }
                        : c,
                );
                return setPlayer(s, side, { bench: bench2, deck: shuffle(p.deck.filter(c => c.id !== energy.id)) });
            },
        };
    },

    'Excited Dodge': ({ side, attacker }) => ({
        damage: 0,
        messages: [`${attacker.name} switched with a Benched Pokémon.`],
        mutate: s => {
            const p = mine(s, side);
            if (p.bench.length === 0 || !p.activePokemon) return s;
            return setPlayer(s, side, {
                activePokemon: p.bench[0],
                bench: [p.activePokemon, ...p.bench.slice(1)],
            });
        },
    }),

    'Colorful Whip': ({ state, side }) => {
        const types = new Set(
            mine(state, side).hand.filter(c => c.type === 'pokemon').map(c => c.energyType || 'colorless'),
        );
        return {
            damage: 30 * types.size,
            messages: [`Revealed ${types.size} Pokémon Types — ${30 * types.size} damage.`],
        };
    },

    'Storm Emeralda': ({ state, side }) => {
        const n = countAttachedEnergy(mine(state, side), ['fire', 'lightning']);
        return {
            damage: 50 * n,
            messages: [`${n} Fire and Lightning Energy in play — ${50 * n} damage.`],
        };
    },

    'Corkscrew Dive': ({ state, side }) => {
        const need = Math.max(0, 6 - mine(state, side).hand.length);
        return {
            damage: 70,
            messages: [need ? `Drew ${need} cards.` : 'Hand already has 6 or more cards.'],
            mutate: s => draw(s, side, need),
        };
    },

    'Surprise Attack': ({ flipCoin }) => {
        const heads = flipCoin();
        return { damage: heads ? 30 : 0, messages: [heads ? 'Heads.' : 'Tails — the attack did nothing.'] };
    },

    Clutch: ({ side }) => ({
        damage: 40,
        messages: ["The Defending Pokémon can't retreat during its next turn."],
        mutate: s => patchDefenderActive(s, side, c => ({ ...c, cannotRetreatUntilTurn: s.turn + 1 })),
    }),

    'Claw Hunt': ({ state, side }) => {
        const found = mine(state, side).deck.slice(0, 2);
        return {
            damage: 150,
            messages: [found.length ? `Put ${found.length} cards into your hand.` : 'Deck is empty.'],
            mutate: s => {
                const p = mine(s, side);
                const ids = new Set(found.map(c => c.id));
                return setPlayer(s, side, {
                    deck: shuffle(p.deck.filter(c => !ids.has(c.id))),
                    hand: [...p.hand, ...found],
                });
            },
        };
    },

    // --- Pokémon Tool attack ---
    'Delta Gift': ({ state, side }) => {
        const wearers = inPlay(mine(state, side)).filter(c => c.attachedTool?.name === 'Mega Rayquaza Cap');
        return {
            damage: 0,
            messages: [`Attached a Basic Energy to ${wearers.length} Pokémon wearing a Mega Rayquaza Cap.`],
            mutate: s => {
                let next = s;
                for (const w of wearers) {
                    const p = mine(next, side);
                    const energy = p.deck.find(isBasicEnergy);
                    if (!energy) break;
                    next = patchAttacker(next, side, w.id, c => ({
                        ...c,
                        attachedEnergy: [...(c.attachedEnergy || []), energyTypeOf(energy) || 'colorless'],
                    }));
                    next = setPlayer(next, side, { deck: p.deck.filter(c => c.id !== energy.id) });
                }
                const p = mine(next, side);
                return setPlayer(next, side, { deck: shuffle(p.deck) });
            },
        };
    },
};

// --- shared attack helpers ---

function returnToHand(s: GameState, side: Side, card: Card): GameState {
    const p = mine(s, side);
    const energyCards: Card[] = (card.attachedEnergy || []).map((e, i) => ({
        id: `returned-energy-${card.id}-${i}`,
        name: `${e.charAt(0).toUpperCase() + e.slice(1)} Energy`,
        type: 'energy',
        energyType: e,
    }));
    const clean: Card = { ...card, attachedEnergy: [], damageCounters: 0, attachedTool: undefined };
    const wasActive = p.activePokemon?.id === card.id;
    return setPlayer(s, side, {
        hand: [...p.hand, clean, ...energyCards],
        activePokemon: wasActive ? p.bench[0] : p.activePokemon,
        bench: wasActive ? p.bench.slice(1) : p.bench.filter(c => c.id !== card.id),
    });
}

function discardEnergyFrom(s: GameState, side: Side, cardId: string, count: number): GameState {
    if (count <= 0) return s;
    const p = mine(s, side);
    let discarded: EnergyType[] = [];
    const strip = (c: Card): Card => {
        const attached = c.attachedEnergy || [];
        discarded = attached.slice(0, count);
        return { ...c, attachedEnergy: attached.slice(count) };
    };
    const next = patchAttacker(s, side, cardId, strip);
    const asCards: Card[] = discarded.map((e, i) => ({
        id: `discarded-energy-${cardId}-${i}-${Math.random()}`,
        name: `${e.charAt(0).toUpperCase() + e.slice(1)} Energy`,
        type: 'energy',
        energyType: e,
    }));
    return setPlayer(next, side, { discardPile: [...mine(next, side).discardPile, ...asCards] });
}

function discardEnergyFromDefender(s: GameState, side: Side, count: number): GameState {
    const opp = theirs(s, side);
    if (!opp.activePokemon) return s;
    return discardEnergyFrom(s, other(side), opp.activePokemon.id, count);
}

/**
 * Resolve a Delta Reign attack. Returns null when the attack has no special
 * handler, in which case the caller falls back to the generic parser.
 */
export function resolveDeltaReignAttack(ctx: DRContext, attackName: string): DRResult | null {
    const handler = ATTACK_HANDLERS[attackName];
    if (!handler) return null;
    return handler(ctx);
}

export function hasDeltaReignAttack(attackName: string): boolean {
    return attackName in ATTACK_HANDLERS;
}

// ------------------------------------------------------------------
// Abilities
// ------------------------------------------------------------------

export interface DRAbilityResult {
    ok: boolean;
    message: string;
    mutate?: (s: GameState) => GameState;
    /** Passive abilities can't be activated; the caller should just report it. */
    passive?: boolean;
}

type AbilityHandler = (ctx: { state: GameState; side: Side; card: Card }) => DRAbilityResult;

const ABILITY_HANDLERS: Record<string, AbilityHandler> = {
    // Passive — read elsewhere via effectiveRetreatCost / applyDamageModifiers / etc.
    'Punk Out': () => ({ ok: false, passive: true, message: 'Punk Out is always active.' }),
    'Cotton Carrier': () => ({ ok: false, passive: true, message: 'Cotton Carrier is always active.' }),
    'Incarnate Union': () => ({ ok: false, passive: true, message: 'Incarnate Union is always active.' }),
    'High-Density Armor': () => ({ ok: false, passive: true, message: 'High-Density Armor is always active.' }),
    'Power Limiter': () => ({ ok: false, passive: true, message: 'Power Limiter is always active.' }),
    Counterattack: () => ({ ok: false, passive: true, message: 'Counterattack is always active.' }),

    // Magmortar — Buddy Boost
    'Buddy Boost': ({ state, side, card }) => {
        const p = mine(state, side);
        const fire = p.hand.find(c => isBasicEnergy(c) && energyTypeOf(c) === 'fire');
        const lightning = p.hand.find(c => isBasicEnergy(c) && energyTypeOf(c) === 'lightning');
        if (!fire && !lightning) return { ok: false, message: 'No Basic Fire or Lightning Energy in hand.' };

        const targets = inPlay(p).filter(c => c.name === 'Magmortar' || c.name === 'Electivire');
        if (targets.length === 0) return { ok: false, message: 'No Magmortar or Electivire in play.' };

        const attach = [fire, lightning].filter(Boolean) as Card[];
        return {
            ok: true,
            message: `Buddy Boost attached ${attach.length} Energy.`,
            mutate: s => {
                let next = s;
                attach.forEach((e, i) => {
                    const t = targets[Math.min(i, targets.length - 1)];
                    next = patchAttacker(next, side, t.id, c => ({
                        ...c,
                        attachedEnergy: [...(c.attachedEnergy || []), energyTypeOf(e) || 'colorless'],
                    }));
                });
                const ids = new Set(attach.map(c => c.id));
                return setPlayer(next, side, { hand: mine(next, side).hand.filter(c => !ids.has(c.id)) });
            },
        };
    },

    // Jellicent — Deep-Sea Draw
    'Deep-Sea Draw': ({ state, side }) => {
        if (mine(state, side).deck.length === 0) return { ok: false, message: 'Your deck is empty.' };
        return {
            ok: true,
            message: 'Deep-Sea Draw: drew a card.',
            mutate: s => draw(s, side, 1),
        };
    },

    // Wishiwashi ex — Ocean Gain
    'Ocean Gain': ({ state, side, card }) => {
        if (mine(state, side).activePokemon?.id !== card.id) {
            return { ok: false, message: 'Ocean Gain can only be used in the Active Spot.' };
        }
        if ((card.damageCounters || 0) === 0) return { ok: false, message: `${card.name} has no damage to heal.` };
        const heal = applyHealModifier(state, 50);
        return {
            ok: true,
            message: `Ocean Gain healed ${heal} damage.`,
            mutate: s => patchAttacker(s, side, card.id, c => ({
                ...c,
                damageCounters: Math.max(0, (c.damageCounters || 0) - heal),
            })),
        };
    },

    // Nidoqueen — Motherly Summon
    'Motherly Summon': ({ state, side }) => {
        const opp = theirs(state, side);
        if (opp.bench.length === 0) return { ok: false, message: 'Opponent has no Benched Pokémon.' };
        const heads = Math.random() < 0.5;
        return {
            ok: true,
            message: heads ? 'Motherly Summon: heads — switched the opponent’s Active.' : 'Motherly Summon: tails.',
            mutate: s => {
                if (!heads) return s;
                const o = theirs(s, side);
                if (!o.activePokemon || o.bench.length === 0) return s;
                const idx = pickBenchTarget(o.bench, 0);
                return setPlayer(s, other(side), {
                    activePokemon: o.bench[idx],
                    bench: [...o.bench.slice(0, idx), o.activePokemon, ...o.bench.slice(idx + 1)],
                });
            },
        };
    },

    // Kommo-o — Scale Beat
    'Scale Beat': ({ state, side }) => {
        const p = mine(state, side);
        const top6 = p.deck.slice(0, 6);
        const energy = top6.filter(isBasicEnergy);
        if (energy.length === 0) return { ok: false, message: 'No Basic Energy in the top 6 cards.' };
        const dragons = inPlay(p).filter(c => c.energyType === 'dragon');
        if (dragons.length === 0) return { ok: false, message: 'No Dragon Pokémon in play.' };
        return {
            ok: true,
            message: `Scale Beat attached ${energy.length} Basic Energy to your Dragon Pokémon.`,
            mutate: s => {
                let next = s;
                energy.forEach((e, i) => {
                    const t = dragons[i % dragons.length];
                    next = patchAttacker(next, side, t.id, c => ({
                        ...c,
                        attachedEnergy: [...(c.attachedEnergy || []), energyTypeOf(e) || 'colorless'],
                    }));
                });
                const ids = new Set(energy.map(c => c.id));
                const rest = mine(next, side).deck.filter(c => !ids.has(c.id));
                return setPlayer(next, side, { deck: shuffle(rest) });
            },
        };
    },

    // Mega Rayquaza ex — Champion's Roar (on being benched from hand)
    "Champion's Roar": ({ state, side, card }) => {
        const p = mine(state, side);
        const top4 = p.deck.slice(0, 4);
        const energy = top4.find(isBasicEnergy);
        if (!energy) return { ok: false, message: 'No Basic Energy in the top 4 cards.' };
        return {
            ok: true,
            message: `Champion's Roar attached ${energy.name} to ${card.name}.`,
            mutate: s => {
                const pp = mine(s, side);
                const rest = pp.deck.slice(0, 4).filter(c => c.id !== energy.id);
                const remainder = pp.deck.slice(4);
                const next = patchAttacker(s, side, card.id, c => ({
                    ...c,
                    attachedEnergy: [...(c.attachedEnergy || []), energyTypeOf(energy) || 'colorless'],
                }));
                return setPlayer(next, side, { deck: [...remainder, ...shuffle(rest)] });
            },
        };
    },

    // Talonflame ex — Excited Dive (played from hand onto the Bench)
    'Excited Dive': ({ state, side, card }) => {
        const p = mine(state, side);
        if (!p.hand.some(c => c.id === card.id)) return { ok: false, message: 'Excited Dive is used from your hand.' };
        if (p.bench.length >= 5) return { ok: false, message: 'Your Bench is full.' };
        const hasColorlessMega = inPlay(p).some(c => isMegaEx(c) && c.energyType === 'colorless');
        if (!hasColorlessMega) {
            return { ok: false, message: 'You need a Colorless Mega Evolution Pokémon ex in play.' };
        }
        return {
            ok: true,
            message: `Excited Dive put ${card.name} onto your Bench.`,
            mutate: s => {
                const pp = mine(s, side);
                return setPlayer(s, side, {
                    hand: pp.hand.filter(c => c.id !== card.id),
                    bench: [...pp.bench, { ...card, playedTurn: s.turn }],
                });
            },
        };
    },
};

export function resolveDeltaReignAbility(
    ctx: { state: GameState; side: Side; card: Card },
    abilityName: string,
): DRAbilityResult | null {
    if (abilitiesDisabled(ctx.state, ctx.card)) {
        return { ok: false, message: 'Legendary Lava Lake has shut off this Ability.' };
    }
    const handler = ABILITY_HANDLERS[abilityName];
    if (!handler) return null;
    return handler(ctx);
}

export function hasDeltaReignAbility(abilityName: string): boolean {
    return abilityName in ABILITY_HANDLERS;
}

// ------------------------------------------------------------------
// Trainers
// ------------------------------------------------------------------

export interface DRTrainerResult {
    ok: boolean;
    message: string;
    mutate?: (s: GameState) => GameState;
    /** Keep the card in hand instead of discarding it (Tate & Liza's Training). */
    returnToHand?: boolean;
}

type TrainerHandler = (ctx: { state: GameState; side: Side; card: Card }) => DRTrainerResult;

const TRAINER_HANDLERS: Record<string, TrainerHandler> = {
    'Yummy Onigiri': ({ state, side, card }) => {
        const p = mine(state, side);
        if (!p.activePokemon) return { ok: false, message: 'No Active Pokémon.' };
        const copies = p.discardPile.filter(c => c.name === 'Yummy Onigiri' && c.id !== card.id).length;
        const heal = applyHealModifier(state, 30 + 30 * copies);
        return {
            ok: true,
            message: `Yummy Onigiri healed ${heal} damage.`,
            mutate: s => {
                const pp = mine(s, side);
                if (!pp.activePokemon) return s;
                return setPlayer(s, side, {
                    activePokemon: {
                        ...pp.activePokemon,
                        damageCounters: Math.max(0, (pp.activePokemon.damageCounters || 0) - heal),
                    },
                });
            },
        };
    },

    'Adventuring Lantern': ({ state, side }) => {
        const p = mine(state, side);
        const fire = p.deck.find(c => isBasicEnergy(c) && energyTypeOf(c) === 'fire');
        const lightning = p.deck.find(c => isBasicEnergy(c) && energyTypeOf(c) === 'lightning');
        const found = [fire, lightning].filter(Boolean) as Card[];
        if (found.length === 0) return { ok: false, message: 'No Basic Fire or Lightning Energy in deck.' };
        return {
            ok: true,
            message: `Adventuring Lantern found ${found.map(c => c.name).join(' and ')}.`,
            mutate: s => {
                const pp = mine(s, side);
                const ids = new Set(found.map(c => c.id));
                return setPlayer(s, side, {
                    deck: shuffle(pp.deck.filter(c => !ids.has(c.id))),
                    hand: [...pp.hand, ...found],
                });
            },
        };
    },

    "Emcee's Hype": ({ state, side }) => {
        const n = theirs(state, side).prizeCards.length <= 3 ? 4 : 2;
        return {
            ok: true,
            message: `Emcee's Hype drew ${n} cards.`,
            mutate: s => draw(s, side, n),
        };
    },

    Aarune: ({ state, side }) => {
        const found = mine(state, side)
            .deck.filter(c => c.subtypes?.includes('Supporter') || c.subtypes?.includes('Stadium'))
            .slice(0, 3);
        if (found.length === 0) return { ok: false, message: 'No Supporter or Stadium cards in deck.' };
        return {
            ok: true,
            message: `Aarune found ${found.length} Supporter/Stadium cards.`,
            mutate: s => {
                const p = mine(s, side);
                const ids = new Set(found.map(c => c.id));
                return setPlayer(s, side, {
                    deck: shuffle(p.deck.filter(c => !ids.has(c.id))),
                    hand: [...p.hand, ...found],
                });
            },
        };
    },

    "Zinnia's Trust": ({ state, side }) => {
        const p = mine(state, side);
        if (p.bench.length === 0 || !p.activePokemon) return { ok: false, message: 'No Benched Pokémon to switch to.' };
        return {
            ok: true,
            message: "Zinnia's Trust switched your Active Pokémon and moved an Energy.",
            mutate: s => {
                const pp = mine(s, side);
                if (!pp.activePokemon || pp.bench.length === 0) return s;
                const old = pp.activePokemon;
                const promoted = pp.bench[0];
                const moved = (old.attachedEnergy || [])[0];
                return setPlayer(s, side, {
                    activePokemon: moved
                        ? { ...promoted, attachedEnergy: [...(promoted.attachedEnergy || []), moved] }
                        : promoted,
                    bench: [
                        { ...old, attachedEnergy: (old.attachedEnergy || []).slice(moved ? 1 : 0) },
                        ...pp.bench.slice(1),
                    ],
                });
            },
        };
    },

    "Tate & Liza's Training": ({ state, side }) => {
        const keep = anyLegendaryStadiumInPlay(state);
        return {
            ok: true,
            message: keep
                ? "Tate & Liza's Training drew 2 cards and returned to your hand."
                : "Tate & Liza's Training drew 2 cards.",
            returnToHand: keep,
            mutate: s => draw(s, side, 2),
        };
    },
};

export function resolveDeltaReignTrainer(
    ctx: { state: GameState; side: Side; card: Card },
    cardName: string,
): DRTrainerResult | null {
    const handler = TRAINER_HANDLERS[cardName];
    if (!handler) return null;
    return handler(ctx);
}

export function hasDeltaReignTrainer(cardName: string): boolean {
    return cardName in TRAINER_HANDLERS;
}

/** Names of every Delta Reign card this module implements behaviour for. */
export const IMPLEMENTED = {
    attacks: Object.keys(ATTACK_HANDLERS),
    abilities: Object.keys(ABILITY_HANDLERS),
    trainers: Object.keys(TRAINER_HANDLERS),
};
