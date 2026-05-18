import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FriendBattleScreenProps {
  onBack: () => void;
  onStartBattle: () => void;
  availableDecks: { id: string; name: string; cards: any[]; type: string; mainCard?: string }[];
}

type MainTab = 'HOST' | 'JOIN';

const ROOM_CODE = 'PK4T9Z';
const RECENT_CODES = ['PK4T9Z', 'ABCD12', 'ZZ9977'];
const DISCLAIMER = 'Online matchmaking coming soon. Currently connects to AI opponent.';

export const FriendBattleScreen: React.FC<FriendBattleScreenProps> = ({
  onBack,
  onStartBattle,
  availableDecks,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('HOST');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    availableDecks.length > 0 ? availableDecks[0].id : null
  );
  const [joinCode, setJoinCode] = useState<string[]>(Array(6).fill(''));
  const [copied, setCopied] = useState(false);

  // Pulsing animation for "Waiting for opponent..."
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Refs for JOIN code inputs
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCopy = () => {
    // Clipboard.setString is not available without @react-native-clipboard/clipboard;
    // visual feedback is shown regardless.
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinCodeChange = (char: string, index: number) => {
    const upper = char.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const updated = [...joinCode];
    updated[index] = upper.slice(-1);
    setJoinCode(updated);
    if (upper && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleJoinCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !joinCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fillJoinCode = (code: string) => {
    const chars = code.split('').slice(0, 6);
    const padded = [...chars, ...Array(6 - chars.length).fill('')];
    setJoinCode(padded);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#0D0D1A']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backArrow}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>FRIENDLY BATTLE</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Tabs */}
      <View style={styles.tabRow}>
        {(['HOST', 'JOIN'] as MainTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'HOST' ? (
          <HostTab
            roomCode={ROOM_CODE}
            copied={copied}
            onCopy={handleCopy}
            pulseAnim={pulseAnim}
            availableDecks={availableDecks}
            selectedDeckId={selectedDeckId}
            onSelectDeck={(id) => setSelectedDeckId(id)}
            onStartBattle={onStartBattle}
          />
        ) : (
          <JoinTab
            joinCode={joinCode}
            inputRefs={inputRefs}
            onCodeChange={handleJoinCodeChange}
            onKeyPress={handleJoinCodeKeyPress}
            onFillCode={fillJoinCode}
            onStartBattle={onStartBattle}
            recentCodes={RECENT_CODES}
          />
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── HOST TAB ────────────────────────────────────────────────────────────────

interface HostTabProps {
  roomCode: string;
  copied: boolean;
  onCopy: () => void;
  pulseAnim: Animated.Value;
  availableDecks: FriendBattleScreenProps['availableDecks'];
  selectedDeckId: string | null;
  onSelectDeck: (id: string) => void;
  onStartBattle: () => void;
}

const HostTab: React.FC<HostTabProps> = ({
  roomCode,
  copied,
  onCopy,
  pulseAnim,
  availableDecks,
  selectedDeckId,
  onSelectDeck,
  onStartBattle,
}) => (
  <View>
    <Text style={styles.sectionLabel}>YOUR ROOM CODE</Text>

    {/* Room code box */}
    <View style={styles.roomCodeBox}>
      <Text style={styles.roomCodeText}>{roomCode}</Text>
      <TouchableOpacity onPress={onCopy} style={styles.copyButton}>
        <Text style={styles.copyIcon}>{copied ? '✓' : '⎘'}</Text>
        <Text style={styles.copyLabel}>{copied ? 'Copied!' : 'Copy'}</Text>
      </TouchableOpacity>
    </View>

    {/* Pulsing waiting text */}
    <View style={styles.waitingRow}>
      <Animated.Text style={[styles.waitingDot, { opacity: pulseAnim }]}>●</Animated.Text>
      <Animated.Text style={[styles.waitingText, { opacity: pulseAnim }]}>
        Waiting for opponent...
      </Animated.Text>
    </View>

    {/* Deck selection */}
    <Text style={styles.sectionLabel}>SELECT DECK</Text>
    {availableDecks.length === 0 ? (
      <Text style={styles.noDecksText}>No decks available.</Text>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckList}>
        {availableDecks.map((deck) => (
          <TouchableOpacity
            key={deck.id}
            style={[styles.deckChip, selectedDeckId === deck.id && styles.deckChipSelected]}
            onPress={() => onSelectDeck(deck.id)}
          >
            <View style={[styles.deckChipDot, { backgroundColor: DECK_TYPE_COLOR[deck.type] || '#888888' }]} />
            <Text style={[styles.deckChipText, selectedDeckId === deck.id && styles.deckChipTextSelected]} numberOfLines={1}>
              {deck.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}

    {/* AI Battle button */}
    <TouchableOpacity style={styles.aiBattleButton} onPress={onStartBattle}>
      <LinearGradient colors={['#A020F0', '#6010B0']} style={styles.aiBattleGradient}>
        <Text style={styles.aiBattleText}>Or battle AI opponent</Text>
      </LinearGradient>
    </TouchableOpacity>

    {/* Cancel room */}
    <TouchableOpacity style={styles.cancelButton} onPress={() => {}}>
      <Text style={styles.cancelButtonText}>Cancel Room</Text>
    </TouchableOpacity>
  </View>
);

// ─── JOIN TAB ─────────────────────────────────────────────────────────────────

interface JoinTabProps {
  joinCode: string[];
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  onCodeChange: (char: string, index: number) => void;
  onKeyPress: (key: string, index: number) => void;
  onFillCode: (code: string) => void;
  onStartBattle: () => void;
  recentCodes: string[];
}

const JoinTab: React.FC<JoinTabProps> = ({
  joinCode,
  inputRefs,
  onCodeChange,
  onKeyPress,
  onFillCode,
  onStartBattle,
  recentCodes,
}) => (
  <View>
    <Text style={styles.sectionLabel}>ENTER ROOM CODE</Text>

    {/* 6-character PIN input */}
    <View style={styles.pinRow}>
      {joinCode.map((char, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputRefs.current[i] = r; }}
          style={styles.pinBox}
          value={char}
          onChangeText={(text) => onCodeChange(text, i)}
          onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, i)}
          maxLength={1}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password' as any}
          selectionColor="#FFD700"
          placeholderTextColor="#444444"
          placeholder="—"
        />
      ))}
    </View>

    {/* Join button */}
    <TouchableOpacity
      style={[styles.joinBattleButton, joinCode.every(Boolean) && styles.joinBattleButtonActive]}
      onPress={onStartBattle}
      disabled={!joinCode.every(Boolean)}
    >
      <LinearGradient
        colors={joinCode.every(Boolean) ? ['#FFD700', '#FFA500'] : ['#2A2A3E', '#1A1A2E']}
        style={styles.joinBattleGradient}
      >
        <Text style={[styles.joinBattleText, joinCode.every(Boolean) && styles.joinBattleTextActive]}>
          JOIN BATTLE
        </Text>
      </LinearGradient>
    </TouchableOpacity>

    {/* Recent codes */}
    <Text style={styles.sectionLabel}>RECENT ROOMS</Text>
    {recentCodes.map((code) => (
      <View key={code} style={styles.recentRow}>
        <View style={styles.recentCodeBadge}>
          <Text style={styles.recentCodeText}>{code}</Text>
        </View>
        <TouchableOpacity style={styles.rejoinButton} onPress={() => { onFillCode(code); }}>
          <Text style={styles.rejoinButtonText}>Rejoin</Text>
        </TouchableOpacity>
      </View>
    ))}
  </View>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DECK_TYPE_COLOR: Record<string, string> = {
  fighting:  '#C03028',
  psychic:   '#A040A0',
  lightning: '#C8A000',
  water:     '#2060C0',
  grass:     '#3A8A30',
  fire:      '#C04808',
  darkness:  '#403830',
  metal:     '#6870A0',
  colorless: '#888888',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },

  // Header
  header: {
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  backArrow: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tabTextActive: {
    color: '#FFD700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#FFD700',
    borderRadius: 1,
  },

  // Scroll content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Section label
  sectionLabel: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
  },

  // Room code box
  roomCodeBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#A020F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  roomCodeText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  copyButton: {
    alignItems: 'center',
    padding: 8,
  },
  copyIcon: {
    color: '#A020F0',
    fontSize: 22,
  },
  copyLabel: {
    color: '#A020F0',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  // Waiting text
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  waitingDot: {
    color: '#A020F0',
    fontSize: 10,
    marginRight: 8,
  },
  waitingText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Deck selection
  noDecksText: {
    color: '#555555',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  deckList: {
    paddingBottom: 4,
    gap: 8,
  },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12122A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  deckChipSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1A2E',
  },
  deckChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  deckChipText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  deckChipTextSelected: {
    color: '#FFD700',
  },

  // AI Battle button
  aiBattleButton: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  aiBattleGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  aiBattleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Cancel
  cancelButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A5E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#777777',
    fontSize: 14,
    fontWeight: '600',
  },

  // PIN input (JOIN tab)
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  pinBox: {
    width: 44,
    height: 56,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2A2A3E',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },

  // Join battle button
  joinBattleButton: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  joinBattleButtonActive: {},
  joinBattleGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinBattleText: {
    color: '#555555',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  joinBattleTextActive: {
    color: '#0D0D1A',
  },

  // Recent rooms
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12122A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  recentCodeBadge: {
    flex: 1,
  },
  recentCodeText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  rejoinButton: {
    backgroundColor: '#1A1A3A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A020F055',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rejoinButtonText: {
    color: '#A020F0',
    fontSize: 12,
    fontWeight: '700',
  },

  // Disclaimer
  disclaimerBox: {
    marginTop: 24,
    backgroundColor: '#0F0F20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    padding: 14,
  },
  disclaimerText: {
    color: '#555555',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default FriendBattleScreen;
