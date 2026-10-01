import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { SimAccount, CallState } from '../types';

const NativeBridge = NativeModules.TelephonyBridge || NativeModules.RivoTelephonyBridge;

// Fallback mock if running in emulator or iOS development
const isAndroid = Platform.OS === 'android';
const telephonyEmitter = isAndroid && NativeBridge ? new NativeEventEmitter(NativeBridge) : null;

export const TelephonyService = {
  async getSimAccounts(): Promise<SimAccount[]> {
    if (!isAndroid || !NativeBridge) {
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
    return await NativeBridge.getSimAccounts();
  },

  async initiateCall(phoneNumber: string, simSlot: number, clientCallId: string): Promise<boolean> {
    if (!isAndroid || !NativeBridge) {
      console.log(`[Telephony] Making call to ${phoneNumber} via SIM ${simSlot + 1}`);
      return true;
    }
    return await NativeBridge.initiateCall(phoneNumber, simSlot, clientCallId);
  },

  async endCall(): Promise<boolean> {
    if (!isAndroid || !NativeBridge) {
      return true;
    }
    return await NativeBridge.endCall();
  },

  async setSpeakerOn(on: boolean): Promise<boolean> {
    if (!isAndroid || !NativeBridge) return true;
    return await NativeBridge.setSpeakerOn(on);
  },

  async setMuted(muted: boolean): Promise<boolean> {
    if (!isAndroid || !NativeBridge) return true;
    return await NativeBridge.setMuted(muted);
  },

  async checkRecordingCapability(): Promise<string> {
    if (!isAndroid || !NativeBridge) return 'AVAILABLE (Mock)';
    return await NativeBridge.checkRecordingCapability();
  },

  async openOemBackgroundSettings(): Promise<void> {
    if (isAndroid && NativeBridge) {
      await NativeBridge.openOemBackgroundSettings();
    }
  },

  subscribeToCallEvents(listener: (event: { state: CallState; durationSeconds: number; error?: string }) => void) {
    if (!telephonyEmitter) return { remove: () => {} };
    const subscription = telephonyEmitter.addListener('onCallStateChanged', listener);
    return subscription;
  }
};
