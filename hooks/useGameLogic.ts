import { useState, useEffect, useCallback } from 'react';
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
    attack: (attackIndex: number) => boolean;
}

const useGameLogic = (externalGameState: GameState | null): GameLogicReturn => {
    const [gameState, setGameState] = useState<GameState | null>(externalGameState);

    // Logic state for turn-based restrictions and UI interactions
    const [logicState, setLogicState] = useState<GameLogicState>({
        hasAttachedEnergy: false,
        hasPlayedSupporter: false,
        hasPlayedStadium: false,
        hasTakenAction: false,
        coinFlipResult: null,
        selectedCard: null,
        actionMode: 'none',
        message: 'Welcome to PVCGL!',
    });

    // Initialize Game handled by useGameData

    // Update game state when external state changes
    useEffect(() => {
        if (externalGameState) {
            setGameState(externalGameState);
        }
    }, [externalGameState]);

    const updateGameState = useCallback((newState: GameState) => {
        setGameState(newState);
    }, []);

    const flipCoin = useCallback(() => {
        const result = Math.random() < 0.5;
        setLogicState(prev => ({ ...prev, coinFlipResult: result, message: result ? 'Heads!' : 'Tails!' }));
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
                    bench: [...prev.player.bench, card],
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

        // Transfer attached energy to evolution
        const evolvedCard: Card = {
            ...evolutionCard,
            attachedEnergy: targetCard.attachedEnergy || [],
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
                    discardPile: [...prev.player.discardPile, targetCard!],
                },
                message: `${targetCard!.name} evolved into ${evolutionCard.name}!`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'none',
            selectedCard: null,
            message: `${targetCard!.name} evolved into ${evolutionCard.name}!`,
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

        if (isSupporter && logicState.hasPlayedSupporter) return false;

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
                message: `Select 2 cards to discard for ${card.name}.`,
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

        setGameState(prev => {
            if (!prev) return prev;

            const cardsToDiscard = prev.player.hand.filter(c => discardedCardIds.includes(c.id));
            const playedCard = prev.player.hand.find(c => c.id === logicState.activeCardId);
            const newHand = prev.player.hand.filter(c =>
                !discardedCardIds.includes(c.id) && c.id !== logicState.activeCardId
            );

            const newDiscardPile = [...prev.player.discardPile, ...cardsToDiscard];
            if (playedCard) newDiscardPile.push(playedCard);

            return {
                ...prev,
                player: {
                    ...prev.player,
                    hand: newHand,
                    discardPile: newDiscardPile,
                },
                message: `Discarded ${cardsToDiscard.length} cards. Searching deck...`,
            };
        });

        setLogicState(prev => ({
            ...prev,
            actionMode: 'search_deck',
            message: 'Select a Pokemon from your deck.',
        }));
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
                    bench: [...prev.player.bench, selectedCard],
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
            };
        });

        setLogicState({
            hasAttachedEnergy: false,
            hasPlayedSupporter: false,
            hasPlayedStadium: false,
            hasTakenAction: false,
            coinFlipResult: null,
            selectedCard: null,
            actionMode: 'none',
            message: '',
        });
    }, [gameState]);

    const attack = useCallback((attackIndex: number) => {
        if (!gameState || gameState.currentPlayer !== 'player') return false;

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

        let damage = selectedAttack.damage;

        setGameState(prev => {
            if (!prev) return prev;

            let newDefender = { ...defender };
            let currentHp = newDefender.hp || 0;
            currentHp -= damage;
            newDefender.hp = currentHp;

            const knockout = currentHp <= 0;
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

        setTimeout(() => {
            endTurn();
        }, 1500);

        return true;
    }, [gameState, endTurn]);

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
        confirmNestBallSelection,
        attack,
    };
}

export default useGameLogic;
