# Offline-First & Data Synchronization Guide

## Employee Calling & CRM Platform
**Resilient Telephony Operation, Local SQLite Persistence, and Idempotency**

---

### 1. Philosophy & Architectural Guarantee

In enterprise calling environments (especially in field sales, tier-2/3 Indian cities, or underground parking), mobile cellular data drops frequently. 

The Employee Calling Platform guarantees **telephony independence**:
> **Voice calling NEVER depends on the FastAPI server being online.**
> An employee can view assigned contacts, initiate a cellular call, talk to the customer, and record their disposition without active internet connectivity.

All mutations are queued locally and synchronized with the backend once connectivity is restored.

---

### 2. Client-Side Local Storage Schema (SQLite)

The React Native application uses local SQLite (via `react-native-quick-sqlite` or `@react-native-async-storage/async-storage`) to maintain offline tables:

#### A. `local_contacts`
- `id`: Server Contact ID
- `first_name`, `last_name`, `normalized_phone`, `priority`, `campaign_id`
- `last_disposition_label`, `last_called_at`
- `cached_at`: Timestamp of last fetch

#### B. `offline_event_queue`
- `client_event_id` (TEXT PRIMARY KEY): Client-generated UUIDv4
- `event_type` (TEXT): `CREATE_CALL`, `UPDATE_CALL_STATE`, `SAVE_DISPOSITION`, `UPLOAD_RECORDING`, `SCHEDULE_CALLBACK`
- `payload_json` (TEXT): Serialized request payload
- `sync_state` (TEXT): `PENDING`, `RETRYING`, `SYNCED`, `FAILED`, `CONFLICT`
- `retry_count` (INTEGER DEFAULT 0)
- `last_error` (TEXT NULL)
- `created_at` (INTEGER): Epoch millisecond timestamp
- `updated_at` (INTEGER): Epoch millisecond timestamp

---

### 3. Idempotency Key Specification (`client_event_id`)

To prevent duplicate call logs, multiple disposition entries, or redundant callback records when a mobile client retries an HTTP request:

1. **Generation:** When the employee taps **CALL**, the mobile app immediately generates a unique UUID:
   ```typescript
   const clientEventId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
   ```
2. **Server Enforcement:** The `calls` table in MySQL has a `UNIQUE` constraint on `client_event_id`:
   ```sql
   client_event_id VARCHAR(100) UNIQUE NOT NULL
   ```
3. **Safe Retries:** If `POST /api/v1/calls` is received with an existing `client_event_id`, FastAPI **does not fail or insert a duplicate**. Instead, it looks up the existing call and returns HTTP `200 OK` with the original `call_id`:
   ```python
   existing_call = db.query(Call).filter(Call.client_event_id == payload.client_event_id).first()
   if existing_call:
       return existing_call # Idempotent safe return
   ```

---

### 4. Synchronization Lifecycle & State Machine

```
[Employee Action (Call / Disposition)]
                  |
                  v
       [Generate client_event_id]
                  |
                  v
      [Save to Local SQLite Queue]
             (State: PENDING)
                  |
                  v
       [Attempt HTTP Push to API]
                  |
         +--------+--------+
         |                 |
      Success           Network Error / Timeout
         |                 |
         v                 v
   (State: SYNCED)   (State: RETRYING)
   [Remove / Archive       |
    from Queue]      [Wait Exponential Backoff:
                      2s -> 4s -> 8s -> 16s -> 32s]
                           |
                           v
                     [Retry Push]
                           |
                 +---------+---------+
                 |                   |
            Retry Succeeded     Retries Exceeded (5x)
                 |                   |
                 v                   v
          (State: SYNCED)     (State: CONFLICT / FAILED)
                              [Alert User in UI badge]
```

---

### 5. Conflict Resolution Rules

| Domain | Conflict Scenario | Authoritative Source | Resolution Strategy |
|---|---|---|---|
| **Contact Assignment** | Admin reassigns Contact C to Employee 2 while Employee 1 was offline | **Server** | Employee 1's completed call on Contact C is still credited to Employee 1. Subsequent attempts to dial Contact C from Employee 1 are rejected. |
| **Call Duration & Timestamps** | Server clock differs slightly from employee mobile clock | **Client Telephony** | The exact call duration recorded by Android `InCallService` is treated as truth. |
| **Call Disposition** | Employee saves disposition offline; another agent notes contact in web | **Client Dialed Call** | Dispositions are linked directly to `call_id`, so both historical interactions are preserved immutably. |

---

### 6. Edge Cases Handled

1. **Device Reboot During Call:**
   - The native `CallStateManager` writes call state transitions to local persistent storage.
   - Upon reboot, `BootReceiver` scans for any incomplete calls (`status == INITIATED` or `ACTIVE`) and marks them `DISCONNECTED` with the last observed duration.
2. **Loss of Cellular Data During Call:**
   - The cellular voice channel on the SIM card is completely independent of the data network.
   - The voice call proceeds normally. When the call ends, the post-call screen opens immediately from local cache.
   - The disposition is saved to SQLite and automatically synchronizes when 4G/5G/Wi-Fi returns.
3. **Audio File Upload Resumption:**
   - Recording files are written locally to `context.cacheDir/recordings/`.
   - If an upload to S3 is interrupted, the recording remains safely on disk until a successful HTTP `200` confirmation is returned by the server.
