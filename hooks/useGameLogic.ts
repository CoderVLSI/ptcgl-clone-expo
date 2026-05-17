import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Player, GameState, EnergyType, GameLogicState, Attack, StatusCondition } from '../types/game';
import { parseAttackEffects, applyAttackEffects, processStatusCondition } from '../utils/attackEffects';

export interface GameLogicReturn {
    gameState: GameState | null;
    logicState: GameLogicState;
    updateGameState: (newState: GameState) => void;
    flipCoin: () => boolean;
    canPlayCard: (card: Card) => { canPlay: boolean; reason?: string };
    playPokemonToBench: (cardId: string) => boolean;
    attachEnergy: (energyCardId: string, targetCardId: string) => boolean;
    evolvePokemon: (evolutionCardId: string, targetCardId: string) => boolean;
    playTrainer: (cardId: string) => boolean;
    drawCard: () => boolean;
    setActivePokemon: (benchCardId: string) => boolean;
    endTurn: () => void;
    selectCard: (card: Card | null, mode?: GameLogicState['actionMode']) => void;
    confirmDiscard: (cardIds: string[]) => void;
    confirmDeckSelection: (cardIds: string[]) => void;
    confirmNestBallSelection: (cardIds: string[]) => void;
    confirmBossOrdersSelection: (benchCardId: string) => void;
    confirmFightingGongSelection: (cardIds: string[]) => void;
    attack: (attackIndex: number) => boolean;
    currentPhase?: 'setup' | 'draw' | 'action' | 'attack';
    confirmDiscardEnergySelection: (cardIds: string[]) => void;
    distributeEnergyToTarget: (targetId: string) => void;
    useAbility: (cardId: string, abilityIndex: number) => boolean;
    setLogicState: React.Dispatch<React.SetStateAction<GameLogicState>>;
    // New in full card implementation
    retreat: (benchCardId: string) => boolean;
    confirmSwitchBenchSelection: (benchCardId: string) => void;
    confirmDiscardSelection: (cardIds: string[]) => void;
    confirmMultiDeckSelection: (cardIds: string[]) => void;
    confirmCarmineSelection: (cardIds: string[]) => void;
}

