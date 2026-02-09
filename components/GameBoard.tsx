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
import CardPreviewModal from './CardPreviewModal';
import AttackMenu from './AttackMenu';
import {
    ShuffleAnimation,
    DrawAnimation,
    AttackAnimation,
    DamageNumberAnimation,
    EnergyAttachmentAnimation,
    EvolutionAnimation,
} from './Animations';
import { TouchableOpacity, Text } from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
        confirmBossOrdersSelection,
        confirmFightingGongSelection,
        confirmDiscardEnergySelection,
        distributeEnergyToTarget,
        attack,
        useAbility,
    } = useGameLogic(externalGameState || null);

    const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
    const [showDialog, setShowDialog] = useState(true);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showCoinFlip, setShowCoinFlip] = useState(false);
    const [showAttackMenu, setShowAttackMenu] = useState(false);
    const [menuCard, setMenuCard] = useState<CardType | null>(null);
    const [previewCard, setPreviewCard] = useState<CardType | null>(null);
    const [selectedHandCard, setSelectedHandCard] = useState<CardType | null>(null);
    const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
    const [pendingEnergyCard, setPendingEnergyCard] = useState<CardType | null>(null);
    const [pendingEvolveCard, setPendingEvolveCard] = useState<CardType | null>(null);
    const [aiActing, setAiActing] = useState(false);
    const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Animation states
    const [showShuffle, setShowShuffle] = useState(false);
    const [showDraw, setShowDraw] = useState(false);
    const [showAttack, setShowAttack] = useState(false);
    const [attackType, setAttackType] = useState<'physical' | 'special' | 'fire' | 'water' | 'electric' | 'psychic'>('physical');
    const [damageNum, setDamageNum] = useState(0);
    const [showDamage, setShowDamage] = useState(false);
    const [showEnergyAttach, setShowEnergyAttach] = useState(false);
    const [attachEnergyType, setAttachEnergyType] = useState<string>('colorless');
    const [showEvolution, setShowEvolution] = useState(false);
    const [isMegaEvolution, setIsMegaEvolution] = useState(false);
    const [evolutionName, setEvolutionName] = useState<string>('');

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

    // Trigger animations based on game state messages
    useEffect(() => {
        if (!gameState?.message) return;

        const msg = gameState.message.toLowerCase();

        // Shuffle animation
        if (msg.includes('shuffled') || msg.includes('shuffle')) {
            setShowShuffle(true);
        }

        // Draw animation
        if (msg.includes('drew') || msg.includes('draw')) {
            setShowDraw(true);
        }

        // Attack animation
        if (msg.includes('used') && msg.includes('attack')) {
            // Determine attack type based on attacker's energy type
            const attacker = gameState.player.activePokemon;
            if (attacker?.energyType) {
                const typeMap: Record<string, typeof attackType> = {
                    fire: 'fire',
                    water: 'water',
                    lightning: 'electric',
                    psychic: 'psychic',
                };
                setAttackType(typeMap[attacker.energyType] || 'physical');
            }
            setShowAttack(true);
        }

        // Damage number animation
        if (msg.includes('dealt') && msg.includes('damage')) {
            const damageMatch = gameState.message.match(/(\d+)\s+damage/);
            if (damageMatch) {
                setDamageNum(parseInt(damageMatch[1]));
                setTimeout(() => setShowDamage(true), 500);
            }
        }

        // Evolution animation
        if (msg.includes('evolved')) {
            // Check if it's a mega evolution
            const isMega = msg.includes('mega') || gameState.message.includes('Mega');
            // Extract the evolved Pokemon name
            const evoMatch = gameState.message.match(/evolved into (.+?)!/);
            const evoName = evoMatch ? evoMatch[1] : '';
            setIsMegaEvolution(isMega);
            setEvolutionName(evoName);
            setTimeout(() => setShowEvolution(true), 200);
        }
    }, [gameState?.message, gameState?.player.activePokemon]);

    // Energy attachment animation
    useEffect(() => {
        if (logicState.message.includes('attached') && pendingEnergyCard) {
            setAttachEnergyType(pendingEnergyCard.energyType || 'colorless');
            setShowEnergyAttach(true);
        }
    }, [logicState.message, pendingEnergyCard]);

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

        // Direct Attack Menu Access
        // If player clicks their own active pokemon during their turn, open attack menu
        if (gameState?.currentPlayer === 'player' && gameState.player.activePokemon?.id === cardId) {
            setMenuCard(gameState.player.activePokemon || null);
            setShowAttackMenu(true);
        }
    }, [gameState, pendingEnergyCard, pendingEvolveCard, selectedCardId, attachEnergy, evolvePokemon]);

    const handleHandCardPress = useCallback((card: CardType) => {
        if (!gameState || gameState.currentPlayer !== 'player') return;

        setSelectedHandCard(card);
        setShowActionMenu(true);
    }, [gameState]);

    const handleBenchCardPress = useCallback((card: CardType) => {
        if (!gameState) return;

        if (logicState.actionMode === 'select_target') {
            confirmBossOrdersSelection(card.id);
            return;
        }

        if (logicState.actionMode === 'distribute_energy_from_discard') {
            distributeEnergyToTarget(card.id);
            return;
        }

        // If pending energy, attach to this bench card
        if (pendingEnergyCard) {
            attachEnergy(pendingEnergyCard.id, card.id);
            setPendingEnergyCard(null);
            return;
        }

        // If pending evolve, evolve this bench card
        if (pendingEvolveCard) {
            evolvePokemon(pendingEvolveCard.id, card.id);
            setPendingEvolveCard(null);
            return;
        }

        // Options: Set Active or Ability
        Alert.alert(
            'Options',
            `What to do with ${card.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Set Active',
                    onPress: () => setActivePokemon(card.id)
                },
                {
                    text: 'View/Abilities',
                    onPress: () => {
                        setMenuCard(card);
                        setShowAttackMenu(true);
                    }
                }
            ]
        );
    }, [gameState, logicState, pendingEnergyCard, pendingEvolveCard, attachEnergy, evolvePokemon, setActivePokemon, distributeEnergyToTarget]);

    const handleActiveCardPress = useCallback(() => {
        if (!gameState || !gameState.player.activePokemon) return;

        if (logicState.actionMode === 'distribute_energy_from_discard') {
            distributeEnergyToTarget(gameState.player.activePokemon.id);
            return;
        }

        // Existing logic for active card press
        if (pendingEnergyCard) {
            attachEnergy(pendingEnergyCard.id, gameState.player.activePokemon.id);
            setPendingEnergyCard(null);
            return;
        }

        if (pendingEvolveCard) {
            evolvePokemon(pendingEvolveCard.id, gameState.player.activePokemon.id);
            setPendingEvolveCard(null);
            return;
        }

        setMenuCard(gameState.player.activePokemon);
        setShowAttackMenu(true);
    }, [gameState, logicState, pendingEnergyCard, pendingEvolveCard, attachEnergy, evolvePokemon, distributeEnergyToTarget]);

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
                onCardLongPress={(card) => setPreviewCard(card)}
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
                title={`Discard ${logicState.discardCount || 1} Cards`}
                subtitle={logicState.message || "Select cards to discard"}
                cards={gameState.player.hand.filter(c => c.id !== logicState.activeCardId)}
                minSelection={logicState.discardCount || 1}
                maxSelection={logicState.discardCount || 1}
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

            {/* Boss's Orders Modal */}
            <CardSelectorModal
                visible={logicState.actionMode === 'switch_opponent_active'}
                title="Boss's Orders"
                subtitle="Select a Pokémon from opponent's bench to switch with Active"
                cards={gameState.opponent.bench}
                minSelection={1}
                maxSelection={1}
                onConfirm={(ids) => confirmBossOrdersSelection(ids[0])}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Switch"
            />

            {/* Fighting Gong Modal */}
            <CardSelectorModal
                visible={logicState.actionMode === 'search_deck_fighting'}
                title="Fighting Gong"
                subtitle="Select Basic Fighting Pokémon or Basic Fighting Energy"
                cards={[
                    // Eligible cards first (Basic Fighting Pokemon, Basic Fighting Energy)
                    ...gameState.player.deck.filter(c =>
                        (c.type === 'pokemon' && c.subtypes?.includes('Basic') && c.energyType === 'fighting') ||
                        (c.type === 'energy' && c.energyType === 'fighting')
                    ),
                    // Then other cards (ineligible, greyed out)
                    ...gameState.player.deck.filter(c =>
                        !((c.type === 'pokemon' && c.subtypes?.includes('Basic') && c.energyType === 'fighting') ||
                            (c.type === 'energy' && c.energyType === 'fighting'))
                    ),
                ]}
                eligibleCardIds={gameState.player.deck
                    .filter(c =>
                        (c.type === 'pokemon' && c.subtypes?.includes('Basic') && c.energyType === 'fighting') ||
                        (c.type === 'energy' && c.energyType === 'fighting')
                    )
                    .map(c => c.id)}
                minSelection={1}
                maxSelection={1}
                onConfirm={confirmFightingGongSelection}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Add to Hand"
            />

            {/* Energy Selection from Discard (Mega Lucario) */}
            <CardSelectorModal
                visible={logicState.actionMode === 'attach_energy_from_discard'}
                title="Select Energy from Discard"
                subtitle={logicState.message || "Select up to 3 Fighting Energy to attach."}
                cards={gameState.player.discardPile.filter(c => c.type === 'energy' && (c.name.includes('Fighting') || c.energyType === 'fighting'))}
                minSelection={1}
                maxSelection={3}
                onConfirm={confirmDiscardEnergySelection}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Attach to Bench"
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
                card={gameState.player.activePokemon || null}
                onClose={() => setShowAttackMenu(false)}
                onAttack={handleAttack}
            />

            {/* Card Preview Modal (Long Press) */}
            <CardPreviewModal
                visible={!!previewCard}
                card={previewCard || null}
                onClose={() => setPreviewCard(null)}
            />

            {/* Animations */}
            <ShuffleAnimation
                visible={showShuffle}
                onComplete={() => setShowShuffle(false)}
                x={SCREEN_WIDTH * 0.15}
                y={SCREEN_HEIGHT * 0.5}
            />

            <DrawAnimation
                visible={showDraw}
                onComplete={() => setShowDraw(false)}
                x={SCREEN_WIDTH * 0.15}
                y={SCREEN_HEIGHT * 0.5}
            />

            <AttackAnimation
                visible={showAttack}
                type={attackType}
                onComplete={() => setShowAttack(false)}
                x={SCREEN_WIDTH * 0.5}
                y={SCREEN_HEIGHT * 0.4}
            />

            <DamageNumberAnimation
                visible={showDamage}
                damage={damageNum}
                type="damage"
                x={SCREEN_WIDTH * 0.5}
                y={SCREEN_HEIGHT * 0.35}
                onComplete={() => setShowDamage(false)}
            />

            <EnergyAttachmentAnimation
                visible={showEnergyAttach}
                energyType={attachEnergyType}
                onComplete={() => setShowEnergyAttach(false)}
                x={SCREEN_WIDTH * 0.3}
                y={SCREEN_HEIGHT * 0.6}
            />

            <EvolutionAnimation
                visible={showEvolution}
                isMega={isMegaEvolution}
                evolutionName={evolutionName}
                onComplete={() => setShowEvolution(false)}
                x={SCREEN_WIDTH * 0.5}
                y={SCREEN_HEIGHT * 0.5}
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
