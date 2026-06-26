/**
 * Attack effect parser and applier.
 * Parses attack description text to derive effects:
 *   status conditions, bench damage, healing, coin flips, self-damage, discard.
 */

import { Card, StatusCondition, EnergyType } from '../types/game';

export interface AttackEffectResult {
    /** Status condition to apply to the defending Pokémon */
    inflictStatus?: StatusCondition;
    /** Whether the status is conditional on a coin flip */
    statusNeedsCoinFlip: boolean;
    /** Flat damage to each benched Pokémon on the opponent's side */
    benchDamageEach: number;
    /** Damage counters to spread across opponent's bench (total) */
    benchDamageSpread: number;
    /** HP to heal from the attacker */
    healSelf: number;
    /** Extra damage added to base (e.g. "+30 more damage") */
    bonusDamage: number;
    /** Number of energy to discard from attacker */
    discardEnergy: number;
    /** Whether to flip a coin for the primary damage (heads = hit, tails = miss) */
    primaryCoinFlip: boolean;
    /** Number of times to flip (e.g. "flip 3 coins, +30 each heads") */
    multiCoinFlips: number;
    /** Damage per heads in a multi-flip attack */
    damagePerHeads: number;
    /** Whether the attack does damage to the attacker's self */
    recoilDamage: number;
    /** Whether the attack has ANY conditional effect */
    hasEffect: boolean;
}

const EMPTY: AttackEffectResult = {
    statusNeedsCoinFlip: false,
    benchDamageEach: 0,
    benchDamageSpread: 0,
    healSelf: 0,
    bonusDamage: 0,
    discardEnergy: 0,
    primaryCoinFlip: false,
    multiCoinFlips: 0,
    damagePerHeads: 0,
    recoilDamage: 0,
    hasEffect: false,
};

/**
 * Parse an attack's description text and return structured effect data.
 */
export function parseAttackEffects(description: string): AttackEffectResult {
    if (!description) return EMPTY;

    const text = description.toLowerCase();
    const result: AttackEffectResult = { ...EMPTY };

    // --- Status conditions ---
    const statusMap: [string, StatusCondition][] = [
        ['poisoned', 'poisoned'],
        ['burned', 'burned'],
        ['burned.', 'burned'],
        ['asleep', 'asleep'],
        ['paralyzed', 'paralyzed'],
        ['confused', 'confused'],
    ];
    for (const [keyword, status] of statusMap) {
        if (text.includes('is now ' + keyword) || text.includes('are now ' + keyword) || text.includes('becomes ' + keyword)) {
            result.inflictStatus = status;
            result.hasEffect = true;
            // Check if it requires a heads
            if (text.includes('flip a coin') && (text.indexOf('flip a coin') < text.indexOf(keyword))) {
                result.statusNeedsCoinFlip = true;
            }
            break;
        }
    }

    // --- Bench damage ---
    // "does X damage to each of your opponent's Benched Pokémon"
    const benchEachMatch = text.match(/does (\d+) damage to each of your opponent['']s benched/);
    if (benchEachMatch) {
        result.benchDamageEach = parseInt(benchEachMatch[1]);
        result.hasEffect = true;
    }

    // "put X damage counters on each of your opponent's Benched Pokémon"
    const benchCountersMatch = text.match(/put (\d+) damage counters? on each of your opponent['']s benched/);
    if (benchCountersMatch) {
        result.benchDamageEach = parseInt(benchCountersMatch[1]) * 10;
        result.hasEffect = true;
    }

    // "does X damage to 1 of your opponent's Benched Pokémon"
    const benchOneMatch = text.match(/does (\d+) damage to 1 of your opponent['']s benched/);
    if (benchOneMatch) {
        result.benchDamageSpread = parseInt(benchOneMatch[1]);
        result.hasEffect = true;
    }

    // --- Heal self ---
    // "heal X damage from this Pokémon"
    const healMatch = text.match(/heal (\d+) damage from this/);
    if (healMatch) {
        result.healSelf = parseInt(healMatch[1]);
        result.hasEffect = true;
    }

    // "remove X damage counters from this Pokémon"
    const removeCountersMatch = text.match(/remove (\d+) damage counters? from this/);
    if (removeCountersMatch) {
        result.healSelf = parseInt(removeCountersMatch[1]) * 10;
        result.hasEffect = true;
    }

    // --- Discard energy ---
    // "discard X energy"
    const discardEnergyMatch = text.match(/discard (\d+) \w+ energy/);
    if (discardEnergyMatch) {
        result.discardEnergy = parseInt(discardEnergyMatch[1]);
        result.hasEffect = true;
    }
    if (text.includes('discard all energy') || text.includes('discard all basic energy')) {
        result.discardEnergy = 99; // discard all
        result.hasEffect = true;
    }

    // --- Recoil ---
    // "this pokémon does X damage to itself"
    const recoilMatch = text.match(/this pok[eé]mon does (\d+) damage to itself/);
    if (recoilMatch) {
        result.recoilDamage = parseInt(recoilMatch[1]);
        result.hasEffect = true;
    }

    // --- Coin flip for damage ---
    // "flip a coin. if heads, ..." basic check
    if (text.includes('flip a coin') && !result.inflictStatus) {
        result.primaryCoinFlip = true;
        result.hasEffect = true;
    }

    // "flip X coins. this attack does X more damage for each heads"
    const multiCoinMatch = text.match(/flip (\d+) coins?\. this attack does (\d+) more damage for each heads/);
    if (multiCoinMatch) {
        result.multiCoinFlips = parseInt(multiCoinMatch[1]);
        result.damagePerHeads = parseInt(multiCoinMatch[2]);
        result.primaryCoinFlip = false; // not a simple coin flip
        result.hasEffect = true;
    }

    return result;
}

