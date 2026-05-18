import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LeaderboardScreenProps {
  onBack: () => void;
  playerScore?: number;
  playerWins?: number;
  playerLosses?: number;
  playerDeckName?: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  wins: number;
  losses: number;
  deckName: string;
  trend: number;
}

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, name: 'AshKetchum_EX', score: 3842, wins: 892, losses: 134, deckName: 'Mega Lucario ex', trend: 12 },
  { rank: 2, name: 'MistyWaterFlower', score: 3756, wins: 847, losses: 156, deckName: 'Mega Greninja ex', trend: 5 },
  { rank: 3, name: 'BlueOak_Rival', score: 3621, wins: 823, losses: 189, deckName: 'Dragapult ex', trend: -3 },
  { rank: 4, name: 'GaryOakChamp', score: 3590, wins: 802, losses: 198, deckName: 'Raging Bolt ex', trend: 8 },
  { rank: 5, name: 'ProfOakLabs', score: 3488, wins: 788, losses: 212, deckName: 'Mega Darkrai ex', trend: 0 },
  { rank: 6, name: 'JessieRocket', score: 3401, wins: 765, losses: 234, deckName: 'Mega Chandelure ex', trend: 2 },
  { rank: 7, name: 'JamesRocket_G', score: 3344, wins: 743, losses: 256, deckName: 'Mega Excadrill ex', trend: -7 },
  { rank: 8, name: 'BrockPewter99', score: 3287, wins: 722, losses: 278, deckName: 'Mega Gallade ex', trend: 4 },
  { rank: 9, name: 'MayMapleDancer', score: 3190, wins: 701, losses: 299, deckName: 'Mega Pyroar ex', trend: 15 },
  { rank: 10, name: 'DawnPiplupFan', score: 3145, wins: 689, losses: 311, deckName: 'Mega Zygarde ex', trend: -2 },
  { rank: 11, name: 'PaulStrongest', score: 3089, wins: 677, losses: 323, deckName: 'Raging Bolt ex', trend: 6 },
  { rank: 12, name: 'HarleyClown', score: 3034, wins: 665, losses: 335, deckName: 'Dragapult ex', trend: 0 },
  { rank: 13, name: 'ZoeyCoordinator', score: 2987, wins: 654, losses: 346, deckName: 'Mega Lucario ex', trend: 9 },
  { rank: 14, name: 'DrewRivalry', score: 2934, wins: 643, losses: 357, deckName: 'Mega Greninja ex', trend: -4 },
  { rank: 15, name: 'SatoshiOG', score: 2890, wins: 632, losses: 368, deckName: 'Mega Chandelure ex', trend: 1 },
  { rank: 16, name: 'TobiasLegend', score: 2845, wins: 622, losses: 378, deckName: 'Mega Darkrai ex', trend: -8 },
  { rank: 17, name: 'LanceDragonM', score: 2798, wins: 612, losses: 388, deckName: 'Dragapult ex', trend: 3 },
  { rank: 18, name: 'CynthiaGirlBoss', score: 2754, wins: 602, losses: 398, deckName: 'Mega Gallade ex', trend: 11 },
  { rank: 19, name: 'StevenStoneDvr', score: 2702, wins: 593, losses: 407, deckName: 'Mega Excadrill ex', trend: -1 },
  { rank: 20, name: 'WallaceMiror', score: 2658, wins: 584, losses: 416, deckName: 'Mega Pyroar ex', trend: 7 },
];

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

const TIER_CONFIG: Record<Tier, { color: string; min: number; max: number }> = {
  Bronze:   { color: '#CD7F32', min: 0,    max: 999  },
  Silver:   { color: '#C0C0C0', min: 1000, max: 1499 },
  Gold:     { color: '#FFD700', min: 1500, max: 1999 },
  Platinum: { color: '#00CED1', min: 2000, max: 2499 },
  Diamond:  { color: '#87CEEB', min: 2500, max: 2999 },
  Master:   { color: '#E040FB', min: 3000, max: Infinity },
};

function getTier(score: number): Tier {
  for (const [name, cfg] of Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG[Tier]][]) {
    if (score >= cfg.min && score <= cfg.max) return name;
  }
  return 'Bronze';
}

