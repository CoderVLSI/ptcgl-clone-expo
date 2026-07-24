/**
 * Behavioural checks for the Delta Reign effect engine.
 *
 * These exercise utils/deltaReignEffects.ts directly against hand-built game
 * states — no React, no bundler — so the damage maths and state patches can be
 * verified without launching the app.
 *
 * Run: node scripts/runDeltaReignTests.js  (see that file for compilation)
 */

import { Card, GameState, Player } from '../types/game';
import {
    resolveDeltaReignAttack,
    resolveDeltaReignAbility,
    resolveDeltaReignTrainer,
    applyDamageModifiers,
    effectiveAttackCost,
    effectiveRetreatCost,
    attackBlockedByAbility,
    attackLocked,
    canRetreat,
    prizeCountFor,
    legendaryStadiumInPlay,
    applyHealModifier,
    abilitiesDisabled,
    findStadiumPartner,
} from '../utils/deltaReignEffects';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        passed++;
        console.log(`  PASS  ${name}`);
    } else {
        failed++;
        console.log(`  FAIL  ${name}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`);
    }
}

// ---------- fixtures ----------

let idCounter = 0;
const mon = (name: string, over: Partial<Card> = {}): Card => ({
    id: `${name}-${idCounter++}`,
    name,
    type: 'pokemon',
    hp: 100,
    energyType: 'colorless',
    subtypes: ['Basic'],
    ...over,
});

const energy = (t: Card['energyType']): Card => ({
    id: `energy-${t}-${idCounter++}`,
    name: `${t} Energy`,
    type: 'energy',
    energyType: t,
});

const player = (over: Partial<Player> = {}): Player => ({
    id: 'p',
    name: 'p',
    deck: [],
    hand: [],
    bench: [],
    prizeCards: [],
    discardPile: [],
    ...over,
});

const state = (p: Partial<Player>, o: Partial<Player>, over: Partial<GameState> = {}): GameState => ({
    turn: 5,
    currentPlayer: 'player',
    phase: 'main',
    player: player(p),
    opponent: player(o),
    timeRemaining: 60,
    ...over,
});

const flipHeads = () => true;
const flipTails = () => false;

const dmg = (s: GameState, attacker: Card, name: string, flip = flipHeads) =>
    resolveDeltaReignAttack(
        { state: s, side: 'player', attacker, defender: s.opponent.activePokemon, flipCoin: flip },
        name,
    );

// ---------- damage scaling ----------

