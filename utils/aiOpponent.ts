import { GameState, Card, Player, EnergyType, Attack } from '../types/game';

export interface AIAction {
    type: 'PLAY_BASIC' | 'PLAY_EVOLUTION' | 'ATTACH_ENERGY' | 'PLAY_TRAINER' | 'END_TURN' | 'ATTACK';
    cardId?: string;
    targetId?: string;
    attackIndex?: number;
    description: string;
}

// Helper to check energy requirements
function checkEnergy(pokemon: Card, attack: Attack): boolean {
    const energyMap = new Map<string, number>();
    (pokemon.attachedEnergy || []).forEach(e => {
        energyMap.set(e, (energyMap.get(e) || 0) + 1);
    });

    const cost = [...attack.energyCost];

    // Check specific requirements first
    for (let i = cost.length - 1; i >= 0; i--) {
        const type = cost[i];
        if (type !== 'colorless') {
            const count = energyMap.get(type) || 0;
            if (count > 0) {
                energyMap.set(type, count - 1);
                cost.splice(i, 1);
            } else {
                return false;
            }
        }
    }

    // Check colorless (any remaining energy)
    let remainingEnergy = 0;
    energyMap.forEach(count => remainingEnergy += count);

    return remainingEnergy >= cost.length;
}

// Iterative AI that makes one decision at a time
export function getNextAIAction(gameState: GameState, usedSupporter: boolean = false, attachedEnergy: boolean = false): AIAction | null {
    const opponent = gameState.opponent;
    const player = gameState.player;

    // 1. If we can attack and it's meaningful, consider it later but prioritize setup
    // Actually, in TCG, you typically do all actions THEN attack because attack ends turn.

    // 2. Play Basic Pokemon to bench
    const basicPokemon = opponent.hand.filter(
        c => c.type === 'pokemon' && c.subtypes?.includes('Basic')
    );
    if (opponent.bench.length < 5 && basicPokemon.length > 0) {
        return {
            type: 'PLAY_BASIC',
            cardId: basicPokemon[0].id,
            description: `Playing ${basicPokemon[0].name} to bench`,
        };
    }

    // 3. Evolve Pokemon
    const evolutions = opponent.hand.filter(c => c.type === 'pokemon' && (c.subtypes?.includes('Stage 1') || c.subtypes?.includes('Stage 2') || c.subtypes?.includes('MEGA')));
    for (const evo of evolutions) {
        // Find target in active
        if (opponent.activePokemon && evo.evolvesFrom === opponent.activePokemon.name) {
            return {
                type: 'PLAY_EVOLUTION',
                cardId: evo.id,
                targetId: opponent.activePokemon.id,
                description: `Evolving ${opponent.activePokemon.name} into ${evo.name}`,
            };
        }
        // Find target on bench
        const benchTarget = opponent.bench.find(p => p.evolvesFrom === evo.name);
        if (benchTarget) {
            return {
                type: 'PLAY_EVOLUTION',
                cardId: evo.id,
                targetId: benchTarget.id,
                description: `Evolving ${benchTarget.name} into ${evo.name}`,
            };
        }
    }

    // 4. Attach Energy (once per turn)
    if (!attachedEnergy) {
        const energyCards = opponent.hand.filter(c => c.type === 'energy');
        if (energyCards.length > 0) {
            const active = opponent.activePokemon;
            // Attach to active if it needs energy for its best attack
            if (active) {
                const needsEnergy = active.attacks?.some(a => !checkEnergy(active, a));
                if (needsEnergy) {
                    return {
                        type: 'ATTACH_ENERGY',
                        cardId: energyCards[0].id,
                        targetId: active.id,
                        description: `Attaching ${energyCards[0].name} to ${active.name}`,
                    };
                }
            }
            // Otherwise attach to first benched
            if (opponent.bench.length > 0) {
                return {
                    type: 'ATTACH_ENERGY',
                    cardId: energyCards[0].id,
                    targetId: opponent.bench[0].id,
                    description: `Attaching ${energyCards[0].name} to ${opponent.bench[0].name}`,
                };
            }
        }
    }

    // 5. Play Trainers
    const trainers = opponent.hand.filter(c => c.type === 'trainer');
    for (const trainer of trainers) {
        const isSupporter = trainer.subtypes?.includes('Supporter');
        if (isSupporter && usedSupporter) continue;

        // Skip complex trainers AI doesn't handle yet (like Ultra Ball)
        if (['Ultra Ball', 'Nest Ball', "Boss's Orders"].includes(trainer.name)) continue;

        return {
            type: 'PLAY_TRAINER',
            cardId: trainer.id,
            description: `Playing ${trainer.name}`,
        };
    }

    // 6. Attack if possible
    const active = opponent.activePokemon;
    if (active && active.attacks && active.attacks.length > 0) {
        let bestAttackIndex = -1;
        let maxDamage = -1;

        active.attacks.forEach((attack, index) => {
            if (checkEnergy(active, attack)) {
                // Calculate real damage considering W/R for AI's choice
                let damage = attack.damage;
                const defender = player.activePokemon;
                if (defender) {
                    const attackerType = active.energyType;
                    const weakness = defender.weaknesses?.find(w => w.type === attackerType);
                    if (weakness) {
                        if (weakness.value.includes('x2') || weakness.value.includes('×2')) damage *= 2;
                        else if (weakness.value.startsWith('+')) damage += parseInt(weakness.value.slice(1)) || 0;
                    }
                    const resistance = defender.resistances?.find(r => r.type === attackerType);
                    if (resistance) {
                        damage = Math.max(0, damage - 30);
                    }
                }

                if (damage >= maxDamage) {
                    maxDamage = damage;
                    bestAttackIndex = index;
                }
            }
        });

        if (bestAttackIndex !== -1) {
            return {
                type: 'ATTACK',
                attackIndex: bestAttackIndex,
                description: `Using ${active.attacks[bestAttackIndex].name}`,
            };
        }
    }

    // 7. Nothing left to do
    return {
        type: 'END_TURN',
        description: 'Ending turn',
    };
}

