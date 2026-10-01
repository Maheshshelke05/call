import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text,
    Enum as SQLEnum, Index, BigInteger, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    TEAM_LEAD = "TEAM_LEAD"
    EMPLOYEE = "EMPLOYEE"

class CallStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    DIALING = "DIALING"
    RINGING = "RINGING"
    CONNECTED = "CONNECTED"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    BUSY = "BUSY"
    REJECTED = "REJECTED"
    FAILED = "FAILED"

class RecordingStatus(str, enum.Enum):
    UNAVAILABLE = "UNAVAILABLE"
    READY = "READY"
    RECORDING = "RECORDING"
    PROCESSING = "PROCESSING"
    UPLOADING = "UPLOADING"
    AVAILABLE = "AVAILABLE"
    FAILED = "FAILED"
    PERMISSION_REQUIRED = "PERMISSION_REQUIRED"
    DEVICE_UNSUPPORTED = "DEVICE_UNSUPPORTED"

class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"

class AssignmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"

class CallbackStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"

class ImportStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

# ----------------- Database Tables -----------------

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    employees = relationship("Employee", back_populates="team")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    daily_call_target = Column(Integer, default=50, nullable=False)
    preferred_sim_slot = Column(Integer, default=0, nullable=False) # 0 for SIM 1, 1 for SIM 2
    phone_number = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    team = relationship("Team", back_populates="employees")
    devices = relationship("EmployeeDevice", back_populates="employee")
    sessions = relationship("Session", back_populates="employee")
    assignments = relationship("ContactAssignment", foreign_keys="[ContactAssignment.employee_id]", back_populates="employee")
    calls = relationship("Call", back_populates="employee")
    callbacks = relationship("Callback", back_populates="employee")

class EmployeeDevice(Base):
    __tablename__ = "employee_devices"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    device_model = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    app_version = Column(String(50), nullable=True)
    fcm_token = Column(String(255), nullable=True)
    is_authorized = Column(Boolean, default=True)
    last_seen_at = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)

    employee = relationship("Employee", back_populates="devices")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    refresh_token = Column(String(500), unique=True, nullable=False, index=True)
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    employee = relationship("Employee", back_populates="sessions")

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    raw_phone = Column(String(50), nullable=False)
    normalized_phone = Column(String(20), nullable=False, index=True)
    email = Column(String(150), nullable=True)
    company = Column(String(150), nullable=True)
    location = Column(String(150), nullable=True)
    priority = Column(Integer, default=1) # 1 normal, 2 medium, 3 high
    tags = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    is_do_not_call = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    assignments = relationship("ContactAssignment", back_populates="contact")
    calls = relationship("Call", back_populates="contact")

    __table_args__ = (
        Index("idx_contacts_normalized_phone", "normalized_phone"),
    )

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.DRAFT, nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    target_calls = Column(Integer, default=0)
    priority = Column(Integer, default=1)
    assigned_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    campaign_contacts = relationship("CampaignContact", back_populates="campaign")
    calls = relationship("Call", back_populates="campaign")

class CampaignContact(Base):
    __tablename__ = "campaign_contacts"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=utc_now)

    campaign = relationship("Campaign", back_populates="campaign_contacts")
    contact = relationship("Contact")

class ContactAssignment(Base):
    __tablename__ = "contact_assignments"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.PENDING, nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    assigned_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="assignments")
    contact = relationship("Contact", back_populates="assignments")
    campaign = relationship("Campaign")

    __table_args__ = (
        Index("idx_contact_assignments_emp_status", "employee_id", "status"),
        UniqueConstraint("employee_id", "contact_id", "campaign_id", name="uq_emp_contact_campaign"),
    )

class CallDisposition(Base):
    __tablename__ = "call_dispositions"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False) # CONNECTED, NO_ANSWER, BUSY, CALLBACK, etc.
    label = Column(String(100), nullable=False)
    is_connected = Column(Boolean, default=False)
    requires_callback = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