console.log('\nDamage scaling');
{
    // Punishing Needle: 10 + 50 per opposing Pokémon with an Ability.
    const withAbility = (n: string) => mon(n, { abilities: [{ name: 'X', type: 'Ability', text: '' }] });
    const s = state(
        {},
        { activePokemon: withAbility('A'), bench: [withAbility('B'), mon('C')] },
    );
    check('Punishing Needle: 2 Abilities in play', dmg(s, mon('Cacturne'), 'Punishing Needle')?.damage, 110);
}
{
    // Mind Ruler: 20 × opponent hand size.
    const s = state({}, { activePokemon: mon('A'), hand: [energy('fire'), energy('fire'), energy('fire')] });
    check('Mind Ruler: 3 cards in hand', dmg(s, mon('Hypno'), 'Mind Ruler')?.damage, 60);
}
{
    // Psychic Marionettes: 70 × opponent bench count.
    const s = state({}, { activePokemon: mon('A'), bench: [mon('B'), mon('C'), mon('D')] });
    check('Psychic Marionettes: 3 benched', dmg(s, mon('Mega Malamar ex'), 'Psychic Marionettes')?.damage, 210);
}
{
    // Energy Crush: 20 × every Energy on the opponent's board.
    const s = state({}, {
        activePokemon: mon('A', { attachedEnergy: ['fire', 'water'] }),
        bench: [mon('B', { attachedEnergy: ['grass'] })],
    });
    check('Energy Crush: 3 Energy in play', dmg(s, mon('Pincurchin'), 'Energy Crush')?.damage, 60);
}
{
    // Storm Emeralda: 50 × Fire and Lightning on YOUR board (other types ignored).
    const s = state(
        {
            activePokemon: mon('Mega Rayquaza ex', { attachedEnergy: ['fire', 'lightning', 'water'] }),
            bench: [mon('B', { attachedEnergy: ['fire'] })],
        },
        { activePokemon: mon('A') },
    );
    check('Storm Emeralda: 3 Fire/Lightning, Water ignored',
        dmg(s, s.player.activePokemon!, 'Storm Emeralda')?.damage, 150);
}
{
    // Finishing Blow: +160 only if the defender is already damaged.
    const clean = state({}, { activePokemon: mon('A') });
    const hurt = state({}, { activePokemon: mon('A', { damageCounters: 10 }) });
    check('Finishing Blow: undamaged target', dmg(clean, mon('G'), 'Finishing Blow')?.damage, 60);
    check('Finishing Blow: damaged target', dmg(hurt, mon('G'), 'Finishing Blow')?.damage, 220);
}
{
    // Energetic Fang: +90 once the opponent is at 4 or fewer Prizes.
    const six = state({}, { activePokemon: mon('A'), prizeCards: Array(6).fill(0).map(() => mon('P')) });
    const four = state({}, { activePokemon: mon('A'), prizeCards: Array(4).fill(0).map(() => mon('P')) });
    check('Energetic Fang: 6 prizes left', dmg(six, mon('Arcanine'), 'Energetic Fang')?.damage, 90);
    check('Energetic Fang: 4 prizes left', dmg(four, mon('Arcanine'), 'Energetic Fang')?.damage, 180);
}
{
    // Rising Heart / Clean Hit: conditional on what the defender is.
    const vsEx = state({}, { activePokemon: mon('Pikachu ex', { subtypes: ['Basic', 'ex'] }) });
    const vsBasic = state({}, { activePokemon: mon('Pikachu') });
    check('Rising Heart vs ex', dmg(vsEx, mon('Enamorus'), 'Rising Heart')?.damage, 200);
    check('Rising Heart vs non-ex', dmg(vsBasic, mon('Enamorus'), 'Rising Heart')?.damage, 100);

    const vsEvo = state({}, { activePokemon: mon('Raichu', { subtypes: ['Stage 1'] }) });
    check('Clean Hit vs Evolution', dmg(vsEvo, mon('Vespiquen'), 'Clean Hit')?.damage, 160);
    check('Clean Hit vs Basic', dmg(vsBasic, mon('Vespiquen'), 'Clean Hit')?.damage, 80);
}
{
    // Raid: +90 only on the turn it evolved.
    const s = state({}, { activePokemon: mon('A') });
    check('Raid: evolved this turn',
        dmg(s, mon('Kilowattrel', { evolvedTurn: 5 }), 'Raid')?.damage, 120);
    check('Raid: evolved earlier',
        dmg(s, mon('Kilowattrel', { evolvedTurn: 3 }), 'Raid')?.damage, 30);
}
{
    // Colorful Whip: 30 per distinct Pokémon TYPE in hand, not per Pokémon.
    const s = state(
        { hand: [mon('A', { energyType: 'fire' }), mon('B', { energyType: 'fire' }), mon('C', { energyType: 'water' }), energy('grass')] },
        { activePokemon: mon('X') },
    );
    check('Colorful Whip: 2 distinct types from 3 Pokémon', dmg(s, mon('Kecleon'), 'Colorful Whip')?.damage, 60);
}
{
    // Reheat: 30 per Basic Fire Energy in the discard, which then shuffle back.
    const fires = [energy('fire'), energy('fire'), energy('fire')];
    const s = state({ discardPile: [...fires, energy('water')] }, { activePokemon: mon('A') });
    const r = dmg(s, mon('Heat Rotom ex'), 'Reheat')!;
    check('Reheat: 3 Fire in discard', r.damage, 90);
    const after = r.mutate!(s);
    check('Reheat: Fire Energy left the discard', after.player.discardPile.length, 1);
    check('Reheat: Fire Energy went to the deck', after.player.deck.length, 3);
}
{
    // Bug Out: 50 per Bug Out Pokémon among the BOTTOM 7 cards of the deck.
    const bugOutMon = (n: string) => mon(n, { attacks: [{ name: 'Bug Out', damage: 50, energyCost: [] }] });
    const deck = [
        ...Array(5).fill(0).map(() => mon('Filler')),
        // bottom 7:
        bugOutMon('Combee'), mon('Filler'), bugOutMon('Spinarak'), mon('Filler'),
        mon('Filler'), mon('Filler'), mon('Filler'),
    ];
    const s = state({ deck }, { activePokemon: mon('A') });
    check('Bug Out: 2 in the bottom 7', dmg(s, mon('Masquerain'), 'Bug Out')?.damage, 100);

    // A Bug Out Pokémon outside the bottom 7 must not count.
    const s2 = state({ deck: [bugOutMon('Combee'), ...Array(10).fill(0).map(() => mon('Filler'))] }, { activePokemon: mon('A') });
    check('Bug Out: hit outside the bottom 7 ignored', dmg(s2, mon('Masquerain'), 'Bug Out')?.damage, 0);
}
{
    // Double Smash: 70 per heads on 2 coins.
    const s = state({}, { activePokemon: mon('A') });
    check('Double Smash: 2 heads', dmg(s, mon('Hakamo-o'), 'Double Smash', flipHeads)?.damage, 140);
    check('Double Smash: 2 tails', dmg(s, mon('Hakamo-o'), 'Double Smash', flipTails)?.damage, 0);
    check('Surprise Attack: tails does nothing', dmg(s, mon('Fletchling'), 'Surprise Attack', flipTails)?.damage, 0);
}

