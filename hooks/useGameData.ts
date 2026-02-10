import { useState, useEffect } from 'react';
import { Card, GameState, Player } from '../types/game';
import { createMegaLucarioExDeck, createDragapultExDeck } from '../data/standardDecks';

export interface GameSetupData {
    playerDeck: Card[];
    opponentDeck: Card[];
    isLoading: boolean;
    error: string | null;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export type SetupPhase = 'loading' | 'coin_flip' | 'select_active' | 'ready';

export function useGameData() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [setupPhase, setSetupPhase] = useState<SetupPhase>('loading');
    const [decksReady, setDecksReady] = useState(false);
    const [playerDeck, setPlayerDeck] = useState<Card[]>([]);
    const [opponentDeck, setOpponentDeck] = useState<Card[]>([]);

    // For active selection
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [opponentHand, setOpponentHand] = useState<Card[]>([]);
    const [playerGoesFirst, setPlayerGoesFirst] = useState(true);
    const [basicCardsInHand, setBasicCardsInHand] = useState<Card[]>([]);
    const [tempDeck, setTempDeck] = useState<Card[]>([]);
    const [tempOppDeck, setTempOppDeck] = useState<Card[]>([]);

    useEffect(() => {
        loadDecks();
    }, []);

    async function loadDecks() {
        try {
            setIsLoading(true);
            setError(null);
            setSetupPhase('loading');

            // Use 2026 Standard Format top decks (async - fetches from API)
            // Player: Mega Lucario ex deck (60 cards)
            // Opponent: Dragapult ex deck (60 cards)
            const [megaLucarioDeck, dragapultDeck] = await Promise.all([
                createMegaLucarioExDeck(),
                createDragapultExDeck(),
            ]);

            console.log(`Player deck size: ${megaLucarioDeck.length}`);
            console.log(`Opponent deck size: ${dragapultDeck.length}`);

            // Set decks (already shuffled in builders)
            setPlayerDeck(megaLucarioDeck);
            setOpponentDeck(dragapultDeck);
            setDecksReady(true);
            setSetupPhase('coin_flip');

        } catch (err) {
            console.error('Error loading game data:', err);
            setError('Failed to load decks. Using offline mode.');
            loadOfflineDecks();
        } finally {
            setIsLoading(false);
        }
    }

    function loadOfflineDecks() {
        const createCard = (id: string, name: string, type: Card['type'], isBasic = true): Card => ({
            id,
            name,
            type,
            hp: type === 'pokemon' ? 100 : undefined,
            subtypes: type === 'pokemon' ? (isBasic ? ['Basic'] : ['Stage 1']) : undefined,
        });

        // Create basic offline deck
        const offlineDeck: Card[] = [];
        for (let i = 0; i < 20; i++) {
            offlineDeck.push(createCard(`pokemon-${i}`, `Pokemon ${i + 1}`, 'pokemon', true));
        }
        for (let i = 0; i < 20; i++) {
            offlineDeck.push(createCard(`trainer-${i}`, `Trainer ${i + 1}`, 'trainer'));
        }
        for (let i = 0; i < 20; i++) {
            offlineDeck.push(createCard(`energy-${i}`, `Energy ${i + 1}`, 'energy'));
        }

        setPlayerDeck(shuffle([...offlineDeck]));
        setOpponentDeck(shuffle([...offlineDeck.map(c => ({ ...c, id: `opp-${c.id}` }))]));
        setDecksReady(true);
        setSetupPhase('coin_flip');
    }

    // Helper to draw initial hand with mulligans
    function drawInitialHand(deck: Card[]): { hand: Card[], remainingDeck: Card[], mulligans: number } {
        let currentDeck = [...deck];
        let mulligans = 0;

        while (true) {
            // Shuffle
            currentDeck = shuffle(currentDeck);

            // Draw 7
            const hand = currentDeck.slice(0, 7);
            const remaining = currentDeck.slice(7);

            // Check for Basic Pokemon
            const hasBasic = hand.some(c => c.type === 'pokemon' && c.subtypes?.includes('Basic'));

            if (hasBasic) {
                return { hand, remainingDeck: remaining, mulligans };
            }

            // Mulligan
            mulligans++;
            console.log('Mulligan! No Basic Pokemon found.');
            // Shuffle hand back into deck (which is just the full deck again)
            currentDeck = [...hand, ...remaining];
        }
    }