/**
 * Apply parsed attack effects to the game state.
 * Returns modified defender, attacker, and opponent bench.
 */
export function applyAttackEffects(
    effects: AttackEffectResult,
    attacker: Card,
    defender: Card,
    opponentBench: Card[],
    coinFlipFn: () => boolean,
): {
    attacker: Card;
    defender: Card;
    opponentBench: Card[];
    bonusDamage: number;
    messages: string[];
} {
    let updatedDefender = { ...defender };
    let updatedAttacker = { ...attacker };
    let updatedBench = [...opponentBench];
    let bonusDamage = 0;
    const messages: string[] = [];

    // --- Status condition ---
    if (effects.inflictStatus) {
        let applyStatus = true;
        if (effects.statusNeedsCoinFlip) {
            const heads = coinFlipFn();
            applyStatus = heads;
            messages.push(heads ? 'Heads! Status applied.' : 'Tails! Status not applied.');
        }
        if (applyStatus) {
            updatedDefender = {
                ...updatedDefender,
                statusCondition: effects.inflictStatus,
                poisonCounters: effects.inflictStatus === 'poisoned' ? 1 : updatedDefender.poisonCounters,
            };
            messages.push(`${defender.name} is now ${effects.inflictStatus}!`);
        }
    }

    // --- Multi-coin damage bonus ---
    if (effects.multiCoinFlips > 0 && effects.damagePerHeads > 0) {
        let heads = 0;
        for (let i = 0; i < effects.multiCoinFlips; i++) {
            if (coinFlipFn()) heads++;
        }
        bonusDamage = heads * effects.damagePerHeads;
        messages.push(`Flipped ${effects.multiCoinFlips} coins, ${heads} heads: +${bonusDamage} damage.`);
    }

    // --- Bench damage ---
    if (effects.benchDamageEach > 0) {
        updatedBench = updatedBench.map(bp => ({
            ...bp,
            damageCounters: (bp.damageCounters || 0) + effects.benchDamageEach,
        }));
        messages.push(`Dealt ${effects.benchDamageEach} damage to each of opponent's Benched Pokémon.`);
    }

    // --- Self heal ---
    if (effects.healSelf > 0) {
        const healAmount = Math.min(effects.healSelf, updatedAttacker.damageCounters || 0);
        updatedAttacker = {
            ...updatedAttacker,
            damageCounters: Math.max(0, (updatedAttacker.damageCounters || 0) - effects.healSelf),
        };
        if (healAmount > 0) messages.push(`Healed ${healAmount} damage from ${attacker.name}.`);
    }

    // --- Recoil ---
    if (effects.recoilDamage > 0) {
        updatedAttacker = {
            ...updatedAttacker,
            damageCounters: (updatedAttacker.damageCounters || 0) + effects.recoilDamage,
        };
        messages.push(`${attacker.name} took ${effects.recoilDamage} recoil damage.`);
    }

    // --- Discard energy ---
    if (effects.discardEnergy > 0 && updatedAttacker.attachedEnergy) {
        const toDiscard = effects.discardEnergy === 99
            ? updatedAttacker.attachedEnergy.length
            : Math.min(effects.discardEnergy, updatedAttacker.attachedEnergy.length);
        updatedAttacker = {
            ...updatedAttacker,
            attachedEnergy: updatedAttacker.attachedEnergy.slice(toDiscard),
        };
        messages.push(`Discarded ${toDiscard} energy from ${attacker.name}.`);
    }

    return { attacker: updatedAttacker, defender: updatedDefender, opponentBench: updatedBench, bonusDamage, messages };
}