// ---------- stadiums ----------

console.log('\nLegendary Stadiums (two-part)');
{
    const trenchL = mon('Legendary Trench L', { type: 'trainer', subtypes: ['Stadium'] });
    const trenchR = mon('Legendary Trench R', { type: 'trainer', subtypes: ['Stadium'] });

    const oneHalf = state({}, {}, { stadium: trenchL });
    const bothHalves = state({}, {}, { stadium: trenchL, stadiumPartner: trenchR });
    const sameHalfTwice = state({}, {}, { stadium: trenchL, stadiumPartner: { ...trenchL, id: 'dup' } });

    check('Trench inactive with one half', legendaryStadiumInPlay(oneHalf, 'Legendary Trench'), false);
    check('Trench active with both halves', legendaryStadiumInPlay(bothHalves, 'Legendary Trench'), true);
    check('Trench inactive with two copies of the same half',
        legendaryStadiumInPlay(sameHalfTwice, 'Legendary Trench'), false);

    check('Trench doubles healing', applyHealModifier(bothHalves, 30), 60);
    check('No Trench leaves healing alone', applyHealModifier(oneHalf, 30), 30);

    // Savage Ground: +170 while a Legendary Stadium is out.
    const withStadium = state({}, { activePokemon: mon('A') }, { stadium: trenchL, stadiumPartner: trenchR });
    check('Savage Ground with Legendary Stadium', dmg(withStadium, mon('Groudon'), 'Savage Ground')?.damage, 270);
    check('Savage Ground without', dmg(state({}, { activePokemon: mon('A') }), mon('Groudon'), 'Savage Ground')?.damage, 100);
}
{
    // Legendary Summit: Colorless Pokémon give up one less Prize.
    const summitL = mon('Legendary Summit L', { type: 'trainer', subtypes: ['Stadium'] });
    const summitR = mon('Legendary Summit R', { type: 'trainer', subtypes: ['Stadium'] });
    const s = state({}, {}, { stadium: summitL, stadiumPartner: summitR });
    const plain = state({}, {});

    const colourlessEx = mon('Mega Rayquaza ex', { energyType: 'colorless', subtypes: ['Basic', 'MEGA', 'ex'] });
    const fireEx = mon('Heat Rotom ex', { energyType: 'fire', subtypes: ['Basic', 'ex'] });
    const colourlessBasic = mon('Swablu', { energyType: 'colorless' });

    check('Summit: Colorless ex gives 1 prize', prizeCountFor(s, colourlessEx), 1);
    check('Summit: Fire ex still gives 2', prizeCountFor(s, fireEx), 2);
    check('Summit: Colorless non-ex floors at 1', prizeCountFor(s, colourlessBasic), 1);
    check('No Summit: Colorless ex gives 2', prizeCountFor(plain, colourlessEx), 2);
}
{
    // Legendary Lava Lake: Evolution Pokémon lose their Abilities.
    const lavaL = mon('Legendary Lava Lake L', { type: 'trainer', subtypes: ['Stadium'] });
    const lavaR = mon('Legendary Lava Lake R', { type: 'trainer', subtypes: ['Stadium'] });
    const s = state({}, {}, { stadium: lavaL, stadiumPartner: lavaR });

    const evo = mon('Steelix', { subtypes: ['Stage 1'], abilities: [{ name: 'High-Density Armor', type: 'Ability', text: '' }] });
    const basic = mon('Wimpod', { subtypes: ['Basic'], abilities: [{ name: 'Punk Out', type: 'Ability', text: '' }] });

    check('Lava Lake shuts off Evolution Abilities', abilitiesDisabled(s, evo), true);
    check('Lava Lake leaves Basic Abilities alone', abilitiesDisabled(s, basic), false);

    // Steelix's armor should stop reducing damage while Lava Lake is out.
    const withLava = state({}, { activePokemon: evo }, { stadium: lavaL, stadiumPartner: lavaR });
    const withoutLava = state({}, { activePokemon: evo });
    check('Armor suppressed by Lava Lake',
        applyDamageModifiers(withLava, 'opponent', evo, mon('X'), 100).damage, 100);
    check('Armor applies without Lava Lake',
        applyDamageModifiers(withoutLava, 'opponent', evo, mon('X'), 100).damage, 40);
}
{
    // Both halves must be in hand to play the Stadium.
    const l = mon('Legendary Trench L', { type: 'trainer', subtypes: ['Stadium'] });
    const r = mon('Legendary Trench R', { type: 'trainer', subtypes: ['Stadium'] });
    check('Partner found in hand', findStadiumPartner(l, [mon('X'), r])?.name, 'Legendary Trench R');
    check('No partner in hand', findStadiumPartner(l, [mon('X')]), undefined);
    check('Same half is not a partner', findStadiumPartner(l, [{ ...l, id: 'dup' }]), undefined);
}

