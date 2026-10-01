# Employee Calling & CRM Platform

> **Production-Grade Enterprise Calling & CRM Platform**  
> Powered by **Rivo-Derived Native Android Telephony + React Native + FastAPI + MySQL + Redis + Private AWS S3 + Next.js Admin Portal**

---

## 1. System Overview

The **Employee Calling & CRM Platform** is an enterprise-scale solution designed to support **300+ employees and 10,000+ contacts**, with end-to-end management of outbound sales and customer outreach.

Unlike conventional VoIP/SIP call center software which suffers from low pickup rates, this platform initiates **true cellular SIM calls** directly from the employee's Android phone using **Android Telecom APIs** and hardware `PhoneAccountHandle` mapping. Calls appear to customers as legitimate mobile phone numbers (+91), drastically improving connection rates.

```
+-------------------------------------------------------------------------------+
|                             THREE DECOUPLED SYSTEMS                           |
+----------------------+-------------------------+------------------------------+
| A. Employee App      | B. FastAPI Backend API  | C. Admin Web Portal          |
| - React Native (TS)  | - Python 3.12 / FastAPI | - Next.js 14 (App Router)    |
| - Rivo Telecom Bridge| - SQLAlchemy 2.x        | - Tailwind CSS               |
| - Dual SIM Control   | - MySQL 8.0 & Redis     | - Real-Time Dashboard        |
| - Offline Sync Queue | - Private AWS S3 Bucket | - Contact Import & Assignment|
| - One-Tap Calling    | - Presigned Playback URL| - Secure Audio Player        |
| - Mandatory Post-Call| - Idempotent Mutations  | - Audit Trail & Settings     |
+----------------------+-------------------------+------------------------------+
```

---

## 2. Repository Structure

```
employee-calling-platform/
│
├── mobile/
│   └── react-native-app/         # Employee React Native application (TypeScript)
│       ├── src/screens/          # Login, Home, ContactQueue, ActiveCall, PostCall, etc.
│       ├── src/services/         # RivoTelephonyBridge, API client, OfflineQueue
│       └── package.json
│
├── android-telephony/
│   ├── rivo-source/              # Cloned user-grinch/RivoPhoneApp (Reference dialer)
│   ├── native-modules/           # Production Kotlin bridge modules:
│   │   ├── SimManager.kt         # Telecom dual-SIM querying & PhoneAccountHandle injection
│   │   ├── RecordingManager.kt   # Multi-tier recording (Shizuku, MediaRecorder, OEM)
│   │   ├── CallStateManager.kt   # Android InCallService hardware state machine
│   │   ├── OemPermissionHelper.kt# Background & autostart for MIUI, OneUI, ColorOS, etc.
│   │   └── RivoTelephonyBridgeModule.kt # React Native bridge module
│   └── poc/
│       └── TelephonyPocActivity.kt # Standalone Phase Zero Telephony Proof-of-Concept
│
├── backend/
│   ├── app/
│   │   ├── api/v1/               # Auth, Employees, Teams, Contacts, Campaigns, Calls,
│   │   │                         # Callbacks, Recordings, Dashboard, Reports, Audit, Settings
│   │   ├── core/                 # Config, Database, Security, RBAC dependencies
│   │   ├── models/               # SQLAlchemy 2.x entity definitions (21 tables)
│   │   ├── schemas/              # Pydantic v2 validation models
│   │   ├── services/             # Business logic & services
│   │   ├── storage/              # S3 private bucket service & presigned URLs
│   │   ├── telephony/            # Indian phone normalization (+91)
│   │   ├── workers/              # Redis background task worker
│   │   └── main.py               # FastAPI entry point, CORS, middlewares
│   ├── requirements.txt
│   └── tests/
│       └── test_backend_suite.py # Complete 12-test automated validation suite
│
├── admin-web/                    # Next.js 14 Admin Portal (TypeScript + Tailwind CSS)
│   ├── app/(dashboard)/          # Dashboard, Employees, Teams, Contacts, Import,
│   │                             # Assignments, Campaigns, Calls, Recordings, Reports, Audit, Settings
│   ├── components/               # Header, Sidebar, AudioPlayer
│   └── lib/                      # Admin API client with token rotation
│
├── infra/
│   ├── docker/                   # Dockerfile.api, Dockerfile.worker, Dockerfile.admin
│   ├── nginx/                    # Production Nginx reverse proxy configuration
│   └── aws/                      # Terraform, IAM policy, S3 bucket policy, deploy_ec2.sh
│
├── docs/                         # Comprehensive engineering documentation:
│   ├── RIVO_TELEPHONY_ANALYSIS.md# Technical analysis of Rivo Android architecture
│   ├── TELEPHONY_POC.md          # 12-point hardware test criteria for Phase Zero
│   ├── ARCHITECTURE.md           # 4-tier system architecture and state machine
│   ├── API_SPECIFICATION.md      # OpenAPI/Swagger endpoint reference
│   ├── DEPLOYMENT_AWS.md         # AWS EC2, RDS MySQL, private S3 deployment guide
│   └── OFFLINE_SYNC_GUIDE.md     # Offline-first persistence and idempotency guide
│
├── scripts/
│   ├── seed_data.py              # Seeds database with admin, teams, employees, campaigns
│   ├── dev_start.bat             # One-click Windows development launcher
│   └── run_tests.bat             # Automated pytest runner
│
├── docker-compose.yml            # Local development orchestration (MySQL, Redis, MinIO, API, Admin)
├── docker-compose.prod.yml       # Production EC2 container stack
├── .env.example                  # Environment configuration template
└── README.md
```

