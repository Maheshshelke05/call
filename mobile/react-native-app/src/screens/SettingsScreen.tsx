import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Api } from '../services/api';
import { OfflineQueue } from '../services/offlineQueue';
import { TelephonyService } from '../services/TelephonyBridge';
import { SimAccount } from '../types';


interface SettingsScreenProps {
  user: any;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onLogout }) => {
  const [simAccounts, setSimAccounts] = useState<SimAccount[]>([]);
  const [preferredSim, setPreferredSim] = useState<number>(user?.preferred_sim_slot || 0);
  const [recordingStatus, setRecordingStatus] = useState<string>('CHECKING...');
  const [pendingSync, setPendingSync] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    TelephonyService.getSimAccounts().then(setSimAccounts);
    TelephonyService.checkRecordingCapability().then(setRecordingStatus);
    OfflineQueue.getPendingCount().then(setPendingSync);
  }, []);

  const handleSimSelect = async (slot: number) => {
    setPreferredSim(slot);
    try {
      await Api.updateSimPreference(slot);
      Alert.alert('Preferred SIM Saved', `Outbound calls will default to SIM ${slot + 1}`);
    } catch {
      Alert.alert('Saved Locally', `Preferred SIM set to SIM ${slot + 1}`);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const res = await OfflineQueue.flushQueue();
    const remaining = await OfflineQueue.getPendingCount();
    setPendingSync(remaining);
    setSyncing(false);
    Alert.alert('Sync Finished', `Uploaded ${res.synced} events (${res.failed} retrying).`);
  };

  const handleOpenOemSettings = async () => {
    await TelephonyService.openOemBackgroundSettings();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>EMPLOYEE ACCOUNT</Text>
        <Text style={styles.userName}>{user?.full_name || 'Calling Agent'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role || 'EMPLOYEE'}</Text>
          </View>
          <Text style={styles.targetInfo}>Target: {user?.daily_call_target || 50} calls/day</Text>
        </View>
      </View>

      {/* Hardware SIM Configuration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PREFERRED CALLING SIM</Text>
        <Text style={styles.cardDesc}>
          Corporate policy routes calls through your designated cellular work SIM.
        </Text>

        <View style={styles.simList}>
          {simAccounts.map((sim) => {
            const isSelected = preferredSim === sim.slotIndex;
            return (
              <TouchableOpacity
                key={sim.slotIndex}
                style={[styles.simCard, isSelected && styles.simCardSelected]}
                onPress={() => handleSimSelect(sim.slotIndex)}
              >
                <View>
                  <Text style={styles.simTitle}>SIM {sim.slotIndex + 1}: {sim.displayName}</Text>
                  <Text style={styles.simCarrier}>{sim.carrierName} • {sim.iccId}</Text>
                </View>
                {isSelected ? <Text style={styles.checkIcon}>✓ ACTIVE</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* OEM & Background Checklist */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DEVICE BACKGROUND STABILITY</Text>
        <Text style={styles.cardDesc}>
          Ensure Xiaomi, Samsung, Vivo, or Oppo does not terminate incoming call notifications.
        </Text>
        <TouchableOpacity style={styles.oemBtn} onPress={handleOpenOemSettings}>
          <Text style={styles.oemBtnText}>Check Auto-Start & Battery Settings →</Text>
        </TouchableOpacity>
      </View>

      {/* Recording Subsystem */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>CALL RECORDING CAPABILITY</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusName}>Hardware Audio Engine:</Text>
          <Text style={[styles.statusVal, { color: recordingStatus === 'READY' ? '#10B981' : '#F59E0B' }]}>
            {recordingStatus}
          </Text>
        </View>
      </View>

      {/* Offline Sync Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>OFFLINE STORAGE & QUEUE</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusName}>Pending Sync Items:</Text>
          <Text style={styles.statusVal}>{pendingSync} events</Text>
        </View>
        <TouchableOpacity
          style={[styles.syncBtn, syncing && styles.btnDisabled]}
          onPress={handleManualSync}
          disabled={syncing}
        >
          {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.syncBtnText}>FLUSH SYNC QUEUE NOW</Text>}
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>SIGN OUT OF SHIFT</Text>
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  roleBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  targetInfo: {
    color: '#94A3B8',
    fontSize: 12,
  },
  simList: {
    gap: 10,
  },
  simCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  simCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  simCarrier: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  checkIcon: {
    color: '#60A5FA',
    fontWeight: '800',
    fontSize: 12,
  },
  oemBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  oemBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  statusName: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  statusVal: {
    fontWeight: '700',
    fontSize: 13,
  },
  syncBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
