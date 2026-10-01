# Rivo Telephony Architecture & Technical Analysis

**Document Version:** 1.0.0  
**Target:** Employee Calling & CRM Platform Integration  
**Reference Codebase:** `user-grinch/RivoPhoneApp` (cloned into `android-telephony/rivo-source/`)  
**Scope:** Deep-dive audit of Android architecture, Telecom APIs, PhoneAccount / SIM management, InCallService, audio routing, call recording (MediaRecorder, Shizuku, OEM directories), OEM permission quirks, and bridge architecture to React Native.

---

## Executive Summary

The Rivo Android Phone App is an open-source Android dialer built with Kotlin and Jetpack Compose. Unlike typical VoIP/SIP wrappers, Rivo is an **Android Telecom Subsystem native dialer**. It registers as a default dialer and Telecom `InCallService`, directly interfacing with the Android OS radio layer to make and receive standard cellular calls across physical SIM cards.

This document breaks down every subsystem of Rivo, evaluates its readiness for an enterprise employee calling solution, and defines the extraction and bridging strategy to empower our React Native Employee Calling App.

---

## 1. Architectural Overview & Component Map

Rivo follows a single-activity MVVM architecture utilizing Koin for dependency injection, Jetpack Compose for UI rendering, Android Telecom framework for cellular telephony, and AndroidX Room for local persistence.

```
+---------------------------------------------------------------------------------+
|                                 RIVO PHONE APP                                  |
+---------------------------------------------------------------------------------+
| UI LAYER (Jetpack Compose)                                                      |
|   - CallActivity, CallScreen, CallScreenControls, Dialpad, SimPickerDialog      |
|   - PostCallActivity, MissedCallActivity                                        |
+---------------------------------------------------------------------------------+
| CONTROLLER / SERVICES (Android Framework & Background Execution)                |
|   - CallService (extends android.telecom.InCallService)                         |
|   - CallRecorder (MediaRecorder + Shizuku IPC + Scrcpy server audio tap)        |
|   - CallRecordingService (Foreground Service with type: microphone)             |
|   - FloatingCallService (SYSTEM_ALERT_WINDOW floating bubble)                   |
|   - OemPermissionHelper (MIUI/HyperOS, ColorOS, FuntouchOS, OneUI auto-start)   |
+---------------------------------------------------------------------------------+
| DATA & STORAGE LAYER (Android Framework Providers & Room DB)                    |
|   - ContactsRepository / CallLogRepository (Android ContactsContract & CallLog)|
|   - RivoDatabase (Room: Call Notes, Private Contacts, Callback Reminders)       |
+---------------------------------------------------------------------------------+
| IPC & PRIVILEGED APIS                                                           |
|   - moe.shizuku.privileged.api (Binder IPC for internal audio capture)          |
+---------------------------------------------------------------------------------+
```

---

## 2. In-Depth Subsystem Analysis

### 2.1 Entry Point & Manifest Configuration
- **Application Class:** `com.grinch.rivo4.RivoApp` initializes Koin DI, notification channels, and preferences.
- **Main Activity:** `com.grinch.rivo4.MainActivity` is exported with intent filters for `MAIN`, `DIAL`, `VIEW` (`tel:`, `vnd.android.cursor.dir/calls`, `call_log`), and `SHOW_MISSED_CALLS_NOTIFICATION`.
- **Telecom Declaration:**
  ```xml
  <service
      android:name=".controller.CallService"
      android:permission="android.permission.BIND_INCALL_SERVICE"
      android:foregroundServiceType="phoneCall|microphone"
      android:directBootAware="true"
      android:exported="true">
      <meta-data
          android:name="android.telecom.IN_CALL_SERVICE_UI"
          android:value="true" />
      <intent-filter>
          <action android:name="android.telecom.InCallService" />
      </intent-filter>
  </service>
  ```
  This permits Android Telecom to bind `CallService` as soon as a cellular call starts or an incoming call arrives.