function getNextTier(tier: Tier): Tier | null {
  const order: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'];
  const idx = order.indexOf(tier);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

function getTierProgress(score: number, tier: Tier): number {
  const cfg = TIER_CONFIG[tier];
  if (tier === 'Master') return 1;
  const range = cfg.max - cfg.min + 1;
  return Math.min(1, Math.max(0, (score - cfg.min) / range));
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

type Tab = 'GLOBAL' | 'FRIENDS' | 'NEARBY';

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  onBack,
  playerScore = 1708,
  playerWins = 0,
  playerLosses = 0,
  playerDeckName = 'Your Deck',
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('GLOBAL');

  const playerTier = getTier(playerScore);
  const playerTierColor = TIER_CONFIG[playerTier].color;
  const playerTierProgress = getTierProgress(playerScore, playerTier);
  const nextTier = getNextTier(playerTier);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Gradient */}
      <LinearGradient colors={['#1A1A2E', '#0D0D1A']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backArrow}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>LADDER</Text>
            <View style={styles.seasonTimer}>
              <Text style={styles.seasonTimerText}>Season ends:</Text>
              <Text style={styles.seasonTimerValue}>14d 6h</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Player Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileLeft}>
          {/* Rank Badge — gold diamond shape */}
          <View style={styles.diamondWrapper}>
            <View style={[styles.diamond, { backgroundColor: playerTierColor }]}>
              <Text style={styles.diamondText}>{playerTier[0]}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileTier, { color: playerTierColor }]}>{playerTier.toUpperCase()}</Text>
            <Text style={styles.profileScore}>{playerScore.toLocaleString()}</Text>
            <Text style={styles.profileRecord}>{playerWins}W / {playerLosses}L</Text>
            <Text style={styles.profileDeck}>{playerDeckName}</Text>
          </View>
        </View>
        <View style={styles.profileRight}>
          <Text style={styles.profileRankNum}>#247</Text>
          <View style={styles.progressBarContainer}>
            <Text style={styles.progressLabel}>
              {nextTier ? `→ ${nextTier}` : 'MAX RANK'}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(playerTierProgress * 100)}%` as any, backgroundColor: playerTierColor },
                ]}
              />
            </View>
            <Text style={styles.progressPct}>{Math.round(playerTierProgress * 100)}%</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['GLOBAL', 'FRIENDS', 'NEARBY'] as Tab[]).map((tab) => (
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

      {/* Content */}
      {activeTab !== 'GLOBAL' ? (
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
          <Text style={styles.comingSoonSub}>This feature is under development.</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {MOCK_ENTRIES.map((entry) => {
            const tier = getTier(entry.score);
            const tierColor = TIER_CONFIG[tier].color;
            const isTopThree = entry.rank <= 3;
            const medal = RANK_MEDALS[entry.rank];

            return (
              <View key={entry.rank} style={styles.row}>
                <View style={styles.rowRank}>
                  {medal ? (
                    <Text style={styles.medal}>{medal}</Text>
                  ) : (
                    <Text style={[styles.rankNum, isTopThree && styles.rankNumGold]}>
                      {entry.rank}
                    </Text>
                  )}
                </View>
                <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
                <View style={styles.rowMiddle}>
                  <Text style={styles.playerName} numberOfLines={1}>{entry.name}</Text>
                  <Text style={styles.deckName} numberOfLines={1}>{entry.deckName}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.scoreText}>{entry.score.toLocaleString()}</Text>
                  <Text
                    style={[
                      styles.trendText,
                      entry.trend > 0 ? styles.trendUp : entry.trend < 0 ? styles.trendDown : styles.trendNeutral,
                    ]}
                  >
                    {entry.trend > 0 ? `+${entry.trend}` : entry.trend === 0 ? '—' : `${entry.trend}`}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Divider + Player Row */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>YOUR RANK</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={[styles.row, styles.playerRow]}>
            <View style={styles.rowRank}>
              <Text style={styles.rankNum}>247</Text>
            </View>
            <View style={[styles.tierDot, { backgroundColor: playerTierColor }]} />
            <View style={styles.rowMiddle}>
              <Text style={styles.playerName} numberOfLines={1}>You</Text>
              <Text style={styles.deckName} numberOfLines={1}>{playerDeckName}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.scoreText}>{playerScore.toLocaleString()}</Text>
              <Text style={styles.trendNeutral}>—</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    flex: 1,
  },
  seasonTimer: {
    width: 90,
    alignItems: 'flex-end',
  },
  seasonTimerText: {
    color: '#888888',
    fontSize: 10,
  },
  seasonTimerValue: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Player profile card
  profileCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD70055',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  diamondWrapper: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  diamond: {
    width: 40,
    height: 40,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  diamondText: {
    color: '#0D0D1A',
    fontWeight: '900',
    fontSize: 14,
    transform: [{ rotate: '-45deg' }],
  },
  profileInfo: {
    flex: 1,
  },
  profileTier: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  profileScore: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  profileRecord: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  profileDeck: {
    color: '#888888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  profileRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  profileRankNum: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  progressBarContainer: {
    alignItems: 'flex-end',
    width: 80,
  },
  progressLabel: {
    color: '#888888',
    fontSize: 10,
    marginBottom: 2,
  },
  progressTrack: {
    width: 80,
    height: 6,
    backgroundColor: '#2A2A3E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressPct: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 2,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: '#FFD700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#FFD700',
    borderRadius: 1,
  },

  // Coming soon
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    color: '#888888',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  comingSoonSub: {
    color: '#555555',
    fontSize: 14,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12122A',
    borderRadius: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  playerRow: {
    borderWidth: 1.5,
    borderColor: '#FFD700',
    backgroundColor: '#1A1A2E',
  },
  rowRank: {
    width: 32,
    alignItems: 'center',
  },
  medal: {
    fontSize: 18,
  },
  rankNum: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '700',
  },
  rankNumGold: {
    color: '#FFD700',
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    marginLeft: 4,
  },
  rowMiddle: {
    flex: 1,
    marginRight: 8,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deckName: {
    color: '#777777',
    fontSize: 11,
    marginTop: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    minWidth: 54,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  trendUp: {
    color: '#00E676',
  },
  trendDown: {
    color: '#FF5252',
  },
  trendNeutral: {
    color: '#666666',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A3E',
  },
  dividerLabel: {
    color: '#555555',
    fontSize: 10,
    letterSpacing: 2,
    marginHorizontal: 10,
    fontWeight: '700',
  },
});

export default LeaderboardScreen;
