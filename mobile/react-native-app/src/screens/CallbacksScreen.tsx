import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Api } from '../services/api';
import { CallbackItem, AssignedContact } from '../types';

interface CallbacksScreenProps {
  onCallContact: (contact: AssignedContact) => void;
}

export const CallbacksScreen: React.FC<CallbacksScreenProps> = ({ onCallContact }) => {
  const [filter, setFilter] = useState<'today' | 'overdue' | 'upcoming'>('today');
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCallbacks = async () => {
    setLoading(true);
    try {
      const data = await Api.getCallbacks(filter);
      setCallbacks(data);
    } catch {
      setCallbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCallbacks();
  }, [filter]);

  const handleCall = (cb: CallbackItem) => {
    onCallContact({
      id: cb.contact_id,
      assignment_id: 0,
      first_name: cb.contact_name,
      phone: cb.contact_phone,
      priority: 3,
      status: 'CALLBACK',
    });
  };

  const renderItem = ({ item }: { item: CallbackItem }) => {
    const timeFormatted = new Date(item.scheduled_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateFormatted = new Date(item.scheduled_at).toLocaleDateString();

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.contactName}>{item.contact_name}</Text>
            <Text style={styles.contactPhone}>{item.contact_phone}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{timeFormatted}</Text>
            <Text style={styles.dateBadgeText}>{dateFormatted}</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText}>📝 {item.notes}</Text>
        ) : null}

        <TouchableOpacity style={styles.callNowBtn} onPress={() => handleCall(item)}>
          <Text style={styles.callNowBtnText}>📞 CALL NOW</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Filter */}
      <View style={styles.tabsRow}>
        {(['today', 'overdue', 'upcoming'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, filter === t && styles.tabBtnActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : callbacks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>👍</Text>
          <Text style={styles.emptyTitle}>No {filter} callbacks</Text>
          <Text style={styles.emptySubtitle}>You are all caught up on follow-ups.</Text>
        </View>
      ) : (
        <FlatList
          data={callbacks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 6,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  contactPhone: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  timeBadgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  dateBadgeText: {
    color: '#64748B',
    fontSize: 10,
  },
  notesText: {
    color: '#CBD5E1',
    fontSize: 13,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  callNowBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  callNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
