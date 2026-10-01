# Technical Architecture Specification

## Employee Calling & CRM Platform
**Production-Grade Architecture for 300+ Employees, 10,000+ Contacts, and Secure Cellular Telephony**

---

### 1. Executive Summary & System Philosophy

The **Employee Calling & CRM Platform** is an enterprise-grade solution designed to bridge native Android cellular telephony with a modern CRM workflow. The platform addresses a fundamental limitation of traditional VoIP/SIP call centers: **customer answer rates for cold calls and sales outreach drop significantly when numbers appear as VoIP trunks, 1800 numbers, or international gateways**. 

By utilizing **true cellular SIM calling** directly on company-provisioned or BYOD employee Android devices, calls originate from legitimate local carrier mobile numbers (+91), ensuring maximum connection rates. 

Crucially, **cellular voice dialing operates independently of server connectivity**: an employee can place a call even if cellular data drops. The CRM backend acts as the authoritative source of truth for assignments, call states, immutable event trails, call dispositions, and private audio recording storage.

---

### 2. High-Level 4-Tier System Topology

```
+-----------------------------------------------------------------------------------+
|                           EMPLOYEE ANDROID DEVICE                                 |
|                                                                                   |
|   +------------------------------------+    +---------------------------------+   |
|   |   React Native / TypeScript UI     |    |   Native Android Telephony      |   |
|   |  - Authentication & Session State  |    |  - Android TelecomManager       |   |
|   |  - Contact Queue & Call Trigger    |    |  - PhoneAccountHandle (SIM 1/2) |   |
|   |  - Disposition & Callback Forms    |    |  - InCallService State Monitor  |   |
|   |  - Idempotent Offline Sync Queue   |    |  - Multi-tier Call Recording    |   |
|   +-----------------+------------------+    +----------------+----------------+   |
|                     | Native React Bridge (JNI)             |                     |
|                     +---------------------------------------+                     |
|                                         |                                         |
|                                         v                                         |
|                              Cellular Radio (SIM Slot)                            |
|                                         |                                         |
+-----------------------------------------|-----------------------------------------+
                                          | Outgoing GSM/VoLTE Call
                                          v
                                 PSTN / Mobile Carrier
                                          |
                                          v
                                    Customer Phone

                                          * * *
                Device Data Channel (HTTPS / REST + Idempotency Keys)
                                          * * *
                                          v
+-----------------------------------------------------------------------------------+
|                        AWS / LOCAL INFRASTRUCTURE                                 |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                          NGINX REVERSE PROXY                              |   |
|   |         Rate Limiting (30 req/s) | SSL/TLS 1.3 | Security Headers         |   |
|   +---------------------+---------------------------------+-------------------+   |
|                         |                                 |                       |
|           /api/*, /health, /ready                         / (Web Routes)          |
|                         v                                 v                       |
|   +-------------------------------------+   +---------------------------------+   |
|   |        FASTAPI BACKEND API          |   |       NEXT.JS ADMIN PORTAL      |   |
|   |  - Modular Monolith (SQLAlchemy 2.x)|   |  - App Router / Tailwind CSS    |   |
|   |  - Role-Based Access Control (RBAC) |   |  - Live Dashboard & Analytics   |   |
|   |  - Idempotent Call State Processing |   |  - Contact Import & Assignment  |   |
|   |  - Presigned S3 Playback URLs       |   |  - Campaign Management          |   |
|   +--------+------------------+---------+   |  - Audio Player & Audit Trail   |   |
|            |                  |             +---------------------------------+   |
|            v                  v                                                   |
|   +----------------+  +-----------------+   +---------------------------------+   |
|   |  RDS / MySQL   |  |   REDIS CACHE   |   |    AWS S3 PRIVATE BUCKET        |   |
|   |  Source of     |  |  Task Queue &   |   |  Encrypted Audio Recordings     |   |
|   |  Truth Tables  |  |  Rate Limiting  |   |  recordings/{yr}/{mo}/{emp}/{call}  |
|   +----------------+  +-----------------+   +---------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

### 3. Decoupled Subsystem Architecture

#### A. Native Android Telephony Layer (`android-telephony/`)
Derived and refined from the open-source **Rivo Phone App** (`user-grinch/RivoPhoneApp`), this layer encapsulates all low-level Android Telecom and hardware capabilities:
1. **`SimManager.kt`**: Queries `SubscriptionManager` and `TelecomManager` to obtain active `PhoneAccountHandle` instances. Maps SIM slot 0 (SIM 1) and SIM slot 1 (SIM 2) with carrier display names and ICCIDs.
2. **`CallStateManager.kt`**: Extends Android's `InCallService`. Listens to hardware call events and maps telephony disconnect causes (`DisconnectCause.BUSY`, `REJECTED`, `MISSED`, `LOCAL`, `REMOTE`) to standard system states (`DIALING`, `RINGING`, `ACTIVE`, `DISCONNECTED`, `FAILED`).
3. **`RecordingManager.kt`**: Implements a three-tier resilient recording pipeline:
   - **Tier 1 (Shizuku + Audio Loopback)**: Utilizes ADB/Shizuku privileges to capture remote party audio directly from system audio streams.
   - **Tier 2 (MediaRecorder with VOICE_COMMUNICATION / MIC)**: Captures voice stream through native hardware hooks.
   - **Tier 3 (OEM Directory Scanner)**: Intercepts OEM native dialer recordings on Xiaomi (MIUI), Samsung (OneUI), Vivo (FuntouchOS), and Oppo (ColorOS).
4. **`OemPermissionHelper.kt`**: Detects custom Android skins and launches OEM-specific Intent screens for auto-start, background battery optimization whitelisting, and pop-up window permissions.
5. **`RivoTelephonyBridgeModule.kt`**: Exposes a clean, promise-based React Native bridge:
   - `getSimCards()`: Returns array of available SIMs.
   - `placeCall(phoneNumber, simSlot)`: Initiates cellular dialing without showing system disambiguation prompts.
   - `endCall()`: Programmatically terminates active cellular call.
   - `getRecordingCapabilities()`: Queries hardware and permission availability.

#### B. Employee Mobile Application (`mobile/react-native-app/`)
Built with React Native and TypeScript, this application provides a distraction-free, high-speed calling experience for field and office employees:
- **Offline-First Synchronization**: Maintains a local SQLite cache of assigned contacts, recent call history, and pending dispositions.
- **Idempotency Guarantee**: Every call initiation creates a UUID `client_event_id` on the client. All subsequent state transitions, dispositions, and audio uploads reference this key, preventing duplicate records if network reconnects.
- **Call Queue Screen**: Large, single-tap **CALL** CTA with priority badges, last interaction notes, and scheduled callbacks.
- **In-Call Screen**: Displays real-time timer, caller details, and in-call audio controls (Speaker, Mute, Dialpad, End Call).
- **Mandatory Post-Call Disposition**: Forces the agent to classify the call (`CONNECTED`, `NO_ANSWER`, `BUSY`, `INTERESTED`, `CALLBACK`, etc.) before presenting the next contact.

#### C. FastAPI Backend Modular Monolith (`backend/`)
Built with Python 3.12, FastAPI, and SQLAlchemy 2.x:
- **Clean Architecture**: Decoupled into `core`, `models`, `schemas`, `services`, `repositories`, `workers`, `storage`, and `telephony`.
- **Role-Based Access Control (RBAC)**: Enforces `SUPER_ADMIN`, `ADMIN`, `TEAM_LEAD`, and `EMPLOYEE` permissions server-side.
- **Indian Phone Normalization**: Automatically strips leading zeros, spaces, dashes, and normalizes 10-digit Indian numbers to E.164 standard (`+91XXXXXXXXXX`). Duplicate detection occurs on `normalized_phone`.
- **Private S3 Storage Service**: Manages upload verification, SHA-256 integrity checks, and generates time-limited presigned GET URLs (300 seconds default). Public bucket access is completely blocked.
- **Redis Worker Queue**: Asynchronously processes CSV/XLSX contact imports, duplicate deduping, and audio transcoding.

#### D. Admin Web Portal (`admin-web/`)
Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS:
- **Modern Dark Aesthetic**: Sleek slate-900 / slate-950 palette, crisp typography, and responsive tables.
- **Operational Control Center**:
  - Live Dashboard (Daily dial targets, connect rates, hourly activity charts).
  - Employee Management (Provisioning, team assignment, preferred SIM configuration).
  - Contact Management & Import Preview (CSV parsing, duplicate detection, validation report).
  - Single & Bulk Contact Assignment with conflict detection.
  - Campaign Manager (Target tracking, employee assignment).
  - Secure Audio Playback Player (Stream via presigned URLs with full audit logging).
  - Audit Log Explorer (Filter by actor, action type, IP address, and inspect JSON payloads).
  - System Settings (Recording policy toggles, retention days, disposition code editor).

---

### 4. Telephony Call State Machine & Lifecycle

```
[Employee Taps CALL]
         |
         v
