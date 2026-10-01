import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Api } from '../services/api';
import { OfflineQueue } from '../services/offlineQueue';
import { TelephonyService } from '../services/TelephonyBridge';
import { AssignedContact, SimAccount } from '../types';


interface ContactQueueScreenProps {
  user: any;
  onStartCall: (contact: AssignedContact, simSlot: number) => void;
}

export const ContactQueueScreen: React.FC<ContactQueueScreenProps> = ({
  user,
  onStartCall,
}) => {
  const [contacts, setContacts] = useState<AssignedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [simAccounts, setSimAccounts] = useState<SimAccount[]>([]);
  const [selectedSimSlot, setSelectedSimSlot] = useState<number>(user?.preferred_sim_slot || 0);
  const [showSimPicker, setShowSimPicker] = useState(false);

  useEffect(() => {
    loadQueue();
    TelephonyService.getSimAccounts().then(setSimAccounts);
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await Api.getAssignedQueue();
      setContacts(data);
      await OfflineQueue.cacheContacts(data);
    } catch (_err) {
      // Fallback to offline cached contacts
      const cached = await OfflineQueue.getCachedContacts();
      setContacts(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleCallPress = (contact: AssignedContact) => {
    onStartCall(contact, selectedSimSlot);
  };

  const currentSim = simAccounts.find((s) => s.slotIndex === selectedSimSlot) || {
    displayName: `SIM ${selectedSimSlot + 1}`,
    carrierName: 'Cellular',
  };

  const renderContactCard = ({ item }: { item: AssignedContact }) => {
    const priorityColor = item.priority === 3 ? '#EF4444' : item.priority === 2 ? '#F59E0B' : '#3B82F6';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{item.first_name} {item.last_name || ''}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>
                {item.priority === 3 ? 'HIGH' : item.priority === 2 ? 'MED' : 'NORM'}
              </Text>
            </View>
          </View>

          {item.company ? <Text style={styles.companyName}>{item.company}</Text> : null}
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.phoneText}>📱 {item.phone}</Text>
          {item.location ? <Text style={styles.locationText}>📍 {item.location}</Text> : null}
        </View>

        {item.campaign_name ? (
          <View style={styles.campaignBadge}>
            <Text style={styles.campaignText}>🎯 {item.campaign_name}</Text>
          </View>
        ) : null}

        {item.last_disposition ? (
          <Text style={styles.lastCallText}>
            Last: <Text style={styles.lastDispText}>{item.last_disposition}</Text>
          </Text>
        ) : null}

        {/* Primary CALL CTA */}
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleCallPress(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.callButtonIcon}>📞</Text>
          <Text style={styles.callButtonText}>CALL VIA {currentSim.displayName.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* SIM Selector Header */}
      <View style={styles.simBar}>
        <View>
          <Text style={styles.simBarLabel}>ACTIVE CALLING SIM</Text>
          <Text style={styles.simBarValue}>
            {currentSim.displayName} ({currentSim.carrierName})
          </Text>
        </View>
        <TouchableOpacity style={styles.changeSimBtn} onPress={() => setShowSimPicker(true)}>
          <Text style={styles.changeSimText}>Change SIM</Text>
        </TouchableOpacity>
      </View>

      {/* Queue List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading assigned contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Queue Cleared!</Text>
          <Text style={styles.emptySubtitle}>No pending contacts assigned right now.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadQueue}>
            <Text style={styles.refreshBtnText}>Check for New Contacts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderContactCard}
          contentContainerStyle={styles.listContent}
          onRefresh={loadQueue}
          refreshing={loading}
        />
      )}

      {/* SIM Picker Modal */}
      <Modal visible={showSimPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Outgoing Calling SIM</Text>
            <Text style={styles.modalDesc}>
              Cellular calls will be routed through your chosen physical SIM card.
            </Text>

            {simAccounts.map((sim) => (
              <TouchableOpacity
                key={sim.slotIndex}
                style={[
                  styles.simOption,
                  selectedSimSlot === sim.slotIndex && styles.simOptionActive,
                ]}
                onPress={() => {
                  setSelectedSimSlot(sim.slotIndex);
                  setShowSimPicker(false);
                }}
              >
                <Text style={styles.simOptionName}>{sim.displayName}</Text>
                <Text style={styles.simOptionCarrier}>{sim.carrierName}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSimPicker(false)}>
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  simBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  simBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  simBarValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60A5FA',
    marginTop: 2,
  },
  changeSimBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeSimText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  companyName: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 6,
  },
  phoneText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  locationText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  campaignBadge: {
    backgroundColor: '#0F172A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 6,
  },
  campaignText: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '600',
  },
  lastCallText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  lastDispText: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  callButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  refreshBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  simOption: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  simOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  simOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  simOptionCarrier: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