### 2.2 Android Telecom & InCallService Integration
- **`CallService.kt`** extends `android.telecom.InCallService`.
- Maintains static singleton `_currentCallSession` (`StateFlow<CallSession?>`) and `_allCalls` (`StateFlow<List<Call>>`).
- **Callbacks:**
  - `onCallAdded(call: Call)`: Registers `Call.Callback()`, parses caller number via `call.details.handle`, applies DND/Flip-to-silence if configured, triggers pre-warming of `CallRecorder`, and launches `CallActivity` or displays a high-priority Heads-Up Notification (`NotificationCompat.CallStyle.forIncomingCall`).
  - `onCallRemoved(call: Call)`: Stops priority ringers, releases wake locks, stops `CallRecorder`, tears down `FloatingCallService`, and cleans up foreground notifications.
  - `onCallAudioStateChanged(audioState: CallAudioState?)`: Bridges routing status (Earpiece, Speakerphone, Bluetooth, Wired Headset) and microphone mute state to the UI.

### 2.3 SIM Management & PhoneAccount Selection
Rivo manages Dual SIM calling using Android `TelecomManager` and `PhoneAccountHandle`:
1. **Discovery:**
   Calls `telecomManager.callCapablePhoneAccounts` (requires `android.permission.READ_PHONE_STATE`).
2. **Identification:**
   For each `PhoneAccountHandle`, retrieves `telecomManager.getPhoneAccount(handle)?.label` and address.
3. **Selection Logic:**
   - Evaluates per-contact preferred SIM setting.
   - Evaluates system-level default SIM setting (`default_sim`).
   - If not set or multi-SIM prompt is needed, renders `SimPickerDialog.kt`.
4. **Call Placement Extras:**
   Attaches the target `PhoneAccountHandle` into call extras:
   ```kotlin
   val extras = Bundle()
   extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, preferredHandle)
   telecomManager.placeCall(Uri.parse("tel:$number"), extras)
   ```
   **Fallback:** If `placeCall` fails, initiates an `Intent(Intent.ACTION_CALL, uri)` with the bundle attached.

### 2.4 Call State Handling & State Machine
The Android `Call` object reports states via `Call.Callback.onStateChanged(call: Call, state: Int)`:
- `Call.STATE_NEW` / `Call.STATE_CONNECTING`
- `Call.STATE_DIALING`: Cellular radio dialing out
- `Call.STATE_RINGING`: Remote ringback or incoming ring
- `Call.STATE_ACTIVE`: Call connected; talk time timer starts
- `Call.STATE_HOLDING`: Call placed on hold
- `Call.STATE_DISCONNECTED`: Call terminated with `DisconnectCause`
- `Call.STATE_DISCONNECTING`

### 2.5 In-Call UI & Post-Call Screen
- **In-Call Screen:** `CallActivity.kt` hosting `CallScreen.kt` in Jetpack Compose with custom keypads, hold, mute, speaker, conference merge, audio route cycling, and notes.
- **Post-Call Screen:** `PostCallActivity.kt` launched on call disconnect. Renders call summary (duration, SIM used, contact details) and quick actions. In our platform, this is adapted to become the mandatory **Disposition & CRM Notes screen**.

### 2.6 Audio Controls
- Muting is handled via `CallService.mute(muted)` which invokes `InCallService.setMuted()` synchronized with `AudioManager.setMicrophoneMute()`.
- Audio routing cycles between:
  - `CallAudioState.ROUTE_EARPIECE`
  - `CallAudioState.ROUTE_SPEAKER`
  - `CallAudioState.ROUTE_BLUETOOTH`
  - `CallAudioState.ROUTE_WIRED_HEADSET`
  via `InCallService.setAudioRoute(nextRoute)`.

