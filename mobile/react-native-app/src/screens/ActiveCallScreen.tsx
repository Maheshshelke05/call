import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { TelephonyService } from '../services/TelephonyBridge';
import { AssignedContact, CallState } from '../types';


interface ActiveCallScreenProps {
  contact: AssignedContact;
  simSlot: number;
  clientCallId: string;
  onCallEnded: (callSummary: {
    durationSeconds: number;
    talkDurationSeconds: number;
    disconnectCause: string;
  }) => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  contact,
  simSlot,
  clientCallId,
  onCallEnded,
}) => {
  const [callState, setCallState] = useState<CallState>('DIALING');
  const [talkSeconds, setTalkSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    // Start native call
    TelephonyService.initiateCall(contact.phone, simSlot, clientCallId);

    // Listen to call state events
    const stateSub = TelephonyService.onCallStateChanged((event) => {
      setCallState(event.state);
      if (event.durationSeconds > 0) {
        setTalkSeconds(event.durationSeconds);
      }
    });

    const endSub = TelephonyService.onCallEnded((event) => {
      onCallEnded({
        durationSeconds: event.totalDurationSeconds,
        talkDurationSeconds: event.talkDurationSeconds,
        disconnectCause: event.disconnectCause || 'NORMAL',
      });
    });

    // Talk time chronometer
    let timer: any = null;
    if (callState === 'ACTIVE') {
      timer = setInterval(() => {
        setTalkSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      stateSub?.remove();
      endSub?.remove();
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    await TelephonyService.setMuted(nextMute);
    setIsMuted(nextMute);
  };

  const handleToggleSpeaker = async () => {
    const nextSpeaker = !isSpeaker;
    await TelephonyService.setSpeakerphone(nextSpeaker);
    setIsSpeaker(nextSpeaker);
  };

  const handleHangup = async () => {
    await TelephonyService.endCall();
    onCallEnded({
      durationSeconds: talkSeconds + 5,
      talkDurationSeconds: talkSeconds,
      disconnectCause: 'LOCAL_HANGUP',
    });
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topInfo}>
        <View style={styles.simBadge}>
          <Text style={styles.simBadgeText}>
            CELLULAR • SIM {simSlot + 1}
          </Text>
        </View>

        <Text style={styles.customerName}>{contact.first_name} {contact.last_name || ''}</Text>
        <Text style={styles.customerPhone}>{contact.phone}</Text>
        {contact.company ? <Text style={styles.customerCompany}>{contact.company}</Text> : null}

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>
            {callState === 'ACTIVE'
              ? 'CALL CONNECTED'
              : callState === 'RINGING'
              ? 'RINGING CUSTOMER...'
              : 'DIALING CELLULAR RADIO...'}
          </Text>
          <Text style={styles.timerText}>{formatTimer(talkSeconds)}</Text>
        </View>
      </View>

      {/* In-Call Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={handleToggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
          onPress={handleToggleSpeaker}
        >
          <Text style={styles.controlIcon}>📢</Text>
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>
      </View>

      {/* End Call Hangup CTA */}
      <View style={styles.hangupContainer}>
        <TouchableOpacity style={styles.hangupBtn} onPress={handleHangup}>
          <Text style={styles.hangupIcon}>📞</Text>
          <Text style={styles.hangupText}>END CALL</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'space-between',
    padding: 24,
  },
  topInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  simBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  simBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  customerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  customerPhone: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 4,
  },
  customerCompany: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  statusBox: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 40,
  },
  controlBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  controlBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  controlIcon: {
    fontSize: 28,
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  hangupContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hangupBtn: {
    backgroundColor: '#DC2626', // Red 600
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#DC2626',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  hangupIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 10,
    transform: [{ rotate: '135deg' }],
  },
  hangupText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
