import { GameState, Card, Player, EnergyType, Attack } from '../types/game';

export interface AIAction {
    type: 'PLAY_BASIC' | 'ATTACH_ENERGY' | 'PLAY_TRAINER' | 'END_TURN' | 'ATTACK';
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

// Simple AI that makes decisions for the opponent
export function getAIActions(gameState: GameState): AIAction[] {
    const opponent = gameState.opponent;
    const actions: AIAction[] = [];

    // 1. Try to play Basic Pokémon to bench (up to 5 bench slots)
    const basicPokemon = opponent.hand.filter(
        c => c.type === 'pokemon' && c.subtypes?.includes('Basic')
    );

    const benchSlotsAvailable = 5 - opponent.bench.length;
    const basicsToPlay = basicPokemon.slice(0, Math.min(2, benchSlotsAvailable)); // Play up to 2 basics

    for (const card of basicsToPlay) {
        actions.push({
            type: 'PLAY_BASIC',
            cardId: card.id,
            description: `Playing ${card.name} to bench`,
        });
    }

    // 2. Try to attach energy (one per turn)
    const energyCards = opponent.hand.filter(c => c.type === 'energy');
    if (energyCards.length > 0) {
        // Prioritize Active Pokemon if it needs energy for an attack
        let targetId = opponent.activePokemon?.id;
        let bestEnergy = energyCards[0];

        // Specific logic could be improved here (match energy type)
        // For now, just attach the first energy to active, or bench if active full?
        // Let's stick to simple: Active -> Bench[0]

        if (!targetId && opponent.bench.length > 0) {
            targetId = opponent.bench[0].id; // Fallback
        }

        if (targetId) {
            // Find name for description
            const targetName = opponent.activePokemon?.id === targetId
                ? opponent.activePokemon?.name
                : opponent.bench.find(c => c.id === targetId)?.name;

            actions.push({
                type: 'ATTACH_ENERGY',
                cardId: bestEnergy.id,
                targetId: targetId,
                description: `Attaching ${bestEnergy.name} to ${targetName}`,
            });
        }
    }

    // 3. Try to play Stadium cards
    const stadiumCards = opponent.hand.filter(
        c => c.type === 'trainer' && c.subtypes?.includes('Stadium')
    );

    if (stadiumCards.length > 0) {
        // Find a stadium that's different from the current one
        const playableStadium = stadiumCards.find(s => s.name !== gameState.stadium?.name);
        if (playableStadium) {
            actions.push({
                type: 'PLAY_TRAINER',
                cardId: playableStadium.id,
                description: `Playing ${playableStadium.name}`,
            });
        }
    }

    // 4. Try to play Item trainers (not Supporters for simplicity)
    const itemCards = opponent.hand.filter(
        c => c.type === 'trainer' && c.subtypes?.includes('Item')
    );

    if (itemCards.length > 0 && Math.random() > 0.5) { // 50% chance to play an item
        actions.push({
            type: 'PLAY_TRAINER',
            cardId: itemCards[0].id,
            description: `Playing ${itemCards[0].name}`,
        });
    }

    // 5. ATTACK or END TURN
    let attacked = false;
    const active = opponent.activePokemon;

    // Check if we can attack
    if (active && active.attacks && active.attacks.length > 0) {
        // Find best attack (highest damage) that we have energy for
        let bestAttackIndex = -1;
        let maxDamage = -1;

        active.attacks.forEach((attack, index) => {
            if (checkEnergy(active, attack)) {
                if (attack.damage > maxDamage) {
                    maxDamage = attack.damage;
                    bestAttackIndex = index;
                }
            }
        });

        if (bestAttackIndex !== -1) {
            const attack = active.attacks[bestAttackIndex];
            actions.push({
                type: 'ATTACK',
                attackIndex: bestAttackIndex,
                description: `Using ${attack.name}!`,
            });
            attacked = true;
        }
    }

    if (!attacked) {
        actions.push({
            type: 'END_TURN',
            description: 'Ending turn',
        });
    }

    return actions;
}

// Apply a single AI action to the game state
export function applyAIAction(
    gameState: GameState,
    action: AIAction
): GameState {
    const opponent = gameState.opponent;

    switch (action.type) {
        case 'PLAY_BASIC': {
            if (!action.cardId) return gameState;

            const card = opponent.hand.find(c => c.id === action.cardId);
            if (!card || opponent.bench.length >= 5) return gameState;

            return {
                ...gameState,
                opponent: {
                    ...opponent,
                    hand: opponent.hand.filter(c => c.id !== action.cardId),
                    bench: [...opponent.bench, card],
                },
                message: `Opponent played ${card.name} to bench!`,
            };
        }

        case 'ATTACH_ENERGY': {
            if (!action.cardId || !action.targetId) return gameState;

            const energyCard = opponent.hand.find(c => c.id === action.cardId);
            if (!energyCard) return gameState;

            // Find target (active or bench)
            let newActive = opponent.activePokemon;
            let newBench = [...opponent.bench];

            if (newActive && newActive.id === action.targetId) {
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

            const targetName = newActive?.id === action.targetId
                ? newActive.name
                : newBench.find(p => p.id === action.targetId)?.name || 'Pokémon';

            return {
                ...gameState,
                opponent: {
                    ...opponent,
                    hand: opponent.hand.filter(c => c.id !== action.cardId),
                    activePokemon: newActive,
                    bench: newBench,
                },
                message: `Opponent attached energy to ${targetName}!`,
            };
        }

        case 'PLAY_TRAINER': {
            if (!action.cardId) return gameState;

            const card = opponent.hand.find(c => c.id === action.cardId);
            if (!card) return gameState;

            const isStadium = card.subtypes?.includes('Stadium');

            // Stadium cards: stay in play instead of going to discard
            if (isStadium) {
                // Can't play same stadium that's already in play
                if (gameState.stadium?.name === card.name) {
                    return gameState;
                }

                // Discard old stadium if exists
                const oldStadium = gameState.stadium;
                const opponentDiscardPile = oldStadium
                    ? [...opponent.discardPile, oldStadium]
                    : opponent.discardPile;

                return {
                    ...gameState,
                    opponent: {
                        ...opponent,
                        hand: opponent.hand.filter(c => c.id !== action.cardId),
                        discardPile: opponentDiscardPile,
                    },
                    stadium: card,
                    stadiumOwner: 'opponent',
                    message: `Opponent played Stadium: ${card.name}!`,
                };
            }

            // Simple trainer effect: draw a card
            let newDeck = [...opponent.deck];
            let newHand = opponent.hand.filter(c => c.id !== action.cardId);

            if (newDeck.length > 0) {
                const drawnCard = newDeck.shift();
                if (drawnCard) {
                    newHand.push(drawnCard);
                }
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
            };
        }

        case 'ATTACK': {
            if (action.attackIndex === undefined || !opponent.activePokemon) return gameState;

            const attack = opponent.activePokemon.attacks?.[action.attackIndex];
            if (!attack) return gameState;

            const damage = attack.damage;
            const defender = gameState.player.activePokemon;

            if (!defender) {
                // Attack but no defender? Should not happen in normal flow but possible if player has no active
                return gameState;
            }

            let newDefender = { ...defender };
            let currentHp = newDefender.hp || 0;
            currentHp -= damage;
            newDefender.hp = currentHp;

            const knockout = currentHp <= 0;
            let drawnPrizes: Card[] = [];
            let remainingPrizes = [...opponent.prizeCards];

            if (knockout) {
                const prizeCount = 1;
                drawnPrizes = remainingPrizes.splice(0, prizeCount);
            }

            // Handle Knockout (Player must switch - Simplified: Auto-promote first bench)
            let playerBench = gameState.player.bench;
            let playerActive = knockout ? undefined : newDefender;

            if (knockout && playerBench.length > 0) {
                playerActive = playerBench[0];
                playerBench = playerBench.slice(1);
            }

            // AI Turn ends after attack
            // Prepare for Player Turn
            let playerDeck = [...gameState.player.deck];
            let playerHand = [...gameState.player.hand];
            let drawnCardName = 'nothing';

            if (playerDeck.length > 0) {
                const drawnCard = playerDeck.shift();
                if (drawnCard) {
                    playerHand.push(drawnCard);
                    drawnCardName = drawnCard.name;
                }
            }

            return {
                ...gameState,
                turn: gameState.turn + 1,
                currentPlayer: 'player',
                timeRemaining: 60,
                player: {
                    ...gameState.player,
                    activePokemon: playerActive,
                    bench: playerBench,
                    deck: playerDeck,
                    hand: playerHand,
                    discardPile: knockout ? [...gameState.player.discardPile, defender] : gameState.player.discardPile,
                },
                opponent: {
                    ...opponent,
                    prizeCards: remainingPrizes,
                    hand: [...opponent.hand, ...drawnPrizes],
                },
                message: `Opponent used ${attack.name}! Dealt ${damage} damage.${knockout ? ' KNOCKOUT!' : ''}. Your turn!`,
            };
        }

        case 'END_TURN': {
            // Draw card for player at start of their turn
            let playerDeck = [...gameState.player.deck];
            let playerHand = [...gameState.player.hand];
            let drawnCardName = 'nothing';

            if (playerDeck.length > 0) {
                const drawnCard = playerDeck.shift();
                if (drawnCard) {
                    playerHand.push(drawnCard);
                    drawnCardName = drawnCard.name;
                }
            }

            return {
                ...gameState,
                turn: gameState.turn + 1,
                currentPlayer: 'player',
                timeRemaining: 60,
                player: {
                    ...gameState.player,
                    deck: playerDeck,
                    hand: playerHand,
                },
                message: `Opponent ended turn. Your turn! Drew ${drawnCardName}.`,
            };
        }

        default:
            return gameState;
    }
}
