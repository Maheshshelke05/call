import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Api } from '../services/api';
import { OfflineQueue } from '../services/offlineQueue';
import { AssignedContact, CallDisposition } from '../types';

interface PostCallScreenProps {
  contact: AssignedContact;
  callSummary: {
    durationSeconds: number;
    talkDurationSeconds: number;
    disconnectCause: string;
  };
  clientCallId: string;
  simSlot: number;
  onFinish: () => void;
}

export const PostCallScreen: React.FC<PostCallScreenProps> = ({
  contact,
  callSummary,
  clientCallId,
  simSlot,
  onFinish,
}) => {
  const [dispositions, setDispositions] = useState<CallDisposition[]>([]);
  const [selectedDisp, setSelectedDisp] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showCallbackInput, setShowCallbackInput] = useState(false);
  const [callbackHours, setCallbackHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Api.getDispositions()
      .then((data) => {
        setDispositions(data);
        if (callSummary.talkDurationSeconds > 0) {
          setSelectedDisp('CONNECTED');
        } else {
          setSelectedDisp('NO_ANSWER');
        }
      })
      .catch(() => {
        // Local fallback dispositions if offline
        setDispositions([
          { id: 1, code: 'CONNECTED', label: 'Connected', is_connected: true, requires_callback: false },
          { id: 2, code: 'INTERESTED', label: 'Interested - Proposal Sent', is_connected: true, requires_callback: false },
          { id: 3, code: 'NO_ANSWER', label: 'No Answer / Ringing', is_connected: false, requires_callback: true },
          { id: 4, code: 'BUSY', label: 'Busy / Call Waiting', is_connected: false, requires_callback: true },
          { id: 5, code: 'CALLBACK', label: 'Callback Requested', is_connected: true, requires_callback: true },
          { id: 6, code: 'NOT_INTERESTED', label: 'Not Interested', is_connected: true, requires_callback: false },
          { id: 7, code: 'COMPLETED', label: 'Completed / Deal Closed', is_connected: true, requires_callback: false },
          { id: 8, code: 'DO_NOT_CONTACT', label: 'Do Not Contact (DNC)', is_connected: false, requires_callback: false },
        ]);
        setSelectedDisp(callSummary.talkDurationSeconds > 0 ? 'CONNECTED' : 'NO_ANSWER');
      });
  }, []);

  const handleSaveAndNext = async () => {
    if (!selectedDisp) {
      Alert.alert('Disposition Required', 'Please select a call disposition before continuing.');
      return;
    }

    setSubmitting(true);

    const now = new Date();
    const startedAt = new Date(now.getTime() - callSummary.durationSeconds * 1000).toISOString();
    const endedAt = now.toISOString();

    let callbackAt: string | undefined = undefined;
    if (showCallbackInput || selectedDisp === 'CALLBACK') {
      const futureHours = parseInt(callbackHours, 10) || 24;
      callbackAt = new Date(now.getTime() + futureHours * 3600 * 1000).toISOString();
    }

    // Enqueue call idempotently in local offline queue
    await OfflineQueue.enqueueCall({
      client_event_id: clientCallId,
      contact_id: contact.id,
      campaign_id: contact.campaign_id,
      phone_number_snapshot: contact.phone,
      sim_slot: simSlot,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: callSummary.talkDurationSeconds,
      status: callSummary.talkDurationSeconds > 0 ? 'COMPLETED' : 'MISSED',
      disposition_code: selectedDisp,
      notes: notes.trim() || undefined,
      callback_at: callbackAt,
      sync_status: 'PENDING',
      retry_count: 0,
    });

    setSubmitting(false);
    onFinish();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Call Summary Banner */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>CALL SUMMARY</Text>
        <Text style={styles.customerName}>{contact.first_name} {contact.last_name || ''}</Text>
        <Text style={styles.customerPhone}>{contact.phone}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Talk Time</Text>
            <Text style={styles.metaValue}>{callSummary.talkDurationSeconds}s</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Total Duration</Text>
            <Text style={styles.metaValue}>{callSummary.durationSeconds}s</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Carrier SIM</Text>
            <Text style={styles.metaValue}>SIM {simSlot + 1}</Text>
          </View>
        </View>
      </View>

      {/* Mandatory Disposition Selector */}
      <Text style={styles.sectionTitle}>SELECT CALL DISPOSITION *</Text>
      <View style={styles.dispositionGrid}>
        {dispositions.map((disp) => {
          const isSelected = selectedDisp === disp.code;
          return (
            <TouchableOpacity
              key={disp.code}
              style={[styles.dispChip, isSelected && styles.dispChipSelected]}
              onPress={() => {
                setSelectedDisp(disp.code);
                if (disp.requires_callback) setShowCallbackInput(true);
              }}
            >
              <Text style={[styles.dispChipText, isSelected && styles.dispChipTextSelected]}>
                {disp.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Callback Scheduler Option */}
      <TouchableOpacity
        style={styles.callbackToggle}
        onPress={() => setShowCallbackInput(!showCallbackInput)}
      >
        <Text style={styles.callbackToggleIcon}>{showCallbackInput ? '☑️' : '◻️'}</Text>
        <Text style={styles.callbackToggleText}>Schedule Follow-Up Callback</Text>
      </TouchableOpacity>

      {showCallbackInput && (
        <View style={styles.callbackInputBox}>
          <Text style={styles.callbackInputLabel}>Callback within:</Text>
          <View style={styles.hoursRow}>
            {['4', '24', '48', '72'].map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.hourBtn, callbackHours === h && styles.hourBtnActive]}
                onPress={() => setCallbackHours(h)}
              >
                <Text style={[styles.hourBtnText, callbackHours === h && styles.hourBtnTextActive]}>
                  {h} Hours
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Notes Text Area */}
      <Text style={styles.sectionTitle}>CALL NOTES (OPTIONAL)</Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Key takeaways, customer requirements, objection details..."
        placeholderTextColor="#64748B"
        multiline
        numberOfLines={3}
      />

      {/* Submit CTA */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSaveAndNext}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>SAVE & NEXT CONTACT →</Text>
        )}
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
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  customerPhone: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  dispositionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dispChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  dispChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  dispChipText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  dispChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  callbackToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  callbackToggleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  callbackToggleText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  callbackInputBox: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  callbackInputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hourBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  hourBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  hourBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  hourBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