// ---------- defensive effects ----------

console.log('\nDefensive effects');
{
    const steelix = mon('Steelix', { hp: 190, abilities: [{ name: 'High-Density Armor', type: 'Ability', text: '' }] });
    const s = state({}, { activePokemon: steelix });
    check('High-Density Armor at full HP', applyDamageModifiers(s, 'opponent', steelix, mon('X'), 150).damage, 90);

    const hurt = { ...steelix, damageCounters: 10 };
    check('High-Density Armor once damaged', applyDamageModifiers(s, 'opponent', hurt, mon('X'), 150).damage, 150);
}
{
    // Custom Vest: -60, but only against a Mega ex and not for a Mega ex wearer.
    const vest = mon('Custom Vest', { type: 'trainer', subtypes: ['Pokémon Tool'] });
    const wearer = mon('Swablu', { attachedTool: vest });
    const megaWearer = mon('Mega Golurk ex', { subtypes: ['Stage 1', 'MEGA', 'ex'], attachedTool: vest });
    const megaAttacker = mon('Mega Malamar ex', { subtypes: ['Stage 1', 'MEGA', 'ex'] });
    const plainAttacker = mon('Arcanine', { subtypes: ['Stage 1'] });
    const s = state({}, {});

    check('Custom Vest vs Mega ex', applyDamageModifiers(s, 'opponent', wearer, megaAttacker, 200).damage, 140);
    check('Custom Vest vs non-Mega', applyDamageModifiers(s, 'opponent', wearer, plainAttacker, 200).damage, 200);
    check('Custom Vest does not protect a Mega ex',
        applyDamageModifiers(s, 'opponent', megaWearer, megaAttacker, 200).damage, 200);
}
{
    // Guard Press / Rock Head expire once the turn passes.
    const guarded = mon('Onix', { damageReduction: 30, damageReductionUntilTurn: 5 });
    const now = state({}, {}, { turn: 5 });
    const later = state({}, {}, { turn: 6 });
    check('Guard Press active on turn 5', applyDamageModifiers(now, 'opponent', guarded, mon('X'), 100).damage, 70);
    check('Guard Press expired on turn 6', applyDamageModifiers(later, 'opponent', guarded, mon('X'), 100).damage, 100);
}
{
    // Full prevention, and Ariados' Basic-only prevention.
    const warded = mon('Wattrel', { preventAllDamageUntilTurn: 5 });
    const s = state({}, {}, { turn: 5 });
    check('Quick Flight prevents everything', applyDamageModifiers(s, 'opponent', warded, mon('X'), 999).damage, 0);

    const needled = mon('Ariados', { preventBasicDamageUntilTurn: 5 });
    const basicAttacker = mon('Wimpod', { subtypes: ['Basic'] });
    const evoAttacker = mon('Vespiquen', { subtypes: ['Stage 1'] });
    check('Secret Needle blocks a Basic attacker',
        applyDamageModifiers(s, 'opponent', needled, basicAttacker, 120).damage, 0);
    check('Secret Needle lets an Evolution through',
        applyDamageModifiers(s, 'opponent', needled, evoAttacker, 120).damage, 120);
}

