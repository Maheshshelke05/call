# REST API Specification

## Employee Calling & CRM Platform — API v1
**Interactive Documentation:** Swagger UI at `http://localhost:8000/docs` | ReDoc at `http://localhost:8000/redoc`

---

### 1. General Principles & Protocols

- **Base URL:** `/api/v1`
- **Protocol:** HTTPS (in production) / HTTP (in local dev)
- **Data Format:** `application/json` (except file uploads which use `multipart/form-data`)
- **Authentication Scheme:** HTTP Bearer token via standard `Authorization: Bearer <access_token>` header
- **Standard Observability Headers:**
  - `X-Correlation-ID`: Unique tracking identifier generated per request (or propagated from client).
  - `X-Process-Time`: Server response processing time in seconds (e.g., `0.0124s`).
- **Standard Error Format:**
  ```json
  {
    "detail": "Descriptive human-readable error message explaining failure condition"
  }
  ```

---

### 2. Authentication & Session Management

#### `POST /api/v1/auth/login`
Authenticates an employee, team lead, or administrator.
- **Request Body:**
  ```json
  {
    "email": "employee1@callingplatform.local",
    "password": "Employee@123456",
    "device_model": "Samsung Galaxy A54",
    "os_version": "Android 14",
    "app_version": "1.0.0"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 2,
      "email": "employee1@callingplatform.local",
      "full_name": "Rohan Sharma",
      "role": "EMPLOYEE",
      "team_id": 1,
      "daily_target": 50,
      "preferred_sim_slot": 0
    }
  }
  ```

#### `POST /api/v1/auth/refresh`
Exchanges a valid refresh token for a new access token and rotated refresh token.
- **Request Body:**
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
- **Response (200 OK):** Same schema as `/auth/login`.

#### `POST /api/v1/auth/logout`
Revokes the caller's active device session and refresh token.

#### `GET /api/v1/me`
Retrieves current authenticated user's profile and permissions.

---

### 3. Employee Management (`/api/v1/employees`)

| Method | Path | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/employees` | `ADMIN`, `TEAM_LEAD` | List all employees (team leads only see their assigned team) |
| `POST` | `/api/v1/employees` | `ADMIN` | Provision a new employee |
| `PUT` | `/api/v1/employees/{id}` | `ADMIN` | Update employee profile, team, target, or preferred SIM slot |
| `POST` | `/api/v1/employees/{id}/reset-password` | `ADMIN` | Reset employee password |
| `POST` | `/api/v1/employees/{id}/revoke-sessions` | `ADMIN` | Invalidate all active mobile sessions for employee |

---

### 4. Contact Management & Assignments (`/api/v1/contacts`)

#### `GET /api/v1/contacts`
- **Query Parameters:** `search`, `priority`, `limit`, `offset`
- **Access Rule:** Ordinary employees receive **only contacts assigned to their ID**. Administrators receive all organization contacts.

#### `POST /api/v1/contacts`
Creates a single contact with automatic Indian phone normalization (+91) and duplicate checking.

#### `POST /api/v1/contacts/assign`
Assigns a list of contacts to an employee.
- **Request Body:**
  ```json
  {
    "employee_id": 2,
    "contact_ids": [101, 102, 103],
    "campaign_id": 1
  }
  ```

#### `POST /api/v1/contacts/import-preview`
Uploads a CSV or XLSX file and returns a pre-import validation report without inserting records.
- **Form Data:** `file: <binary_file>`
- **Response (200 OK):**
  ```json
  {
    "total_rows": 150,
    "valid_rows": 145,
    "invalid_rows": 2,
    "duplicate_rows": 3,
    "preview_rows": [
      {
        "row_number": 1,
        "first_name": "Aarav",
        "last_name": "Mehta",
        "normalized_phone": "+919876543210",
        "status": "VALID"
      }
    ]
  }
  ```

#### `POST /api/v1/contacts/import-confirm`
Asynchronously commits validated contact rows into the database via Redis worker.

---

### 5. Campaigns (`/api/v1/campaigns`)

- `GET /api/v1/campaigns`: Lists active and draft campaigns with target counts and progress.
- `POST /api/v1/campaigns`: Creates a new calling campaign with target dates and team assignment.
- `GET /api/v1/campaigns/{id}`: Retrieves campaign details, contact distribution, and connect rate.

---

### 6. Calls & Event Synchronization (`/api/v1/calls`)

#### `POST /api/v1/calls`
Idempotent call session creation initiated from employee mobile dialer.
- **Request Body:**
  ```json
  {
    "client_event_id": "7fa12345-6789-4abc-def0-123456789abc",
    "contact_id": 1,
    "campaign_id": 1,
    "phone_number_snapshot": "+919876543210",
    "sim_slot": 0,
    "started_at": "2026-10-01T10:00:00Z"
  }
  ```
- **Response (201 Created or 200 OK on duplicate retry):**
  Returns `CallResponse` with server `call_id`.

#### `POST /api/v1/calls/{id}/events`
Appends immutable telephony state transitions (`CALL_DIALING`, `CALL_RINGING`, `CALL_CONNECTED`, `CALL_DISCONNECTED`, `CALL_FAILED`).

#### `POST /api/v1/calls/{id}/disposition`
Saves mandatory post-call outcome code and optional notes.
- **Request Body:**
  ```json
  {
    "disposition_code": "CONNECTED",
    "notes": "Customer interested in pricing tier 2; schedule demo.",
    "callback_at": "2026-10-02T11:00:00Z"
  }
  ```

---

### 7. Callbacks (`/api/v1/callbacks`)

- `GET /api/v1/callbacks`: Filter by `filter_type` (`today`, `overdue`, `upcoming`, `all`).
- `POST /api/v1/callbacks`: Schedule a callback for an assigned contact.
- `PUT /api/v1/callbacks/{id}`: Reschedule or mark completed (`COMPLETED`, `CANCELLED`).

---

### 8. Call Recordings (`/api/v1/recordings`)

#### `POST /api/v1/recordings/upload`
Uploads voice recording file (`.mp4`, `.aac`, `.m4a`) from Android device.
- **Form Data:**
  - `call_id`: `42`
  - `file`: `<binary audio>`
  - `recording_method`: `MEDIA_RECORDER` or `SHIZUKU_AUDIO_LOOPBACK`
  - `client_event_id`: UUID idempotency key

#### `GET /api/v1/recordings/{id}/playback-url`
Generates a short-lived presigned AWS S3 playback URL (expires in 300 seconds).
- **Query Parameter:** `action` (`PLAY` or `DOWNLOAD`)
- **Access Rule:** Requires `ADMIN` or `TEAM_LEAD` role.
- **Audit:** Automatically logs access to `recording_access_logs`.

---

### 9. Dashboard & Reporting

- `GET /api/v1/dashboard/employee`: Returns real-time metrics for current employee (daily target, completed calls, connected calls, callbacks due, remaining).
- `GET /api/v1/dashboard/admin`: Returns organizational KPIs (talk time, avg duration, hourly dial chart, day chart, recording coverage).
- `GET /api/v1/reports`: Returns agent leaderboard and disposition outcome distribution.

---

### 10. Audit Logs & System Settings

- `GET /api/v1/audit-logs`: Immutable security audit trail with actor name, action, IP, and JSON payload.
- `GET /api/v1/settings`: Retrieves all system configuration flags and call dispositions.
- `PUT /api/v1/settings`: Updates configuration keys (`recording_enabled`, `recording_retention_days`, etc.).
- `POST /api/v1/settings/dispositions`: Adds custom call disposition code.
- `PUT /api/v1/settings/dispositions/{id}`: Updates disposition label or active status.
