import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert, Modal, Animated } from 'react-native';
import { GameState, Card as CardType, EnergyType } from '../types/game';
import Colors from '../constants/colors';
import useGameLogic from '../hooks/useGameLogic';
import { getNextAIAction, applyAIAction, AIAction } from '../utils/aiOpponent';
import useGameDimensions from '../hooks/useGameDimensions';
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
import { playSound, preloadEssentialSounds, attackSoundForType, setMuted } from '../services/soundService';
import { LinearGradient } from 'expo-linear-gradient';

interface GameBoardProps {
    gameState?: GameState;
    onReturnToLobby?: () => void;
    onGameEnd?: (didWin: boolean) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState: externalGameState, onReturnToLobby, onGameEnd }) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, isDesktop } = useGameDimensions();

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
        setLogicState,
        retreat,
        confirmSwitchBenchSelection,
        confirmDiscardSelection,
        confirmMultiDeckSelection,
        confirmCarmineSelection,
        confirmPlaceDamageCounters,
    } = useGameLogic(externalGameState || null);

    const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
    const [showDialog, setShowDialog] = useState(true);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showCoinFlip, setShowCoinFlip] = useState(false);
    const [showAttackMenu, setShowAttackMenu] = useState(false);
    const [menuCard, setMenuCard] = useState<CardType | null>(null);
    const [menuCardIsBench, setMenuCardIsBench] = useState(false);
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
    const [soundMuted, setSoundMuted] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Victory/Defeat modal
    const [showGameOver, setShowGameOver] = useState(false);
    const [isVictory, setIsVictory] = useState(false);
    const gameOverOpacity = useRef(new Animated.Value(0)).current;

    // Your Turn banner
    const [showTurnBanner, setShowTurnBanner] = useState(false);
    const turnBannerOpacity = useRef(new Animated.Value(0)).current;

    // AI thinking indicator
    const aiThinkingOpacity = useRef(new Animated.Value(1)).current;
    const aiThinkingLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    useEffect(() => {
        const isOpponentTurn = gameState?.currentPlayer === 'opponent';
        if (aiActing && isOpponentTurn) {
            aiThinkingLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(aiThinkingOpacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                    Animated.timing(aiThinkingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                ])
            );
            aiThinkingLoopRef.current.start();
        } else {
            if (aiThinkingLoopRef.current) {
                aiThinkingLoopRef.current.stop();
                aiThinkingLoopRef.current = null;
            }
            aiThinkingOpacity.setValue(1);
        }
        return () => {
            if (aiThinkingLoopRef.current) {
                aiThinkingLoopRef.current.stop();
            }
        };
    }, [aiActing, gameState?.currentPlayer]);

    // Update game state when external state changes
    const updateGameStateRef = useRef(updateGameState);
    updateGameStateRef.current = updateGameState;

    useEffect(() => {
        if (externalGameState) {
            updateGameStateRef.current(externalGameState);
        }
    }, [externalGameState]);

    // Preload essential sounds on mount
    useEffect(() => {
        preloadEssentialSounds();
    }, []);

    // Reset turn-based state when turn changes; auto-draw for player on turn 3+ (skip turn 1)
    const prevTurnPlayerRef = useRef<number>(-1);
    useEffect(() => {
        if (gameState?.currentPlayer === 'player') {
            setHasDrawnThisTurn(false);
            // Auto-draw at start of player's turn (not on very first turn of the game)
            if (gameState.turn > 1 && prevTurnPlayerRef.current !== gameState.turn) {
                prevTurnPlayerRef.current = gameState.turn;
                // Small delay so state settles before drawing
                setTimeout(() => {
                    const success = drawCard();
                    if (success) setHasDrawnThisTurn(true);
                }, 400);
            }
        }
    }, [gameState?.turn, gameState?.currentPlayer]);

    // Trigger animations + sounds based on game state messages
    useEffect(() => {
        if (!gameState?.message) return;

        const msg = gameState.message.toLowerCase();

        // Shuffle
        if (msg.includes('shuffled') || msg.includes('shuffle')) {
            setShowShuffle(true);
            playSound('card_draw', 0.6);
        }

        // Draw
        if (msg.includes('drew') || msg.includes('draw')) {
            setShowDraw(true);
            playSound('card_draw');
        }

        // Attack (player attacked)
        if (msg.includes('used') && !msg.includes('opponent')) {
            const attacker = gameState.player.activePokemon;
            const typeMap: Record<string, typeof attackType> = {
                fire: 'fire', water: 'water', lightning: 'electric', psychic: 'psychic',
            };
            const etype = attacker?.energyType || '';
            setAttackType(typeMap[etype] || 'physical');
            setShowAttack(true);
            playSound(attackSoundForType(etype));
        }

        // Opponent attacked
        if (msg.includes('opponent used')) {
            const etype = gameState.opponent?.activePokemon?.energyType || '';
            playSound(attackSoundForType(etype), 0.7);
        }

        // Damage number
        if (msg.includes('dealt') && msg.includes('damage')) {
            const m = gameState.message.match(/(\d+)\s+damage/);
            if (m) {
                setDamageNum(parseInt(m[1]));
                setTimeout(() => setShowDamage(true), 500);
            }
        }

        // Knockout
        if (msg.includes('knocked out') || msg.includes('knocked out')) {
            playSound('knockout', 0.9);
        }

        // Prize card
        if (msg.includes('prize')) {
            setTimeout(() => playSound('prize_card'), 800);
        }

        // Evolution
        if (msg.includes('evolved')) {
            const isMega = msg.includes('mega');
            const evoMatch = gameState.message.match(/evolved into (.+?)!/);
            setIsMegaEvolution(isMega);
            setEvolutionName(evoMatch ? evoMatch[1] : '');
            setTimeout(() => setShowEvolution(true), 200);
            playSound(isMega ? 'evolve_mega' : 'evolve');
        }

        // Game over
        if (msg.includes('you win') || msg.includes('won the game')) playSound('win');
        if (msg.includes('you lose') || msg.includes('lost the game')) playSound('lose');

    }, [gameState?.message, gameState?.player.activePokemon?.id]);

    // Game over detection
    useEffect(() => {
        if (!gameState?.message) return;
        const msg = gameState.message.toLowerCase();
        if (msg.includes('you win') || msg.includes('won the game')) {
            setIsVictory(true);
            setShowGameOver(true);
            onGameEnd?.(true);
            gameOverOpacity.setValue(0);
            Animated.timing(gameOverOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } else if (msg.includes('you lose') || msg.includes('lost the game')) {
            setIsVictory(false);
            setShowGameOver(true);
            onGameEnd?.(false);
            gameOverOpacity.setValue(0);
            Animated.timing(gameOverOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }
    }, [gameState?.message]);

    // "Your Turn" banner
    const prevPlayerRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!gameState?.currentPlayer) return;
        if (gameState.currentPlayer === 'player' && prevPlayerRef.current === 'opponent') {
            setShowTurnBanner(true);
            turnBannerOpacity.setValue(0);
            Animated.sequence([
                Animated.timing(turnBannerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.delay(1000),
                Animated.timing(turnBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start(() => setShowTurnBanner(false));
        }
        prevPlayerRef.current = gameState.currentPlayer;
    }, [gameState?.currentPlayer]);

    // Energy attachment animation + sound
    useEffect(() => {
        if (logicState.message.includes('attached') && pendingEnergyCard) {
            setAttachEnergyType(pendingEnergyCard.energyType || 'colorless');
            setShowEnergyAttach(true);
            playSound('energy_attach');
        }
    }, [logicState.message, pendingEnergyCard]);

    // Track the turn when AI started to prevent re-running
    const aiTurnRef = useRef<number>(-1);

    // Reset aiActing when turn changes to player
    useEffect(() => {
        if (gameState?.currentPlayer === 'player' && aiActing) {
            setAiActing(false);
        }
    }, [gameState?.currentPlayer]);

    // AI Opponent's Turn (Iterative)
    useEffect(() => {
        if (!gameState || gameState.currentPlayer !== 'opponent') {
            aiTurnRef.current = -1;
            return;
        }

        // Only start the AI loop if not already acting
        if (aiActing || aiTurnRef.current === gameState.turn) {
            return;
        }

        aiTurnRef.current = gameState.turn;
        setAiActing(true);

        let hasAttachedEnergy = false;
        let hasPlayedSupporter = false;

        const executeAI = async () => {
            // Give a small initial delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            let currentState = gameState;
            if (!currentState) return;

            while (true) {
                // Fetch next action
                const action = getNextAIAction(currentState, hasPlayedSupporter, hasAttachedEnergy);
                if (!action || action.type === 'END_TURN') {
                    const finalState = applyAIAction(currentState, { type: 'END_TURN', description: 'AI Ending turn' });
                    updateGameState(finalState);
                    break;
                }

                if (action.type === 'ATTACH_ENERGY') hasAttachedEnergy = true;
                if (action.type === 'PLAY_TRAINER') {
                    const card = currentState.opponent.hand.find(c => c.id === action.cardId);
                    if (card?.subtypes?.includes('Supporter')) hasPlayedSupporter = true;
                }

                // Apply action
                const nextState = applyAIAction(currentState, action);
                currentState = nextState;
                updateGameState(nextState);

                // If it was an attack, turn ends automatically in applyAIAction
                if (action.type === 'ATTACK') break;

                // Wait before next action
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 800));
            }

            setAiActing(false);
        };

        executeAI();
    }, [gameState?.currentPlayer, gameState?.turn]);

    const handleCardPress = useCallback((cardId: string) => {
        if (!gameState) return;

        if (logicState.actionMode === 'distribute_energy_from_discard') {
            distributeEnergyToTarget(cardId);
            return;
        }

        // If we have a pending energy attachment, attach to this card
        if (pendingEnergyCard) {
            const success = attachEnergy(pendingEnergyCard.id, cardId);
            if (success) {
                setPendingEnergyCard(null);
                setShowDialog(true);
                setShowActionMenu(false); // Close action menu
                setSelectedHandCard(null);
            }
            return;
        }

        // If we have a pending evolution, evolve this card
        if (pendingEvolveCard) {
            const success = evolvePokemon(pendingEvolveCard.id, cardId);
            if (success) {
                setPendingEvolveCard(null);
                setShowDialog(true);
                setShowActionMenu(false); // Close action menu
                setSelectedHandCard(null);
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
            setMenuCardIsBench(false);
            setShowAttackMenu(true);
        }
    }, [gameState, logicState.actionMode, pendingEnergyCard, pendingEvolveCard, selectedCardId, attachEnergy, evolvePokemon, distributeEnergyToTarget]);

    const handleHandCardPress = useCallback((card: CardType) => {
        if (!gameState || gameState.currentPlayer !== 'player') return;

        setSelectedHandCard(card);
        setShowActionMenu(true);
    }, [gameState]);

    const handleBenchCardPress = useCallback((cardId: string) => {
        if (!gameState) return;

        // Find card in bench, or check if it's the active Pokemon
        let card = gameState.player.bench.find(c => c.id === cardId);
        if (!card && gameState.player.activePokemon?.id === cardId) {
            card = gameState.player.activePokemon;
        }
        if (!card) return;

        if (logicState.actionMode === 'select_target') {
            confirmBossOrdersSelection(card.id);
            return;
        }

        if (logicState.actionMode === 'distribute_energy_from_discard') {
            distributeEnergyToTarget(card.id);
            return;
        }

        // If pending energy, attach to this card (active or bench)
        if (pendingEnergyCard) {
            const success = attachEnergy(pendingEnergyCard.id, cardId);
            if (success) {
                setPendingEnergyCard(null);
                setShowDialog(true);
                setShowActionMenu(false);
                setSelectedHandCard(null);
            }
            return;
        }

        // If pending evolve, evolve this card (active or bench)
        if (pendingEvolveCard) {
            const success = evolvePokemon(pendingEvolveCard.id, cardId);
            if (success) {
                setPendingEvolveCard(null);
                setShowDialog(true);
                setShowActionMenu(false);
                setSelectedHandCard(null);
            }
            return;
        }

        // Options: Set Active or Ability
        if (isDesktop) {
            // Alert.alert only supports 2 buttons on web — open AttackMenu directly so
            // the user can use abilities. Set Active is accessible via the AttackMenu too.
            setMenuCard(card);
            setMenuCardIsBench(true);
            setShowAttackMenu(true);
        } else {
            Alert.alert(
                'Options',
                `What to do with ${card.name}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Set Active', onPress: () => setActivePokemon(card.id) },
                    { text: 'View/Abilities', onPress: () => { setMenuCard(card); setShowAttackMenu(true); } }
                ]
            );
        }
    }, [gameState, logicState, pendingEnergyCard, pendingEvolveCard, attachEnergy, evolvePokemon, setActivePokemon, distributeEnergyToTarget, setLogicState]);



    const handlePlayToBench = useCallback(() => {
        if (!selectedHandCard) return;
        playPokemonToBench(selectedHandCard.id);
        playSound('card_play');
        setSelectedHandCard(null);
    }, [selectedHandCard, playPokemonToBench]);

    const handleAttachEnergy = useCallback(() => {
        if (!selectedHandCard) return;
        setPendingEnergyCard(selectedHandCard);
        setShowActionMenu(false);
        setSelectedHandCard(null);
        setLogicState(prev => ({
            ...prev,
            actionMode: 'attach_energy',
            message: 'Tap a Pokémon to attach energy to',
        }));
    }, [selectedHandCard, setLogicState]);

    const handleEvolve = useCallback(() => {
        if (!selectedHandCard) return;
        setPendingEvolveCard(selectedHandCard);
        setShowActionMenu(false);
        setSelectedHandCard(null);
        setLogicState(prev => ({
            ...prev,
            actionMode: 'evolve',
            message: 'Tap a Pokémon to evolve',
        }));
    }, [selectedHandCard, setLogicState]);

    const handlePlayTrainer = useCallback(() => {
        if (!selectedHandCard) return;
        const success = playTrainer(selectedHandCard.id);
        playSound('card_play');
        setSelectedHandCard(null);
        if (success) setShowActionMenu(false);
    }, [selectedHandCard, playTrainer]);

    const handleDrawCard = useCallback(() => {
        if (hasDrawnThisTurn) {
            Alert.alert('Already Drew', 'You already drew a card this turn (auto-drawn at turn start).');
            return;
        }
        const success = drawCard();
        if (success) {
            setHasDrawnThisTurn(true);
            playSound('card_draw');
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
                onMenuPress={() => setShowSettingsModal(true)}
                playerPrizes={gameState.player.prizeCards.length}
                opponentPrizes={gameState.opponent.prizeCards.length}
                timeRemaining={gameState.timeRemaining}
                isPlayerTurn={isPlayerTurn}
            />

            {/* AI Thinking Indicator */}
            {aiActing && !isPlayerTurn && (
                <Animated.View style={[styles.aiThinkingPill, { opacity: aiThinkingOpacity }]}>
                    <Text style={styles.aiThinkingText}>🤖 Thinking...</Text>
                </Animated.View>
            )}
            {/* Mute toggle */}
            <TouchableOpacity
                style={styles.muteButton}
                onPress={() => {
                    const next = !soundMuted;
                    setSoundMuted(next);
                    setMuted(next);
                }}
            >
                <Text style={styles.muteIcon}>{soundMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            {/* Opponent Area — hidden on desktop (info shown inside DesktopPlayMat) */}
            {!isDesktop && (
                <OpponentArea opponent={gameState.opponent} />
            )}

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
                    opponentDeckCount={gameState.opponent.deck.length}
                    opponentHandCount={gameState.opponent.hand.length}
                    opponentPrizeCount={gameState.opponent.prizeCards.length}
                    playerDeckCount={gameState.player.deck.length}
                    playerPrizeCount={gameState.player.prizeCards.length}
                    playerHand={isDesktop ? gameState.player.hand : undefined}
                    selectedHandCardId={isDesktop ? selectedCardId : undefined}
                    onHandCardPress={isDesktop ? handleHandCardPress : undefined}
                    onHandCardLongPress={isDesktop ? (card) => setPreviewCard(card) : undefined}
                    playerDiscard={isDesktop ? gameState.player.discardPile : undefined}
                    opponentDiscard={isDesktop ? gameState.opponent.discardPile : undefined}
                    isPlayerTurn={isDesktop ? isPlayerTurn : undefined}
                    onPlayerRetreat={isDesktop ? () => {
                        if (gameState.player.bench.length === 1) {
                            retreat(gameState.player.bench[0].id);
                        } else {
                            setLogicState(prev => ({
                                ...prev,
                                actionMode: 'retreat_select_bench',
                                message: 'Select a Benched Pokémon to retreat to.',
                            }));
                        }
                    } : undefined}
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


                {/* Attack Button — mobile only; desktop opens AttackMenu by clicking active Pokémon */}
                {!isDesktop && isPlayerTurn &&
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

            {/* Player Area — hidden on desktop (hand shown inside PlayMat right column) */}
            {!isDesktop && (
                <PlayerArea
                    player={gameState.player}
                    onCardPress={handleHandCardPress}
                    onCardLongPress={(card) => setPreviewCard(card)}
                    selectedCardId={selectedCardId}
                />
            )}

            {/* Game Controls — mobile only; desktop has hand inside playmat */}
            {!isDesktop && (
                <GameControls
                    hasAttachedEnergy={logicState.hasAttachedEnergy}
                    deckCount={gameState.player.deck.length}
                    discardCount={gameState.player.discardPile.length}
                    currentTurn={gameState.turn}
                    prizeCount={gameState.player.prizeCards.length}
                    opponentDeckCount={gameState.opponent.deck.length}
                    isPlayerTurn={isPlayerTurn}
                    activeStatusCondition={gameState.player.activePokemon?.statusCondition}
                    activeRetreatCost={gameState.player.activePokemon?.retreatCost ?? 0}
                    activeEnergyCount={gameState.player.activePokemon?.attachedEnergy?.length ?? 0}
                    canRetreat={
                        isPlayerTurn &&
                        gameState.player.bench.length > 0 &&
                        (gameState.player.activePokemon?.retreatCost ?? 0) <= (gameState.player.activePokemon?.attachedEnergy?.length ?? 0)
                    }
                    onRetreat={() => {
                        if (gameState.player.bench.length === 1) {
                            retreat(gameState.player.bench[0].id);
                        } else {
                            setLogicState(prev => ({
                                ...prev,
                                actionMode: 'retreat_select_bench',
                                message: 'Select a Benched Pokémon to retreat to.',
                            }));
                        }
                    }}
                />
            )}

            {/* Promote Pokémon Modal — shown when player's active is KO'd by opponent */}
            <CardSelectorModal
                visible={!!gameState?.pendingPlayerPromotion && gameState.player.bench.length > 0}
                title="Your Pokémon was Knocked Out!"
                subtitle="Choose a Benched Pokémon to become your new Active Pokémon"
                cards={gameState?.player.bench || []}
                minSelection={1}
                maxSelection={1}
                onConfirm={(ids) => {
                    if (!gameState) return;
                    const promoted = gameState.player.bench.find(c => c.id === ids[0]);
                    if (!promoted) return;
                    updateGameState({
                        ...gameState,
                        pendingPlayerPromotion: false,
                        player: {
                            ...gameState.player,
                            activePokemon: promoted,
                            bench: gameState.player.bench.filter(c => c.id !== ids[0]),
                        },
                        message: `${promoted.name} is now your Active Pokémon!`,
                    });
                }}
                onCancel={() => {}} // Cannot cancel — must promote
                confirmText="Promote"
                hideCancel
            />

            {/* Card Selector Modals (Ultra Ball, etc) */}
            <CardSelectorModal
                visible={logicState.actionMode === 'discard_from_hand'}
                title={
                    logicState.activeCardId === 'carmine_topdeck'
                        ? 'Carmine — Put 2 Cards on Deck'
                        : `Discard ${logicState.discardCount || 1} Cards`
                }
                subtitle={logicState.message || "Select cards"}
                cards={gameState.player.hand.filter(c => c.id !== logicState.activeCardId)}
                minSelection={logicState.discardCount || 1}
                maxSelection={logicState.discardCount || 1}
                onConfirm={confirmDiscard}
                onCancel={() => selectCard(null, 'none')}
                confirmText={
                    logicState.activeCardId === 'carmine_topdeck'
                        ? 'Put on Top of Deck'
                        : 'Discard Selected'
                }
            />

            <CardSelectorModal
                visible={logicState.actionMode === 'search_deck'}
                title="Search Deck — Pick a Pokémon"
                subtitle={logicState.message || "Select a Pokémon to put into your hand"}
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
                confirmText="Add to Hand"
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

            {/* Place Damage Counters Modal (Sure-Hit Shuriken etc) */}
            <CardSelectorModal
                visible={logicState.actionMode === 'place_damage_counters'}
                title="Choose Target"
                subtitle={logicState.message || `Place ${(logicState.discardCount || 60) / 10} damage counters on 1 of your opponent's Pokémon.`}
                cards={[
                    ...(gameState.opponent.activePokemon ? [gameState.opponent.activePokemon] : []),
                    ...gameState.opponent.bench,
                ]}
                minSelection={1}
                maxSelection={1}
                onConfirm={(ids) => confirmPlaceDamageCounters(ids[0])}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Place Damage"
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

            {/* Energy Selection from Discard (Mega Lucario Ora Jab / Crispin) */}
            <CardSelectorModal
                visible={logicState.actionMode === 'attach_energy_from_discard'}
                title="Select Energy from Discard"
                subtitle={logicState.message || "Select Energy card(s) to attach."}
                cards={
                    logicState.activeCardId === 'crispin_attach'
                        // Crispin: any basic energy
                        ? gameState.player.discardPile.filter(c => c.type === 'energy')
                        // Ora Jab: Fighting Energy only
                        : gameState.player.discardPile.filter(c => c.type === 'energy' && (c.name.includes('Fighting') || c.energyType === 'fighting'))
                }
                minSelection={1}
                maxSelection={logicState.activeCardId === 'crispin_attach' ? 1 : 3}
                onConfirm={
                    logicState.activeCardId === 'crispin_attach'
                        ? (ids) => confirmDiscardSelection(ids)
                        : confirmDiscardEnergySelection
                }
                onCancel={() => selectCard(null, 'none')}
                confirmText={logicState.activeCardId === 'crispin_attach' ? 'Attach Energy' : 'Attach to Bench'}
            />

            {/* Switch / Retreat bench selection */}
            <CardSelectorModal
                visible={logicState.actionMode === 'retreat_select_bench'}
                title="Switch Active"
                subtitle="Select a Benched Pokémon to switch with your Active"
                cards={gameState.player.bench}
                minSelection={1}
                maxSelection={1}
                onConfirm={(ids) => confirmSwitchBenchSelection(ids[0])}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Switch"
            />

            {/* Night Stretcher — select Pokémon from discard */}
            <CardSelectorModal
                visible={logicState.actionMode === 'select_from_discard'}
                title="Select from Discard"
                subtitle={logicState.message || "Select a card from your discard pile"}
                cards={gameState.player.discardPile.filter(c => c.type === 'pokemon')}
                minSelection={1}
                maxSelection={1}
                onConfirm={(ids) => confirmDiscardSelection(ids)}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Put in Hand"
            />

            {/* Briar / Buddy-Buddy Poffin multi-deck search */}
            <CardSelectorModal
                visible={logicState.actionMode === 'search_deck_multiple'}
                title="Search Deck"
                subtitle={logicState.message || "Select Pokémon from your deck"}
                cards={
                    logicState.activeCardId === 'buddy_poffin'
                        ? gameState.player.deck.filter(c => c.type === 'pokemon' && c.subtypes?.includes('Basic') && (c.hp || 0) <= 70)
                        : gameState.player.deck.filter(c => c.type === 'pokemon')
                }
                minSelection={0}
                maxSelection={logicState.discardCount || 2}
                onConfirm={(ids) => confirmMultiDeckSelection(ids)}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Add to Hand"
            />

            {/* Super Rod — select from discard to shuffle back */}
            <CardSelectorModal
                visible={logicState.actionMode === 'select_discard_multiple'}
                title="Super Rod"
                subtitle="Select up to 3 Pokémon or Energy to shuffle into your deck"
                cards={gameState.player.discardPile.filter(c => c.type === 'pokemon' || c.type === 'energy')}
                minSelection={0}
                maxSelection={3}
                onConfirm={(ids) => confirmDiscardSelection(ids)}
                onCancel={() => selectCard(null, 'none')}
                confirmText="Shuffle into Deck"
            />

            {/* Action Menu Modal */}
            <ActionMenu
                card={selectedHandCard}
                visible={showActionMenu}
                selectionMode={false}
                onClose={() => {
                    setShowActionMenu(false);
                    setSelectedHandCard(null);
                    setPendingEnergyCard(null);
                    setPendingEvolveCard(null);
                    setLogicState(prev => ({
                        ...prev,
                        actionMode: 'none',
                        message: '',
                    }));
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
                    (!selectedHandCard?.subtypes?.includes('Supporter') ||
                        (gameState.turn > 1 && !logicState.hasPlayedSupporter))
                }
                message={
                    logicState.actionMode === 'attach_energy' ? 'Tap a Pokémon to attach energy' :
                        logicState.actionMode === 'evolve' ? 'Tap a Pokémon to evolve' :
                            !selectedCardCheck.canPlay ? selectedCardCheck.reason : undefined
                }
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
                card={menuCard}
                onClose={() => {
                    setShowAttackMenu(false);
                    setMenuCard(null);
                    setMenuCardIsBench(false);
                }}
                onAttack={handleAttack}
                onUseAbility={(abilityIndex) => {
                    if (menuCard) {
                        useAbility(menuCard.id, abilityIndex);
                        setShowAttackMenu(false);
                        setMenuCard(null);
                        setMenuCardIsBench(false);
                    }
                }}
                onSetActive={menuCardIsBench && isDesktop && isPlayerTurn && menuCard ? () => {
                    setActivePokemon(menuCard.id);
                    setShowAttackMenu(false);
                    setMenuCard(null);
                    setMenuCardIsBench(false);
                } : undefined}
                abilitiesUsed={logicState.abilitiesUsed || []}
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

            {/* "Your Turn" Banner */}
            {showTurnBanner && (
                <Animated.View
                    style={[styles.turnBannerContainer, { opacity: turnBannerOpacity }]}
                    pointerEvents="none"
                >
                    <LinearGradient
                        colors={['rgba(255,215,0,0.9)', 'rgba(255,140,0,0.9)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.turnBannerGradient}
                    >
                        <Text style={styles.turnBannerText}>⚔ YOUR TURN</Text>
                    </LinearGradient>
                </Animated.View>
            )}

            {/* Victory / Defeat Modal */}
            <Modal
                visible={showGameOver}
                transparent
                animationType="fade"
                onRequestClose={() => {}}
            >
                <View style={styles.gameOverOverlay}>
                    <Animated.View style={[styles.gameOverCard, { opacity: gameOverOpacity, borderColor: isVictory ? '#FFD700' : '#FF4444' }]}>
                        <Text style={[styles.gameOverTitle, { color: isVictory ? '#FFD700' : '#FF4444' }]}>
                            {isVictory ? '✨ VICTORY!' : '💔 DEFEAT'}
                        </Text>
                        <Text style={styles.gameOverSubtitle}>
                            {isVictory ? 'You collected all 6 prize cards!' : 'Your Pokémon have fainted.'}
                        </Text>

                        <View style={styles.gameOverStats}>
                            <View style={styles.gameOverStatItem}>
                                <Text style={styles.gameOverStatLabel}>TURN</Text>
                                <Text style={styles.gameOverStatValue}>{gameState.turn}</Text>
                            </View>
                            <View style={styles.gameOverStatDivider} />
                            <View style={styles.gameOverStatItem}>
                                <Text style={styles.gameOverStatLabel}>PRIZES TAKEN</Text>
                                <Text style={styles.gameOverStatValue}>
                                    {6 - (gameState.player.prizeCards?.length ?? 0)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.gameOverButtons}>
                            <TouchableOpacity
                                style={[styles.gameOverButton, styles.gameOverButtonPrimary]}
                                onPress={() => {
                                    setShowGameOver(false);
                                    onReturnToLobby?.();
                                }}
                            >
                                <Text style={styles.gameOverButtonTextPrimary}>PLAY AGAIN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.gameOverButton, styles.gameOverButtonSecondary]}
                                onPress={() => {
                                    setShowGameOver(false);
                                    onReturnToLobby?.();
                                }}
                            >
                                <Text style={styles.gameOverButtonTextSecondary}>REMATCH</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* In-Game Settings Modal */}
            <Modal
                visible={showSettingsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSettingsModal(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>⚙ SETTINGS</Text>

                        {/* Sound toggle */}
                        <View style={styles.settingsRow}>
                            <Text style={styles.settingsRowLabel}>🔊 Sound</Text>
                            <TouchableOpacity
                                style={[styles.settingsToggle, soundMuted ? styles.settingsToggleOff : styles.settingsToggleOn]}
                                onPress={() => {
                                    const next = !soundMuted;
                                    setSoundMuted(next);
                                    setMuted(next);
                                }}
                            >
                                <Text style={styles.settingsToggleText}>{soundMuted ? 'OFF' : 'ON'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingsDivider} />

                        {/* Return to Lobby */}
                        <TouchableOpacity
                            style={styles.settingsReturnButton}
                            onPress={() => {
                                Alert.alert(
                                    'Return to Lobby?',
                                    'Your current game progress will be lost.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Return',
                                            style: 'destructive',
                                            onPress: () => {
                                                setShowSettingsModal(false);
                                                onReturnToLobby?.();
                                            },
                                        },
                                    ]
                                );
                            }}
                        >
                            <Text style={styles.settingsReturnText}>↩ Return to Lobby</Text>
                        </TouchableOpacity>

                        {/* Close */}
                        <TouchableOpacity
                            style={styles.settingsCloseButton}
                            onPress={() => setShowSettingsModal(false)}
                        >
                            <Text style={styles.settingsCloseText}>✕ Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.ui.black,
    },
    muteButton: {
        position: 'absolute',
        top: 8,
        right: 52,
        zIndex: 200,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    muteIcon: {
        fontSize: 18,
    },
    aiThinkingPill: {
        position: 'absolute',
        top: 60,
        right: 10,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.72)',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    aiThinkingText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontStyle: 'italic',
    },
    playMatContainer: {
        flex: 1,
        position: 'relative',
    },
    dialogOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '5%',
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

    // Your Turn Banner
    turnBannerContainer: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    turnBannerGradient: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 12,
    },
    turnBannerText: {
        color: '#1A1A1A',
        fontWeight: 'bold',
        fontSize: 22,
        letterSpacing: 3,
        textAlign: 'center',
    },

    // Game Over Modal
    gameOverOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    gameOverCard: {
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        borderWidth: 2,
        paddingVertical: 36,
        paddingHorizontal: 28,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 20,
    },
    gameOverTitle: {
        fontSize: 48,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    gameOverSubtitle: {
        color: '#CCCCCC',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
    },
    gameOverStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
    },
    gameOverStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    gameOverStatLabel: {
        color: '#888888',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    gameOverStatValue: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    gameOverStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 16,
    },
    gameOverButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    gameOverButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gameOverButtonPrimary: {
        backgroundColor: '#FFD700',
    },
    gameOverButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#FFD700',
    },
    gameOverButtonTextPrimary: {
        color: '#1A1A1A',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1.5,
    },
    gameOverButtonTextSecondary: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1.5,
    },

    // Settings Modal
    settingsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    settingsCard: {
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFD700',
        paddingVertical: 28,
        paddingHorizontal: 24,
        width: '100%',
        maxWidth: 300,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 20,
    },
    settingsTitle: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 20,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    settingsRowLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    settingsToggle: {
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 14,
        minWidth: 52,
        alignItems: 'center',
    },
    settingsToggleOn: {
        backgroundColor: '#FFD700',
    },
    settingsToggleOff: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: '#666',
    },
    settingsToggleText: {
        color: '#1A1A1A',
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
    },
    settingsDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginVertical: 16,
    },
    settingsReturnButton: {
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#FF4444',
        paddingVertical: 13,
        alignItems: 'center',
        marginBottom: 10,
    },
    settingsReturnText: {
        color: '#FF4444',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    settingsCloseButton: {
        borderRadius: 12,
        backgroundColor: '#FFD700',
        paddingVertical: 13,
        alignItems: 'center',
    },
    settingsCloseText: {
        color: '#1A1A1A',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
});

export default GameBoard;