// ---------- costs, locks, retreat ----------

console.log('\nCosts, locks and retreat');
{
    // Incarnate Union drops Colorless from the cost, but only with all four out.
    const ability = { name: 'Incarnate Union', type: 'Ability', text: '' };
    const thundurus = mon('Thundurus', { abilities: [ability] });
    const attack = { name: 'Thunder Edge', damage: 90, energyCost: ['lightning', 'colorless', 'colorless'] as any };

    const full = state({
        activePokemon: thundurus,
        bench: [mon('Tornadus'), mon('Landorus'), mon('Enamorus')],
    }, {});
    const partial = state({ activePokemon: thundurus, bench: [mon('Tornadus')] }, {});

    check('Incarnate Union with all four', effectiveAttackCost(full, 'player', thundurus, attack), ['lightning']);
    check('Incarnate Union with two', effectiveAttackCost(partial, 'player', thundurus, attack),
        ['lightning', 'colorless', 'colorless']);
}
{
    // Power Limiter gates attacking on hand size.
    const golurk = mon('Mega Golurk ex', { abilities: [{ name: 'Power Limiter', type: 'Ability', text: '' }] });
    const small = state({ activePokemon: golurk, hand: Array(9).fill(0).map(() => mon('C')) }, {});
    const big = state({ activePokemon: golurk, hand: Array(10).fill(0).map(() => mon('C')) }, {});
    check('Power Limiter blocks at 9 cards', attackBlockedByAbility(small, 'player', golurk) !== null, true);
    check('Power Limiter allows at 10 cards', attackBlockedByAbility(big, 'player', golurk), null);
}
{
    // Per-attack lockouts.
    const torkoal = mon('Torkoal', { disabledAttacks: { 'Flame Explosion': 6 } });
    check('Flame Explosion locked on turn 6',
        attackLocked(state({}, {}, { turn: 6 }), torkoal, 'Flame Explosion') !== null, true);
    check('Flame Explosion free on turn 7',
        attackLocked(state({}, {}, { turn: 7 }), torkoal, 'Flame Explosion'), null);
    check('Other attacks unaffected',
        attackLocked(state({}, {}, { turn: 6 }), torkoal, 'Singe'), null);
}
{
    // Punk Out and Cotton Carrier.
    const wimpod = mon('Wimpod', { retreatCost: 3, abilities: [{ name: 'Punk Out', type: 'Ability', text: '' }] });
    const vsEx = state({ activePokemon: wimpod }, { activePokemon: mon('Raikou ex', { subtypes: ['Basic', 'ex'] }) });
    const vsPlain = state({ activePokemon: wimpod }, { activePokemon: mon('Growlithe') });
    check('Punk Out vs a Pokémon ex', effectiveRetreatCost(vsEx, 'player', wimpod), 0);
    check('Punk Out with no ex out', effectiveRetreatCost(vsPlain, 'player', wimpod), 3);

    const altaria = mon('Altaria', { subtypes: ['Stage 1'], abilities: [{ name: 'Cotton Carrier', type: 'Ability', text: '' }] });
    const basic = mon('Onix', { retreatCost: 4, subtypes: ['Basic'] });
    const withCarrier = state({ activePokemon: basic, bench: [altaria] }, {});
    check('Cotton Carrier frees a Basic', effectiveRetreatCost(withCarrier, 'player', basic), 0);
    check('Cotton Carrier does not free an Evolution',
        effectiveRetreatCost(withCarrier, 'player', mon('Steelix', { retreatCost: 4, subtypes: ['Stage 1'] })), 4);
}
{
    // Quatro Hold / Clutch retreat lock.
    const held = mon('X', { cannotRetreatUntilTurn: 5 });
    check('Locked on turn 5', canRetreat(state({}, {}, { turn: 5 }), held), false);
    check('Free on turn 6', canRetreat(state({}, {}, { turn: 6 }), held), true);
}

// ---------- abilities ----------