class Call(Base):
    __tablename__ = "calls"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    external_call_reference = Column(String(100), nullable=True)
    phone_number_snapshot = Column(String(20), nullable=False)
    sim_slot = Column(Integer, default=0) # 0 for SIM 1, 1 for SIM 2
    started_at = Column(DateTime, default=utc_now, nullable=False)
    answered_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    status = Column(SQLEnum(CallStatus), default=CallStatus.INITIATED, nullable=False)
    disposition_id = Column(Integer, ForeignKey("call_dispositions.id"), nullable=True)
    notes_id = Column(Integer, ForeignKey("call_notes.id"), nullable=True)
    recording_id = Column(Integer, ForeignKey("recordings.id"), nullable=True)
    client_event_id = Column(String(100), unique=True, nullable=False, index=True) # Idempotency key
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    employee = relationship("Employee", back_populates="calls")
    contact = relationship("Contact", back_populates="calls")
    campaign = relationship("Campaign", back_populates="calls")
    disposition = relationship("CallDisposition")
    notes = relationship("CallNote", foreign_keys=[notes_id])
    recording = relationship("Recording", foreign_keys=[recording_id])
    events = relationship("CallEvent", back_populates="call")

    __table_args__ = (
        Index("idx_calls_employee_started", "employee_id", "started_at"),
        Index("idx_calls_contact_started", "contact_id", "started_at"),
        Index("idx_calls_campaign_started", "campaign_id", "started_at"),
        Index("idx_calls_status_started", "status", "started_at"),
    )

class CallEvent(Base):
    __tablename__ = "call_events"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False)
    event_type = Column(String(50), nullable=False) # CALL_INITIATED, CALL_DIALING, CALL_CONNECTED, etc.
    event_timestamp = Column(DateTime, default=utc_now, nullable=False)
    metadata_json = Column(Text, nullable=True)

    call = relationship("Call", back_populates="events")

class CallNote(Base):
    __tablename__ = "call_notes"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class Callback(Base):
    __tablename__ = "callbacks"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(SQLEnum(CallbackStatus), default=CallbackStatus.SCHEDULED, nullable=False)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    employee = relationship("Employee", back_populates="callbacks")
    contact = relationship("Contact")
    call = relationship("Call")

    __table_args__ = (
        Index("idx_callbacks_employee_scheduled_status", "employee_id", "scheduled_at", "status"),
    )

class Recording(Base):
    __tablename__ = "recordings"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False, unique=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    s3_bucket = Column(String(100), nullable=True)
    s3_key = Column(String(255), nullable=True)
    file_path = Column(String(255), nullable=True) # local path or fallback
    file_size_bytes = Column(BigInteger, default=0)
    duration_seconds = Column(Integer, default=0)
    mime_type = Column(String(50), default="audio/mp4")
    status = Column(SQLEnum(RecordingStatus), default=RecordingStatus.PROCESSING, nullable=False)
    recording_method = Column(String(50), default="MEDIA_RECORDER")
    created_at = Column(DateTime, default=utc_now)

    access_logs = relationship("RecordingAccessLog", back_populates="recording")

    __table_args__ = (
        Index("idx_recordings_call_id", "call_id"),
    )

class RecordingAccessLog(Base):
    __tablename__ = "recording_access_logs"
    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("recordings.id"), nullable=False)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False) # Owner of call
    accessed_by = Column(Integer, ForeignKey("employees.id"), nullable=False) # User playing/downloading
    accessed_at = Column(DateTime, default=utc_now, nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    action = Column(String(20), nullable=False) # PLAY, DOWNLOAD, DELETE

    recording = relationship("Recording", back_populates="access_logs")

class Import(Base):
    __tablename__ = "imports"
    id = Column(Integer, primary_key=True, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    inserted_rows = Column(Integer, default=0)
    updated_rows = Column(Integer, default=0)
    skipped_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    status = Column(SQLEnum(ImportStatus), default=ImportStatus.PENDING, nullable=False)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

class ImportRow(Base):
    __tablename__ = "import_rows"
    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("imports.id"), nullable=False)
    row_number = Column(Integer, nullable=False)
    raw_data = Column(Text, nullable=False)
    normalized_phone = Column(String(20), nullable=True)
    validation_status = Column(String(20), default="VALID") # VALID, INVALID, DUPLICATE
    error_message = Column(String(255), nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    action = Column(String(100), nullable=False) # e.g. EMPLOYEE_LOGIN, CONTACT_IMPORT, RECORDING_PLAYED
    entity_type = Column(String(50), nullable=True) # CALL, RECORDING, CONTACT, EMPLOYEE
    entity_id = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_audit_logs_actor_created", "actor_id", "created_at"),
    )

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