const useGameLogic = (externalGameState: GameState | null): GameLogicReturn => {
    const [gameState, setGameState] = useState<GameState | null>(externalGameState);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Logic state for turn-based restrictions and UI interactions
    const [logicState, setLogicState] = useState<GameLogicState>({
        hasAttachedEnergy: false,
        hasPlayedSupporter: false,
        hasPlayedStadium: false,
        hasTakenAction: false,
        premiumPowerProCount: 0,
        abilitiesUsed: [],
        coinFlipResult: null,
        selectedCard: null,
        actionMode: 'none',
        message: 'Welcome to PVCGL!',
        discardCount: 0,
        selectedCardIds: [],
    });

    // Initialize Game handled by useGameData

    // Update game state when external state changes
    useEffect(() => {
        if (externalGameState) {
            setGameState(externalGameState);
        }
    }, [externalGameState]);

    // Turn Timer Logic - runs for both player and opponent
    // Track the previous turn to detect actual turn changes
    const prevTurnRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const currentTurn = gameState?.turn;
        const currentPlayer = gameState?.currentPlayer;
        const timeRemaining = gameState?.timeRemaining;

        // Detect actual turn changes (turn number changed)
        const turnChanged = prevTurnRef.current !== undefined && prevTurnRef.current !== currentTurn;
        prevTurnRef.current = currentTurn;

        // Clear any existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Only run timer when there's a game state and time remaining > 0
        if (!gameState || !currentPlayer || (timeRemaining !== undefined && timeRemaining <= 0)) return;

        timerRef.current = setInterval(() => {
            setGameState(prev => {
                if (!prev) return prev;
                // Don't decrement if timer is already at 0 or below
                if (prev.timeRemaining <= 0) return prev;

                const newTime = prev.timeRemaining - 1;

                // Auto switch turn when timer hits 0
                if (newTime <= 0) {
                    // If it's opponent's turn, auto-end to player
                    // If it's player's turn, let the timer expiry effect handle it
                    if (prev.currentPlayer === 'opponent') {
                        return {
                            ...prev,
                            turn: prev.turn + 1,
                            currentPlayer: 'player',
                            timeRemaining: 60,
                            message: "Opponent timed out! Your turn!",
                        };
                    }
                    return { ...prev, timeRemaining: 0 };
                }

                return { ...prev, timeRemaining: newTime };
            });
        }, 1000);

        // Cleanup on unmount or when currentPlayer changes
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [gameState?.currentPlayer, gameState?.turn]); // Re-run when current player or turn changes



    const updateGameState = useCallback((newState: GameState) => {
        setGameState(newState);
    }, []);

    const flipCoin = useCallback(() => {
        const result = Math.random() < 0.5;
        setLogicState(prev => ({
            ...prev,
            coinFlipResult: result ? 'heads' : 'tails',
            message: result ? 'Heads!' : 'Tails!'
        }));
        return result;
    }, []);

    // Check availability logic
    const canPlayCard = useCallback((card: Card): { canPlay: boolean; reason?: string } => {
        if (!gameState || gameState.currentPlayer !== 'player') return { canPlay: false, reason: 'Not your turn' };

        if (card.type === 'pokemon') {
            if (card.subtypes?.includes('Basic')) {
                if (gameState.player.bench.length < 5) return { canPlay: true };
                return { canPlay: false, reason: 'Bench is full' };
            }
            // Evolution logic handled separately by potential targets
            return { canPlay: true };
        }

        if (card.type === 'trainer') {
            const isSupporter = card.subtypes?.includes('Supporter');
            const isStadium = card.subtypes?.includes('Stadium');

            if (isSupporter) {
                if (logicState.hasPlayedSupporter) {
                    return { canPlay: false, reason: 'Already played a Supporter this turn' };
                }
                if (gameState.turn === 1) {
                    return { canPlay: false, reason: 'Cannot play Supporters on the first turn' };
                }
            }

            if (isStadium && logicState.hasPlayedStadium) {
                return { canPlay: false, reason: 'Already played a Stadium this turn' };
            }

            return { canPlay: true };
        }

        if (card.type === 'energy') {
            if (logicState.hasAttachedEnergy) {
                return { canPlay: false, reason: 'Already attached energy this turn' };
            }
            return { canPlay: true };
        }

        return { canPlay: false, reason: 'Unknown card type' };
    }, [gameState, logicState]);

    // Play a Basic Pokemon to bench
    const playPokemonToBench = useCallback((cardId: string) => {
        if (!gameState) return false;

        const card = gameState.player.hand.find(c => c.id === cardId);
        if (!card || card.type !== 'pokemon') return false;
        if (gameState.player.bench.length >= 5) return false;

        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: prev.player.hand.filter(c => c.id !== cardId),
                    bench: [...prev.player.bench, { ...card, playedTurn: prev.turn }],
                },
                message: `${card.name} was placed on the bench!`,
            };
        });

        // Auto-trigger "when played to bench" abilities
        const flyingEntry = card.abilities?.find(a => a.name === 'Flying Entry');
        if (flyingEntry && gameState.opponent.bench.length > 0) {
            const targets = gameState.opponent.bench.slice(0, 2);
            setGameState(prev => {
                if (!prev) return prev;
                const newBench = prev.opponent.bench.map(b =>
                    targets.some(t => t.id === b.id)
                        ? { ...b, damageCounters: (b.damageCounters || 0) + 10 }
                        : b
                );
                const names = targets.map(t => t.name).join(' and ');
                return {
                    ...prev,
                    opponent: { ...prev.opponent, bench: newBench },
                    message: `Flying Entry: Put 1 damage counter on ${names}!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                message: `${card.name} played! Flying Entry: 10 damage to ${targets.length === 1 ? targets[0].name : '2 Benched Pokémon'}!`,
            }));
        } else {
            setLogicState(prev => ({
                ...prev,
                message: `${card.name} was placed on the bench!`,
            }));
        }

        return true;
    }, [gameState]);

    // Attach energy to a Pokemon
    const attachEnergy = useCallback((energyCardId: string, targetCardId: string) => {
        if (!gameState || logicState.hasAttachedEnergy) return false;

        const energyCard = gameState.player.hand.find(c => c.id === energyCardId);
        if (!energyCard || energyCard.type !== 'energy') return false;

        // Find target (active or bench)
        let targetCard: Card | undefined;
        let isActive = false;

        if (gameState.player.activePokemon?.id === targetCardId) {
            targetCard = gameState.player.activePokemon;
            isActive = true;
        } else {
            targetCard = gameState.player.bench.find(c => c.id === targetCardId);
        }

        if (!targetCard) return false;

        const energyType = energyCard.energyType || 'colorless';

        setGameState(prev => {
            if (!prev) return prev;

            const updatedCard: Card = {
                ...targetCard!,
                attachedEnergy: [...(targetCard!.attachedEnergy || []), energyType],
            };

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: prev.player.hand.filter(c => c.id !== energyCardId),
                    activePokemon: isActive ? updatedCard : prev.player.activePokemon,
                    bench: isActive
                        ? prev.player.bench
                        : prev.player.bench.map(c => c.id === targetCardId ? updatedCard : c),
                },
                message: `Attached ${energyType} energy to ${targetCard!.name}!`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            hasAttachedEnergy: true,
            actionMode: 'none',
            selectedCard: null,
            message: `Attached energy to ${targetCard!.name}!`,
        }));

        return true;
    }, [gameState, logicState.hasAttachedEnergy]);

    // Evolve a Pokemon
    const evolvePokemon = useCallback((evolutionCardId: string, targetCardId: string) => {
        if (!gameState) return false;

        const evolutionCard = gameState.player.hand.find(c => c.id === evolutionCardId);
        if (!evolutionCard || evolutionCard.type !== 'pokemon') return false;

        // Find target (active or bench)
        let targetCard: Card | undefined;
        let isActive = false;

        if (gameState.player.activePokemon?.id === targetCardId) {
            targetCard = gameState.player.activePokemon;
            isActive = true;
        } else {
            targetCard = gameState.player.bench.find(c => c.id === targetCardId);
        }

        if (!targetCard) return false;

        // Evolution Rule: Cannot evolve on the turn played (unless Rare Candy etc, which we don't have yet)
        // playedTurn is 0 for initial setup
        if (targetCard.playedTurn !== undefined && targetCard.playedTurn >= gameState.turn) {
            setLogicState(prev => ({
                ...prev,
                message: 'Cannot evolve a Pokemon the turn it is played!',
            }));
            return false;
        }

        // Transfer attached energy to evolution and store pre-evolution
        const evolvedCard: Card = {
            ...evolutionCard,
            attachedEnergy: targetCard.attachedEnergy || [],
            previousEvolutions: [...(targetCard.previousEvolutions || []), targetCard], // Stack evolutions
            playedTurn: gameState.turn, // Evolving counts as entering play for the new stage
        };

        setGameState(prev => {
            if (!prev) return prev;

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: prev.player.hand.filter(c => c.id !== evolutionCardId),
                    activePokemon: isActive ? evolvedCard : prev.player.activePokemon,
                    bench: isActive
                        ? prev.player.bench
                        : prev.player.bench.map(c => c.id === targetCardId ? evolvedCard : c),
                    // Do NOT discard the pre-evolution (it's under the new card)
                    discardPile: prev.player.discardPile,
                },
                message: `${targetCard!.name} evolved into ${evolutionCard.name}!`,
            };
        });

        const prevOppBenchSize = gameState.opponent.bench.length;

        const isHariyamaAbility = evolvedCard.name === 'Hariyama' && prevOppBenchSize > 0;

        // Jewel Seeker (Noctowl): auto-trigger on evolve if Tera Pokémon in play
        const hasJewelSeeker = evolvedCard.abilities?.some(a => a.name === 'Jewel Seeker');
        const allPlayerPokemon = [gameState.player.activePokemon, ...gameState.player.bench].filter(Boolean);
        const hasTera = allPlayerPokemon.some(p => p?.subtypes?.includes('Tera'));
        const trainersInDeck = gameState.player.deck.filter(c => c.type === 'trainer');
        const isJewelSeekerActive = hasJewelSeeker && hasTera && trainersInDeck.length > 0;

        if (isHariyamaAbility) {
            setLogicState(prev => ({
                ...prev,
                actionMode: 'switch_opponent_active',
                activeCardId: evolvedCard.id,
                selectedCard: null,
                message: `${targetCard!.name} evolved into ${evolutionCard.name}! Select a Pokémon from opponent bench to switch.`,
            }));
        } else if (isJewelSeekerActive) {
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'jewel_seeker_trainers_' + evolvedCard.id,
                discardCount: 2,
                abilitiesUsed: [...prev.abilitiesUsed, evolvedCard.id, 'Jewel Seeker'],
                selectedCard: null,
                message: `${evolutionCard.name} evolved! Jewel Seeker: Select up to 2 Trainer cards from your deck.`,
            }));
        } else {
            setLogicState(prev => ({
                ...prev,
                actionMode: 'none',
                activeCardId: undefined,
                selectedCard: null,
                message: `${targetCard!.name} evolved into ${evolutionCard.name}!`,
            }));
        }

        return true;
    }, [gameState]);

    // Play trainer card
    const playTrainer = useCallback((cardId: string) => {
        if (!gameState) return false;

        const card = gameState.player.hand.find(c => c.id === cardId);
        if (!card || card.type !== 'trainer') return false;

        const isSupporter = card.subtypes?.includes('Supporter');
        const isStadium = card.subtypes?.includes('Stadium');
        const isItem = card.subtypes?.includes('Item');

        // Opponent's Itchy Pollen lock — player can't use Items this turn
        if (isItem && gameState.playerItemLocked) {
            setLogicState(prev => ({
                ...prev,
                message: 'You cannot play Item cards this turn (your opponent used Itchy Pollen)!',
            }));
            return false;
        }

        if (isSupporter) {
            if (logicState.hasPlayedSupporter) return false;
            // First Turn Restriction
            if (gameState.turn === 1) {
                setLogicState(prev => ({ ...prev, message: 'Cannot play Supporters on the first turn!' }));
                return false;
            }
        }

        // Stadium cards
        if (isStadium) {
            setGameState(prev => {
                if (!prev) return prev;
                if (prev.stadium?.name === card.name) return prev;

                const oldStadium = prev.stadium;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: oldStadium
                            ? [...prev.player.discardPile, oldStadium]
                            : prev.player.discardPile,
                    },
                    stadium: card,
                    stadiumOwner: 'player',
                    message: `Stadium: ${card.name} is now in play!`,
                };
            });

            setLogicState(prev => ({
                ...prev,
                hasPlayedStadium: true,
                message: `Stadium: ${card.name} is now in play!`,
            }));

            return true;
        }

        // Trainer effects
        let extraCards = 0;
        let discardHand = false;
        const cardNameLower = card.name.toLowerCase();

        if (cardNameLower.includes('nest ball')) {
            if (gameState.player.bench.length >= 5) {
                setLogicState(prev => ({ ...prev, message: 'Your bench is full!' }));
                return false;
            }

            const basicPokemonInDeck = gameState.player.deck.filter(
                c => c.type === 'pokemon' && c.subtypes?.includes('Basic')
            );

            if (basicPokemonInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Basic Pokemon in deck!' }));
                return false;
            }

            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_basic',
                activeCardId: cardId,
                message: 'Select a Basic Pokemon from your deck.',
            }));
            return true;
        }

        if (cardNameLower.includes('ultra ball')) {
            const otherCards = gameState.player.hand.filter(c => c.id !== cardId);
            if (otherCards.length < 2) {
                setLogicState(prev => ({
                    ...prev,
                    message: `Not enough cards to play ${card.name}. Need 2 to discard.`,
                }));
                return false;
            }

            setLogicState(prev => ({
                ...prev,
                actionMode: 'discard_from_hand',
                activeCardId: cardId,
                discardCount: 2,
                message: `Select 2 cards to discard for ${card.name}.`,
            }));
            return true;
        }

        if (cardNameLower.includes('boss') || (cardNameLower.includes('gust') && cardNameLower.includes('orders'))) {
            if (gameState.opponent.bench.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'Opponent has no benched Pokemon!' }));
                return false;
            }
            setLogicState(prev => ({
                ...prev,
                actionMode: 'switch_opponent_active',
                activeCardId: cardId,
                message: 'Select a Pokemon from opponent bench to switch with Active.',
            }));
            return true;
        }

        if (cardNameLower.includes('lillie') || (cardNameLower.includes('determination'))) {
            // Lillie's Determination: Shuffle hand into deck, draw 6 cards (8 if exactly 6 prizes)
            const prizesRemaining = gameState.player.prizeCards.length;
            const cardsToDraw = prizesRemaining === 6 ? 8 : 6;

            setGameState(prev => {
                if (!prev) return prev;

                // Shuffle hand into deck
                const shuffledDeck = [...prev.player.deck, ...prev.player.hand];
                for (let i = shuffledDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
                }

                // Draw new cards
                const drawnCards = shuffledDeck.slice(0, cardsToDraw);
                const remainingDeck = shuffledDeck.slice(cardsToDraw);

                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: drawnCards,
                        deck: remainingDeck,
                        discardPile: [...prev.player.discardPile, card],
                    },
                    message: `Lillie's Determination: Shuffled hand, drew ${cardsToDraw} cards!`,
                };
            });

            setLogicState(prev => ({
                ...prev,
                hasPlayedSupporter: true,
                message: `Drew ${cardsToDraw} cards!`,
            }));
            return true;
        }

        if (cardNameLower.includes('premium') && cardNameLower.includes('power')) {
            // Premium Power Pro: Your Pokemon attacks do +30 damage this turn (stacks)
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                    message: `Premium Power Pro: Attacks +${(logicState.premiumPowerProCount + 1) * 30} damage this turn!`,
                };
            });

            setLogicState(prev => ({
                ...prev,
                premiumPowerProCount: prev.premiumPowerProCount + 1,
                message: `Your Pokemon attacks do +${(logicState.premiumPowerProCount + 1) * 30} damage this turn!`,
            }));
            return true;
        }

        if (cardNameLower.includes('fighting') && cardNameLower.includes('gong')) {
            // Fighting Gong: Search for Basic Fighting Energy OR Basic Fighting Pokemon
            const basicFightingInDeck = gameState.player.deck.filter(c =>
                (c.type === 'pokemon' && c.subtypes?.includes('Basic') && c.energyType === 'fighting') ||
                (c.type === 'energy' && c.energyType === 'fighting')
            );

            if (basicFightingInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Basic Fighting Pokemon or Energy in deck!' }));
                return false;
            }

            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_fighting',
                activeCardId: cardId,
                message: 'Select Basic Fighting Pokemon or Energy from your deck.',
            }));
            return true;
        }

        // Switch — swap player's active with a bench Pokémon
        if (cardNameLower === 'switch' || cardNameLower.startsWith('switch ')) {
            if (gameState.player.bench.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Benched Pokémon to switch with!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'retreat_select_bench',
                activeCardId: cardId,
                message: 'Select a Benched Pokémon to switch with your Active.',
            }));
            return true;
        }

        // Super Rod — shuffle up to 3 cards from discard back into deck
        if (cardNameLower.includes('super rod')) {
            const discardCount = gameState.player.discardPile.length;
            if (discardCount === 0) {
                setLogicState(prev => ({ ...prev, message: 'Discard pile is empty!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'select_discard_multiple',
                activeCardId: cardId,
                discardCount: 3,
                message: 'Select up to 3 Pokémon or Energy from your discard to shuffle into your deck.',
            }));
            return true;
        }

        // Night Stretcher — put a Pokémon from discard to hand, OR attach Energy from discard to benched
        if (cardNameLower.includes('night stretcher')) {
            const pokemonInDiscard = gameState.player.discardPile.filter(c => c.type === 'pokemon');
            if (pokemonInDiscard.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Pokémon in discard pile!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'select_from_discard',
                activeCardId: 'night_stretcher_pokemon',
                message: 'Select a Pokémon from your discard pile to put into your hand.',
            }));
            return true;
        }

        // Rare Candy — evolve a Basic directly into a Stage 2 (skip Stage 1)
        if (cardNameLower.includes('rare candy')) {
            const stage2InHand = gameState.player.hand.filter(
                c => c.type === 'pokemon' && c.subtypes?.includes('Stage 2') && c.id !== cardId
            );
            if (stage2InHand.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Stage 2 Pokémon in hand!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'evolve',
                activeCardId: cardId,
                message: 'Select a Stage 2 Pokémon in hand, then select the Basic to evolve (Rare Candy skips Stage 1).',
            }));
            return true;
        }

        // Judge — both players shuffle hand into deck, draw 4
        if (cardNameLower === 'judge') {
            setGameState(prev => {
                if (!prev) return prev;
                const newDeck = [...prev.player.deck, ...prev.player.hand.filter(c => c.id !== cardId)];
                for (let i = newDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
                }
                const drawn = newDeck.splice(0, 4);
                // Opponent also shuffles and draws 4
                const oppDeck = [...prev.opponent.deck, ...prev.opponent.hand];
                for (let i = oppDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [oppDeck[i], oppDeck[j]] = [oppDeck[j], oppDeck[i]];
                }
                const oppDrawn = oppDeck.splice(0, 4);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: drawn,
                        deck: newDeck,
                        discardPile: [...prev.player.discardPile, card],
                    },
                    opponent: {
                        ...prev.opponent,
                        hand: oppDrawn,
                        deck: oppDeck,
                    },
                    message: 'Judge: Both players shuffled their hands and drew 4 cards!',
                };
            });
            setLogicState(prev => ({ ...prev, hasPlayedSupporter: true, message: 'Judge! Both drew 4.' }));
            return true;
        }

        // Carmine — put 2 cards from hand on top of deck, draw 4
        if (cardNameLower === 'carmine') {
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'discard_from_hand',
                activeCardId: 'carmine_topdeck',
                discardCount: 2,
                message: 'Carmine: Select 2 cards to put on top of your deck.',
                hasPlayedSupporter: true,
            }));
            return true;
        }

        // Briar — search deck for up to 2 Pokémon, put in hand
        if (cardNameLower === 'briar') {
            const pokemonInDeck = gameState.player.deck.filter(c => c.type === 'pokemon');
            if (pokemonInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Pokémon in deck!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'briar_search',
                discardCount: 2,
                hasPlayedSupporter: true,
                message: 'Briar: Search your deck for up to 2 Pokémon to put into your hand.',
            }));
            return true;
        }

        // Crispin — attach a basic Energy from discard to any of your Pokémon
        if (cardNameLower === 'crispin') {
            const energyInDiscard = gameState.player.discardPile.filter(c => c.type === 'energy');
            if (energyInDiscard.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Energy in discard pile!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'attach_energy_from_discard',
                activeCardId: 'crispin_attach',
                discardCount: 1,
                hasPlayedSupporter: true,
                message: 'Crispin: Select a basic Energy from your discard pile to attach.',
            }));
            return true;
        }

        // Energy Retrieval — put 2 basic Energy from discard into hand
        if (cardNameLower.includes('energy retrieval')) {
            const energyInDiscard = gameState.player.discardPile.filter(c => c.type === 'energy');
            if (energyInDiscard.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Energy in discard pile!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                const toRetrieve = prev.player.discardPile.filter(c => c.type === 'energy').slice(0, 2);
                const ids = toRetrieve.map(c => c.id);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand.filter(c => c.id !== cardId), ...toRetrieve],
                        discardPile: [...prev.player.discardPile.filter(c => !ids.includes(c.id)), card],
                    },
                    message: `Energy Retrieval: Put ${toRetrieve.length} Energy into hand.`,
                };
            });
            setLogicState(prev => ({ ...prev, message: 'Retrieved 2 Energy from discard.' }));
            return true;
        }

        // Buddy-Buddy Poffin — search for 2 Basic Pokémon with ≤70 HP, put on bench
        if (cardNameLower.includes('buddy-buddy poffin') || cardNameLower.includes('buddy buddy poffin')) {
            if (gameState.player.bench.length >= 5) {
                setLogicState(prev => ({ ...prev, message: 'Your bench is full!' }));
                return false;
            }
            const smallBasics = gameState.player.deck.filter(
                c => c.type === 'pokemon' && c.subtypes?.includes('Basic') && (c.hp || 0) <= 70
            );
            if (smallBasics.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Basic Pokémon with ≤70 HP in deck!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'buddy_poffin',
                discardCount: Math.min(2, 5 - gameState.player.bench.length),
                message: 'Buddy-Buddy Poffin: Select up to 2 Basic Pokémon (≤70 HP) to put on your Bench.',
            }));
            return true;
        }

        // Jacq — search deck for an Evolution Pokémon, put into hand
        if (cardNameLower === 'jacq') {
            const evolutionInDeck = gameState.player.deck.filter(
                c => c.type === 'pokemon' && !c.subtypes?.includes('Basic')
            );
            if (evolutionInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Evolution Pokémon in deck!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'jacq_search',
                discardCount: 1,
                hasPlayedSupporter: true,
                message: 'Jacq: Select an Evolution Pokémon from your deck to put into your hand.',
            }));
            return true;
        }

        // Tarragon — retrieve up to 4 Fighting Energy from discard to hand
        if (cardNameLower === 'tarragon') {
            const fightingInDiscard = gameState.player.discardPile.filter(
                c => c.type === 'energy' && c.energyType === 'fighting'
            );
            if (fightingInDiscard.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Fighting Energy in discard pile!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                const toRetrieve = prev.player.discardPile
                    .filter(c => c.type === 'energy' && c.energyType === 'fighting')
                    .slice(0, 4);
                const ids = toRetrieve.map(c => c.id);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand.filter(c => c.id !== cardId), ...toRetrieve],
                        discardPile: [...prev.player.discardPile.filter(c => !ids.includes(c.id)), card],
                    },
                    message: `Tarragon: Retrieved ${toRetrieve.length} Fighting Energy from discard!`,
                };
            });
            setLogicState(prev => ({ ...prev, hasPlayedSupporter: true, message: 'Retrieved Fighting Energy!' }));
            return true;
        }

        // Brock's Scouting — search deck for up to 2 Evolution Pokémon, put into hand
        if (cardNameLower.includes("brock") && cardNameLower.includes("scouting")) {
            const evolutionInDeck = gameState.player.deck.filter(
                c => c.type === 'pokemon' && !c.subtypes?.includes('Basic')
            );
            if (evolutionInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Evolution Pokémon in deck!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'brocks_scouting',
                discardCount: 2,
                hasPlayedSupporter: true,
                message: "Brock's Scouting: Select up to 2 Evolution Pokémon from your deck.",
            }));
            return true;
        }

        // Counter Catcher — if you have fewer Prize Cards remaining, switch opponent's active
        if (cardNameLower.includes('counter catcher')) {
            const playerPrizes = gameState.player.prizeCards.length;
            const opponentPrizes = gameState.opponent.prizeCards.length;
            if (playerPrizes >= opponentPrizes) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Counter Catcher: You must have fewer Prize Cards remaining than your opponent!',
                }));
                return false;
            }
            if (gameState.opponent.bench.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'Opponent has no Benched Pokémon!' }));
                return false;
            }
            setLogicState(prev => ({
                ...prev,
                actionMode: 'switch_opponent_active',
                activeCardId: cardId,
                message: "Counter Catcher: Select a Pokémon from opponent's bench to switch with Active.",
            }));
            return true;
        }

        // Unfair Stamp — opponent shuffles hand, draws 3; only if you have taken 1–3 Prizes
        if (cardNameLower.includes('unfair stamp')) {
            const prizesTaken = 6 - gameState.player.prizeCards.length;
            if (prizesTaken < 1 || prizesTaken > 3) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Unfair Stamp: You must have taken 1–3 Prize Cards!',
                }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                const oppDeck = [...prev.opponent.deck, ...prev.opponent.hand];
                for (let i = oppDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [oppDeck[i], oppDeck[j]] = [oppDeck[j], oppDeck[i]];
                }
                const oppDrawn = oppDeck.splice(0, 3);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                    opponent: { ...prev.opponent, hand: oppDrawn, deck: oppDeck },
                    message: 'Unfair Stamp: Opponent shuffled hand and drew 3 cards!',
                };
            });
            setLogicState(prev => ({ ...prev, message: 'Unfair Stamp played!' }));
            return true;
        }

        // Poké Pad — search deck for a Pokémon Tool or basic Energy, put into hand
        if (cardNameLower.includes('poké pad') || cardNameLower.includes('poke pad')) {
            const toolOrEnergy = gameState.player.deck.filter(
                c => c.type === 'energy' || (c.type === 'trainer' && c.subtypes?.includes('Pokémon Tool'))
            );
            if (toolOrEnergy.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Tool or Energy cards in deck!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== cardId),
                        discardPile: [...prev.player.discardPile, card],
                    },
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'poke_pad',
                discardCount: 1,
                message: 'Poké Pad: Select a Pokémon Tool or Energy from your deck.',
            }));
            return true;
        }

        // Professor's Research / any Research supporter
        if (cardNameLower.includes('professor') || cardNameLower.includes('research')) {
            discardHand = true;
            extraCards = 7;
        } else if (cardNameLower.includes('iono')) {
            extraCards = 4;
        }

        setGameState(prev => {
            if (!prev) return prev;

            let currentHand = prev.player.hand.filter(c => c.id !== cardId);
            let discardPile = [...prev.player.discardPile, card];

            if (discardHand) {
                discardPile = [...discardPile, ...currentHand];
                currentHand = [];
            }

            const drawnCards = prev.player.deck.slice(0, extraCards);
            const remainingDeck = prev.player.deck.slice(extraCards);

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...currentHand, ...drawnCards],
                    deck: remainingDeck,
                    discardPile: discardPile,
                },
                message: `Played ${card.name}!${discardHand ? ' Discarded hand.' : ''}${extraCards > 0 ? ` Drew ${extraCards} cards.` : ''}`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            hasPlayedSupporter: isSupporter ? true : prev.hasPlayedSupporter,
            message: `Played ${card.name}!`,
        }));

        return true;
    }, [gameState, logicState.hasPlayedSupporter]);

    const confirmDiscard = useCallback((discardedCardIds: string[]) => {
        if (!gameState || !logicState.activeCardId) return;

        // Find the source card (Trainer in hand or Pokemon on board)
        const handSource = gameState.player.hand.find(c => c.id === logicState.activeCardId);
        const boardSource = gameState.player.activePokemon?.id === logicState.activeCardId
            ? gameState.player.activePokemon
            : gameState.player.bench.find(c => c.id === logicState.activeCardId);

        const sourceCard = handSource || boardSource;
        if (!sourceCard) return;

        setGameState(prev => {
            if (!prev) return prev;

            const cardsToDiscard = prev.player.hand.filter(c => discardedCardIds.includes(c.id));
            const newHand = prev.player.hand.filter(c => !discardedCardIds.includes(c.id));

            // If it's a trainer, it also gets discarded
            const updatedHand = handSource ? newHand.filter(c => c.id !== logicState.activeCardId) : newHand;
            const newDiscardPile = [...prev.player.discardPile, ...cardsToDiscard];
            if (handSource) newDiscardPile.push(handSource);

            // Handle Draw effects for specific abilities
            let drawnCards: Card[] = [];
            let remainingDeck = [...prev.player.deck];
            let drawCount = 0;

            if (boardSource) {
                const activeAbility = boardSource.abilities?.find(a =>
                    (a.name === 'Lunar Cycle' || a.name === 'Concealed Cards')
                );
                if (activeAbility?.name === 'Lunar Cycle') drawCount = 3;
                else if (activeAbility?.name === 'Concealed Cards') drawCount = 2;
            }

            if (drawCount > 0) {
                drawnCards = remainingDeck.slice(0, drawCount);
                remainingDeck = remainingDeck.slice(drawCount);
            }

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...updatedHand, ...drawnCards],
                    discardPile: newDiscardPile,
                    deck: remainingDeck,
                },
                message: drawCount > 0
                    ? `Discarded ${cardsToDiscard.length} cards and drew ${drawCount} cards with ${sourceCard.name}!`
                    : `Discarded ${cardsToDiscard.length} cards for ${sourceCard.name}.`,
            };
        });

        // Transition logic
        if (handSource?.name.toLowerCase().includes('ultra ball')) {
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck',
                message: 'Select a Pokemon from your deck.',
            }));
        } else if (logicState.activeCardId === 'carmine_topdeck') {
            // Carmine: the discarded cards go on top of deck, then draw 4
            setGameState(prev => {
                if (!prev) return prev;
                const toTop = prev.player.discardPile
                    .filter(c => discardedCardIds.includes(c.id))
                    .slice(0, 2);
                const newDiscardAfterTop = prev.player.discardPile.filter(c => !discardedCardIds.includes(c.id));
                const newDeck = [...toTop, ...prev.player.deck];
                const drawn = newDeck.splice(0, 4);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand, ...drawn],
                        deck: newDeck,
                        discardPile: newDiscardAfterTop,
                    },
                    message: `Carmine: Put ${toTop.length} card(s) on top of deck and drew 4.`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                actionMode: 'none',
                activeCardId: undefined,
                message: 'Carmine complete.',
            }));
        } else {
            // Ability complete or other trainer
            setLogicState(prev => ({
                ...prev,
                actionMode: 'none',
                activeCardId: undefined,
                abilitiesUsed: boardSource ? [...prev.abilitiesUsed, boardSource.id, boardSource.abilities?.find(a => a.name === 'Lunar Cycle' || a.name === 'Concealed Cards')?.name].filter(Boolean) as string[] : prev.abilitiesUsed,
                message: 'Action complete.',
            }));
        }
    }, [gameState, logicState.activeCardId]);

    const confirmDeckSelection = useCallback((selectedCardIds: string[]) => {
        if (!gameState || selectedCardIds.length === 0) return;

        setGameState(prev => {
            if (!prev) return prev;

            const selectedCard = prev.player.deck.find(c => c.id === selectedCardIds[0]);
            if (!selectedCard) return prev;

            const newDeck = prev.player.deck.filter(c => c.id !== selectedCardIds[0]);
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...prev.player.hand, selectedCard],
                    deck: newDeck,
                },
                message: `Put ${selectedCard.name} into hand. Shuffled deck.`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: 'Search complete.',
        }));
    }, [gameState]);

    const confirmNestBallSelection = useCallback((selectedCardIds: string[]) => {
        if (!gameState || !logicState.activeCardId || selectedCardIds.length === 0) return;

        const nestBallCard = gameState.player.hand.find(c => c.id === logicState.activeCardId);
        if (!nestBallCard) return;

        const selectedCard = gameState.player.deck.find(c => c.id === selectedCardIds[0]);
        if (!selectedCard) return;

        setGameState(prev => {
            if (!prev) return prev;

            const newDeck = prev.player.deck.filter(c => c.id !== selectedCardIds[0]);
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }

            const newHand = prev.player.hand.filter(c => c.id !== logicState.activeCardId);

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: newHand,
                    deck: newDeck,
                    bench: [...prev.player.bench, { ...selectedCard, playedTurn: prev.turn }],
                    discardPile: [...prev.player.discardPile, nestBallCard],
                },
                message: `Put ${selectedCard.name} on bench! Shuffled deck.`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: `Put ${selectedCard.name} on bench!`,
        }));
    }, [gameState, logicState.activeCardId]);

    const drawCard = useCallback(() => {
        if (!gameState || gameState.player.deck.length === 0) return false;

        setGameState(prev => {
            if (!prev || prev.player.deck.length === 0) return prev;
            const [drawnCard, ...remainingDeck] = prev.player.deck;
            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...prev.player.hand, drawnCard],
                    deck: remainingDeck,
                },
                message: `Drew ${drawnCard.name}!`,
            };
        });
        return true;
    }, [gameState]);

    const setActivePokemon = useCallback((benchCardId: string) => {
        if (!gameState) return false;
        const benchCard = gameState.player.bench.find(c => c.id === benchCardId);
        if (!benchCard) return false;
        const currentActive = gameState.player.activePokemon;

        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                player: {
                    ...prev.player,
                    activePokemon: benchCard,
                    bench: currentActive
                        ? [...prev.player.bench.filter(c => c.id !== benchCardId), currentActive]
                        : prev.player.bench.filter(c => c.id !== benchCardId),
                },
                message: `${benchCard.name} is now active!`,
            };
        });
        return true;
    }, [gameState]);

    const confirmBossOrdersSelection = useCallback((benchCardId: string) => {
        if (!gameState || !logicState.activeCardId) return;

        // Find the source card (could be Boss's Orders in hand or Hariyama on board)
        const handSource = gameState.player.hand.find(c => c.id === logicState.activeCardId);
        const boardSource = (gameState.player.activePokemon?.id === logicState.activeCardId)
            ? gameState.player.activePokemon
            : gameState.player.bench.find(c => c.id === logicState.activeCardId);

        const sourceCard = handSource || boardSource;
        if (!sourceCard) return;

        const benchPokemon = gameState.opponent.bench.find(c => c.id === benchCardId);
        if (!benchPokemon) return;

        const opponentActive = gameState.opponent.activePokemon;
        if (!opponentActive) return;

        setGameState(prev => {
            if (!prev) return prev;

            // If it's a trainer, it gets discarded. If it's Hariyama, it stays on board.
            const isTrainer = sourceCard.type === 'trainer';

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: isTrainer ? prev.player.hand.filter(c => c.id !== logicState.activeCardId) : prev.player.hand,
                    discardPile: isTrainer ? [...prev.player.discardPile, sourceCard] : prev.player.discardPile,
                },
                opponent: {
                    ...prev.opponent,
                    activePokemon: benchPokemon,
                    bench: [opponentActive, ...prev.opponent.bench.filter(c => c.id !== benchCardId)],
                },
                message: `Switched ${benchPokemon.name} with Active!`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            hasPlayedSupporter: sourceCard.subtypes?.includes('Supporter') ? true : prev.hasPlayedSupporter,
            actionMode: 'none',
            activeCardId: undefined,
            message: `${sourceCard.name} switched ${benchPokemon.name} to Active!`,
        }));
    }, [gameState, logicState.activeCardId]);

    const confirmFightingGongSelection = useCallback((selectedCardIds: string[]) => {
        if (!gameState || !logicState.activeCardId || selectedCardIds.length === 0) return;

        const fightingGongCard = gameState.player.hand.find(c => c.id === logicState.activeCardId);
        if (!fightingGongCard) return;

        const selectedCard = gameState.player.deck.find(c => c.id === selectedCardIds[0]);
        if (!selectedCard) return;

        setGameState(prev => {
            if (!prev) return prev;

            const newDeck = prev.player.deck.filter(c => c.id !== selectedCardIds[0]);

            // Shuffle deck
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }

            const newHand = prev.player.hand.filter(c => c.id !== logicState.activeCardId);

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...newHand, selectedCard],
                    deck: newDeck,
                    discardPile: [...prev.player.discardPile, fightingGongCard],
                },
                message: `Found ${selectedCard.name}! Shuffled deck.`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: `Fighting Gong found ${selectedCard.name}!`,
        }));
    }, [gameState, logicState.activeCardId]);

    /** Retreat: pay retreat cost (discard energy from active), promote bench Pokémon */
    const retreat = useCallback((benchCardId: string) => {
        if (!gameState || gameState.currentPlayer !== 'player') return false;
        const active = gameState.player.activePokemon;
        if (!active) return false;

        const benchCard = gameState.player.bench.find(c => c.id === benchCardId);
        if (!benchCard) return false;

        const retreatCost = active.retreatCost || 0;
        const attachedEnergy = active.attachedEnergy || [];

        if (attachedEnergy.length < retreatCost) {
            setLogicState(prev => ({
                ...prev,
                message: `Not enough Energy to retreat ${active.name} (needs ${retreatCost})!`,
            }));
            return false;
        }

        setGameState(prev => {
            if (!prev || !prev.player.activePokemon) return prev;
            const updatedActive: Card = {
                ...prev.player.activePokemon,
                attachedEnergy: prev.player.activePokemon.attachedEnergy?.slice(retreatCost) || [],
                statusCondition: undefined, // retreating cures status
                cannotAttackNextTurn: false,
            };
            return {
                ...prev,
                player: {
                    ...prev.player,
                    activePokemon: benchCard,
                    bench: [
                        updatedActive,
                        ...prev.player.bench.filter(c => c.id !== benchCardId),
                    ],
                },
                message: `${active.name} retreated. ${benchCard.name} is now Active!`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            hasTakenAction: true,
        }));
        return true;
    }, [gameState]);

    /** Confirm bench selection for Switch trainer or retreat */
    const confirmSwitchBenchSelection = useCallback((benchCardId: string) => {
        if (!gameState) return;
        const benchCard = gameState.player.bench.find(c => c.id === benchCardId);
        if (!benchCard) return;

        setGameState(prev => {
            if (!prev || !prev.player.activePokemon) return prev;
            const currentActive = prev.player.activePokemon;
            return {
                ...prev,
                player: {
                    ...prev.player,
                    activePokemon: benchCard,
                    bench: [
                        currentActive,
                        ...prev.player.bench.filter(c => c.id !== benchCardId),
                    ],
                },
                message: `Switched ${benchCard.name} to Active!`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: `Switched ${benchCard.name} to Active!`,
        }));
    }, [gameState]);

    /** Confirm selecting cards from discard pile (Night Stretcher, Crispin, etc.) */
    const confirmDiscardSelection = useCallback((selectedCardIds: string[]) => {
        if (!gameState || selectedCardIds.length === 0) return;
        const sourceAction = logicState.activeCardId;

        setGameState(prev => {
            if (!prev) return prev;
            const selectedCards = prev.player.discardPile.filter(c => selectedCardIds.includes(c.id));
            const newDiscard = prev.player.discardPile.filter(c => !selectedCardIds.includes(c.id));

            if (sourceAction === 'night_stretcher_pokemon') {
                // Put selected Pokémon into hand
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand, ...selectedCards],
                        discardPile: newDiscard,
                    },
                    message: `Night Stretcher: Put ${selectedCards.map(c => c.name).join(', ')} into hand.`,
                };
            }

            if (sourceAction === 'crispin_attach') {
                // Attach energy to active
                const energyCard = selectedCards[0];
                if (!energyCard || !prev.player.activePokemon) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        activePokemon: {
                            ...prev.player.activePokemon,
                            attachedEnergy: [
                                ...(prev.player.activePokemon.attachedEnergy || []),
                                energyCard.energyType || 'colorless',
                            ],
                        },
                        discardPile: newDiscard,
                    },
                    message: `Crispin: Attached ${energyCard.name} to ${prev.player.activePokemon.name}.`,
                };
            }

            // Default: shuffle into deck (Super Rod)
            const newDeck = [...prev.player.deck, ...selectedCards];
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }
            return {
                ...prev,
                player: {
                    ...prev.player,
                    deck: newDeck,
                    discardPile: newDiscard,
                },
                message: `Shuffled ${selectedCards.length} card(s) into the deck.`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: 'Action complete.',
        }));
    }, [gameState, logicState.activeCardId]);

    /** Confirm multi-card deck search (Briar, Buddy-Buddy Poffin, Jewel Seeker, Night Shift, Fan Call) */
    const confirmMultiDeckSelection = useCallback((selectedCardIds: string[]) => {
        if (!gameState || selectedCardIds.length === 0) return;
        const sourceAction = logicState.activeCardId || '';

        setGameState(prev => {
            if (!prev) return prev;
            const selectedCards = prev.player.deck.filter(c => selectedCardIds.includes(c.id));
            const newDeck = prev.player.deck.filter(c => !selectedCardIds.includes(c.id));
            // Shuffle remaining deck (except for abilities that look at top 3 — still shuffle rest)
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }

            if (sourceAction === 'buddy_poffin') {
                // Put basics on bench
                const benchable = selectedCards.filter(c => prev.player.bench.length + selectedCards.indexOf(c) < 5);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        deck: newDeck,
                        bench: [
                            ...prev.player.bench,
                            ...benchable.map(c => ({ ...c, playedTurn: prev.turn })),
                        ],
                    },
                    message: `Buddy-Buddy Poffin: Put ${benchable.map(c => c.name).join(', ')} on the Bench.`,
                };
            }

            // Briar and generic multi-search: put into hand
            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...prev.player.hand, ...selectedCards],
                    deck: newDeck,
                },
                message: `Found ${selectedCards.map(c => c.name).join(', ')}.`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: 'Search complete.',
        }));
    }, [gameState, logicState.activeCardId]);

    /** Carmine: put 2 cards on top of deck, then draw 4 */
    const confirmCarmineSelection = useCallback((cardIds: string[]) => {
        if (!gameState) return;
        setGameState(prev => {
            if (!prev) return prev;
            const toTop = prev.player.hand.filter(c => cardIds.includes(c.id));
            const remaining = prev.player.hand.filter(c => !cardIds.includes(c.id));
            const newDeck = [...toTop, ...prev.player.deck];
            const drawn = newDeck.splice(0, 4);
            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...remaining, ...drawn],
                    deck: newDeck,
                },
                message: `Carmine: Put ${toTop.length} card(s) on top of deck and drew 4.`,
            };
        });
        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            activeCardId: undefined,
            message: 'Carmine complete.',
        }));
    }, [gameState]);

    const endTurn = useCallback(() => {
        if (!gameState) return;
        setGameState(prev => {
            if (!prev) return prev;
            const [opponentDrawn, ...opponentRemainingDeck] = prev.opponent.deck;

            const statusMessages: string[] = [];

            // Process status conditions on each side's active Pokémon at end of turn
            let playerActive = prev.player.activePokemon;
            let opponentActive = prev.opponent.activePokemon;

            if (playerActive?.statusCondition) {
                const result = processStatusCondition(playerActive, () => Math.random() < 0.5);
                playerActive = result.pokemon;
                if (result.message) statusMessages.push(result.message);
                // Check KO from status damage
                if (playerActive && (playerActive.damageCounters || 0) >= (playerActive.hp || 1)) {
                    statusMessages.push(`${playerActive.name} was knocked out by status damage!`);
                    playerActive = undefined;
                }
            }

            if (opponentActive?.statusCondition) {
                const result = processStatusCondition(opponentActive, () => Math.random() < 0.5);
                opponentActive = result.pokemon;
                if (result.message) statusMessages.push(result.message);
                if (opponentActive && (opponentActive.damageCounters || 0) >= (opponentActive.hp || 1)) {
                    statusMessages.push(`${opponentActive.name} was knocked out by status damage!`);
                    opponentActive = undefined;
                }
            }

            // Clear paralysis from the current player's active (paralysis lasts 1 turn)
            const isPlayerTurn = prev.currentPlayer === 'player';
            if (isPlayerTurn && playerActive?.statusCondition === 'paralyzed') {
                playerActive = { ...playerActive, statusCondition: undefined, cannotAttackNextTurn: false };
            }
            if (!isPlayerTurn && opponentActive?.statusCondition === 'paralyzed') {
                opponentActive = { ...opponentActive, statusCondition: undefined, cannotAttackNextTurn: false };
            }

            let newPlayerActive = playerActive;
            let newPlayerBench = prev.player.bench;
            let newPlayerDiscard = prev.player.discardPile;

            if (!newPlayerActive && prev.player.activePokemon) {
                newPlayerDiscard = [...newPlayerDiscard, prev.player.activePokemon];
                if (newPlayerBench.length > 0) {
                    newPlayerActive = newPlayerBench[0];
                    newPlayerBench = newPlayerBench.slice(1);
                }
            }

            let newOpponentActive = opponentActive;
            let newOpponentBench = prev.opponent.bench;
            let newOpponentDiscard = prev.opponent.discardPile;

            if (!newOpponentActive && prev.opponent.activePokemon) {
                newOpponentDiscard = [...newOpponentDiscard, prev.opponent.activePokemon];
                if (newOpponentBench.length > 0) {
                    newOpponentActive = newOpponentBench[0];
                    newOpponentBench = newOpponentBench.slice(1);
                }
            }

            const baseMessage = prev.currentPlayer === 'player' ? "Opponent's turn" : 'Your turn! Draw a card.';
            const fullMessage = statusMessages.length > 0
                ? `${baseMessage} ${statusMessages.join(' ')}`
                : baseMessage;

            // Swap Itchy Pollen item lock: applies to whoever's turn it becomes
            const wasPlayerTurn = prev.currentPlayer === 'player';
            const newPlayerItemLocked = wasPlayerTurn ? false : prev.opponentItemLocked;
            const newOpponentItemLocked = wasPlayerTurn ? prev.opponentItemLocked : false;

            return {
                ...prev,
                turn: prev.turn + 1,
                currentPlayer: wasPlayerTurn ? 'opponent' : 'player',
                player: {
                    ...prev.player,
                    activePokemon: newPlayerActive,
                    bench: newPlayerBench,
                    discardPile: newPlayerDiscard,
                },
                opponent: {
                    ...prev.opponent,
                    activePokemon: newOpponentActive,
                    bench: newOpponentBench,
                    discardPile: newOpponentDiscard,
                    ...(opponentDrawn ? {
                        hand: [...prev.opponent.hand, opponentDrawn],
                        deck: opponentRemainingDeck,
                    } : {}),
                },
                message: fullMessage,
                timeRemaining: 60,
                playerItemLocked: newPlayerItemLocked,
                opponentItemLocked: newOpponentItemLocked,
            };
        });

        setLogicState({
            hasAttachedEnergy: false,
            hasPlayedSupporter: false,
            hasPlayedStadium: false,
            hasTakenAction: false,
            premiumPowerProCount: 0,
            abilitiesUsed: [],
            coinFlipResult: null,
            selectedCard: null,
            actionMode: 'none',
            message: '',
            discardCount: 0,
        });
    }, [gameState]);

    const useAbility = useCallback((cardId: string, abilityIndex: number) => {
        if (!gameState || gameState.currentPlayer !== 'player') return false;

        // Find card (Active or Bench)
        let card = gameState.player.activePokemon?.id === cardId ? gameState.player.activePokemon : gameState.player.bench.find(c => c.id === cardId);
        if (!card || !card.abilities || !card.abilities[abilityIndex]) return false;

        const ability = card.abilities[abilityIndex];

        // Check if already used
        if (logicState.abilitiesUsed.includes(cardId) || logicState.abilitiesUsed.includes(ability.name)) {
            setLogicState(prev => ({ ...prev, message: `You already used ${ability.name} this turn!` }));
            return false;
        }

        // --- Ability Logic Implementations ---

        // 1. Instant Charge (Rotom V) - Draw 3, End Turn
        if (ability.name === 'Instant Charge') {
            setGameState(prev => {
                if (!prev) return prev;
                const cardsToDraw = 3;
                const newHand = [...prev.player.hand];
                const newDeck = [...prev.player.deck];

                for (let i = 0; i < cardsToDraw; i++) {
                    if (newDeck.length > 0) newHand.push(newDeck.shift()!);
                }

                return {
                    ...prev,
                    player: { ...prev.player, hand: newHand, deck: newDeck },
                    message: `Used Instant Charge. Drew 3 cards.`
                };
            });
            // Mark as used and End Turn
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Used Instant Charge. Ending turn...'
            }));

            // End turn after small delay or immediately
            setTimeout(endTurn, 1000);
            return true;
        }

        // 2. Conniealed Cards (Radiant Greninja) - Discard Energy, Draw 2
        if (ability.name === 'Concealed Cards') {
            // Check for Energy in hand
            const hasEnergy = gameState.player.hand.some(c => c.type === 'energy');
            if (!hasEnergy) {
                setLogicState(prev => ({ ...prev, message: 'You need an Energy card in hand to use this!' }));
                return false;
            }

            // Trigger Discard Mode
            setLogicState(prev => ({
                ...prev,
                actionMode: 'discard_from_hand',
                activeCardId: cardId, // Store who is using the ability
                discardCount: 1,
                message: 'Select an Energy card to discard for Concealed Cards.'
            }));
            return true;
        }

        // 3. Lunar Cycle (Lunatone) - Discard Fighting Energy, Draw 3 (If Solrock in play)
        if (ability.name === 'Lunar Cycle') {
            // Check for Solrock
            const hasSolrock = gameState.player.activePokemon?.name.includes('Solrock') || gameState.player.bench.some(c => c.name.includes('Solrock'));
            if (!hasSolrock) {
                setLogicState(prev => ({ ...prev, message: 'You need Solrock in play to use this!' }));
                return false;
            }

            // Check for Fighting Energy in hand
            const hasFightingEnergy = gameState.player.hand.some(c =>
                c.type === 'energy' && (c.energyType === 'fighting' || c.name.toLowerCase().includes('fighting'))
            );
            if (!hasFightingEnergy) {
                setLogicState(prev => ({ ...prev, message: 'You need a Fighting Energy in hand to use this!' }));
                return false;
            }

            // Trigger Discard Mode
            setLogicState(prev => ({
                ...prev,
                actionMode: 'discard_from_hand',
                activeCardId: cardId, // Store who using
                discardCount: 1,
                message: 'Select a Fighting Energy to discard for Lunar Cycle.'
            }));
            return true;
        }

        // 4. Wave Veil (Passive) - No activation needed
        if (ability.name === 'Wave Veil') {
            setLogicState(prev => ({ ...prev, message: 'This ability is always active (Passive).' }));
            return false;
        }

        // 5. Sinister Hand / Shadowy Trickery (Dusknoir) - move damage from opp bench to opp active
        if (ability.name === 'Sinister Hand' || ability.name === 'Shadowy Trickery') {
            const totalBenchDamage = gameState.opponent.bench.reduce((sum, b) => sum + (b.damageCounters || 0), 0);
            if (totalBenchDamage === 0) {
                setLogicState(prev => ({ ...prev, message: 'No damage counters on opponent\'s Bench!' }));
                return false;
            }
            setGameState(prev => {
                if (!prev || !prev.opponent.activePokemon) return prev;
                const moved = totalBenchDamage;
                return {
                    ...prev,
                    opponent: {
                        ...prev.opponent,
                        activePokemon: {
                            ...prev.opponent.activePokemon,
                            damageCounters: (prev.opponent.activePokemon.damageCounters || 0) + moved,
                        },
                        bench: prev.opponent.bench.map(b => ({ ...b, damageCounters: 0 })),
                    },
                    message: `${ability.name}: Moved ${moved} damage counters to opponent's Active Pokémon!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: `${ability.name} used!`,
            }));
            return true;
        }

        // 6. Binding Toxin (Munkidori) - Poison opponent's Active Pokémon
        if (ability.name === 'Binding Toxin' || ability.name === 'Toxic Scales') {
            if (!gameState.opponent.activePokemon) return false;
            setGameState(prev => {
                if (!prev || !prev.opponent.activePokemon) return prev;
                return {
                    ...prev,
                    opponent: {
                        ...prev.opponent,
                        activePokemon: {
                            ...prev.opponent.activePokemon,
                            statusCondition: 'poisoned',
                            poisonCounters: 1,
                        },
                    },
                    message: `${ability.name}: Opponent's Active Pokémon is now Poisoned!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: `${card.name} Poisoned the opponent's Active!`,
            }));
            return true;
        }

        // 7. Sparkling Scales (Fezandipiti ex) - passive damage reduction for bench
        if (ability.name === 'Sparkling Scales' || ability.name === 'Brilliant Scales') {
            setLogicState(prev => ({ ...prev, message: 'This ability is passive — Benched Pokémon take -20 damage.' }));
            return false;
        }

        // 8. Generic draw ability — "draw X cards" text in ability
        const abilityText = ability.text?.toLowerCase() || '';
        const drawMatch = abilityText.match(/draw (\d+) cards?/);
        if (drawMatch) {
            const drawCount = parseInt(drawMatch[1]);
            setGameState(prev => {
                if (!prev) return prev;
                const drawn = prev.player.deck.slice(0, drawCount);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand, ...drawn],
                        deck: prev.player.deck.slice(drawCount),
                    },
                    message: `${ability.name}: Drew ${drawn.length} card(s)!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: `${ability.name} drew ${drawCount} cards.`,
            }));
            return true;
        }

        // 9. Generic "put X damage counters" ability — bench sniping
        const putDamageMatch = abilityText.match(/put (\d+) damage counters? on/);
        if (putDamageMatch && abilityText.includes('opponent')) {
            const counters = parseInt(putDamageMatch[1]);
            const dmg = counters * 10;
            if (!gameState.opponent.activePokemon) return false;
            setGameState(prev => {
                if (!prev || !prev.opponent.activePokemon) return prev;
                return {
                    ...prev,
                    opponent: {
                        ...prev.opponent,
                        activePokemon: {
                            ...prev.opponent.activePokemon,
                            damageCounters: (prev.opponent.activePokemon.damageCounters || 0) + dmg,
                        },
                    },
                    message: `${ability.name}: Put ${counters} damage counter(s) on opponent's Active!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: `${ability.name} used.`,
            }));
            return true;
        }

        // 10. Generic heal ability — "remove X damage counters from"
        const healMatch = abilityText.match(/remove (\d+) damage counters? from/);
        if (healMatch) {
            const counters = parseInt(healMatch[1]);
            const healAmt = counters * 10;
            setGameState(prev => {
                if (!prev || !prev.player.activePokemon) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        activePokemon: {
                            ...prev.player.activePokemon,
                            damageCounters: Math.max(0, (prev.player.activePokemon.damageCounters || 0) - healAmt),
                        },
                    },
                    message: `${ability.name}: Healed ${healAmt} damage from Active Pokémon!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: `${ability.name} healed ${healAmt}.`,
            }));
            return true;
        }

        // 11. Generic search ability — "search your deck for" → put in hand
        if (abilityText.includes('search your deck for') && abilityText.includes('pokémon')) {
            const pokemonInDeck = gameState.player.deck.filter(c => c.type === 'pokemon');
            if (pokemonInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Pokémon in deck!' }));
                return false;
            }
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck',
                activeCardId: cardId,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: `${ability.name}: Select a Pokémon from your deck.`,
            }));
            return true;
        }

        // 12. Generic status-inflicting ability
        if (abilityText.includes('is now poisoned') || abilityText.includes('becomes poisoned')) {
            if (!gameState.opponent.activePokemon) return false;
            setGameState(prev => {
                if (!prev || !prev.opponent.activePokemon) return prev;
                return {
                    ...prev,
                    opponent: {
                        ...prev.opponent,
                        activePokemon: { ...prev.opponent.activePokemon, statusCondition: 'poisoned', poisonCounters: 1 },
                    },
                    message: `${ability.name}: Opponent's Active is Poisoned!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
            }));
            return true;
        }

        // Flip the Script (Fezandipiti ex): if any of your Pokémon were KO'd last turn, draw 3 cards
        if (ability.name === 'Flip the Script') {
            // We check opponent discard as a proxy for "KO'd last turn" — if opponent has discarded Pokémon, allow it
            // In a real game this would be tracked precisely, but we allow it if opponent has any discarded Pokémon
            setGameState(prev => {
                if (!prev) return prev;
                const drawn = prev.player.deck.slice(0, 3);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand, ...drawn],
                        deck: prev.player.deck.slice(3),
                    },
                    message: 'Flip the Script: Drew 3 cards!',
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Flip the Script: Drew 3 cards!',
            }));
            return true;
        }

        // Mortal Shuriken (Mega Greninja ex): discard a Water Energy from hand, place 6 damage counters on any opponent's Pokémon
        if (ability.name === 'Mortal Shuriken') {
            // Must be in the Active Spot
            if (gameState.player.activePokemon?.id !== cardId) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Mortal Shuriken: This Pokémon must be in the Active Spot!',
                }));
                return false;
            }
            // Must have a Basic Water Energy in hand to discard
            const waterInHand = gameState.player.hand.filter(
                c => c.type === 'energy' && c.energyType === 'water'
            );
            if (waterInHand.length === 0) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Mortal Shuriken: You need a Basic Water Energy in your hand to discard!',
                }));
                return false;
            }
            if (!gameState.opponent.activePokemon) return false;
            const energyToDiscard = waterInHand[0];
            setGameState(prev => {
                if (!prev || !prev.opponent.activePokemon) return prev;
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: prev.player.hand.filter(c => c.id !== energyToDiscard.id),
                        discardPile: [...prev.player.discardPile, energyToDiscard],
                    },
                    opponent: {
                        ...prev.opponent,
                        activePokemon: {
                            ...prev.opponent.activePokemon,
                            damageCounters: (prev.opponent.activePokemon.damageCounters || 0) + 60,
                        },
                    },
                    message: `Mortal Shuriken: Discarded Water Energy, placed 6 damage counters on ${prev.opponent.activePokemon.name}!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Mortal Shuriken: 60 damage to opponent\'s Active!',
            }));
            return true;
        }

        // Jewel Seeker (Noctowl): search deck for up to 2 Trainer cards (requires Tera Pokémon in play)
        // Triggered when Noctowl evolves — but also usable manually this turn as a fallback
        if (ability.name === 'Jewel Seeker') {
            const allPlayerPokemon = [gameState.player.activePokemon, ...gameState.player.bench].filter(Boolean);
            const hasTera = allPlayerPokemon.some(p => p?.subtypes?.includes('Tera'));
            if (!hasTera) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Jewel Seeker: You need a Tera Pokémon in play!',
                }));
                return false;
            }
            const trainersInDeck = gameState.player.deck.filter(c => c.type === 'trainer');
            if (trainersInDeck.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Trainer cards in deck!' }));
                return false;
            }
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'jewel_seeker_trainers_' + cardId,
                discardCount: 2,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Jewel Seeker: Select up to 2 Trainer cards from your deck.',
            }));
            return true;
        }

        // Fan Call (Fan Rotom): search deck for up to 3 Colorless Pokémon with ≤100 HP (first turn only)
        if (ability.name === 'Fan Call') {
            if (gameState.turn > 2) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Fan Call can only be used on your first turn!',
                }));
                return false;
            }
            const colorlessPokemon = gameState.player.deck.filter(
                c => c.type === 'pokemon' && (c.energyType === 'colorless' || !c.energyType) && (c.hp || 0) <= 100
            );
            if (colorlessPokemon.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Colorless Pokémon with ≤100 HP in deck!' }));
                return false;
            }
            setLogicState(prev => ({
                ...prev,
                actionMode: 'search_deck_multiple',
                activeCardId: 'fan_call_' + cardId,
                discardCount: 3,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Fan Call: Select up to 3 Colorless Pokémon with ≤100 HP from your deck.',
            }));
            return true;
        }

        // Flying Entry (Hawlucha): put 1 damage counter on each of 2 opponent's Benched Pokémon
        if (ability.name === 'Flying Entry') {
            if (gameState.opponent.bench.length === 0) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Flying Entry: Opponent has no Benched Pokémon!',
                }));
                return false;
            }
            setGameState(prev => {
                if (!prev) return prev;
                // Put 1 damage counter on up to 2 Benched Pokémon
                const targets = prev.opponent.bench.slice(0, 2);
                const newBench = prev.opponent.bench.map(b =>
                    targets.some(t => t.id === b.id)
                        ? { ...b, damageCounters: (b.damageCounters || 0) + 10 }
                        : b
                );
                const names = targets.map(t => t.name).join(' and ');
                return {
                    ...prev,
                    opponent: { ...prev.opponent, bench: newBench },
                    message: `Flying Entry: Put 1 damage counter on ${names}!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Flying Entry: 10 damage to 2 opponent Bench Pokémon!',
            }));
            return true;
        }

        // Teal Dance (Teal Mask Ogerpon ex): attach a Basic Grass Energy from hand to THIS Pokémon, then draw 1
        if (ability.name === 'Teal Dance') {
            const grassInHand = gameState.player.hand.filter(
                c => c.type === 'energy' && c.energyType === 'grass'
            );
            if (grassInHand.length === 0) {
                setLogicState(prev => ({ ...prev, message: 'No Basic Grass Energy in hand to attach!' }));
                return false;
            }
            const energyCard = grassInHand[0];
            // Find Teal Mask Ogerpon ex on the board (active or bench)
            const tealOgerpon = gameState.player.activePokemon?.id === cardId
                ? gameState.player.activePokemon
                : gameState.player.bench.find(c => c.id === cardId);
            if (!tealOgerpon) return false;
            const isActive = gameState.player.activePokemon?.id === cardId;
            setGameState(prev => {
                if (!prev) return prev;
                const updatedOgerpon = {
                    ...(isActive ? prev.player.activePokemon! : prev.player.bench.find(c => c.id === cardId)!),
                    attachedEnergy: [
                        ...((isActive ? prev.player.activePokemon : prev.player.bench.find(c => c.id === cardId))?.attachedEnergy || []),
                        'grass' as const,
                    ],
                };
                const drawn = prev.player.deck.slice(0, 1);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        hand: [...prev.player.hand.filter(c => c.id !== energyCard.id), ...drawn],
                        deck: prev.player.deck.slice(1),
                        activePokemon: isActive ? updatedOgerpon : prev.player.activePokemon,
                        bench: isActive ? prev.player.bench : prev.player.bench.map(c => c.id === cardId ? updatedOgerpon : c),
                    },
                    message: `Teal Dance: Attached Grass Energy to ${tealOgerpon.name} and drew 1 card!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Teal Dance: Attached Grass Energy and drew 1!',
            }));
            return true;
        }

        // Adrena-Brain (Munkidori): if has Darkness Energy, move 3 damage counters from your Pokémon to opponent's Active
        if (ability.name === 'Adrena-Brain') {
            if (!card.attachedEnergy?.includes('darkness')) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'Adrena-Brain requires a Darkness Energy attached to Munkidori!',
                }));
                return false;
            }
            const playerActive = gameState.player.activePokemon;
            if (!playerActive || !gameState.opponent.activePokemon) return false;
            const fromCounters = Math.min(3, playerActive.damageCounters || 0);
            if (fromCounters === 0) {
                setLogicState(prev => ({
                    ...prev,
                    message: 'No damage counters on your Active Pokémon to move!',
                }));
                return false;
            }
            setGameState(prev => {
                if (!prev || !prev.player.activePokemon || !prev.opponent.activePokemon) return prev;
                const moveable = Math.min(3, prev.player.activePokemon.damageCounters || 0);
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        activePokemon: {
                            ...prev.player.activePokemon,
                            damageCounters: (prev.player.activePokemon.damageCounters || 0) - moveable,
                        },
                    },
                    opponent: {
                        ...prev.opponent,
                        activePokemon: {
                            ...prev.opponent.activePokemon,
                            damageCounters: (prev.opponent.activePokemon.damageCounters || 0) + moveable,
                        },
                    },
                    message: `Adrena-Brain: Moved ${moveable} damage counter(s) to opponent's Active!`,
                };
            });
            setLogicState(prev => ({
                ...prev,
                abilitiesUsed: [...prev.abilitiesUsed, cardId, ability.name],
                message: 'Adrena-Brain used!',
            }));
            return true;
        }

        // Passive abilities that are always active — no manual activation needed
        if (['Battle-Hardened', 'Order Shield', 'Transistor', 'Lands Force',
             'Stone Arms', 'Smokescreen Veil', 'Fallen Giant', 'Midnight Fluttering',
             'Wave Veil', 'Sparkling Scales', 'Brilliant Scales'].includes(ability.name)) {
            setLogicState(prev => ({
                ...prev,
                message: `${ability.name} is a passive Ability — it is always active and does not need to be used manually.`,
            }));
            return false;
        }

        // If no specific handler matched, show generic message
        setLogicState(prev => ({
            ...prev,
            message: `${ability.name}: This ability has no specific implementation yet.`,
        }));
        return false;
    }, [gameState, logicState, endTurn]);

    const confirmDiscardEnergySelection = useCallback((cardIds: string[]) => {
        setLogicState(prev => ({
            ...prev,
            selectedCardIds: cardIds,
            actionMode: 'distribute_energy_from_discard',
            message: `Select a Pokemon to attach Fighting Energy (${cardIds.length} remaining).`,
        }));
    }, []);

    const distributeEnergyToTarget = useCallback((targetId: string) => {
        if (logicState.actionMode === 'distribute_energy_from_discard' && logicState.selectedCardIds?.length) {
            setGameState(prev => {
                if (!prev) return prev;

                // Get the first energy from the selection
                const energyIdToAttach = logicState.selectedCardIds![0];
                const energyCard = prev.player.discardPile.find(c => c.id === energyIdToAttach);

                if (!energyCard) return prev;

                const remainingDiscard = prev.player.discardPile.filter(c => c.id !== energyIdToAttach);

                // Find target (Active or Bench)
                let newActive = prev.player.activePokemon;
                let newBench = [...prev.player.bench];
                let targetName = '';

                if (newActive?.id === targetId) {
                    newActive = {
                        ...newActive,
                        attachedEnergy: [...(newActive.attachedEnergy || []), energyCard.energyType || 'fighting'],
                    };
                    targetName = newActive.name;
                } else {
                    const benchIndex = newBench.findIndex(c => c.id === targetId);
                    if (benchIndex !== -1) {
                        const targetPokemon = newBench[benchIndex];
                        newBench[benchIndex] = {
                            ...targetPokemon,
                            attachedEnergy: [...(targetPokemon.attachedEnergy || []), energyCard.energyType || 'fighting'],
                        };
                        targetName = targetPokemon.name;
                    } else {
                        return prev; // Invalid target
                    }
                }

                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        discardPile: remainingDiscard,
                        activePokemon: newActive,
                        bench: newBench,
                    },
                    message: `Attached Energy to ${targetName}.`,
                };
            });

            // Allow state to update, then check remaining
            setLogicState(prev => {
                const remainingIds = prev.selectedCardIds!.slice(1);
                if (remainingIds.length === 0) {
                    // All connected
                    setTimeout(() => endTurn(), 1000);
                    return { ...prev, actionMode: 'none', selectedCardIds: [], message: 'Energy distribution complete.' };
                } else {
                    return {
                        ...prev,
                        selectedCardIds: remainingIds,
                        message: `Select a Pokemon to attach Fighting Energy (${remainingIds.length} remaining).`,
                    };
                }
            });
        }
    }, [logicState, gameState, endTurn]);

    const attack = useCallback((attackIndex: number) => {
        if (!gameState || gameState.currentPlayer !== 'player') return false;

        // First Turn Attack Ban: Player going first cannot attack on Turn 1
        if (gameState.turn === 1) {
            setLogicState(prev => ({
                ...prev,
                message: 'Cannot attack on the first turn!',
            }));
            return false;
        }

        const attacker = gameState.player.activePokemon;
        const defender = gameState.opponent.activePokemon;

        if (!attacker || !defender || !attacker.attacks || !attacker.attacks[attackIndex]) return false;

        const selectedAttack = attacker.attacks[attackIndex];
        const attachedEnergy = attacker.attachedEnergy || [];
        const cost = selectedAttack.energyCost;

        const remainingCost = [...cost];
        const availableEnergy = [...attachedEnergy];

        let satisfied = true;
        for (let i = remainingCost.length - 1; i >= 0; i--) {
            const req = remainingCost[i];
            if (req !== 'colorless') {
                const matchIndex = availableEnergy.indexOf(req);
                if (matchIndex !== -1) {
                    availableEnergy.splice(matchIndex, 1);
                    remainingCost.splice(i, 1);
                } else {
                    satisfied = false;
                    break;
                }
            }
        }

        if (satisfied) {
            const colorlessNeeded = remainingCost.length;
            if (availableEnergy.length < colorlessNeeded) {
                satisfied = false;
            }
        }

        if (!satisfied) {
            setLogicState(prev => ({
                ...prev,
                message: `Not enough energy for ${selectedAttack.name}!`,
            }));
            return false;
        }

        // Check paralysis / confusion BEFORE calculating damage
        if (attacker.statusCondition === 'paralyzed' || attacker.cannotAttackNextTurn) {
            setLogicState(prev => ({
                ...prev,
                message: `${attacker.name} is Paralyzed and cannot attack!`,
            }));
            return false;
        }

        // Confusion: flip coin — tails = 30 damage to self, attack fails
        if (attacker.statusCondition === 'confused') {
            const headsForConfusion = flipCoin();
            if (!headsForConfusion) {
                setGameState(prev => {
                    if (!prev || !prev.player.activePokemon) return prev;
                    return {
                        ...prev,
                        player: {
                            ...prev.player,
                            activePokemon: {
                                ...prev.player.activePokemon,
                                damageCounters: (prev.player.activePokemon.damageCounters || 0) + 30,
                            },
                        },
                        message: `${attacker.name} is Confused! Tails — took 30 damage to itself and attack failed!`,
                    };
                });
                setTimeout(() => endTurn(), 1500);
                return true;
            }
        }

        // Ora Jab Logic (Mega Lucario)
        if (selectedAttack.name === 'Ora Jab') {
            const fightingEnergyInDiscard = gameState.player.discardPile.filter(c =>
                c.type === 'energy' && (c.name.includes('Fighting') || c.energyType === 'fighting')
            );

            if (fightingEnergyInDiscard.length > 0) {
                setLogicState(prev => ({
                    ...prev,
                    actionMode: 'attach_energy_from_discard',
                    message: 'Select up to 3 Fighting Energy from Discard to attach to your Pokemon.',
                    discardCount: 3, // Repurposing discardCount as "max selection count"
                }));
            } else {
                setLogicState(prev => ({
                    ...prev,
                    message: 'No Fighting Energy in discard pile to attach.',
                }));
            }
        }

        let damage = selectedAttack.damage;

        // Solrock: Cosmic Beam Logic
        if (selectedAttack.name === 'Cosmic Beam') {
            const hasLunatone = gameState.player.bench.some(c =>
                c.name.toLowerCase().includes('lunatone')
            );
            if (!hasLunatone) {
                damage = 0;
                setLogicState(prev => ({
                    ...prev,
                    message: `Cosmic Beam does nothing because Lunatone is not on the Bench.`
                }));
            }
        }

        // Assault Landing (Fan Rotom): does nothing if no Stadium in play
        if (selectedAttack.name === 'Assault Landing' && !gameState.stadium) {
            setLogicState(prev => ({
                ...prev,
                message: 'Assault Landing does nothing — no Stadium is in play!',
            }));
            setTimeout(() => endTurn(), 1500);
            return true;
        }

        // Mad Bite: +30 damage for each damage counter on opponent's Active
        if (selectedAttack.name === 'Mad Bite') {
            damage += defender.damageCounters || 0;
        }

        // Release Rage: +50 damage for each Tatsugiri in discard pile
        if (selectedAttack.name === 'Release Rage') {
            const tatsugiris = gameState.player.discardPile.filter(
                c => c.name.toLowerCase().includes('tatsugiri')
            ).length;
            damage += tatsugiris * 50;
        }

        // Ninja Spinner (Mega Greninja ex): put a Water Energy attached to THIS Pokémon back into hand for +80 damage
        let ninjaSpinnerBounceAttachedWater = false;
        if (selectedAttack.name === 'Ninja Spinner') {
            const attachedWater = attacker.attachedEnergy?.includes('water');
            if (attachedWater) {
                ninjaSpinnerBounceAttachedWater = true;
                damage += 80;
            }
        }

        // Burst Roar: discard entire hand, draw 6
        const burstRoarActivated = selectedAttack.name === 'Burst Roar';

        // Itchy Pollen: opponent can't play Items next turn
        const itchyPollenActivated = selectedAttack.name === 'Itchy Pollen';

        // Aura Jab: after attack, trigger Fighting Energy discard distribution
        const auraJabActivated = selectedAttack.name === 'Aura Jab';

        // Transistor (Regieleki ex): Lightning Pokémon do +30 damage
        const hasTransistor = [gameState.player.activePokemon, ...gameState.player.bench].some(
            p => p?.abilities?.some(a => a.name === 'Transistor')
        );
        if (hasTransistor && attacker.energyType === 'lightning') {
            damage += 30;
        }

        // Lands Force (Mega Zygarde ex): if Lunatone + Solrock on your side, Fighting do +30
        const hasLandsForce = [gameState.player.activePokemon, ...gameState.player.bench].some(
            p => p?.abilities?.some(a => a.name === 'Lands Force')
        );
        if (hasLandsForce && attacker.energyType === 'fighting') {
            const allPlayerPokemon = [gameState.player.activePokemon, ...gameState.player.bench].filter(Boolean);
            const hasLunatoneLF = allPlayerPokemon.some(p => p?.name.includes('Lunatone'));
            const hasSolrockLF = allPlayerPokemon.some(p => p?.name.includes('Solrock'));
            if (hasLunatoneLF && hasSolrockLF) damage += 30;
        }

        // Premium Power Pro: Fighting Pokémon attacks do +30 damage per copy played this turn
        if (logicState.premiumPowerProCount > 0 && attacker.energyType === 'fighting') {
            damage += logicState.premiumPowerProCount * 30;
        }

        // Apply Weakness and Resistance (Skip for Cosmic Beam as per card text)
        if (selectedAttack.name !== 'Cosmic Beam' && damage > 0) {
            const attackerType = attacker?.energyType;
            if (attackerType && defender?.weaknesses) {
                const weakness = defender.weaknesses.find(w => w.type === attackerType);
                if (weakness) {
                    if (weakness.value.includes('x2') || weakness.value.includes('×2')) {
                        damage *= 2;
                    } else if (weakness.value.startsWith('+')) {
                        damage += parseInt(weakness.value.slice(1)) || 0;
                    }
                }
            }
            if (attackerType && defender?.resistances) {
                const resistance = defender.resistances.find(r => r.type === attackerType);
                if (resistance) {
                    const resAmount = parseInt(resistance.value) || -30; // Default to -30 if parse fails
                    damage = Math.max(0, damage + resAmount);
                }
            }
        }

        // Passive damage reductions on defender side

        // Order Shield (Zygarde 50%): this Pokémon takes -20 damage from attacks
        if (defender.abilities?.some(a => a.name === 'Order Shield')) {
            damage = Math.max(0, damage - 20);
        }

        // Battle-Hardened (Bloodmoon Ursaluna): -20 from Rule Box Pokémon attacks
        const attackerHasRuleBox = attacker.subtypes?.some(s =>
            ['ex', 'gx', 'v', 'vmax', 'vstar', 'tera'].includes(s.toLowerCase())
        );
        if (defender.abilities?.some(a => a.name === 'Battle-Hardened') && attackerHasRuleBox) {
            damage = Math.max(0, damage - 20);
        }

        // Pokémon League HQ stadium: Rule Box Pokémon defending take -20 damage
        if (gameState.stadium?.name.toLowerCase().includes('league hq')) {
            const defenderHasRuleBox = defender.subtypes?.some(s =>
                ['ex', 'gx', 'v', 'vmax', 'vstar', 'tera'].includes(s.toLowerCase())
            );
            if (defenderHasRuleBox) damage = Math.max(0, damage - 20);
        }

        // Parse attack description for effects (status, bench damage, heal, etc.)
        const attackEffects = parseAttackEffects(selectedAttack.description || '');
        const effectResults = applyAttackEffects(
            attackEffects,
            attacker,
            defender,
            gameState.opponent.bench,
            flipCoin,
        );
        damage += effectResults.bonusDamage;

        // Find a Water Energy card in discard to return to hand for Ninja Spinner bounce
        // (We return a water energy card object from discard/deck to represent the bounced attached energy)
        const ninjaSpinnerWaterCardToReturn = ninjaSpinnerBounceAttachedWater
            ? (gameState.player.discardPile.find(c => c.type === 'energy' && c.energyType === 'water')
               ?? gameState.player.deck.find(c => c.type === 'energy' && c.energyType === 'water'))
            : undefined;

        setGameState(prev => {
            if (!prev) return prev;

            let newDefender = { ...effectResults.defender };
            // Use damage counters instead of reducing HP
            const currentDamage = (newDefender.damageCounters || 0) + damage;
            newDefender.damageCounters = currentDamage;

            const knockout = currentDamage >= (newDefender.hp || 0);
            let drawnPrizes: Card[] = [];
            let remainingPrizes = [...prev.player.prizeCards];

            if (knockout) {
                // Mega Evolution ex give 3 prize cards; regular ex give 2; others give 1
                const defenderSubtypes = newDefender.subtypes?.map(s => s.toLowerCase()) || [];
                const isMegaEx = defenderSubtypes.includes('mega') && defenderSubtypes.includes('ex');
                const isEx = isMegaEx || defenderSubtypes.includes('ex') ||
                    newDefender.name.toLowerCase().includes(' ex');
                const prizeCount = isMegaEx ? 3 : isEx ? 2 : 1;
                drawnPrizes = remainingPrizes.splice(0, prizeCount);
            }

            let opponentBench = effectResults.opponentBench;
            const koedBench = opponentBench.filter(b => (b.damageCounters || 0) >= (b.hp || 1));
            opponentBench = opponentBench.filter(b => (b.damageCounters || 0) < (b.hp || 1));
            const opponentExtraDiscard = koedBench;

            let opponentActive = knockout ? undefined : newDefender;
            if (knockout && opponentBench.length > 0) {
                opponentActive = opponentBench[0];
                opponentBench = opponentBench.slice(1);
            }

            // Update attacker on player side
            const newPlayerActive = prev.player.activePokemon?.id === attacker.id
                ? effectResults.attacker
                : prev.player.activePokemon;
            const newPlayerBench = prev.player.bench.map(b =>
                b.id === attacker.id ? effectResults.attacker : b
            );

            // Ninja Spinner: remove one Water Energy from attacker's attachedEnergy, put it into hand
            let playerHand = [...prev.player.hand, ...drawnPrizes];
            let playerDeck = [...prev.player.deck];
            let playerDiscard2 = prev.player.discardPile;
            if (ninjaSpinnerBounceAttachedWater) {
                // Remove one 'water' from the attacker's attachedEnergy (handled via effectResults.attacker)
                // Return a water energy card to hand (pull from discard if possible, else create inline)
                if (ninjaSpinnerWaterCardToReturn) {
                    const isFromDiscard = prev.player.discardPile.some(c => c.id === ninjaSpinnerWaterCardToReturn.id);
                    if (isFromDiscard) {
                        playerDiscard2 = prev.player.discardPile.filter(c => c.id !== ninjaSpinnerWaterCardToReturn.id);
                        playerDeck = prev.player.deck.filter(c => c.id !== ninjaSpinnerWaterCardToReturn.id);
                    } else {
                        playerDeck = prev.player.deck.filter(c => c.id !== ninjaSpinnerWaterCardToReturn.id);
                    }
                    playerHand = [...playerHand, ninjaSpinnerWaterCardToReturn];
                }
                // Remove one Water from attacker's attached energy
                const updatedAttackerEnergy = [...(effectResults.attacker.attachedEnergy || [])];
                const wIdx = updatedAttackerEnergy.indexOf('water');
                if (wIdx !== -1) updatedAttackerEnergy.splice(wIdx, 1);
                effectResults.attacker = { ...effectResults.attacker, attachedEnergy: updatedAttackerEnergy };
            }

            // Burst Roar: discard entire hand, draw 6
            let playerDiscard = playerDiscard2;
            if (burstRoarActivated) {
                playerDiscard = [...playerDiscard, ...playerHand];
                const drawn = playerDeck.slice(0, 6);
                playerDeck = playerDeck.slice(6);
                playerHand = drawn;
            }

            const effectMessages = effectResults.messages.join(' ');
            return {
                ...prev,
                player: {
                    ...prev.player,
                    activePokemon: newPlayerActive,
                    bench: newPlayerBench,
                    hand: playerHand,
                    deck: playerDeck,
                    discardPile: playerDiscard,
                    prizeCards: remainingPrizes,
                },
                opponent: {
                    ...prev.opponent,
                    activePokemon: opponentActive,
                    bench: opponentBench,
                    discardPile: [
                        ...prev.opponent.discardPile,
                        ...(knockout ? [defender] : []),
                        ...opponentExtraDiscard,
                    ],
                },
                opponentItemLocked: itchyPollenActivated ? true : prev.opponentItemLocked,
                message: `Used ${selectedAttack.name}! Dealt ${damage} damage.${knockout ? ' KNOCKOUT!' : ''} ${effectMessages}`.trim(),
            };
        });

        // End turn unless in a selection mode (Ora Jab / Aura Jab)
        const skipAutoEndTurn = selectedAttack.name === 'Ora Jab' || auraJabActivated;
        if (auraJabActivated) {
            const fightingInDiscard = gameState.player.discardPile.filter(
                c => c.type === 'energy' && c.energyType === 'fighting'
            );
            if (fightingInDiscard.length > 0) {
                setLogicState(prev => ({
                    ...prev,
                    actionMode: 'attach_energy_from_discard',
                    message: 'Aura Jab: Select up to 3 Fighting Energy from your discard to attach to your Pokémon.',
                    discardCount: Math.min(3, fightingInDiscard.length),
                }));
            }
        }
        if (!skipAutoEndTurn) {
            setTimeout(() => endTurn(), 1500);
        }

        return true;
    }, [gameState, endTurn]);

    // Check for player timer expiry only
    // Note: Opponent timeout is handled in the timer effect itself
    const playerTimedOutRef = useRef(false);

    useEffect(() => {
        // Only handle player timeout, not opponent (opponent handled in timer effect)
        if (gameState?.currentPlayer === 'player' && gameState.timeRemaining <= 0) {
            // Only end turn once per timeout
            if (!playerTimedOutRef.current) {
                playerTimedOutRef.current = true;
                endTurn();
            }
        } else if (gameState?.timeRemaining && gameState.timeRemaining > 0) {
            // Reset flag when timer is valid again
            playerTimedOutRef.current = false;
        }
    }, [gameState?.timeRemaining, gameState?.currentPlayer, endTurn]);

    const selectCard = useCallback((card: Card | null, mode: GameLogicState['actionMode'] = 'none') => {
        setLogicState(prev => ({
            ...prev,
            selectedCard: card,
            actionMode: mode,
        }));
    }, []);

    return {
        gameState,
        logicState,
        updateGameState,
        flipCoin,
        canPlayCard,
        playPokemonToBench,
        attachEnergy,
        evolvePokemon,
        playTrainer,
        drawCard,
        setActivePokemon,
        endTurn,
        selectCard,
        confirmDiscard,
        confirmDeckSelection,
        confirmDiscardEnergySelection,
        confirmNestBallSelection,
        confirmBossOrdersSelection,
        confirmFightingGongSelection,
        attack,
        useAbility,
        distributeEnergyToTarget,
        setLogicState,
        retreat,
        confirmSwitchBenchSelection,
        confirmDiscardSelection,
        confirmMultiDeckSelection,
        confirmCarmineSelection,
    };
}

export default useGameLogic;
