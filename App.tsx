import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { GameBoard } from './components';
import GameStartCoinFlip from './components/GameStartCoinFlip';
import SelectActiveModal from './components/SelectActiveModal';
import { useGameData } from './hooks/useGameData';
import Colors from './constants/colors';

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
  } = useGameData();

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
      <GameBoard gameState={gameState || undefined} />
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