### 2.7 Call Recording Pipeline (Comprehensive Analysis)
Call recording on modern Android (Android 9+) is notoriously restricted due to Google privacy enforcements. Rivo addresses this through a multi-tiered architecture:

#### Tier 1: Privileged Loopback Audio Capture via Shizuku + scrcpy
- Uses `moe.shizuku.privileged.api` Binder IPC.
- Copies and executes `scrcpy-server` JAR in privileged ADB/system shell context.
- Invokes `IShellService.startCapture("voice-call", "aac", bitrate, ...)` returning a `ParcelFileDescriptor`.
- Decodes and muxes audio into an `.m4a` file via `ScrcpyAudioMuxer.kt` and `ScrcpyAudioCodec.kt`.
- **Capability:** Captures both uplink (employee microphone) and downlink (customer voice) with high fidelity without root if the user has paired Shizuku via wireless debugging or ADB.

#### Tier 2: Standard MediaRecorder Adaptive Fallback
- Uses `android.media.MediaRecorder`.
- Adapts across audio sources:
  1. `MediaRecorder.AudioSource.MIC`
  2. `MediaRecorder.AudioSource.VOICE_COMMUNICATION`
  3. `MediaRecorder.AudioSource.VOICE_RECOGNITION`
  4. `MediaRecorder.AudioSource.DEFAULT`
  5. `MediaRecorder.AudioSource.CAMCORDER`
  6. `MediaRecorder.AudioSource.VOICE_CALL` (works on legacy Android / pre-Pie or OEM whitelisted builds)
- Output format: MPEG-4 container with AAC audio encoder (`MediaRecorder.OutputFormat.MPEG_4`, `MediaRecorder.AudioEncoder.AAC`).

#### Tier 3: OEM Native Recording Directory Monitoring
- Many Indian & Asian OEM ROMs (Xiaomi MIUI/HyperOS, Samsung OneUI, Vivo Funtouch, Oppo/OnePlus ColorOS) have built-in cellular call recorders that bypass Google restrictions at the kernel/framework level.
- Rivo proactively scans known OEM recording directories:
  - `MIUI/sound_recorder/call_rec`
  - `Sounds/CallRecord`
  - `Record/Call`, `vivo/Record/Call`
  - `Recordings/Call Recordings`, `Recordings/Phone`
- Matches new recordings by contact number, timestamp, and duration!

### 2.8 OEM-Specific Workarounds (`OemPermissionHelper.kt`)
Modern Asian Android OEMs aggressively kill background services, block lock-screen activities, and suppress incoming call notifications. Rivo provides comprehensive intent dispatchers and `AppOpsManager` checks for:
- **Xiaomi / Redmi / Poco (MIUI & HyperOS):**
  - `OP_AUTO_START` (10008)
  - `OP_SHOW_WHEN_LOCKED` (10020)
  - `OP_BACKGROUND_START_ACTIVITY` (10021)
  - Direct intents to `com.miui.securitycenter/com.miui.permcenter.permissions.PermissionsEditorActivity`
- **Vivo & iQOO (Funtouch OS / OriginOS):**
  - `com.iqoo.secure` & `com.vivo.permissionmanager`
  - Floating window & autostart whitelisting
- **Oppo & Realme (ColorOS / RealmeUI):**
  - `com.coloros.safecenter.permission.startup.StartupAppListActivity`
- **Samsung (OneUI):**
  - Battery optimization whitelist (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)

---

## 3. Modularization Strategy for React Native Calling & CRM

To satisfy the strict requirement **"DO NOT MIX BUSINESS LOGIC INTO RIVO TELEPHONY CODE"**:

### Component Classification Matrix

