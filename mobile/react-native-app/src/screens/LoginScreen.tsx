import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Api, getApiBaseUrl, setApiBaseUrl } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('employee1@callingplatform.local');
  const [password, setPassword] = useState('Employee@123456');
  const [apiUrl, setApiUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (apiUrl) {
        await setApiBaseUrl(apiUrl);
      }
      const user = await Api.login(email.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Login failed. Please check credentials and server.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>CALLSYNC CRM</Text>
          </View>
          <Text style={styles.title}>Employee Telephony</Text>
          <Text style={styles.subtitle}>Cellular SIM Calling & CRM Platform</Text>

        </View>

        {/* Error Card */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>Corporate Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="employee@company.com"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#666"
          />

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>FastAPI Server URL</Text>
              <TextInput
                style={styles.configInput}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="http://192.168.1.100:8000/api/v1"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? 'Hide Server Configuration' : 'Configure Server Endpoint'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>SIGN IN TO SHIFT</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Fill Buttons */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Switcher:</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => quickFill('employee1@callingplatform.local', 'Employee@123456')}
            >
              <Text style={styles.demoBtnText}>Employee 1 (SIM 1)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => quickFill('employee2@callingplatform.local', 'Employee@123456')}
            >
              <Text style={styles.demoBtnText}>Employee 2 (SIM 2)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  configBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  configLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  configInput: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  configToggle: {
    marginTop: 12,
    alignItems: 'center',
  },
  configToggleText: {
    color: '#60A5FA',
    fontSize: 12,
  },
  demoSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  demoTitle: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  demoBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
});
