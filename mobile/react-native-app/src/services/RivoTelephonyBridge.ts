import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { SimAccount, CallState } from '../types';

const { RivoTelephonyBridge } = NativeModules;

// Fallback mock if running in emulator or iOS development
const isAndroid = Platform.OS === 'android';
const telephonyEmitter = isAndroid && RivoTelephonyBridge ? new NativeEventEmitter(RivoTelephonyBridge) : null;

export const TelephonyService = {
  async getSimAccounts(): Promise<SimAccount[]> {
    if (!isAndroid || !RivoTelephonyBridge) {
      return [
        {
          slotIndex: 0,
          subscriptionId: 1,
          carrierName: 'Jio 5G',
          displayName: 'Work SIM (SIM 1)',
          iccId: '••••1024',
          isDefaultVoice: true,
          phoneAccountHandleId: 'sim_1'
        },
        {
          slotIndex: 1,
          subscriptionId: 2,
          carrierName: 'Airtel',
          displayName: 'Personal (SIM 2)',
          iccId: '••••5591',
          isDefaultVoice: false,
          phoneAccountHandleId: 'sim_2'
        }
      ];
    }
    return await RivoTelephonyBridge.getSimAccounts();
  },

  async initiateCall(phoneNumber: string, simSlot: number, clientCallId: string): Promise<boolean> {
    if (!isAndroid || !RivoTelephonyBridge) {
      console.log(`[Mock Telephony] Making call to ${phoneNumber} via SIM ${simSlot + 1}`);
      return true;
    }
    return await RivoTelephonyBridge.initiateCall(phoneNumber, simSlot, clientCallId);
  },

  async endCall(): Promise<boolean> {
    if (!isAndroid || !RivoTelephonyBridge) {
      console.log('[Mock Telephony] End call dispatched');
      return true;
    }
    return await RivoTelephonyBridge.endCall();
  },

  async setMuted(muted: boolean): Promise<boolean> {
    if (!isAndroid || !RivoTelephonyBridge) return muted;
    return await RivoTelephonyBridge.setMuted(muted);
  },

  async setSpeakerphone(speakerOn: boolean): Promise<boolean> {
    if (!isAndroid || !RivoTelephonyBridge) return speakerOn;
    return await RivoTelephonyBridge.setSpeakerphone(speakerOn);
  },

  async checkRecordingCapability(): Promise<string> {
    if (!isAndroid || !RivoTelephonyBridge) return 'READY';
    return await RivoTelephonyBridge.checkRecordingCapability();
  },

  async startCallRecording(callId: string, phoneNumber: string): Promise<boolean> {
    if (!isAndroid || !RivoTelephonyBridge) return true;
    return await RivoTelephonyBridge.startCallRecording(callId, phoneNumber);
  },

  async stopCallRecording(): Promise<any> {
    if (!isAndroid || !RivoTelephonyBridge) return null;
    return await RivoTelephonyBridge.stopCallRecording();
  },

  async openOemBackgroundSettings(): Promise<boolean> {
    if (!isAndroid || !RivoTelephonyBridge) return false;
    return await RivoTelephonyBridge.openOemBackgroundSettings();
  },

  onCallStateChanged(callback: (data: { state: CallState; durationSeconds: number; disconnectReason?: string; clientCallId: string }) => void) {
    if (!telephonyEmitter) return { remove: () => {} };
    return telephonyEmitter.addListener('onCallStateChanged', callback);
  },

  onCallEnded(callback: (data: { totalDurationSeconds: number; talkDurationSeconds: number; disconnectCause: string; clientCallId: string }) => void) {
    if (!telephonyEmitter) return { remove: () => {} };
    return telephonyEmitter.addListener('onCallEnded', callback);
  }
};