export function applyAIAction(
    gameState: GameState,
    action: AIAction
): GameState {
    const opponent = gameState.opponent;

    switch (action.type) {
        case 'PLAY_BASIC': {
            if (!action.cardId) return gameState;
            const card = opponent.hand.find(c => c.id === action.cardId);
            if (!card) return gameState;

            return {
                ...gameState,
                opponent: {
                    ...opponent,
                    hand: opponent.hand.filter(c => c.id !== action.cardId),
                    bench: [...opponent.bench, card],
                },
                message: `Opponent played ${card.name} to bench!`,
                timeRemaining: gameState.timeRemaining, // Preserve timer
            };
        }

        case 'PLAY_EVOLUTION': {
            if (!action.cardId || !action.targetId) return gameState;
            const evoCard = opponent.hand.find(c => c.id === action.cardId);
            if (!evoCard) return gameState;

            let oldPokemon: Card | null = null;
            let newActive = opponent.activePokemon;
            let newBench = [...opponent.bench];

            if (newActive?.id === action.targetId) {
                oldPokemon = newActive;
                newActive = {
                    ...evoCard,
                    attachedEnergy: oldPokemon.attachedEnergy,
                    damageCounters: oldPokemon.damageCounters,
                    id: oldPokemon.id,
                };
            } else {
                newBench = newBench.map(p => {
                    if (p.id === action.targetId) {
                        oldPokemon = p;
                        return {
                            ...evoCard,
                            attachedEnergy: p.attachedEnergy,
                            damageCounters: p.damageCounters,
                            id: p.id,
                        };
                    }
                    return p;
                });
            }

            return {
                ...gameState,
                opponent: {
                    ...opponent,
                    hand: opponent.hand.filter(c => c.id !== action.cardId),
                    activePokemon: newActive,
                    bench: newBench,
                },
                message: `Opponent evolved ${oldPokemon?.name} into ${evoCard.name}!`,
                timeRemaining: gameState.timeRemaining, // Preserve timer
            };
        }

        case 'ATTACH_ENERGY': {
            if (!action.cardId || !action.targetId) return gameState;
            const energyCard = opponent.hand.find(c => c.id === action.cardId);
            if (!energyCard) return gameState;

            let newActive = opponent.activePokemon;
            let newBench = [...opponent.bench];

            if (newActive?.id === action.targetId) {
                newActive = {
                    ...newActive,
                    attachedEnergy: [...(newActive.attachedEnergy || []), energyCard.energyType || 'colorless'],
                };
            } else {
                newBench = newBench.map(p => {
                    if (p.id === action.targetId) {
                        return {
                            ...p,
                            attachedEnergy: [...(p.attachedEnergy || []), energyCard.energyType || 'colorless'],
                        };
                    }
                    return p;
                });
            }

            return {
                ...gameState,
                opponent: {
                    ...opponent,
                    hand: opponent.hand.filter(c => c.id !== action.cardId),
                    activePokemon: newActive,
                    bench: newBench,
                },
                message: `Opponent attached energy to ${newActive?.id === action.targetId ? newActive.name : 'Bench'}!`,
                timeRemaining: gameState.timeRemaining, // Preserve timer
            };
        }

        case 'PLAY_TRAINER': {
            if (!action.cardId) return gameState;
            const card = opponent.hand.find(c => c.id === action.cardId);
            if (!card) return gameState;

            // Simplified: Most trainers just draw 2 cards for AI
            let newHand = opponent.hand.filter(c => c.id !== action.cardId);
            let newDeck = [...opponent.deck];
            for (let i = 0; i < 2; i++) {
                if (newDeck.length > 0) newHand.push(newDeck.shift()!);
            }

            return {
                ...gameState,
                opponent: {
                    ...opponent,
                    hand: newHand,
                    deck: newDeck,
                    discardPile: [...opponent.discardPile, card],
                },
                message: `Opponent played ${card.name}!`,
                timeRemaining: gameState.timeRemaining, // Preserve timer
            };
        }

        case 'ATTACK': {
            if (action.attackIndex === undefined || !opponent.activePokemon) return gameState;
            const attack = opponent.activePokemon.attacks?.[action.attackIndex];
            if (!attack) return gameState;

            let damage = attack.damage;
            const defender = gameState.player.activePokemon;
            if (!defender) return gameState;

            // Engine logic mirror (W/R)
            const attackerType = opponent.activePokemon.energyType;
            if (attackerType) {
                const weakness = defender.weaknesses?.find(w => w.type === attackerType);
                if (weakness) {
                    if (weakness.value.includes('x2') || weakness.value.includes('×2')) damage *= 2;
                    else if (weakness.value.startsWith('+')) damage += parseInt(weakness.value.slice(1)) || 0;
                }
                const resistance = defender.resistances?.find(r => r.type === attackerType);
                if (resistance) damage = Math.max(0, damage - 30);
            }

            let newDefender = { ...defender };
            newDefender.hp = (newDefender.hp || 0) - damage;

            const knockout = newDefender.hp <= 0;
            let playerBench = gameState.player.bench;
            let playerActive = knockout ? (playerBench.length > 0 ? playerBench[0] : undefined) : newDefender;
            if (knockout && playerBench.length > 0) playerBench = playerBench.slice(1);

            return {
                ...gameState,
                turn: gameState.turn + 1,
                currentPlayer: 'player',
                timeRemaining: 60,
                player: {
                    ...gameState.player,
                    activePokemon: playerActive,
                    bench: playerBench,
                    discardPile: knockout ? [...gameState.player.discardPile, defender] : gameState.player.discardPile,
                    prizeCards: gameState.player.prizeCards, // AI doesn't take player prizes
                },
                opponent: {
                    ...opponent,
                    prizeCards: knockout ? opponent.prizeCards.slice(1) : opponent.prizeCards,
                },
                message: `Opponent used ${attack.name}! Dealt ${damage} damage.${knockout ? ' KNOCKOUT!' : ''} Your turn!`,
            };
        }

        case 'END_TURN': {
            return {
                ...gameState,
                turn: gameState.turn + 1,
                currentPlayer: 'player',
                timeRemaining: 60,
                message: `Opponent ended turn. Your turn!`,
            };
        }

        default:
            return gameState;
    }
}
