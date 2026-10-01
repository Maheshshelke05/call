import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Api } from '../services/api';
import { OfflineQueue } from '../services/offlineQueue';
import { EmployeeDashboardMetrics } from '../types';

interface HomeScreenProps {
  user: any;
  onNavigateToQueue: () => void;
  onNavigateToCallbacks: () => void;
  onNavigateToSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigateToQueue,
  onNavigateToCallbacks,
  onNavigateToSettings,
}) => {
  const [metrics, setMetrics] = useState<EmployeeDashboardMetrics>({
    daily_target: 50,
    completed_calls: 0,
    connected_calls: 0,
    no_answer_calls: 0,
    busy_calls: 0,
    callbacks_due_today: 0,
    remaining_calls: 50,
    assigned_contacts_count: 0,
    sync_status: 'SYNCED',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const loadData = async () => {
    try {
      const data = await Api.getDashboard();
      setMetrics(data);
      const pending = await OfflineQueue.getPendingCount();
      setPendingSyncCount(pending);
    } catch (_err) {
      // Offline fallback
      const pending = await OfflineQueue.getPendingCount();
      setPendingSyncCount(pending);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    OfflineQueue.flushQueue().then(() => loadData());
  };

  const progressPercent = Math.min(
    100,
    Math.round((metrics.completed_calls / Math.max(1, metrics.daily_target)) * 100)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.full_name || 'Calling Agent'}</Text>
        </View>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={onNavigateToSettings}>
          <Text style={styles.settingsIconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Status Badge */}
      <View style={styles.syncBanner}>
        <View style={[styles.syncDot, { backgroundColor: pendingSyncCount > 0 ? '#F59E0B' : '#10B981' }]} />
        <Text style={styles.syncText}>
          {pendingSyncCount > 0
            ? `${pendingSyncCount} call events queued offline • Auto-syncing`
            : 'All call logs synchronized with cloud'}
        </Text>
      </View>

      {/* Daily Target Card */}
      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetTitle}>TODAY'S TARGET</Text>
          <Text style={styles.targetCount}>
            {metrics.completed_calls} / {metrics.daily_target} calls
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.targetFooter}>
          <Text style={styles.progressText}>{progressPercent}% Achieved</Text>
          <Text style={styles.remainingText}>{metrics.remaining_calls} remaining</Text>
        </View>
      </View>

      {/* Primary Calling CTA */}
      <TouchableOpacity style={styles.mainCallCTA} onPress={onNavigateToQueue}>
        <Text style={styles.mainCallIcon}>📞</Text>
        <View style={styles.mainCallTexts}>
          <Text style={styles.mainCallTitle}>OPEN CALLING QUEUE</Text>
          <Text style={styles.mainCallSubtitle}>
            {metrics.assigned_contacts_count} Contacts Assigned & Ready
          </Text>
        </View>
        <Text style={styles.mainCallArrow}>→</Text>
      </TouchableOpacity>

      {/* KPI Grid */}
      <Text style={styles.sectionHeader}>TODAY'S CALL PERFORMANCE</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>{metrics.completed_calls}</Text>
          <Text style={styles.kpiLabel}>Total Dialed</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#34D399' }]}>{metrics.connected_calls}</Text>
          <Text style={styles.kpiLabel}>Connected</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#F87171' }]}>{metrics.no_answer_calls}</Text>
          <Text style={styles.kpiLabel}>No Answer</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#FBBF24' }]}>{metrics.busy_calls}</Text>
          <Text style={styles.kpiLabel}>Busy / Failed</Text>
        </View>
      </View>

      {/* Callbacks Due Card */}
      <TouchableOpacity style={styles.callbackCard} onPress={onNavigateToCallbacks}>
        <View style={styles.callbackLeft}>
          <Text style={styles.callbackIcon}>⏰</Text>
          <View>
            <Text style={styles.callbackTitle}>Callbacks Due Today</Text>
            <Text style={styles.callbackSubtitle}>Scheduled follow-ups with interested clients</Text>
          </View>
        </View>
        <View style={styles.callbackBadge}>
          <Text style={styles.callbackBadgeText}>{metrics.callbacks_due_today}</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  greetingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  settingsIconBtn: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsIconText: {
    fontSize: 18,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  syncText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  targetCard: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  targetCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },
  targetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 12,
    color: '#64748B',
  },
  mainCallCTA: {
    backgroundColor: '#16A34A', // Emerald 600
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#16A34A',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  mainCallIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  mainCallTexts: {
    flex: 1,
  },
  mainCallTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mainCallSubtitle: {
    fontSize: 12,
    color: '#D1FAE5',
    marginTop: 2,
  },
  mainCallArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    backgroundColor: '#1E293B',
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  callbackCard: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  callbackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  callbackIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  callbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  callbackSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  callbackBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  callbackBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
