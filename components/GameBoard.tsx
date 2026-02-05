import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Dimensions, Alert } from 'react-native';
import { GameState, Card as CardType, EnergyType } from '../types/game';
import Colors from '../constants/colors';
import useGameLogic from '../hooks/useGameLogic';
import { getAIActions, applyAIAction, AIAction } from '../utils/aiOpponent';
import OpponentArea from './OpponentArea';
import PlayMat from './PlayMat';
import PlayerArea from './PlayerArea';
import DialogBox from './DialogBox';
import HeaderBar from './HeaderBar';
import ActionMenu from './ActionMenu';
import CoinFlip from './CoinFlip';
import GameControls from './GameControls';
import EndTurnButton from './EndTurnButton';
import CardSelectorModal from './CardSelectorModal';
import AttackMenu from './AttackMenu';
import { TouchableOpacity, Text } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GameBoardProps {
    gameState?: GameState;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState: externalGameState }) => {
    const {
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
    } = useGameLogic(externalGameState || null);

    const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
    const [showDialog, setShowDialog] = useState(true);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showCoinFlip, setShowCoinFlip] = useState(false);
    const [selectedHandCard, setSelectedHandCard] = useState<CardType | null>(null);
    const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
    const [pendingEnergyCard, setPendingEnergyCard] = useState<CardType | null>(null);
    const [pendingEvolveCard, setPendingEvolveCard] = useState<CardType | null>(null);
    const [aiActing, setAiActing] = useState(false);
    const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showAttackMenu, setShowAttackMenu] = useState(false);

    // Update game state when external state changes
    useEffect(() => {
        if (externalGameState) {
            updateGameState(externalGameState);
        }
    }, [externalGameState, updateGameState]);

    // Reset turn-based state when turn changes
    useEffect(() => {
        if (gameState?.currentPlayer === 'player') {
            setHasDrawnThisTurn(false);
        }
    }, [gameState?.turn]);

    // Auto-pass timer for Opponent
    useEffect(() => {
        if (gameState?.currentPlayer === 'opponent') {
            const timer = setTimeout(() => {
                console.log("Opponent 1-minute timeout reached. Auto-passing.");
                endTurn();
            }, 60000); // 1 minute

            return () => clearTimeout(timer);
        }
    }, [gameState?.currentPlayer, endTurn]);

    // AI Opponent's Turn
    useEffect(() => {
        if (!gameState || gameState.currentPlayer !== 'opponent' || aiActing) {
            return;
        }

        // Start AI turn
        setAiActing(true);

        // Get all AI actions
        const actions = getAIActions(gameState);
        let actionIndex = 0;
        let currentState = gameState;

        // Execute actions with delays
        const executeNextAction = () => {
            if (actionIndex >= actions.length) {
                setAiActing(false);
                return;
            }

            const action = actions[actionIndex];
            currentState = applyAIAction(currentState, action);
            updateGameState(currentState);
            actionIndex++;

            // Delay before next action (500-1500ms random)
            const delay = action.type === 'END_TURN' ? 500 : Math.random() * 1000 + 500;
            aiTimeoutRef.current = setTimeout(executeNextAction, delay);
        };

        // Start with initial delay
        aiTimeoutRef.current = setTimeout(executeNextAction, 1000);

        // Cleanup
        return () => {
            if (aiTimeoutRef.current) {
                clearTimeout(aiTimeoutRef.current);
            }
        };
    }, [gameState?.currentPlayer, gameState?.turn]);

    const handleCardPress = useCallback((cardId: string) => {
        if (!gameState) return;

        // If we have a pending energy attachment, attach to this card
        if (pendingEnergyCard) {
            const success = attachEnergy(pendingEnergyCard.id, cardId);
            if (success) {
                setPendingEnergyCard(null);
                setShowDialog(true);
            }
            return;
        }

        // If we have a pending evolution, evolve this card
        if (pendingEvolveCard) {
            const success = evolvePokemon(pendingEvolveCard.id, cardId);
            if (success) {
                setPendingEvolveCard(null);
                setShowDialog(true);
            }
            return;
        }

        // Toggle selection
        setSelectedCardId(selectedCardId === cardId ? undefined : cardId);
        setShowDialog(false);
    }, [gameState, pendingEnergyCard, pendingEvolveCard, selectedCardId, attachEnergy, evolvePokemon]);

    const handleHandCardPress = useCallback((card: CardType) => {
        if (!gameState || gameState.currentPlayer !== 'player') return;

        setSelectedHandCard(card);
        setShowActionMenu(true);
    }, [gameState]);

    const handleBenchCardPress = useCallback((cardId: string) => {
        if (!gameState) return;

        // If pending energy, attach to this bench card
        if (pendingEnergyCard) {
            attachEnergy(pendingEnergyCard.id, cardId);
            setPendingEnergyCard(null);
            return;
        }

        // If pending evolve, evolve this bench card
        if (pendingEvolveCard) {
            evolvePokemon(pendingEvolveCard.id, cardId);
            setPendingEvolveCard(null);
            return;
        }

        // Otherwise, offer to set as active
        const benchCard = gameState.player.bench.find(c => c.id === cardId);
        if (benchCard) {
            Alert.alert(
                'Set Active?',
                `Make ${benchCard.name} your active Pokémon?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Set Active',
                        onPress: () => setActivePokemon(cardId),
                    },
                ]
            );
        }
    }, [gameState, pendingEnergyCard, pendingEvolveCard, attachEnergy, evolvePokemon, setActivePokemon]);

    const handlePlayToBench = useCallback(() => {
        if (!selectedHandCard) return;
        playPokemonToBench(selectedHandCard.id);
        setSelectedHandCard(null);
    }, [selectedHandCard, playPokemonToBench]);

    const handleAttachEnergy = useCallback(() => {
        if (!selectedHandCard) return;
        setPendingEnergyCard(selectedHandCard);
        setShowActionMenu(false);
        setSelectedHandCard(null);

        // Show instruction
        Alert.alert(
            'Select Target',
            'Tap a Pokémon to attach energy to',
            [{ text: 'OK' }]
        );
    }, [selectedHandCard]);

    const handleEvolve = useCallback(() => {
        if (!selectedHandCard) return;
        setPendingEvolveCard(selectedHandCard);
        setShowActionMenu(false);
        setSelectedHandCard(null);

        Alert.alert(
            'Select Target',
            'Tap a Pokémon to evolve',
            [{ text: 'OK' }]
        );
    }, [selectedHandCard]);

    const handlePlayTrainer = useCallback(() => {
        if (!selectedHandCard) return;
        playTrainer(selectedHandCard.id);
        setSelectedHandCard(null);
    }, [selectedHandCard, playTrainer]);

    const handleDrawCard = useCallback(() => {
        if (hasDrawnThisTurn) {
            Alert.alert('Already Drew', 'You can only draw one card per turn at the start.');
            return;
        }
        const success = drawCard();
        if (success) {
            setHasDrawnThisTurn(true);
            setShowDialog(true);
        }
    }, [drawCard, hasDrawnThisTurn]);

    const handleEndTurn = useCallback(() => {
        endTurn();
        setSelectedCardId(undefined);
        setHasDrawnThisTurn(false);
        setPendingEnergyCard(null);
        setPendingEvolveCard(null);
        setShowDialog(true);
    }, [endTurn]);

    const handleAttack = useCallback((attackIndex: number) => {
        const success = attack(attackIndex);
        if (success) {
            setShowAttackMenu(false);
            setSelectedCardId(undefined);
        }
    }, [attack]);

    const handleCoinFlipResult = useCallback((result: 'heads' | 'tails') => {
        // You can use the result for game effects
        console.log('Coin flip result:', result);
    }, []);

    if (!gameState) {
        return null;
    }

    const selectedCardCheck = selectedHandCard ? canPlayCard(selectedHandCard) : { canPlay: false };
    const isPlayerTurn = gameState.currentPlayer === 'player';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary.darkRed} />

            {/* Header Bar */}
            <HeaderBar
                opponentName={gameState.opponent.name}
                turnNumber={gameState.turn}
            />

            {/* Opponent Area */}
            <OpponentArea
                opponent={gameState.opponent}
            />

            {/* Play Mat */}
            <View style={styles.playMatContainer}>
                <PlayMat
                    opponentActive={gameState.opponent.activePokemon}
                    opponentBench={gameState.opponent.bench}
                    playerActive={gameState.player.activePokemon}
                    playerBench={gameState.player.bench}
                    onCardPress={handleCardPress}
                    selectedCardId={selectedCardId}
                    onBenchCardPress={handleBenchCardPress}
                    highlightTargets={!!pendingEnergyCard || !!pendingEvolveCard}
                    stadium={gameState.stadium}
                    stadiumOwner={gameState.stadiumOwner}
                />

                {/* End Turn Button - Center Right */}
                <View style={styles.endTurnContainer}>
                    <EndTurnButton
                        onPress={handleEndTurn}
                        disabled={!isPlayerTurn}
                        timeRemaining={gameState.timeRemaining}
                    />
                </View>

                {/* Game Messages & Pending Actions */}
                {(pendingEnergyCard || pendingEvolveCard || logicState.message || gameState.message) && (
                    <View style={styles.pendingIndicator}>
                        <DialogBox
                            message={
                                pendingEnergyCard
                                    ? `Select a Pokémon to attach ${pendingEnergyCard.energyType || 'energy'} to`
                                    : pendingEvolveCard
                                        ? `Select a Pokémon to evolve into ${pendingEvolveCard?.name}`
                                        : (logicState.message || gameState.message || '')
                            }
                        />
                    </View>
                )}


                {/* Attack Button */}
                {isPlayerTurn &&
                    gameState.player.activePokemon &&
                    selectedCardId === gameState.player.activePokemon.id &&
                    !pendingEnergyCard && !pendingEvolveCard && (
                        <View style={styles.attackButtonContainer}>
                            <TouchableOpacity
                                style={styles.attackButton}
                                onPress={() => setShowAttackMenu(true)}
                            >
                                <Text style={styles.attackButtonText}>ATTACK</Text>
                            </TouchableOpacity>
                        </View>
                    )}
            </View>

            {/* Player Area */}
            <PlayerArea
                player={gameState.player}
                onCardPress={handleHandCardPress}
                selectedCardId={selectedCardId}
            />

            {/* Game Controls */}
            <GameControls
                hasAttachedEnergy={logicState.hasAttachedEnergy}
                deckCount={gameState.player.deck.length}
                discardCount={gameState.player.discardPile.length}
                currentTurn={gameState.turn}
                isPlayerTurn={isPlayerTurn}
            />

            {/* Card Selector Modals (Ultra Ball, etc) */}
            <CardSelectorModal
                visible={logicState.actionMode === 'discard_from_hand'}
                title="Discard 2 Cards"
                subtitle="Select cards to discard to play Ultra Ball"
                cards={gameState.player.hand.filter(c => c.id !== logicState.activeCardId)}
                minSelection={2}
                maxSelection={2}
                onConfirm={confirmDiscard}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Discard Selected"
            />

            <CardSelectorModal
                visible={logicState.actionMode === 'search_deck'}
                title="Ultra Ball"
                subtitle="Select a Pokémon to put into your hand"
                cards={[
                    // Pokémon first (eligible)
                    ...gameState.player.deck.filter(c => c.type === 'pokemon'),
                    // Then other cards (ineligible but shown greyed out)
                    ...gameState.player.deck.filter(c => c.type !== 'pokemon'),
                ]}
                eligibleCardIds={gameState.player.deck
                    .filter(c => c.type === 'pokemon')
                    .map(c => c.id)}
                minSelection={1}
                maxSelection={1}
                onConfirm={confirmDeckSelection}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Select Pokémon"
            />

            {/* Nest Ball Modal */}
            <CardSelectorModal
                visible={logicState.actionMode === 'search_deck_basic'}
                title="Nest Ball"
                subtitle="Select a Basic Pokémon to put onto your Bench"
                cards={[
                    // Basic Pokémon first (eligible)
                    ...gameState.player.deck.filter(c => c.type === 'pokemon' && c.subtypes?.includes('Basic')),
                    // Then other cards (ineligible but shown greyed out)
                    ...gameState.player.deck.filter(c => !(c.type === 'pokemon' && c.subtypes?.includes('Basic'))),
                ]}
                eligibleCardIds={gameState.player.deck
                    .filter(c => c.type === 'pokemon' && c.subtypes?.includes('Basic'))
                    .map(c => c.id)}
                minSelection={1}
                maxSelection={1}
                onConfirm={confirmNestBallSelection}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Put on Bench"
            />

            {/* Action Menu Modal */}
            <ActionMenu
                card={selectedHandCard}
                visible={showActionMenu}
                onClose={() => {
                    setShowActionMenu(false);
                    setSelectedHandCard(null);
                }}
                onPlayToBench={handlePlayToBench}
                onAttachEnergy={handleAttachEnergy}
                onEvolve={handleEvolve}
                onPlayTrainer={handlePlayTrainer}
                canPlayToBench={
                    selectedHandCard?.type === 'pokemon' &&
                    selectedHandCard?.subtypes?.includes('Basic') &&
                    gameState.player.bench.length < 5
                }
                canAttachEnergy={
                    selectedHandCard?.type === 'energy' &&
                    !logicState.hasAttachedEnergy
                }
                canEvolve={
                    selectedHandCard?.type === 'pokemon' &&
                    selectedHandCard?.subtypes?.some(s => s.includes('Stage'))
                }
                canPlayTrainer={
                    selectedHandCard?.type === 'trainer' &&
                    (!selectedHandCard?.subtypes?.includes('Supporter') || !logicState.hasPlayedSupporter)
                }
                message={!selectedCardCheck.canPlay ? selectedCardCheck.reason : undefined}
            />

            {/* Coin Flip Modal */}
            <CoinFlip
                visible={showCoinFlip}
                onClose={() => setShowCoinFlip(false)}
                onResult={handleCoinFlipResult}

            />

            {/* Attack Menu */}
            <AttackMenu
                visible={showAttackMenu}
                card={gameState.player.activePokemon}
                onClose={() => setShowAttackMenu(false)}
                onAttack={handleAttack}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.ui.black,
    },
    playMatContainer: {
        flex: 1,
        position: 'relative',
    },
    dialogOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: SCREEN_HEIGHT * 0.05,
        zIndex: 10,
    },
    pendingIndicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 10,
        zIndex: 10,
    },
    endTurnContainer: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: [{ translateY: -40 }],
        zIndex: 20,
    },
    attackButtonContainer: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        zIndex: 20,
    },
    attackButton: {
        backgroundColor: Colors.primary.red,
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    attackButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
});

export default GameBoard;