console.log('\nAbilities');
{
    // Ocean Gain heals 50, doubled under Legendary Trench.
    const wishi = mon('Wishiwashi ex', { hp: 260, damageCounters: 120, abilities: [{ name: 'Ocean Gain', type: 'Ability', text: '' }] });
    const s = state({ activePokemon: wishi }, {});
    const r = resolveDeltaReignAbility({ state: s, side: 'player', card: wishi }, 'Ocean Gain')!;
    check('Ocean Gain usable in the Active Spot', r.ok, true);
    check('Ocean Gain heals 50', r.mutate!(s).player.activePokemon!.damageCounters, 70);

    // From the Bench it should be refused.
    const benched = state({ activePokemon: mon('Other'), bench: [wishi] }, {});
    check('Ocean Gain refused on the Bench',
        resolveDeltaReignAbility({ state: benched, side: 'player', card: wishi }, 'Ocean Gain')!.ok, false);

    // Doubled by Legendary Trench.
    const trenchL = mon('Legendary Trench L', { type: 'trainer', subtypes: ['Stadium'] });
    const trenchR = mon('Legendary Trench R', { type: 'trainer', subtypes: ['Stadium'] });
    const withTrench = state({ activePokemon: wishi }, {}, { stadium: trenchL, stadiumPartner: trenchR });
    const r2 = resolveDeltaReignAbility({ state: withTrench, side: 'player', card: wishi }, 'Ocean Gain')!;
    check('Ocean Gain doubled under Trench', r2.mutate!(withTrench).player.activePokemon!.damageCounters, 20);
}
{
    // Buddy Boost moves Fire + Lightning from hand onto Magmortar/Electivire.
    const magmortar = mon('Magmortar', { abilities: [{ name: 'Buddy Boost', type: 'Ability', text: '' }] });
    const fire = energy('fire');
    const lightning = energy('lightning');
    const s = state({ activePokemon: magmortar, hand: [fire, lightning, energy('water')] }, {});
    const r = resolveDeltaReignAbility({ state: s, side: 'player', card: magmortar }, 'Buddy Boost')!;
    check('Buddy Boost available', r.ok, true);
    const after = r.mutate!(s);
    check('Buddy Boost attached both Energy', after.player.activePokemon!.attachedEnergy, ['fire', 'lightning']);
    check('Buddy Boost only spent those two', after.player.hand.length, 1);

    // With no valid target it must refuse.
    const noTarget = state({ activePokemon: mon('Pikachu'), hand: [fire] }, {});
    check('Buddy Boost refused with no Magmortar/Electivire',
        resolveDeltaReignAbility({ state: noTarget, side: 'player', card: magmortar }, 'Buddy Boost')!.ok, false);
}
{
    // Passive abilities report rather than firing.
    const wimpod = mon('Wimpod', { abilities: [{ name: 'Punk Out', type: 'Ability', text: '' }] });
    const r = resolveDeltaReignAbility({ state: state({}, {}), side: 'player', card: wimpod }, 'Punk Out')!;
    check('Punk Out is passive', [r.ok, r.passive], [false, true]);
}
{
    // Excited Dive needs a Colorless Mega ex in play.
    const talon = mon('Talonflame ex', { subtypes: ['Stage 2', 'ex'], abilities: [{ name: 'Excited Dive', type: 'Ability', text: '' }] });
    const rayquaza = mon('Mega Rayquaza ex', { energyType: 'colorless', subtypes: ['Basic', 'MEGA', 'ex'] });
    const golurk = mon('Mega Golurk ex', { energyType: 'psychic', subtypes: ['Stage 1', 'MEGA', 'ex'] });

    const ok = state({ hand: [talon], activePokemon: rayquaza }, {});
    const wrongType = state({ hand: [talon], activePokemon: golurk }, {});
    check('Excited Dive with a Colorless Mega ex',
        resolveDeltaReignAbility({ state: ok, side: 'player', card: talon }, 'Excited Dive')!.ok, true);
    check('Excited Dive with a Psychic Mega ex',
        resolveDeltaReignAbility({ state: wrongType, side: 'player', card: talon }, 'Excited Dive')!.ok, false);

    const r = resolveDeltaReignAbility({ state: ok, side: 'player', card: talon }, 'Excited Dive')!;
    const after = r.mutate!(ok);
    check('Excited Dive benches from hand', [after.player.bench.length, after.player.hand.length], [1, 0]);
}

// ---------- trainers ----------