    // Called after coin flip - prepares hands for active selection
    function onCoinFlipComplete(playerFirst: boolean) {
        setPlayerGoesFirst(playerFirst);

        // Draw hands with Mulligan logic
        const playerResult = drawInitialHand([...playerDeck]);
        const opponentResult = drawInitialHand([...opponentDeck]);

        let pHand = playerResult.hand;
        let oHand = opponentResult.hand;
        let pDeck = playerResult.remainingDeck;
        let oDeck = opponentResult.remainingDeck;

        // Apply Mulligan Penalties (Extra Cards)
        // If Player mulliganed, Opponent draws extra
        if (playerResult.mulligans > 0) {
            const extra = playerResult.mulligans;
            const extraCards = oDeck.slice(0, extra);
            oHand = [...oHand, ...extraCards];
            oDeck = oDeck.slice(extra);
            console.log(`Opponent drew ${extra} extra cards due to Player mulligans.`);
        }

        // If Opponent mulliganed, Player draws extra
        if (opponentResult.mulligans > 0) {
            const extra = opponentResult.mulligans;
            const extraCards = pDeck.slice(0, extra);
            pHand = [...pHand, ...extraCards];
            pDeck = pDeck.slice(extra);
            console.log(`Player drew ${extra} extra cards due to Opponent mulligans.`);
        }

        setPlayerHand(pHand);
        setOpponentHand(oHand);
        setTempDeck(pDeck);
        setTempOppDeck(oDeck);

        // Find all basic Pokémon in player's hand
        const basics = pHand.filter(c => c.type === 'pokemon' && c.subtypes?.includes('Basic'));
        setBasicCardsInHand(basics);

        if (basics.length > 1) {
            // Player needs to choose
            setSetupPhase('select_active');
        } else {
            // Auto-select the only basic (guaranteed to exist now due to mulligan)
            const selectedActive = basics[0];
            finishSetup(selectedActive, pHand, oHand, pDeck, oDeck, playerFirst);
        }
    }

    // Called when player selects their active Pokémon
    function selectActiveCard(card: Card) {
        finishSetup(card, playerHand, opponentHand, tempDeck, tempOppDeck, playerGoesFirst);
    }

    // Finishes game setup with the selected active
    function finishSetup(
        playerActive: Card,
        pHand: Card[],
        oHand: Card[],
        pDeck: Card[],
        oDeck: Card[],
        goesFirst: boolean
    ) {
        // Find opponent's active (auto-select first basic)
        const opponentBasics = oHand.filter(c => c.type === 'pokemon' && c.subtypes?.includes('Basic'));
        const opponentActive = opponentBasics[0] || oHand[0];

        // Remove actives from hands
        const playerHandFiltered = pHand.filter(c => c.id !== playerActive.id);
        const opponentHandFiltered = oHand.filter(c => c.id !== opponentActive?.id);

        // Set 6 prize cards each
        const playerPrizes = pDeck.splice(0, 6);
        const opponentPrizes = oDeck.splice(0, 6);

        // Create players
        const player: Player = {
            id: 'player',
            name: 'You',
            deck: pDeck,
            hand: playerHandFiltered,
            activePokemon: { ...playerActive, playedTurn: 0 },
            bench: [],
            prizeCards: playerPrizes,
            discardPile: [],
        };

        const opponent: Player = {
            id: 'opponent',
            name: 'Trainer Red',
            deck: oDeck,
            hand: opponentHandFiltered,
            activePokemon: opponentActive ? { ...opponentActive, playedTurn: 0 } : undefined,
            bench: [],
            prizeCards: opponentPrizes,
            discardPile: [],
        };

        // Set game state
        setGameState({
            turn: 1,
            currentPlayer: goesFirst ? 'player' : 'opponent',
            phase: 'main',
            player,
            opponent,
            timeRemaining: 60,
            message: goesFirst ? 'Your turn! Play a card.' : "Opponent's turn...",
        });

        setSetupPhase('ready');
        setBasicCardsInHand([]);
    }

    function endTurn() {
        if (!gameState) return;

        setGameState(prev => {
            if (!prev) return prev;

            const nextPlayer = prev.currentPlayer === 'player' ? 'opponent' : 'player';

            // Draw card for new player
            const newPlayerData = prev[nextPlayer];
            let drawnCard: Card | undefined;
            let newDeck = [...newPlayerData.deck];
            let newHand = [...newPlayerData.hand];

            if (newDeck.length > 0) {
                drawnCard = newDeck.shift();
                if (drawnCard) {
                    newHand.push(drawnCard);
                }
            }

            return {
                ...prev,
                turn: prev.turn + 1,
                currentPlayer: nextPlayer,
                [nextPlayer]: {
                    ...newPlayerData,
                    deck: newDeck,
                    hand: newHand,
                },
                timeRemaining: 60,
                message: nextPlayer === 'player'
                    ? `Your turn! Drew ${drawnCard?.name || 'nothing'}.`
                    : "Opponent's turn...",
            };
        });
    }

    return {
        gameState,
        setGameState,
        isLoading,
        error,
        setupPhase,
        decksReady,
        basicCardsInHand,
        onCoinFlipComplete,
        selectActiveCard,
        endTurn,
        reloadGame: loadDecks,
        activeDeckName: "Mega Lucario ex Battle Deck", // Hardcoded for now as it's the only player deck
        playerDeck,
    };
}

export default useGameData;