---

## 3. Quickstart & Local Development

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **MySQL 8.0 & Redis** (or run via Docker)
- **Android Studio** (for Android build and testing)

---

### Step 1: Clone & Configure Environment

```bash
git clone <repository_url>
cd employee-calling-platform

# Copy environment template
cp .env.example .env
```

---

### Step 2: Launch Backend & Run Automated Tests

```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Seed development database (creates users, teams, campaigns, and dispositions)
python scripts/seed_data.py

# 3. Execute 100% automated pytest test suite
python -m pytest backend/tests/test_backend_suite.py -v
```
*(Or on Windows, simply double-click `scripts/run_tests.bat`)*

**Output:**
```
======================= 12 passed in 7.53s =======================
```

To run the backend server with live reload:
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Swagger Documentation:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/health`

---

### Step 3: Launch Admin Web Portal

```bash
cd admin-web
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

### Step 4: Default Seed Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Super Admin** | `admin@callingplatform.local` | `Admin@123456` | Full platform access, all recordings, settings |
| **Team Lead** | `teamlead@callingplatform.local` | `Lead@123456` | Team members, team calls, recordings |
| **Employee 1** | `employee1@callingplatform.local` | `Employee@123456` | Assigned contacts, dialer, call disposition |
| **Employee 2** | `employee2@callingplatform.local` | `Employee@123456` | Assigned contacts, dialer, call disposition |

---

### Step 5: Run via Docker Compose (Full Stack)

To run the entire local stack (FastAPI, MySQL, Redis, MinIO S3, Admin Web) with a single command:

```bash
docker compose up --build
```
- API: `http://localhost:8000`
- Admin Web: `http://localhost:3000`
- MinIO S3 Console: `http://localhost:9001` (User: `minio_admin`, Pass: `minio_secret_key_123`)

---

## 4. Phase Zero: Telephony Proof of Concept (POC)

Before deploying the complete CRM to field devices, test cellular dialing on an actual physical Android phone using [`android-telephony/poc/TelephonyPocActivity.kt`](file:///c:/Users/Mahesh/Desktop/test%20calling/android-telephony/poc/TelephonyPocActivity.kt):

1. **SIM 1 Outgoing Call:** Verify call places on SIM 1 without OS dialog.
2. **SIM 2 Outgoing Call:** Verify call places on SIM 2.
3. **Hardware Call State:** Verify transitions (`DIALING` -> `RINGING` -> `ACTIVE` -> `DISCONNECTED`).
4. **Call Recording:** Verify audio file generation in application cache.
5. **Presigned Upload:** Verify secure upload to S3 and audio playback.

See [`docs/TELEPHONY_POC.md`](file:///c:/Users/Mahesh/Desktop/test%20calling/docs/TELEPHONY_POC.md) for the 12-point validation checklist.

---

## 5. Security & Privacy Architecture

- **True Cellular Independence:** Cellular voice calls are initiated by Android hardware and do NOT depend on backend server uptime.
- **Idempotency Guarantee:** Every mutation uses a client-generated `client_event_id` to prevent duplicate call records on network reconnect.
- **Private S3 Storage:** Call recordings are saved in private S3 buckets (`recordings/{year}/{month}/{employee_id}/{call_id}/recording.mp4`). Public access is strictly blocked.
- **Time-Limited Signed URLs:** Audio streaming uses presigned S3 URLs that expire after 300 seconds.
- **Comprehensive Audit Trail:** Every authentication event, contact assignment, and recording playback creates an immutable audit record in `audit_logs` and `recording_access_logs`.
- **Role-Based Access Control:** Strict server-side authorization ensures employees can never view contacts or recordings outside their assignment.

---

## 6. Documentation Reference

- **[Architecture Specification](docs/ARCHITECTURE.md)**: End-to-end 4-tier topology, Telecom state machine, and capacity planning.
- **[Rivo Technical Analysis](docs/RIVO_TELEPHONY_ANALYSIS.md)**: In-depth audit of Rivo source code, Telecom APIs, Shizuku, and OEM integrations.
- **[REST API Specification](docs/API_SPECIFICATION.md)**: Complete OpenAPI request/response schemas for all endpoints.
- **[AWS Production Deployment](docs/DEPLOYMENT_AWS.md)**: Step-by-step guide for VPC, RDS MySQL, private S3, Docker, and Amplify.
- **[Offline-First Synchronization](docs/OFFLINE_SYNC_GUIDE.md)**: SQLite persistence, event queue lifecycle, and conflict resolution rules.
- **[Telephony POC Guide](docs/TELEPHONY_POC.md)**: 12-point hardware test checklist for physical Android devices.