console.log('\nTrainers');
{
    // Yummy Onigiri scales with copies already in the discard.
    const onigiri = mon('Yummy Onigiri', { type: 'trainer', subtypes: ['Item'] });
    const active = mon('A', { hp: 200, damageCounters: 150 });
    const s = state({
        activePokemon: active,
        discardPile: [mon('Yummy Onigiri', { type: 'trainer' }), mon('Yummy Onigiri', { type: 'trainer' })],
    }, {});
    const r = resolveDeltaReignTrainer({ state: s, side: 'player', card: onigiri }, 'Yummy Onigiri')!;
    // 30 + 30×2 = 90
    check('Yummy Onigiri heals 90 with 2 in discard', r.mutate!(s).player.activePokemon!.damageCounters, 60);

    const fresh = state({ activePokemon: active }, {});
    const r2 = resolveDeltaReignTrainer({ state: fresh, side: 'player', card: onigiri }, 'Yummy Onigiri')!;
    check('Yummy Onigiri heals 30 with none in discard', r2.mutate!(fresh).player.activePokemon!.damageCounters, 120);
}
{
    // Emcee's Hype draws 2, or 4 when the opponent is at 3 or fewer Prizes.
    const hype = mon("Emcee's Hype", { type: 'trainer', subtypes: ['Supporter'] });
    const deck = Array(10).fill(0).map(() => mon('D'));
    const many = state({ deck }, { prizeCards: Array(6).fill(0).map(() => mon('P')) });
    const few = state({ deck }, { prizeCards: Array(3).fill(0).map(() => mon('P')) });

    const r1 = resolveDeltaReignTrainer({ state: many, side: 'player', card: hype }, "Emcee's Hype")!;
    check("Emcee's Hype draws 2 normally", r1.mutate!(many).player.hand.length, 2);
    const r2 = resolveDeltaReignTrainer({ state: few, side: 'player', card: hype }, "Emcee's Hype")!;
    check("Emcee's Hype draws 4 when opponent is low", r2.mutate!(few).player.hand.length, 4);
}
{
    // Tate & Liza's Training returns to hand only under a Legendary Stadium.
    const tate = mon("Tate & Liza's Training", { type: 'trainer', subtypes: ['Supporter'] });
    const trenchL = mon('Legendary Trench L', { type: 'trainer', subtypes: ['Stadium'] });
    const trenchR = mon('Legendary Trench R', { type: 'trainer', subtypes: ['Stadium'] });
    const deck = Array(5).fill(0).map(() => mon('D'));

    const plain = state({ deck }, {});
    const legendary = state({ deck }, {}, { stadium: trenchL, stadiumPartner: trenchR });

    check("Tate & Liza discards without a Legendary Stadium",
        resolveDeltaReignTrainer({ state: plain, side: 'player', card: tate }, "Tate & Liza's Training")!.returnToHand, false);
    check("Tate & Liza returns under a Legendary Stadium",
        resolveDeltaReignTrainer({ state: legendary, side: 'player', card: tate }, "Tate & Liza's Training")!.returnToHand, true);
}
{
    // Aarune grabs up to 3 Supporters/Stadiums and nothing else.
    const aarune = mon('Aarune', { type: 'trainer', subtypes: ['Supporter'] });
    const deck = [
        mon('S1', { type: 'trainer', subtypes: ['Supporter'] }),
        mon('Item', { type: 'trainer', subtypes: ['Item'] }),
        mon('St1', { type: 'trainer', subtypes: ['Stadium'] }),
        mon('S2', { type: 'trainer', subtypes: ['Supporter'] }),
        mon('S3', { type: 'trainer', subtypes: ['Supporter'] }),
        energy('fire'),
    ];
    const s = state({ deck }, {});
    const r = resolveDeltaReignTrainer({ state: s, side: 'player', card: aarune }, 'Aarune')!;
    const after = r.mutate!(s);
    check('Aarune takes 3 cards', after.player.hand.length, 3);
    check('Aarune left the Item and Energy in the deck', after.player.deck.length, 3);
    check('Aarune took only Supporters/Stadiums',
        after.player.hand.every(c => c.subtypes?.includes('Supporter') || c.subtypes?.includes('Stadium')), true);
}

// ---------- board-changing attacks ----------

