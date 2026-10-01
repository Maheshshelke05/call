import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ContactQueueScreen } from './src/screens/ContactQueueScreen';
import { ActiveCallScreen } from './src/screens/ActiveCallScreen';
import { PostCallScreen } from './src/screens/PostCallScreen';
import { CallbacksScreen } from './src/screens/CallbacksScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { Api } from './src/services/api';
import { AssignedContact } from './src/types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<'HOME' | 'QUEUE' | 'ACTIVE_CALL' | 'POST_CALL' | 'CALLBACKS' | 'SETTINGS'>('HOME');
  const [activeContact, setActiveContact] = useState<AssignedContact | null>(null);
  const [activeSimSlot, setActiveSimSlot] = useState<number>(0);
  const [clientCallId, setClientCallId] = useState<string>('');
  const [callSummary, setCallSummary] = useState<any>(null);

  useEffect(() => {
    // Check if user session already exists
    AsyncStorage.getItem('user_profile').then((raw) => {
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setCurrentScreen('HOME');
  };

  const handleLogout = async () => {
    await Api.logout();
    setUser(null);
    setCurrentScreen('HOME');
  };

  const handleStartCall = (contact: AssignedContact, simSlot: number) => {
    const uniqueId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setActiveContact(contact);
    setActiveSimSlot(simSlot);
    setClientCallId(uniqueId);
    setCurrentScreen('ACTIVE_CALL');
  };

  const handleCallEnded = (summary: {
    durationSeconds: number;
    talkDurationSeconds: number;
    disconnectCause: string;
  }) => {
    setCallSummary(summary);
    setCurrentScreen('POST_CALL');
  };

  const handleFinishPostCall = () => {
    setActiveContact(null);
    setCallSummary(null);
    setCurrentScreen('QUEUE');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Screen Router */}
      <View style={styles.container}>
        {currentScreen === 'HOME' && (
          <HomeScreen
            user={user}
            onNavigateToQueue={() => setCurrentScreen('QUEUE')}
            onNavigateToCallbacks={() => setCurrentScreen('CALLBACKS')}
            onNavigateToSettings={() => setCurrentScreen('SETTINGS')}
          />
        )}

        {currentScreen === 'QUEUE' && (
          <ContactQueueScreen
            user={user}
            onStartCall={handleStartCall}
          />
        )}

        {currentScreen === 'ACTIVE_CALL' && activeContact && (
          <ActiveCallScreen
            contact={activeContact}
            simSlot={activeSimSlot}
            clientCallId={clientCallId}
            onCallEnded={handleCallEnded}
          />
        )}

        {currentScreen === 'POST_CALL' && activeContact && (
          <PostCallScreen
            contact={activeContact}
            callSummary={callSummary || { durationSeconds: 0, talkDurationSeconds: 0, disconnectCause: 'NORMAL' }}
            clientCallId={clientCallId}
            simSlot={activeSimSlot}
            onFinish={handleFinishPostCall}
          />
        )}

        {currentScreen === 'CALLBACKS' && (
          <CallbacksScreen
            onCallContact={(contact) => handleStartCall(contact, activeSimSlot)}
          />
        )}

        {currentScreen === 'SETTINGS' && (
          <SettingsScreen
            user={user}
            onLogout={handleLogout}
          />
        )}
      </View>

      {/* Bottom Navigation Bar (Hidden during in-call & post-call screens) */}
      {currentScreen !== 'ACTIVE_CALL' && currentScreen !== 'POST_CALL' && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, currentScreen === 'HOME' && styles.navItemActive]}
            onPress={() => setCurrentScreen('HOME')}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text style={[styles.navText, currentScreen === 'HOME' && styles.navTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentScreen === 'QUEUE' && styles.navItemActive]}
            onPress={() => setCurrentScreen('QUEUE')}
          >
            <Text style={styles.navIcon}>📞</Text>
            <Text style={[styles.navText, currentScreen === 'QUEUE' && styles.navTextActive]}>
              Queue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentScreen === 'CALLBACKS' && styles.navItemActive]}
            onPress={() => setCurrentScreen('CALLBACKS')}
          >
            <Text style={styles.navIcon}>⏰</Text>
            <Text style={[styles.navText, currentScreen === 'CALLBACKS' && styles.navTextActive]}>
              Callbacks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentScreen === 'SETTINGS' && styles.navItemActive]}
            onPress={() => setCurrentScreen('SETTINGS')}
          >
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={[styles.navText, currentScreen === 'SETTINGS' && styles.navTextActive]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navItemActive: {
    opacity: 1,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
});