[Validate Permissions & SIM Config]
         |
         v
[telecomManager.placeCall(uri, phoneAccountHandle)]
         |
         v
   +---------------+
   |    DIALING    | ---> Event sent to Backend / Local Queue
   +-------+-------+
           |
           v
   +---------------+
   |    RINGING    | ---> Event sent to Backend / Local Queue
   +-------+-------+
           |
     +-----+-----+
     |           |
     v           v
+--------+  +-----------+
| ACTIVE |  | NO ANSWER |
+----+---+  +-----+-----+
     |            |
     |            v
     |      +------------+
     |      | DISCONNECT |
     |      +-----+------+
     v            |
[Call Finished]   |
     |            |
     +------+-----+
            |
            v
   +-----------------+
   |    POST-CALL    | ---> Prompts Employee for Disposition
   |   DISPOSITION   |      (Mandatory outcome code + optional notes)
   +--------+--------+
            |
            v
   +-----------------+
   | RECORDING CHECK | ---> If recording captured: upload file to S3
   +--------+--------+
            |
            v
   [Ready for Next Contact]
```

---

### 5. Call Recording Security & Compliance Pipeline

1. **Recording Capture**: Where technically supported and legally authorized, the Android client records cellular voice audio to an isolated application cache directory (`context.cacheDir/recordings/`).
2. **Local Integrity Check**: The client verifies file existence, checks minimum file size (> 4KB), and computes a local SHA-256 hash.
3. **Secure Streaming Upload**: The client sends a `multipart/form-data` request to `POST /api/v1/recordings/upload` with the `call_id` and JWT authorization token.
4. **S3 Private Storage**: The FastAPI backend streams the file to AWS S3 using the strictly structured path:
   ```
   recordings/{YYYY}/{MM}/{employee_id}/{call_id}/recording.mp4
   ```
5. **No Public URLs**: The S3 bucket policy blocks public ACLs and public bucket policies.
6. **Time-Limited Presigned URLs**: When an authorized Admin or Team Lead requests playback:
   - FastAPI verifies user RBAC permissions.
   - An immutable record is created in `recording_access_logs` recording `actor_id`, `action` (`PLAY` or `DOWNLOAD`), `ip_address`, and timestamp.
   - S3 generates a presigned URL expiring in 300 seconds.

---

### 6. Database Indexing Strategy (300 Employees / 10,000+ Contacts)

To guarantee sub-100ms API response times at scale, the MySQL database is configured with the following strategic composite indexes:

| Table | Index Columns | Purpose |
|---|---|---|
| `contacts` | `(normalized_phone)` | Instant duplicate phone number lookups during CSV import |
| `contact_assignments` | `(employee_id, status)` | Fast retrieval of an employee's pending call queue |
| `calls` | `(employee_id, started_at)` | High-speed employee call history and daily KPI aggregation |
| `calls` | `(contact_id, started_at)` | Fast customer interaction history retrieval |
| `calls` | `(campaign_id, started_at)` | Campaign progress reports and connect rate analytics |
| `calls` | `(status, started_at)` | Dashboard real-time call monitoring |
| `callbacks` | `(employee_id, scheduled_at, status)` | Instant lookup of today's and overdue callbacks |
| `recordings` | `(call_id)` | Fast lookup of call audio recordings |
| `audit_logs` | `(actor_id, created_at)` | Security investigation and actor trail indexing |