console.log('\nBoard-changing attacks');
{
    // Drag Out promotes a Benched Pokémon and damages it, not the old Active.
    const oldActive = mon('OldActive', { hp: 100 });
    const weak = mon('Weak', { hp: 60, damageCounters: 30 });
    const strong = mon('Strong', { hp: 200 });
    const s = state({}, { activePokemon: oldActive, bench: [strong, weak] });
    const r = dmg(s, mon('Druddigon'), 'Drag Out')!;
    check('Drag Out does no damage to the old Active', r.damage, 0);

    const after = r.mutate!(s);
    // Weak has 30 damage and 60 HP, so 40 more knocks it out.
    check('Drag Out KOs the dragged Pokémon', after.opponent.discardPile.map(c => c.name), ['Weak']);
    check('Old Active went to the Bench', after.opponent.bench.some(c => c.name === 'OldActive'), true);
}
{
    // Gaia Crush clears both halves of a two-part Stadium.
    const trenchL = mon('Legendary Trench L', { type: 'trainer', subtypes: ['Stadium'] });
    const trenchR = mon('Legendary Trench R', { type: 'trainer', subtypes: ['Stadium'] });
    const s = state({}, { activePokemon: mon('A') }, { stadium: trenchL, stadiumPartner: trenchR });
    const after = dmg(s, mon('Landorus'), 'Gaia Crush')!.mutate!(s);
    check('Gaia Crush removes both halves', [after.stadium, after.stadiumPartner], [undefined, undefined]);
}
{
    // Hole-Digging Claws mills the opponent's top card.
    const s = state({}, { activePokemon: mon('A'), deck: [mon('Top'), mon('Next')] });
    const after = dmg(s, mon('Sandslash'), 'Hole-Digging Claws')!.mutate!(s);
    check('Hole-Digging Claws milled the top card', after.opponent.deck.map(c => c.name), ['Next']);
    check('Milled card went to the discard', after.opponent.discardPile.map(c => c.name), ['Top']);
}
{
    // Ascension pulls the evolution out of the deck and keeps Energy/damage.
    const sandshrew = mon('Sandshrew', { attachedEnergy: ['fighting'], damageCounters: 20 });
    const sandslash = mon('Sandslash', { subtypes: ['Stage 1'], evolvesFrom: 'Sandshrew', hp: 110 });
    const s = state({ activePokemon: sandshrew, deck: [mon('Filler'), sandslash] }, { activePokemon: mon('A') });
    const after = dmg(s, sandshrew, 'Ascension')!.mutate!(s);
    check('Ascension evolved the Active', after.player.activePokemon!.name, 'Sandslash');
    check('Ascension kept the Energy', after.player.activePokemon!.attachedEnergy, ['fighting']);
    check('Ascension kept the damage', after.player.activePokemon!.damageCounters, 20);
    check('Ascension removed it from the deck', after.player.deck.length, 1);
}
{
    // Voltage Hammer discards the Energy beyond the attack cost.
    const electivire = mon('Electivire', { attachedEnergy: ['lightning', 'lightning', 'colorless', 'colorless', 'lightning', 'lightning'] });
    const s = state({ activePokemon: electivire }, { activePokemon: mon('A') });
    const r = dmg(s, electivire, 'Voltage Hammer')!;
    check('Voltage Hammer: 2 spare Energy', r.damage, 120);
    const after = r.mutate!(s);
    check('Voltage Hammer discarded 2', after.player.activePokemon!.attachedEnergy!.length, 4);
    check('Discarded Energy reached the discard pile', after.player.discardPile.length, 2);
}
{
    // Create Waves resets both hands to 4 cards.
    const s = state(
        { hand: [mon('A'), mon('B')], deck: Array(10).fill(0).map(() => mon('D')) },
        { hand: [mon('C')], deck: Array(10).fill(0).map(() => mon('D')), activePokemon: mon('X') },
    );
    const after = dmg(s, mon('Mantine'), 'Create Waves')!.mutate!(s);
    check('Create Waves: player drew 4', after.player.hand.length, 4);
    check('Create Waves: opponent drew 4', after.opponent.hand.length, 4);
}
{
    // Savage Whirlpool only sprays the Bench with a Legendary Stadium out.
    const trenchL = mon('Legendary Trench L', { type: 'trainer', subtypes: ['Stadium'] });
    const trenchR = mon('Legendary Trench R', { type: 'trainer', subtypes: ['Stadium'] });
    const plain = state({}, { activePokemon: mon('A'), bench: [mon('B')] });
    const legendary = state({}, { activePokemon: mon('A'), bench: [mon('B')] }, { stadium: trenchL, stadiumPartner: trenchR });
    check('Savage Whirlpool without a Stadium', dmg(plain, mon('Kyogre'), 'Savage Whirlpool')?.benchDamageEach, 0);
    check('Savage Whirlpool with a Legendary Stadium', dmg(legendary, mon('Kyogre'), 'Savage Whirlpool')?.benchDamageEach, 50);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
