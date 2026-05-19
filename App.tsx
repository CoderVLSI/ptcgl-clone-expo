import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { GameBoard } from './components';
import LobbyScreen from './components/LobbyScreen';
import GameStartCoinFlip from './components/GameStartCoinFlip';
import SelectActiveModal from './components/SelectActiveModal';
import { useGameData } from './hooks/useGameData';
import Colors from './constants/colors';
import EditDeckScreen from './components/EditDeckScreen';
import DeckSelectionScreen from './components/DeckSelectionScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import FriendBattleScreen from './components/FriendBattleScreen';
import useGameDimensions from './hooks/useGameDimensions';

import { Card } from './types/game';

export default function App() {
  const {
    gameState,
    isLoading,
    error,
    setupPhase,
    decksReady,
    basicCardsInHand,
    onCoinFlipComplete,
    selectActiveCard,
    reloadGame,
    playerDeck,
    activeDeckName,
    setActiveDeckName,
    setPlayerDeck,
    availableDecks,
  } = useGameData();

  const [currentScreen, setCurrentScreen] = useState<
    'lobby' | 'game' | 'edit_deck' | 'deck_selection' | 'leaderboard' | 'friend_battle'
  >('lobby');
  const [editingDeck, setEditingDeck] = useState<Card[]>([]);
  const [editingDeckName, setEditingDeckName] = useState<string>('');
  const [playerWins, setPlayerWins] = useState(0);
  const [playerLosses, setPlayerLosses] = useState(0);
  const { isDesktop, screenWidth } = useGameDimensions();

  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <View style={[styles.container, styles.center]}>
          <StatusBar style="light" />
          <ActivityIndicator size="large" color={Colors.card.highlight} />
          <Text style={styles.loadingText}>Loading cards from Pokémon TCG API...</Text>
        </View>
      );
    }

    // Error state
    if (error && !decksReady) {
      return (
        <View style={[styles.container, styles.center]}>
          <StatusBar style="light" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reloadGame}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Lobby Screen
    if (currentScreen === 'lobby') {
      return (
        <LobbyScreen
          onPlayPress={() => setCurrentScreen('game')}
          activeDeck={playerDeck}
          activeDeckName={activeDeckName}
          onEditDeck={() => {
            setEditingDeck(playerDeck);
            setEditingDeckName(activeDeckName);
            setCurrentScreen('edit_deck');
          }}
          onDecksPress={() => setCurrentScreen('deck_selection')}
          onUpdateDeck={setPlayerDeck}
          onLeaderboardPress={() => setCurrentScreen('leaderboard')}
          onFriendBattlePress={() => setCurrentScreen('friend_battle')}
          playerWins={playerWins}
          playerLosses={playerLosses}
        />
      );
    }

    // Deck Selection Screen
    if (currentScreen === 'deck_selection') {
      return (
        <DeckSelectionScreen
          onBack={() => setCurrentScreen('lobby')}
          playerDeck={playerDeck}
          availableDecks={availableDecks}
          onSelectDeck={(deck, name) => {
            setPlayerDeck(deck);
            setActiveDeckName(name);
            setCurrentScreen('lobby');
          }}
          onEditDeck={(deck, name) => {
            setEditingDeck(deck);
            setEditingDeckName(name);
            setCurrentScreen('edit_deck');
          }}
          onCreateDeck={() => {
            setEditingDeck([]);
            setEditingDeckName('New Deck');
            setCurrentScreen('edit_deck');
          }}
          onUpdateDeck={setPlayerDeck}
        />
      );
    }

    // Edit Deck Screen
    if (currentScreen === 'edit_deck') {
      return (
        <EditDeckScreen
          deck={playerDeck}
          deckName={activeDeckName}
          onBack={() => setCurrentScreen('lobby')}
          onHome={() => setCurrentScreen('lobby')}
          onUpdateDeck={setPlayerDeck}
        />
      );
    }

    // Leaderboard Screen
    if (currentScreen === 'leaderboard') {
      return (
        <LeaderboardScreen
          onBack={() => setCurrentScreen('lobby')}
          playerScore={1708}
          playerWins={playerWins}
          playerLosses={playerLosses}
        />
      );
    }

    // Friend Battle Screen
    if (currentScreen === 'friend_battle') {
      return (
        <FriendBattleScreen
          onBack={() => setCurrentScreen('lobby')}
          onStartBattle={() => setCurrentScreen('game')}
          availableDecks={availableDecks}
        />
      );
    }

    // Coin flip to decide who goes first
    if (setupPhase === 'coin_flip') {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          <GameStartCoinFlip
            visible={true}
            onComplete={(playerGoesFirst) => onCoinFlipComplete(playerGoesFirst)}
          />
        </View>
      );
    }

    // Select active Pokémon from multiple basics
    if (setupPhase === 'select_active') {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          <SelectActiveModal
            visible={true}
            basicCards={basicCardsInHand}
            onSelect={(card) => selectActiveCard(card)}
          />
        </View>
      );
    }

    // Main game
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <GameBoard
          gameState={gameState || undefined}
          onReturnToLobby={() => setCurrentScreen('lobby')}
          onGameEnd={(didWin) => {
            if (didWin) setPlayerWins(w => w + 1);
            else setPlayerLosses(l => l + 1);
          }}
        />
      </View>
    );
  };

  if (!isDesktop) {
    return renderContent();
  }

  return (
    <View style={desktopStyles.outerContainer}>
      <StatusBar style="light" />
      {/* Desktop sidebar - left */}
      <View style={desktopStyles.sidebar}>
        <View style={desktopStyles.sidebarContent}>
          <Text style={desktopStyles.gameTitle}>PTCGL</Text>
          <Text style={desktopStyles.gameSubtitle}>CLONE</Text>
          <View style={desktopStyles.divider} />
          <Text style={desktopStyles.sidebarHint}>Pokémon{'\n'}TCG Live{'\n'}Clone</Text>
        </View>
      </View>

      {/* Centered game frame */}
      <View style={desktopStyles.gameFrame}>
        <View style={desktopStyles.gameContainer}>
          {renderContent()}
        </View>
      </View>

      {/* Desktop sidebar - right */}
      <View style={desktopStyles.sidebar}>
        <View style={desktopStyles.sidebarContent}>
          <Text style={desktopStyles.sidebarHint}>Controls{'\n\n'}Click cards{'\n'}to select{'\n\n'}Click active{'\n'}Pokémon{'\n'}to attack{'\n\n'}END TURN{'\n'}button →</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: Colors.ui.white,
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.ui.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const desktopStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0D0D1A',
  },
  sidebar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sidebarContent: {
    alignItems: 'center',
  },
  gameTitle: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  gameSubtitle: {
    color: '#A020F0',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginTop: -4,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  sidebarHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  gameFrame: {
    width: 480,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    // @ts-ignore - web only
    boxShadow: '0 0 60px rgba(0,0,0,0.8)',
  },
  gameContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});
