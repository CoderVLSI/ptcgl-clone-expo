/**
 * Coverage report for the Delta Reign set: every attack and ability in
 * data/deltaReignSet.ts, and whether it is handled by a dedicated handler in
 * utils/deltaReignEffects.ts, by the generic parser in utils/attackEffects.ts,
 * or is plain vanilla damage with no rules text.
 *
 * Run: node scripts/checkDeltaReign.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const setSrc = fs.readFileSync(path.join(root, 'data/deltaReignSet.ts'), 'utf8');
const fxSrc = fs.readFileSync(path.join(root, 'utils/deltaReignEffects.ts'), 'utf8');

function handlerNames(src, startMarker) {
    const start = src.indexOf(startMarker);
    if (start === -1) return [];
    // Collect keys until the closing "};" of the record literal.
    const body = src.slice(start, src.indexOf('\n};', start));
    const names = new Set();
    const re = /^\s{4}(?:'([^']+)'|"([^"]+)"|([A-Za-z][A-Za-z0-9_]*))\s*:/gm;
    let m;
    while ((m = re.exec(body))) names.add(m[1] || m[2] || m[3]);
    return [...names];
}

const attackHandlers = handlerNames(fxSrc, 'const ATTACK_HANDLERS');
const abilityHandlers = handlerNames(fxSrc, 'const ABILITY_HANDLERS');
const trainerHandlers = handlerNames(fxSrc, 'const TRAINER_HANDLERS');

// Pull attacks/abilities out of the set data.
const attacks = [];
const abilities = [];
for (const m of setSrc.matchAll(/\{ name: (?:'([^']*)'|"([^"]*)"), damage: (\d+), energyCost:.*?description: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    attacks.push({ name: m[1] || m[2], damage: +m[3], text: m[4] || m[5] || '' });
}
for (const m of setSrc.matchAll(/\{ name: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"), type: '(Ability|Item|Supporter|Stadium|Pokémon Tool)', text:/g)) {
    abilities.push({ name: (m[1] || m[2]).replace(/\\'/g, "'"), type: m[3] });
}

const uniq = a => [...new Map(a.map(x => [x.name, x])).values()];

/**
 * Attacks whose only rules text is a plain status condition. parseAttackEffects()
 * in utils/attackEffects.ts already applies these correctly, so they deliberately
 * have no dedicated handler.
 */
const STATUS_ONLY = /^(your opponent's active pokémon is now (burned|asleep|poisoned|confused)\.?|flip a coin\. if heads, your opponent's active pokémon is now paralyzed\.?)$/i;

/**
 * Passive cards with no activated effect. These are read by the modifier
 * functions (applyDamageModifiers, legendaryStadiumInPlay, abilitiesDisabled,
 * prizeCountFor, applyHealModifier) rather than dispatched as handlers.
 */
const PASSIVE = new Set([
    'Custom Vest',          // applyDamageModifiers
    'Mega Rayquaza Cap',    // grants the Delta Gift attack (an ATTACK_HANDLER)
    'Legendary Trench',     // applyHealModifier
    'Legendary Summit',     // prizeCountFor
    'Legendary Lava Lake',  // abilitiesDisabled
]);

console.log('=== ATTACKS ===');
const unhandledAttacks = [];
for (const a of uniq(attacks)) {
    let status;
    if (attackHandlers.includes(a.name)) status = 'handler';
    else if (!a.text.trim()) status = 'vanilla';
    else if (STATUS_ONLY.test(a.text.trim())) status = 'generic-parser';
    else status = 'UNHANDLED';
    if (status === 'UNHANDLED') unhandledAttacks.push(a);
    console.log(`  [${status.padEnd(12)}] ${a.name}`);
}

console.log('\n=== ABILITIES / TRAINERS ===');
const unhandledAbilities = [];
for (const a of uniq(abilities)) {
    const hasHandler =
        (a.type === 'Ability' && abilityHandlers.includes(a.name)) ||
        trainerHandlers.includes(a.name);
    const status = hasHandler ? 'handler' : PASSIVE.has(a.name) ? 'passive' : 'UNHANDLED';
    if (status === 'UNHANDLED') unhandledAbilities.push(a);
    console.log(`  [${status.padEnd(12)}] ${a.type.padEnd(14)} ${a.name}`);
}

console.log('\n--- SUMMARY ---');
console.log(`attacks: ${uniq(attacks).length} total, ${unhandledAttacks.length} unhandled`);
unhandledAttacks.forEach(a => console.log(`    ! ${a.name}: ${a.text.slice(0, 90)}`));
console.log(`abilities/trainers: ${uniq(abilities).length} total, ${unhandledAbilities.length} unhandled`);
unhandledAbilities.forEach(a => console.log(`    ! ${a.type} ${a.name}`));
process.exitCode = unhandledAttacks.length + unhandledAbilities.length > 0 ? 1 : 0;

// Handlers that don't correspond to any card in the set (typo guard).
const setAttackNames = new Set(uniq(attacks).map(a => a.name));
const orphans = attackHandlers.filter(h => !setAttackNames.has(h));
if (orphans.length) console.log(`\nWARNING orphan attack handlers (no such attack in set): ${orphans.join(', ')}`);
const setAbilityNames = new Set(uniq(abilities).map(a => a.name));
const orphanAb = [...abilityHandlers, ...trainerHandlers].filter(h => !setAbilityNames.has(h));
if (orphanAb.length) console.log(`WARNING orphan ability/trainer handlers: ${orphanAb.join(', ')}`);