/**
 * Process status condition effects at the between-turns boundary.
 * Returns updated card and any messages.
 */
export function processStatusCondition(
    pokemon: Card,
    coinFlipFn: () => boolean,
): { pokemon: Card; damageDone: number; cured: boolean; message: string } {
    if (!pokemon.statusCondition) {
        return { pokemon, damageDone: 0, cured: false, message: '' };
    }

    let updatedPokemon = { ...pokemon };
    let damageDone = 0;
    let cured = false;
    let message = '';

    switch (pokemon.statusCondition) {
        case 'poisoned': {
            const counters = pokemon.poisonCounters || 1;
            damageDone = counters * 10;
            updatedPokemon = {
                ...updatedPokemon,
                damageCounters: (updatedPokemon.damageCounters || 0) + damageDone,
            };
            message = `${pokemon.name} is Poisoned and took ${damageDone} damage!`;
            break;
        }
        case 'burned': {
            damageDone = 20;
            updatedPokemon = {
                ...updatedPokemon,
                damageCounters: (updatedPokemon.damageCounters || 0) + damageDone,
            };
            // Flip coin: heads = cured
            const headsForBurn = coinFlipFn();
            if (headsForBurn) {
                updatedPokemon = { ...updatedPokemon, statusCondition: undefined };
                cured = true;
                message = `${pokemon.name} is Burned (20 damage) and flipped Heads — cured!`;
            } else {
                message = `${pokemon.name} is Burned and took 20 damage (Tails, still Burned).`;
            }
            break;
        }
        case 'asleep': {
            // Flip coin: heads = wake up
            const headsForSleep = coinFlipFn();
            if (headsForSleep) {
                updatedPokemon = { ...updatedPokemon, statusCondition: undefined };
                cured = true;
                message = `${pokemon.name} woke up!`;
            } else {
                message = `${pokemon.name} is still Asleep.`;
            }
            break;
        }
        case 'paralyzed': {
            // Paralysis is cured at the end of the Paralyzed player's next turn
            updatedPokemon = { ...updatedPokemon, statusCondition: undefined, cannotAttackNextTurn: false };
            cured = true;
            message = `${pokemon.name}'s Paralysis wore off.`;
            break;
        }
        case 'confused': {
            // Confusion is processed when the Pokémon tries to attack — handled in attack()
            // No between-turn effect
            message = `${pokemon.name} is Confused.`;
            break;
        }
    }

    return { pokemon: updatedPokemon, damageDone, cured, message };
}
