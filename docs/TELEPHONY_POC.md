# Phase Zero: Standalone Telephony Proof of Concept (POC)

**Status:** Ready for Device Testing  
**Target Hardware:** Physical Dual SIM Android Smartphones (Android 10 through 14, e.g. Samsung, Xiaomi, Vivo, OnePlus)

---

## 1. Objective

Before completing the CRM application rollout, Phase Zero validates that native Android cellular telephony functions reliably without crashing, adheres to SIM routing rules, accurately tracks call states, and handles call recording within device and privacy constraints.

---

## 2. 12 Mandatory POC Validation Criteria

| # | Test Case | Action / Input | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **1** | Make Outgoing SIM Call | Tap CALL on a normalized mobile number | Android Telecom triggers cellular radio and starts outbound call | Normal cellular call rings customer phone |
| **2** | SIM 1 Selection | Select SIM 1 explicitly in settings or UI | Call extras include `PhoneAccountHandle` for SIM 1 | Customer caller ID reflects SIM 1 carrier number |
| **3** | SIM 2 Selection | Select SIM 2 explicitly in settings or UI | Call extras include `PhoneAccountHandle` for SIM 2 | Customer caller ID reflects SIM 2 carrier number |
| **4** | Call State Tracking | Observe call state stream during call progression | Events emit: `DIALING -> RINGING -> ACTIVE -> DISCONNECTED` | Transitions are received in exact sequence by listener |
| **5** | Call Duration Accuracy | Keep call connected for exactly 30 seconds | System reports talk time as 30s (+/- 1s) based on `connectTimeMillis` | Does not count ringing time as talk duration |
| **6** | Call Ended Event | Remote hangs up or employee taps End Call | Listener receives `onCallEnded` with disconnect cause code | Disconnect cause maps accurately (`LOCAL_HANGUP`, `REMOTE_HANGUP`, `BUSY`) |
| **7** | Recording Availability Check | Call `recordingManager.checkCapability()` | Returns `READY` or specific status if permissions missing | No crashes; reports `PERMISSION_REQUIRED` if audio permission absent |
| **8** | Recording Quality Verification | Record audio during call connection | Generates AAC audio container (`.m4a`) | Audio file is playable, not corrupted, clear employee voice |
| **9** | Recording File Generation | Stop call after connection | File exists in cache dir (`REC_*.m4a`), file size > 1 KB | File metadata duration matches call talk duration |
| **10** | Upload Test | Submit recording artifact to FastAPI endpoint | Endpoint accepts multipart upload, validates mime type, uploads to S3 | S3 receives file under `recordings/{year}/{month}/{employee_id}/{call_id}/` |
| **11** | Android Permission Behavior | Deny `CALL_PHONE` or `RECORD_AUDIO` | App displays graceful error/toast, does not crash, does not fake call | App prompts user to grant missing permission |
| **12** | Device Reboot Behavior | Reboot physical smartphone, open app | SIM slots re-enumerated, pending offline queue preserved | App continues functioning without configuration corruption |

---

## 3. Running the POC

1. Build and install the POC APK on a physical test device with two active SIM cards.
2. Ensure permissions `CALL_PHONE`, `READ_PHONE_STATE`, and `RECORD_AUDIO` are granted.
3. Verify that both SIM cards appear in the log output with correct carrier names (e.g. Jio and Airtel).
4. Run Test 1 through 12 sequentially and record results in the validation report.