| Rivo Module / File | Platform Action | Rationale |
| :--- | :--- | :--- |
| `CallService.kt` | **REUSE & WRAP** | Core InCallService for cellular call lifecycle and Telecom communication. |
| `CallRecorder.kt` | **REUSE & WRAP** | Multi-tier recording engine (MediaRecorder, Shizuku, OEM directories). |
| `SimPickerDialog.kt` / SIM logic in `utils.kt` | **REUSE & EXPOSE** | Extracted into native bridge `SimManagerModule.kt` to allow React Native UI to inspect and pick SIMs. |
| `OemPermissionHelper.kt` | **REUSE** | Direct inclusion into native bridge to prompt employees on Xiaomi/Vivo/Samsung devices. |
| `CallActivity.kt` / `CallScreen.kt` | **REPLACE / EMBED** | React Native renders the CRM interface; native in-call overlay or React Native in-call screen displays CRM contact metadata. |
| `PostCallActivity.kt` | **REPLACE** | Replaced with React Native's rich **Call Disposition, Notes, and Callback Scheduling Modal**. |
| `RivoDatabase.kt` / Room DAOs | **ISOLATE** | Rivo's local Room database is isolated. React Native app maintains SQLite offline sync queue with idempotency keys (`client_event_id`). |
| `ContactsRepository.kt` | **ISOLATE** | Employee contacts are managed by CRM backend, not device address book (preventing mixing personal & enterprise contacts). |

---

## 4. Bridge Design: React Native to Native Telephony Layer

```
+-------------------------------------------------------------------------------+
|                       REACT NATIVE APPLICATION LAYER                          |
|  - Redux / Zustand State Machine                                              |
|  - Contact Queue Screen (CALL CTA)                                            |
|  - Post-Call Screen (Disposition, Notes, Callback)                            |
|  - Offline Sync Engine (WatermelonDB / SQLite + Idempotency Keys)             |
+-------------------------------------------------------------------------------+
                                      ▲  ▼
                     React Native NativeModule Bridge
+-------------------------------------------------------------------------------+
|                      RivoTelephonyBridgeModule.kt                             |
|  Methods:                                                                     |
|    - getSimAccounts(): Promise<List<SimAccountInfo>>                          |
|    - startCellularCall(phone: String, simSlot: Int): Promise<Boolean>         |
|    - endCall(): Promise<Boolean>                                              |
|    - setMute(muted: Boolean): Promise<Void>                                   |
|    - setSpeaker(speaker: Boolean): Promise<Void>                              |
|    - checkRecordingCapability(): Promise<RecordingCapabilityStatus>           |
|    - requestOemPermissions(): Promise<Void>                                   |
|  Events (DeviceEventEmitter):                                                 |
|    - onCallStateChanged (DIALING, RINGING, ACTIVE, DISCONNECTED)              |
|    - onRecordingCompleted (filePath, durationSeconds, format)                 |
|    - onSimSelected (simSlot, displayName)                                     |
+-------------------------------------------------------------------------------+
                                      ▲  ▼
+-------------------------------------------------------------------------------+
|                        NATIVE ANDROID TELEPHONY ENGINE                        |
|  - InCallService (CallService)                                                |
|  - TelecomManager                                                             |
|  - CallRecorder (MediaRecorder + Shizuku + OEM Monitor)                       |
+-------------------------------------------------------------------------------+
```

---

## 5. Phase Zero: Telephony Proof of Concept (POC) Plan

Prior to complete CRM rollout, the standalone telephony POC verifies:
1. `TelecomManager.placeCall` with explicit `PhoneAccountHandle` on Dual SIM devices (Airtel, Jio, Vi).
2. Detection of SIM 1 vs SIM 2 active subscription IDs and carrier labels.
3. Call state transitions emitted to JavaScript: `DIALING -> RINGING -> ACTIVE -> DISCONNECTED`.
4. Accurate talk-time calculation (`connectTimeMillis` vs wall clock).
5. Recording capability assessment (`UNAVAILABLE`, `READY`, `RECORDING`, `AVAILABLE`, `FAILED`, `PERMISSION_REQUIRED`).
6. Recording artifact generation in temporary cache, ready for S3 upload.

*Document finalized and approved for implementation.*
