import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone, timedelta

from backend.app.core.config import settings
from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.models.entities import (
    Employee, UserRole, Contact, ContactAssignment, Campaign,
    Call, CallDisposition, Callback, Recording, AuditLog
)
from sqlalchemy.pool import StaticPool
from backend.app.core.security import get_password_hash, create_access_token

# Test SQLite in-memory database with StaticPool
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed dispositions
    db.add(CallDisposition(code="CONNECTED", label="Connected", is_connected=True, requires_callback=False, is_active=True))
    db.add(CallDisposition(code="NO_ANSWER", label="No Answer", is_connected=False, requires_callback=True, is_active=True))
    db.add(CallDisposition(code="CALLBACK", label="Callback", is_connected=True, requires_callback=True, is_active=True))

    # Seed Admin User
    admin = Employee(
        id=1,
        email="admin@test.local",
        full_name="Admin Test",
        hashed_password=get_password_hash("Password123"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

    # Seed Employee 1
    emp1 = Employee(
        id=2,
        email="emp1@test.local",
        full_name="Employee One",
        hashed_password=get_password_hash("Password123"),
        role=UserRole.EMPLOYEE,
        is_active=True,
        daily_call_target=50,
        preferred_sim_slot=0
    )
    db.add(emp1)

    # Seed Employee 2
    emp2 = Employee(
        id=3,
        email="emp2@test.local",
        full_name="Employee Two",
        hashed_password=get_password_hash("Password123"),
        role=UserRole.EMPLOYEE,
        is_active=True,
        daily_call_target=40,
        preferred_sim_slot=1
    )
    db.add(emp2)

    db.commit()
    db.close()
    yield
    test_engine.dispose()

def get_auth_header(user_id: int, role: str):
    token = create_access_token(data={"sub": str(user_id), "role": role})
    return {"Authorization": f"Bearer {token}"}

# ----------------- Auth Tests -----------------

def test_login_success():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "Password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "admin@test.local"

def test_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "WrongPassword"
    })
    assert response.status_code == 401

# ----------------- Contact & Normalization Tests -----------------

def test_create_contact_with_phone_normalization():
    headers = get_auth_header(1, "ADMIN")
    response = client.post("/api/v1/contacts", headers=headers, json={
        "first_name": "Ramesh",
        "last_name": "Gupta",
        "phone": "9876543210", # 10 digits
        "company": "Gupta Traders",
        "location": "Jaipur"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["normalized_phone"] == "+919876543210"

def test_contact_duplicate_detection():
    headers = get_auth_header(1, "ADMIN")
    # Attempt to insert same number formatted with country code
    response = client.post("/api/v1/contacts", headers=headers, json={
        "first_name": "Ramesh",
        "phone": "+91 98765 43210"
    })
    assert response.status_code == 409 # Duplicate

def test_assign_contact_and_employee_queue():
    admin_headers = get_auth_header(1, "ADMIN")
    emp1_headers = get_auth_header(2, "EMPLOYEE")

    # 1. Assign contact to emp1
    assign_resp = client.post("/api/v1/contacts/assign", headers=admin_headers, json={
        "employee_id": 2,
        "contact_ids": [1]
    })
    assert assign_resp.status_code == 200
    assert assign_resp.json()["assigned_count"] == 1

    # 2. Emp1 sees contact in queue
    queue_resp = client.get("/api/v1/contacts/queue", headers=emp1_headers)
    assert queue_resp.status_code == 200
    queue = queue_resp.json()
    assert len(queue) == 1
    assert queue[0]["phone"] == "+919876543210"

# ----------------- RBAC Tests -----------------

def test_employee_cannot_access_other_employee_contact():
    emp2_headers = get_auth_header(3, "EMPLOYEE")
    # Emp2 attempts to access contact 1 which is only assigned to emp1
    response = client.get("/api/v1/contacts/1", headers=emp2_headers)
    assert response.status_code == 403

def test_employee_cannot_create_employee():
    emp1_headers = get_auth_header(2, "EMPLOYEE")
    response = client.post("/api/v1/employees", headers=emp1_headers, json={
        "email": "hacker@test.local",
        "full_name": "Hacker",
        "password": "Password123"
    })
    assert response.status_code == 403

# ----------------- Call Sync & Idempotency Tests -----------------

def test_call_sync_idempotency():
    emp1_headers = get_auth_header(2, "EMPLOYEE")
    idempotency_key = "client-uuid-test-9999"

    now_iso = datetime.now(timezone.utc).isoformat()

    payload = {
        "client_event_id": idempotency_key,
        "contact_id": 1,
        "phone_number_snapshot": "+919876543210",
        "sim_slot": 0,
        "started_at": now_iso,
        "duration_seconds": 45,
        "status": "COMPLETED",
        "disposition_code": "CONNECTED",
        "notes": "Customer interested in annual subscription"
    }

    # First sync
    res1 = client.post("/api/v1/calls/sync", headers=emp1_headers, json=payload)
    assert res1.status_code == 200
    call1 = res1.json()
    assert call1["duration_seconds"] == 45
    call_id = call1["id"]

    # Second sync with same client_event_id (retry simulation)
    res2 = client.post("/api/v1/calls/sync", headers=emp1_headers, json=payload)
    assert res2.status_code == 200
    call2 = res2.json()
    assert call2["id"] == call_id # Guaranteed same record, zero duplicate!

# ----------------- Callback Tests -----------------

def test_callback_scheduling_and_retrieval():
    emp1_headers = get_auth_header(2, "EMPLOYEE")
    now_utc = datetime.now(timezone.utc)
    cb_time = now_utc.replace(hour=12, minute=0, second=0).isoformat()

    create_res = client.post("/api/v1/callbacks", headers=emp1_headers, json={

        "contact_id": 1,
        "scheduled_at": cb_time,
        "notes": "Discuss payment gateway integration"
    })
    assert create_res.status_code == 201

    list_res = client.get("/api/v1/callbacks?filter_type=today", headers=emp1_headers)
    assert list_res.status_code == 200
    callbacks = list_res.json()
    assert len(callbacks) >= 1

# ----------------- Dashboard & Audit Log Tests -----------------

def test_employee_and_admin_dashboard():
    emp1_headers = get_auth_header(2, "EMPLOYEE")
    admin_headers = get_auth_header(1, "ADMIN")

    emp_dash = client.get("/api/v1/dashboard/employee", headers=emp1_headers)
    assert emp_dash.status_code == 200
    stats = emp_dash.json()
    assert "daily_target" in stats
    assert "completed_calls" in stats

    admin_dash = client.get("/api/v1/dashboard/admin", headers=admin_headers)
    assert admin_dash.status_code == 200
    admin_stats = admin_dash.json()
    assert admin_stats["total_employees"] >= 3

def test_audit_logs_retrieval():
    admin_headers = get_auth_header(1, "ADMIN")
    response = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) > 0

def test_health_and_ready():
    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["status"] == "healthy"

    r = client.get("/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"
