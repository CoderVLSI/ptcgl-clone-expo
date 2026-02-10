import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Player, GameState, EnergyType, GameLogicState, Attack } from '../types/game';

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
    currentPhase?: 'setup' | 'draw' | 'action' | 'attack'; // Optional phase tracking if needed
    confirmDiscardEnergySelection: (cardIds: string[]) => void;
    distributeEnergyToTarget: (targetId: string) => void;
    useAbility: (cardId: string, abilityIndex: number) => boolean;
    setLogicState: React.Dispatch<React.SetStateAction<GameLogicState>>;
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
    useEffect(() => {
        // Clear any existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Only run timer when there's a game state and time remaining
        if (!gameState || gameState.timeRemaining <= 0) return;

        // Only start/restart timer when we have a valid state with time remaining
        const startTime = gameState.timeRemaining;
        let lastTime = startTime;

        timerRef.current = setInterval(() => {
            setGameState(prev => {
                if (!prev || prev.timeRemaining <= 0) return prev;

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
    }, [gameState?.currentPlayer]); // Re-run only when current player changes



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

        setLogicState(prev => ({
            ...prev,
            message: `${card.name} was placed on the bench!`,
        }));

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

        const isHariyamaAbility = evolvedCard.name === 'Hariyama' && (prevOppBenchSize > 0);

        setLogicState(prev => ({
            ...prev,
            actionMode: isHariyamaAbility ? 'switch_opponent_active' : 'none',
            activeCardId: isHariyamaAbility ? evolvedCard.id : undefined,
            selectedCard: null,
            message: isHariyamaAbility
                ? `${targetCard!.name} evolved into ${evolutionCard.name}! Select a Pokémon from opponent bench to switch.`
                : `${targetCard!.name} evolved into ${evolutionCard.name}!`,
        }));

        return true;
    }, [gameState]);

    // Play trainer card
    const playTrainer = useCallback((cardId: string) => {
        if (!gameState) return false;

        const card = gameState.player.hand.find(c => c.id === cardId);
        if (!card || card.type !== 'trainer') return false;

        const isSupporter = card.subtypes?.includes('Supporter');
        const isStadium = card.subtypes?.includes('Stadium');

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

    const endTurn = useCallback(() => {
        if (!gameState) return;
        setGameState(prev => {
            if (!prev) return prev;
            const [opponentDrawn, ...opponentRemainingDeck] = prev.opponent.deck;
            return {
                ...prev,
                turn: prev.turn + 1,
                currentPlayer: prev.currentPlayer === 'player' ? 'opponent' : 'player',
                opponent: opponentDrawn ? {
                    ...prev.opponent,
                    hand: [...prev.opponent.hand, opponentDrawn],
                    deck: opponentRemainingDeck,
                } : prev.opponent,
                message: prev.currentPlayer === 'player' ? "Opponent's turn" : 'Your turn! Draw a card.',
                timeRemaining: 60,
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

        // Premium Power Pro: Your Pokemon attacks do +30 damage per copy played this turn
        if (logicState.premiumPowerProCount > 0) {
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

        setGameState(prev => {
            if (!prev) return prev;

            let newDefender = { ...defender };
            // Use damage counters instead of reducing HP
            const currentDamage = (newDefender.damageCounters || 0) + damage;
            newDefender.damageCounters = currentDamage;

            const knockout = currentDamage >= (newDefender.hp || 0);
            let drawnPrizes: Card[] = [];
            let remainingPrizes = [...prev.player.prizeCards];

            if (knockout) {
                const prizeCount = 1;
                drawnPrizes = remainingPrizes.splice(0, prizeCount);
            }

            let opponentBench = prev.opponent.bench;
            let opponentActive = knockout ? undefined : newDefender;

            if (knockout && opponentBench.length > 0) {
                opponentActive = opponentBench[0];
                opponentBench = opponentBench.slice(1);
            }

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: [...prev.player.hand, ...drawnPrizes],
                    prizeCards: remainingPrizes,
                },
                opponent: {
                    ...prev.opponent,
                    activePokemon: opponentActive,
                    bench: opponentBench,
                    discardPile: knockout ? [...prev.opponent.discardPile, defender] : prev.opponent.discardPile,
                },
                message: `Used ${selectedAttack.name}! Dealt ${damage} damage.${knockout ? ' KNOCKOUT!' : ''}`,
            };
        });

        // ONLY end turn if we are NOT in a selection mode
        if (selectedAttack.name !== 'Ora Jab') {
            setTimeout(() => {
                endTurn();
            }, 1500);
        }

        return true;
    }, [gameState, endTurn]);

    // Check for timer expiry
    useEffect(() => {
        if (gameState?.currentPlayer === 'player' && gameState.timeRemaining <= 0) {
            endTurn();
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
    };
}

export default useGameLogic;
